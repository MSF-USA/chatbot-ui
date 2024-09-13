import { JWT, Session } from 'next-auth';
import { getToken } from 'next-auth/jwt';
import { getServerSession } from 'next-auth/next';
import { NextRequest } from 'next/server';

import {
  checkIsModelValid,
  isFileConversation,
  isImageConversation,
} from '@/utils/app/chat';
import {
  APIM_CHAT_ENDPONT,
  AZURE_DEPLOYMENT_ID,
  DEFAULT_SYSTEM_PROMPT,
  DEFAULT_TEMPERATURE,
  OPENAI_API_HOST,
  OPENAI_API_VERSION,
} from '@/utils/app/const';
import { parseAndQueryFileOpenAI } from '@/utils/app/documentSummary';
import { AzureBlobStorage, BlobProperty } from '@/utils/server/blob';
import { getMessagesToSend } from '@/utils/server/chat';

import { MessageType } from '@/types/chat';
import {
  ChatBody,
  FileMessageContent,
  Message,
  TextMessageContent,
} from '@/types/chat';
import { OpenAIModelID, OpenAIVisionModelID } from '@/types/openai';
import { SearchIndex } from '@/types/searchIndex';

import { authOptions } from '@/pages/api/auth/[...nextauth]';

import useSearchService from './searchService';

import tiktokenModel from '@dqbd/tiktoken/encoders/cl100k_base.json';
import { Tiktoken, init } from '@dqbd/tiktoken/lite/init';
import { OpenAIStream, StreamingTextResponse } from 'ai';
import fs from 'fs';
import OpenAI from 'openai';
import path from 'path';
import { Readable } from 'stream';

/**
 * ChatService class for handling chat-related API operations.
 */
export default class ChatService {
  /**
   * Initializes the Tiktoken tokenizer.
   * @returns {Promise<Tiktoken>} A promise that resolves to the initialized Tiktoken instance.
   */
  private async initTiktoken(): Promise<Tiktoken> {
    const wasmPath = path.resolve(
      './node_modules/@dqbd/tiktoken/lite/tiktoken_bg.wasm',
    );
    const wasmBuffer = fs.readFileSync(wasmPath);
    await init((imports) => WebAssembly.instantiate(wasmBuffer, imports));
    return new Tiktoken(
      tiktokenModel.bpe_ranks,
      tiktokenModel.special_tokens,
      tiktokenModel.pat_str,
    );
  }

  /**
   * Wrapper function to implement exponential backoff retry logic.
   * @param {Function} fn - The function to retry.
   * @param {number} maxRetries - Maximum number of retries.
   * @param {number} baseDelay - Base delay in milliseconds.
   * @returns {Promise<any>} - The result of the function call.
   */
  private async retryWithExponentialBackoff<T>(
    fn: () => Promise<T>,
    maxRetries: number = 3,
    baseDelay: number = 1000,
  ): Promise<T> {
    for (let attempt = 0; attempt <= maxRetries; attempt++) {
      try {
        return await fn();
      } catch (error) {
        if (attempt === maxRetries) {
          throw error;
        }
        const delay = Math.min(Math.pow(2, attempt) * baseDelay, 10000); // Max delay of 10 seconds
        console.warn(
          `Attempt ${attempt + 1} failed. Retrying in ${delay}ms...`,
        );
        await new Promise((resolve) => setTimeout(resolve, delay));
      }
    }
    throw new Error('Failed after maximum retries');
  }

