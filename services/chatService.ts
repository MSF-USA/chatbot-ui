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
import { getEnvVariable } from '@/utils/app/env';
import {
  StreamProcessingResult,
  createAzureOpenAIStreamProcessor,
} from '@/utils/app/streamProcessor';
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

import { AzureMonitorLoggingService } from './loggingService';
import useSearchService from './searchService';

import {
  DefaultAzureCredential,
  getBearerTokenProvider,
} from '@azure/identity';
import '@azure/openai/types';
import tiktokenModel from '@dqbd/tiktoken/encoders/cl100k_base.json';
import { Tiktoken, init } from '@dqbd/tiktoken/lite/init';
import { OpenAIStream, StreamingTextResponse } from 'ai';
import fs from 'fs';
import OpenAI, { AzureOpenAI } from 'openai';
import { ChatCompletion, ChatCompletionChunk } from 'openai/resources';
import path from 'path';

interface StreamResponse {
  [Symbol.asyncIterator](): AsyncIterator<any>;
  choices: Array<{
    delta: {
      content?: string;
      context?: {
        citations: any[];
      };
    };
  }>;
}

/**
 * ChatService class for handling chat-related API operations.
 */
export default class ChatService {
  private loggingService: AzureMonitorLoggingService;

  constructor() {
    this.loggingService = new AzureMonitorLoggingService(
      process.env.LOGS_INJESTION_ENDPOINT!,
      process.env.DATA_COLLECTION_RULE_ID!,
      process.env.STREAM_NAME!,
    );
  }
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
      apiVersion: OPENAI_API_VERSION,
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
    botId: string | undefined,
    streamResponse: boolean, // Added this parameter
  ): Promise<Response> {
    const startTime = Date.now();
    let fileBuffer: Buffer | undefined;
    let filename: string | undefined;

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

      filename = (fileUrl as string).split('/').pop();
      if (!filename) throw new Error('Could not parse filename from URL!');
      const filePath = `/tmp/${filename}`;

      try {
        await this.downloadFile(fileUrl, filePath, token, user);
        console.log('File downloaded successfully.');

        fileBuffer = await this.retryReadFile(filePath);
        const file: File = new File([fileBuffer], filename, {});

        const result = await parseAndQueryFileOpenAI({
          file,
          prompt,
          modelId,
          user,
          botId,
          loggingService: this.loggingService,
          stream: streamResponse, // Pass streamResponse parameter
        });

        console.log('File summarized successfully.');

        if (streamResponse) {
          const { stream } = result as StreamProcessingResult;
          return new StreamingTextResponse(stream);
        } else {
          const responseText = result as string;
          return new Response(JSON.stringify({ text: responseText }), {
            headers: { 'Content-Type': 'application/json' },
          });
        }
      } catch (error) {
        console.error('Error processing the file:', error);

        const endTime = Date.now();
        const duration = endTime - startTime;

        await this.loggingService.log({
          EventType: 'FileConversationError',
          Status: 'error',
          ModelUsed: modelId,
          UserId: user.id,
          UserJobTitle: user.jobTitle,
          UserDisplayName: user.displayName,
          UserEmail: user.mail,
          UserCompanyName: user.companyName,
          FileUpload: true,
          FileName: filename,
          FileSize: fileBuffer ? fileBuffer.length : undefined,
          Duration: duration,
          ErrorMessage:
            error instanceof Error ? error.message : 'Unknown error',
          ErrorStack: error instanceof Error ? error.stack : undefined,
        });

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
    const userId: string = user?.id ?? (token as any).userId ?? 'anonymous';
    const remoteFilepath = `${userId}/uploads/files`;
    const id: string | undefined = fileUrl.split('/').pop();
    if (!id) throw new Error(`Could not find file id from URL: ${fileUrl}`);

    const blobStorage = new AzureBlobStorage(
      getEnvVariable({ name: 'AZURE_BLOB_STORAGE_NAME', user }),
      getEnvVariable({ name: 'AZURE_BLOB_STORAGE_KEY', user }),
      getEnvVariable({
        name: 'AZURE_BLOB_STORAGE_CONTAINER',
        throwErrorOnFail: false,
        defaultValue: process.env.AZURE_BLOB_STORAGE_IMAGE_CONTAINER ?? '',
        user,
      }),
      user,
    );
    const blob: Buffer = await (blobStorage.get(
      `${remoteFilepath}/${id}`,
      BlobProperty.BLOB,
    ) as Promise<Buffer>);

    fs.writeFile(filePath, blob, () => null);
  }

  private getSearchDataSource() {
    return {
      type: 'azure_search' as const,
      parameters: {
        endpoint: process.env.SEARCH_ENDPOINT,
        index_name: process.env.SEARCH_INDEX,
        authentication: {
          type: 'api_key' as const,
          key: process.env.SEARCH_ENDPOINT_API_KEY,
        },
      },
    };
  }

  private getMSFStandards() {
    return {
      type: 'azure_search' as const,
      parameters: {
        endpoint: '',
        index_name: 'msf-standards',
        authentication: {
          type: 'api_key' as const,
          key: '',
        },
      },
    };
  }

  /**
   * Handles a chat completion request by sending the messages to the OpenAI API and returning a response.
   * @param {string} modelToUse - The ID of the model to use for the chat completion.
   * @param {Message[]} messagesToSend - The messages to send in the chat completion request.
   * @param {number} temperatureToUse - The temperature value to use for the chat completion.
   * @param {Session['user']} user - User information for logging
   * @returns {Promise<Response>} A promise that resolves to the response containing the chat completion.
   */
  private async handleChatCompletion(
    modelToUse: string,
    messagesToSend: Message[],
    temperatureToUse: number,
    user: Session['user'],
    botId: string | undefined,
    streamResponse: boolean,
  ): Promise<Response> {
    const startTime = Date.now();
    return this.retryWithExponentialBackoff(async () => {
      const scope = 'https://cognitiveservices.azure.com/.default';
      const azureADTokenProvider = getBearerTokenProvider(
        new DefaultAzureCredential(),
        scope,
      );

      const deployment = modelToUse;
      const apiVersion = '2024-07-01-preview';
      const client = new AzureOpenAI({
        azureADTokenProvider,
        deployment,
        apiVersion,
      });

      try {
        const commonParams = {
          model: modelToUse,
          messages:
            messagesToSend as OpenAI.Chat.Completions.ChatCompletionMessageParam[],
          temperature: temperatureToUse,
          max_tokens: null,
          stream: streamResponse,
          user: JSON.stringify(user),
        };

        let streamData: AsyncIterable<any>;

        if (botId === 'msf_communications') {
          const response = await client.chat.completions.create({
            ...commonParams,
            //@ts-ignore
            data_sources: [this.getSearchDataSource()],
          });

          // Convert response to async iterable
          streamData = streamResponse
            ? (response as AsyncIterable<any>)
            : {
                async *[Symbol.asyncIterator]() {
                  yield {
                    choices: [
                      {
                        delta: {
                          content: (response as any).choices[0]?.message
                            ?.content,
                        },
                      },
                    ],
                  };
                  // Include citations if they exist
                  const citations = (response as any).choices[0]?.message
                    ?.context?.citations;
                  if (citations) {
                    yield {
                      choices: [
                        {
                          delta: {
                            context: { citations },
                          },
                        },
                      ],
                    };
                  }
                },
              };
        } else if (botId === 'content_validator') {
          console.log('Running validation checks...');

          // Run both checks concurrently
          const [styleCheckResponse, factCheckResponse] = await Promise.all([
            // Style guide check
            client.chat.completions.create({
              model: modelToUse,
              messages: [
                {
                  role: 'system',
                  content: `
                    Analyze the inputted text against the provided style guide rules and determine adherence to these guidelines. Include citations and specific wording from the style guide for each rule when identifying compliance or deviations.

                    Use the provided style guide details to evaluate the text's compliance. Clearly identify any deviations or confirm adherence, citing specific areas.

                    # Steps

                    1. **Receive Input**: Collect the text and style guide rules for analysis.
                    2. **Compare Text**: Evaluate the text against each rule in the style guide, using direct quotes where violations or compliance are identified.
                    3. **Identify Deviations**: Highlight specific instances of non-compliance, including citations with precise wording from the style guide.
                    4. **Confirm Adherence**: Note specific areas where the text adheres to the style policies, again incorporating citations as needed.

                    # Output Format

                    Provide a detailed compliance report in the following JSON format:

                    \`\`\`json
                    {
                      "compliance": {
                        "is_compliant": [true/false],
                        "non_compliance_areas": [
                          {
                            "rule": "[Description of the rule, including citation and wording from the guide]",
                            "issue": "[Description of the non-compliance issue within the text]"
                          }
                        ],
                        "compliance_areas": [
                          {
                            "rule": "[Description of the rule, including citation and wording from the guide]",
                            "compliant_text": "[Description of the text portion in compliance]"
                          }
                        ]
                      }
                    }
                    \`\`\`

                    # Examples

                    **Example Input:**

                    - Text: "The quick brown fox jumps over the lazy dog."
                    - Style Guide Rule: "Avoid passive voice. Ensure verbs are in active tense."

                    **Example Output:**

                    \`\`\`json
                    {
                      "compliance": {
                        "is_compliant": true,
                        "non_compliance_areas": [],
                        "compliance_areas": [
                          {
                            "rule": "Avoid passive voice. Ensure verbs are in active tense.",
                            "compliant_text": "The sentence uses active voice as in 'jumps', complying with the rule."
                          }
                        ]
                      }
                    }
                    \`\`\`

                    # Notes

                    - Always use exact citations and wording from the style guide for each rule.
                    - Handle cases of partial compliance and ambiguity within the guidelines, noting specific examples.
                  `,
                },
                {
                  role: 'user',
                  content: `does this align with the style guide?`,
                },
                ...messagesToSend,
              ] as OpenAI.Chat.Completions.ChatCompletionMessageParam[],
              temperature: temperatureToUse,
              stream: false,
              user: JSON.stringify(user),
              //@ts-ignore
              data_sources: [this.getMSFStandards()],
            }),

            // Fact check
            client.chat.completions.create({
              model: modelToUse,
              messages: [
                {
                  role: 'system',
                  content: `You are fact-checking this content against MSF's official communications and data. Check for:
                   - Accuracy of statistics and numbers
                   - Correctness of dates and timelines
                   - Accuracy of program descriptions and locations
                   - Proper representation of MSF policies and positions
                   - Verification of claims and statements
                   Compare against official MSF documents and flag any discrepancies.`,
                },
                ...messagesToSend,
              ] as OpenAI.Chat.Completions.ChatCompletionMessageParam[],
              temperature: temperatureToUse,
              stream: false,
              user: JSON.stringify(user),
              //@ts-ignore
              data_sources: [this.getSearchDataSource()],
            }),
          ]);

          // Type assertion and get citations
          const styleResp = styleCheckResponse as any;
          const factResp = factCheckResponse as any;

          const styleCitations =
            styleResp?.choices?.[0]?.message?.context?.citations || [];
          const factCitations =
            factResp?.choices?.[0]?.message?.context?.citations || [];
          const allCitations = [...styleCitations, ...factCitations];

          // Create unified prompt for final analysis
          const unifiedPrompt = `

  STYLE ANALYSIS RESULTS:
  ${styleResp.choices?.[0]?.message?.content || ''}

  FACT CHECK RESULTS:
  ${factResp.choices?.[0]?.message?.content || ''}`;

          // Get unified response with citations
          if (streamResponse) {
            const response = await client.chat.completions.create({
              model: modelToUse,
              messages: [
                {
                  role: 'system',
                  content: `You are a content validation expert. Analyze the provided style and fact-check results and create a clear, structured report in table format.

                Create your response in the following format:

                CONTENT VALIDATION REPORT
                ========================

                SUMMARY
                -------
                | Category              | Status | Score | Issues Found |
                |----------------------|--------|-------|--------------|
                | Overall Compliance   | ✓/⚠/✗  | 0-100 | #           |
                | Style Guide          | ✓/⚠/✗  | 0-100 | #           |
                | Factual Accuracy     | ✓/⚠/✗  | 0-100 | #           |

                STYLE ANALYSIS
                -------------
                Compliant Areas:
                | Category | Rule | Example | Source |
                |----------|------|---------|--------|
                | ...      | ...  | ...     | ...    |

                Style Issues Found:
                | Severity | Category | Rule Violated | Issue Found | Location | Recommendation |
                |----------|----------|---------------|-------------|----------|----------------|
                | CRITICAL | ...      | ...           | ...         | ...      | ...            |
                | MAJOR    | ...      | ...           | ...         | ...      | ...            |
                | MINOR    | ...      | ...           | ...         | ...      | ...            |

                FACTUAL ANALYSIS
                ---------------
                Verified Facts:
                | Category | Fact | Source | Citation |
                |----------|------|--------|-----------|
                | ...      | ...  | ...    | ...       |

                Inaccuracies Found:
                | Severity | Category | Claim | Correction | Source |
                |----------|----------|-------|------------|--------|
                | CRITICAL | ...      | ...   | ...        | ...    |
                | MAJOR    | ...      | ...   | ...        | ...    |
                | MINOR    | ...      | ...   | ...        | ...    |

                PRIORITY RECOMMENDATIONS
                ----------------------
                Critical Actions:
                | Issue | Action Required | Reference |
                |-------|-----------------|-----------|
                | ...   | ...            | ...       |

                Major Improvements:
                | Issue | Suggested Action | Reference |
                |-------|-----------------|-----------|
                | ...   | ...            | ...       |

                Use these symbols for status:
                ✓ = Compliant/Verified
                ⚠ = Needs Review
                ✗ = Non-Compliant/Incorrect

                Always maintain proper table formatting with aligned columns. Each section should be clearly separated with headers.`,
                },
                {
                  role: 'user',
                  content: unifiedPrompt,
                },
              ],
              temperature: temperatureToUse,
              stream: true,
              user: JSON.stringify(user),
            });

            // Create streaming response with citations
            streamData = {
              async *[Symbol.asyncIterator]() {
                for await (const chunk of response as AsyncIterable<any>) {
                  yield chunk;
                }

                if (allCitations.length > 0) {
                  yield {
                    choices: [
                      {
                        delta: {
                          context: { citations: allCitations },
                        },
                      },
                    ],
                  };
                }
              },
            };
          } else {
            // For non-streaming, get the complete response first
            const response = await client.chat.completions.create({
              model: modelToUse,
              messages: [
                {
                  role: 'system',
                  content:
                    'You are a content validation expert. Create a clear report combining style and fact-check analyses. Be specific about issues found and cite relevant documents.',
                },
                {
                  role: 'user',
                  content: unifiedPrompt,
                },
              ],
              temperature: temperatureToUse,
              stream: false,
              user: JSON.stringify(user),
            });

            const content =
              (response as any).choices?.[0]?.message?.content || '';

            // Create non-streaming response with citations
            streamData = {
              async *[Symbol.asyncIterator]() {
                yield {
                  choices: [
                    {
                      delta: {
                        content: content,
                      },
                    },
                  ],
                };

                if (allCitations.length > 0) {
                  yield {
                    choices: [
                      {
                        delta: {
                          context: { citations: allCitations },
                        },
                      },
                    ],
                  };
                }
              },
            };
          }
        } else {
          // Handle default case for no botId or unknown botId
          const response = await client.chat.completions.create(commonParams);
          streamData = streamResponse
            ? (response as AsyncIterable<any>)
            : {
                async *[Symbol.asyncIterator]() {
                  yield {
                    choices: [
                      {
                        delta: {
                          content: (response as any).choices[0]?.message
                            ?.content,
                        },
                      },
                    ],
                  };
                },
              };
        }

        if (streamResponse) {
          const { stream, contentAccumulator, citationsAccumulator } =
            createAzureOpenAIStreamProcessor(streamData);

          const streamingResponse = new StreamingTextResponse(stream);

          // Log the completion
          const endTime = Date.now();
          const duration = endTime - startTime;
          await this.loggingService.log({
            EventType: 'ChatCompletion',
            Status: 'success',
            ModelUsed: modelToUse,
            MessageCount: messagesToSend.length,
            Temperature: temperatureToUse,
            UserId: user.id,
            UserJobTitle: user.jobTitle,
            UserDisplayName: user.displayName,
            UserEmail: user.mail,
            UserCompanyName: user.companyName,
            FileUpload: false,
            BotId: botId,
            Env: process.env.NEXT_PUBLIC_ENV,
            CitationsCount: citationsAccumulator.length,
            Duration: duration,
          });

          return streamingResponse;
        }

        // Handle non-streaming response
        const completionText =
          (streamData as any).choices?.[0]?.message?.content || '';
        const encoder = new TextEncoder();
        const stream = new ReadableStream({
          start(controller) {
            controller.enqueue(encoder.encode(completionText));
            controller.close();
          },
        });

        // Log the completion
        const endTime = Date.now();
        const duration = endTime - startTime;
        await this.loggingService.log({
          EventType: 'ChatCompletion',
          Status: 'success',
          ModelUsed: modelToUse,
          MessageCount: messagesToSend.length,
          Temperature: temperatureToUse,
          UserId: user.id,
          UserJobTitle: user.jobTitle,
          UserDisplayName: user.displayName,
          UserEmail: user.mail,
          UserCompanyName: user.companyName,
          FileUpload: false,
          BotId: botId,
          Env: process.env.NEXT_PUBLIC_ENV,
          Duration: duration,
        });

        return new Response(stream, {
          headers: {
            'Content-Type': 'text/event-stream',
            'Cache-Control': 'no-cache',
            Connection: 'keep-alive',
          },
        });
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

        const endTime = Date.now();
        const duration = endTime - startTime;
        await this.loggingService.log({
          EventType: 'ChatCompletion',
          Status: 'error',
          ModelUsed: modelToUse,
          MessageCount: messagesToSend.length,
          Temperature: temperatureToUse,
          UserId: user.id,
          BotId: botId,
          Duration: duration,
          ErrorMessage: errorMessage,
          StatusCode: statusCode,
        });

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
    const {
      model,
      messages,
      prompt,
      temperature,
      botId,
      stream = true, // Extract stream parameter (default to true)
    } = (await req.json()) as ChatBody;

    const encoding = await this.initTiktoken();
    const promptToSend = prompt || DEFAULT_SYSTEM_PROMPT;
    const temperatureToUse = temperature ?? DEFAULT_TEMPERATURE;

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
      return this.handleFileConversation(
        messagesToSend,
        token,
        model.id,
        user,
        botId,
        stream, // Pass stream parameter
      );
    } else {
      return this.handleChatCompletion(
        modelToUse,
        messagesToSend,
        temperatureToUse,
        user,
        botId,
        stream, // Pass stream parameter
      );
    }
  }
}