  /**
   * Retrieves the OpenAI API arguments based on the provided token and model.
   * @param {JWT} token - The JWT token for authentication.
   * @param {string} modelToUse - The ID of the model to use.
   * @returns {Promise<any>} A promise that resolves to the OpenAI API arguments.
   */
  private async getOpenAIArgs(token: JWT, modelToUse: string): Promise<any> {
    const openAIArgs: any = {
      baseURL: `${OPENAI_API_HOST}/${APIM_CHAT_ENDPONT}/deployments/${modelToUse}`,
      defaultQuery: { 'api-version': OPENAI_API_VERSION },
      defaultHeaders: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token.accessToken}`,
      },
    };

    if (process.env.OPENAI_API_KEY)
      openAIArgs.apiKey = process.env.OPENAI_API_KEY;
    else openAIArgs.apiKey = '';

    return openAIArgs;
  }

  private async retryReadFile(
    filePath: string,
    maxRetries: number = 2,
  ): Promise<Buffer> {
    const delay = (ms: number) =>
      new Promise((resolve) => setTimeout(resolve, ms));

    for (let attempt = 0; attempt <= maxRetries; attempt++) {
      try {
        return fs.readFileSync(filePath);
      } catch (error) {
        if (attempt === maxRetries) {
          throw error;
        }
        console.warn(`Attempt ${attempt + 1} to read file failed. Retrying...`);
        await delay(Math.pow(2, attempt) * 1000); // Exponential backoff: 1s, 2s, 4s
      }
    }
    throw new Error('Failed to read file after maximum retries');
  }

  /**
   * Handles a file conversation by processing the file and returning a response.
   * @param {Message[]} messagesToSend - The messages to send in the conversation.
   * @returns {Promise<Response>} A promise that resolves to the response containing the processed file content.
   */
  private async handleFileConversation(
    messagesToSend: Message[],
    token: JWT,
    modelId: string,
    user: Session['user'],
  ): Promise<Response> {
    return this.retryWithExponentialBackoff(async () => {
      const lastMessage: Message = messagesToSend[messagesToSend.length - 1];
      const content = lastMessage.content as Array<
        TextMessageContent | FileMessageContent
      >;

      let prompt: string | null = null;
      let fileUrl: string | null = null;
      content.forEach((section) => {
        if (section.type === 'text') prompt = section.text;
        else if (section.type === 'file_url') fileUrl = section.url;
        else
          throw new Error(
            `Unexpected content section type: ${JSON.stringify(section)}`,
          );
      });

      if (!prompt) throw new Error('Could not find text content type!');
      if (!fileUrl) throw new Error('Could not find file URL!');

      const filename = (fileUrl as string).split('/').pop();
      if (!filename) throw new Error('Could not parse filename from URL!');
      const filePath = `/tmp/${filename}`;

      try {
        await this.downloadFile(fileUrl, filePath, token, user);
        console.log('File downloaded successfully.');

        const fileBuffer: Buffer = await this.retryReadFile(filePath);
        const file: File = new File([fileBuffer], filename, {});

        const stream: ReadableStream<any> = await parseAndQueryFileOpenAI({
          file,
          prompt,
          token,
          modelId,
        }); //""; // await parseAndQueryFileLangchainOpenAI(file, prompt);

        console.log('File summarized successfully.');
        return new StreamingTextResponse(stream);
      } catch (error) {
        console.error('Error processing the file:', error);
        throw error;
      } finally {
        try {
          fs.unlinkSync(filePath);
        } catch (fileUnlinkError) {
          if (
            fileUnlinkError instanceof Error &&
            fileUnlinkError.message.startsWith(
              'ENOENT: no such file or directory, unlink',
            )
          ) {
            console.warn('File not found, but this is acceptable.');
          } else {
            throw fileUnlinkError;
          }
        }
      }
    });
  }

  /**
   * Downloads a file from the specified URL and saves it to the specified file path.
   * @param {string} fileUrl - The URL of the file to download.
   * @param {string} filePath - The path where the downloaded file will be saved.
   * @returns {Promise<void>} A promise that resolves when the file is successfully downloaded.
   */
  private async downloadFile(
    fileUrl: string,
    filePath: string,
    token: JWT,
    user: Session['user'],
  ): Promise<void> {
    const userId: string = (token as any).userId ?? user?.id ?? 'anonymous';
    const remoteFilepath = `${userId}/uploads/files`;
    const id: string | undefined = fileUrl.split('/').pop();
    if (!id) throw new Error(`Could not find file id from URL: ${fileUrl}`);

    const blobStorage = new AzureBlobStorage();
    const blob: Buffer = await (blobStorage.get(
      `${remoteFilepath}/${id}`,
      BlobProperty.BLOB,
    ) as Promise<Buffer>);

    fs.writeFile(filePath, blob, () => null);
  }

  /**
   * Determines whether a user query is relevant to Médecins Sans Frontières (MSF) or related topics.
   * @param {string} modelToUse - The ID of the model to use for relevance checking.
   * @param {JWT} token - The JWT token for authentication.
   * @param {string} query - The user's query to check for relevance.
   * @returns {Promise<boolean>} A promise that resolves to true if the query is relevant, false otherwise.
   */
  private async isQueryRelevantToMSF(
    modelToUse: string,
    token: JWT,
    query: string,
  ): Promise<boolean> {
    const openAIArgs = await this.getOpenAIArgs(token, modelToUse);
    const azureOpenai = new OpenAI(openAIArgs);

    const response = await azureOpenai.chat.completions.create({
      model: modelToUse,
      messages: [
        {
          role: 'system',
          content:
            'You are an AI assistant that determines if a query is related to humanitarian issues, global health crises, or the work of organizations like Médecins Sans Frontières (MSF)/Doctors Without Borders. Consider the following as relevant:\n' +
            '1. Direct questions about MSF, their work, or similar NGOs\n' +
            '2. Queries about humanitarian aid or medical assistance in any context\n' +
            '3. Questions about ongoing conflicts, natural disasters, or health crises anywhere in the world\n' +
            '4. General inquiries about the situation in areas known for humanitarian challenges\n' +
            '5. Topics related to global health, epidemic outbreaks, or access to healthcare in developing countries\n' +
            '6. Questions about refugee health, displacement, or migration due to conflicts or disasters\n' +
            "Respond with only 'yes' if the query is related to any of these topics, or 'no' if it's completely unrelated.",
        },
        {
          role: 'user',
          content: `Is the following query related to humanitarian issues, global health crises, or the work of organizations like MSF? Query: "${query}"`,
        },
      ],
      no_log: true,
    } as OpenAI.Chat.Completions.ChatCompletionCreateParams & {
      no_log: boolean;
    });

    const typedAnswer = response as OpenAI.Chat.Completions.ChatCompletion;

    const answer = typedAnswer.choices[0]?.message?.content
      ?.toLowerCase()
      .trim();
    console.log('relevant: ', answer);
    return answer === 'yes';
  }

  /**
   * Extracts the text content from a message.
   * @param {Message} message - The message to extract text content from.
   * @returns {string | null} The extracted text content, or null if not found.
   */
  private getTextContent(message: Message): string | null {
    if (typeof message.content === 'string') return message.content;
    if ((message.content as TextMessageContent).type === 'text')
      return (message.content as TextMessageContent).text;
    return null;
  }

  /**
   * Reformats the user query to Azure OpenAI for RAG captabilities.
   * @param {string} userQuestion - The original user question.
   * @param {any[]} searchResults - The search results to include in the augmented content.
   * @returns {string} The formatted augmented content.
   */
  private formatAugmentedContent(
    userQuestion: string,
    searchResults: any[],
  ): string {
    const formattedResults = searchResults
      .map(
        (result, index) =>
          `[${index + 1}] ${result.title}: date ${result.date} : ${
            result.content
          } (URL: ${result.url})`,
      )
      .join('\n');

    return `
User's question: ${userQuestion}

Relevant information:
${formattedResults}

Instructions:
1. Provide a clear and concise answer to the user's question based on the provided information and your general knowledge.
2. Use the most recent and relevant information available from the provided sources.
3. When citing information from the provided sources in your answer, use the format [X] where X is the original number of the source as listed in the "Relevant information" section above. Do NOT renumber these in-text citations.
4. Use multiple sources when appropriate to provide a comprehensive answer.
5. If information from the provided sources contradicts your general knowledge, prioritize the provided information as it's likely more up-to-date.
6. Do not cite general knowledge that isn't from these sources.
7. Structure your response as follows:
   a. Start with a direct answer to the user's question, highlighting the MOST RECENT data or information available.
   b. Provide supporting details and explanations, using citations where appropriate. Clearly indicate when you're presenting older vs. newer information.
   c. If relevant, include a brief conclusion or summary, emphasizing the latest findings or data.
8. After your main response, you MUST include a "CITATIONS" section, followed by a "FOLLOW_UP_QUESTIONS" section. Always include both sections in this order, even if one is empty.
9. The CITATIONS section:
   a. Must be preceded by the exact string "[[CITATIONS_START]]" on a new line.
   b. Must be followed by "[[CITATIONS_END]]" on a new line after the last citation.
   c. Must list ALL sources from the relevant information provided, including those not directly cited in your answer.
   d. Must maintain the original numbering from the "Relevant information" section for each source.
   e. Each citation should be on a new line and in the following format:
      [{"number": "X", "title": "Source Title", "url": "https://example.com", "date": "Source Date as Month Day, Year"}]
10. The FOLLOW_UP_QUESTIONS section:
    a. Must be preceded by the exact string "[[FOLLOW_UP_QUESTIONS_START]]" on a new line.
    b. Must be followed by "[[FOLLOW_UP_QUESTIONS_END]]" on a new line after the last question.
    c. Should include 3 relevant follow-up questions based on your response and the available information.
    d. Each follow-up question should be on a new line and in the following format:
       {"question": "Follow-up question text here?"}

Your response MUST always include both the CITATIONS and FOLLOW_UP_QUESTIONS sections with their respective start and end markers, in that order, even if one section is empty.

Example format:

Your detailed response here... According to [2], some relevant information... Another study [1] suggests...

[[CITATIONS_START]]
[{"number": "1", "title": "Source Title 1", "url": "https://example1.com", "date": "January 1, 2023"}]
[{"number": "2", "title": "Source Title 2", "url": "https://example2.com", "date": "February 2, 2023"}]
[{"number": "3", "title": "Unused Source Title 3", "url": "https://example3.com", "date": "March 3, 2023"}]
[[CITATIONS_END]]

[[FOLLOW_UP_QUESTIONS_START]]
{"question": "How do the findings from the Smith et al. study compare to previous research in this field?"}
{"question": "What are the potential implications of the WHO report for global health policies?"}
{"question": "Are there any ongoing studies or upcoming reports that might provide more recent data on this topic?"}
[[FOLLOW_UP_QUESTIONS_END]]
`;
  }

  /**
   * Handles a chat completion request by sending the messages to the OpenAI API and returning a streaming response.
   * @param {string} modelToUse - The ID of the model to use for the chat completion.
   * @param {Message[]} messagesToSend - The messages to send in the chat completion request.
   * @param {number} temperatureToUse - The temperature value to use for the chat completion.
   * @param {JWT} token - The JWT token for authentication.
   * @param {Session['user']} user - User information for logging
   * @param {boolean} useAISearch - Whether to use Azure AI Search and use RAG capabilities
   * @returns {Promise<StreamingTextResponse>} A promise that resolves to the streaming response containing the chat completion.
   */
  private async handleChatCompletion(
    modelToUse: string,
    messagesToSend: Message[],
    temperatureToUse: number,
    token: JWT,
    user: Session['user'],
    useAISearch: boolean,
  ): Promise<Response> {
    return this.retryWithExponentialBackoff(async () => {
      const openAIArgs = await this.getOpenAIArgs(token, modelToUse);
      const azureOpenai = new OpenAI(openAIArgs);

      const lastMessage = messagesToSend[messagesToSend.length - 1];
      const textContent = this.getTextContent(lastMessage);

      if (textContent && useAISearch) {
        try {
          const isRelevant = await this.isQueryRelevantToMSF(
            modelToUse,
            token,
            textContent,
          );
          if (isRelevant) {
            const searchResults = await useSearchService(textContent);
            const augmentedUserMessage = this.formatAugmentedContent(
              textContent,
              searchResults,
            );
            messagesToSend[messagesToSend.length - 1] = {
              ...lastMessage,
              content: augmentedUserMessage,
            };
          }
        } catch (error) {
          console.error('Error in AI search or relevance check:', error);
        }
      }

      try {
        const response = await azureOpenai.chat.completions.create({
          model: modelToUse,
          messages:
            messagesToSend as OpenAI.Chat.Completions.ChatCompletionMessageParam[],
          temperature: temperatureToUse,
          max_tokens: null,
          stream: true,
          user: JSON.stringify(user),
        });

        const stream = OpenAIStream(response);
        return new StreamingTextResponse(stream);
      } catch (error) {
        console.error('Error in chat completion:', error);
        let statusCode = 500;
        let errorMessage =
          'An error occurred while processing your request. Please try again later.';

        if (error instanceof OpenAI.APIError) {
          statusCode = error.status || 500;
          errorMessage = error.message;
        } else if (error instanceof Error) {
          errorMessage = error.message;
        }

        return new Response(JSON.stringify({ error: errorMessage }), {
          status: statusCode,
          headers: { 'Content-Type': 'application/json' },
        });
      }
    });
  }

  /**
   * Handles an incoming request by processing the chat body and returning an appropriate response.
   * @param {NextRequest} req - The incoming Next.js request.
   * @returns {Promise<Response>} A promise that resolves to the response based on the request.
   */
  public async handleRequest(req: NextRequest): Promise<Response> {
    const { model, messages, prompt, temperature, useKnowledgeBase } =
      (await req.json()) as ChatBody;

    const encoding = await this.initTiktoken();
    const promptToSend = prompt || DEFAULT_SYSTEM_PROMPT;
    const temperatureToUse = temperature ?? DEFAULT_TEMPERATURE;
    const useAISearch = useKnowledgeBase || false;

    const needsToHandleImages: boolean = isImageConversation(messages);
    const needsToHandleFiles: boolean =
      !needsToHandleImages && isFileConversation(messages);

    const isValidModel: boolean = checkIsModelValid(model.id, OpenAIModelID);
    const isImageModel: boolean = checkIsModelValid(
      model.id,
      OpenAIVisionModelID,
    );

    let modelToUse = model.id;
    if (isValidModel && needsToHandleImages && !isImageModel) {
      modelToUse = 'gpt-4o';
    } else if (modelToUse == null || !isValidModel) {
      modelToUse = AZURE_DEPLOYMENT_ID;
    }

    const token = (await getToken({ req })) as JWT | null;
    if (!token) throw new Error('Could not pull token!');
    const session: Session | null = await getServerSession(authOptions as any);
    if (!session) throw new Error('Could not pull session!');

    const user = session['user'];

    const prompt_tokens = encoding.encode(promptToSend);
    const messagesToSend: Message[] = await getMessagesToSend(
      messages,
      encoding,
      prompt_tokens.length,
      model.tokenLimit,
      token,
      user,
    );
    encoding.free();

    if (needsToHandleFiles) {
      return this.handleFileConversation(messagesToSend, token, model.id, user);
    } else {
      return this.handleChatCompletion(
        modelToUse,
        messagesToSend,
        temperatureToUse,
        token,
        user,
        useAISearch,
      );
    }
  }
}
