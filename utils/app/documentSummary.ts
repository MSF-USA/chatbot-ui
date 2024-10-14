import { JWT } from 'next-auth';
import { Session } from 'next-auth';

import { AzureMonitorLoggingService } from '@/services/loggingService';

import {
  StreamProcessingResult,
  createAzureOpenAIStreamProcessor,
} from '@/utils/app/streamProcessor';
import { loadDocument } from '@/utils/server/file-handling';

import {
  DefaultAzureCredential,
  getBearerTokenProvider,
} from '@azure/identity';
import OpenAI from 'openai';
import { AzureOpenAI } from 'openai';

interface parseAndQueryFilterOpenAIArguments {
  file: File;
  prompt: string;
  token: JWT;
  modelId: string;
  maxLength?: number;
  stream?: boolean;
  user: Session['user'];
  botId?: string;
  loggingService: AzureMonitorLoggingService;
}

async function summarizeChunk(
  azureOpenai: OpenAI,
  modelId: string,
  prompt: string,
  chunk: string,
  user: Session['user'],
): Promise<string> {
  const summaryPrompt: string = `Summarize the following text with relevance to the prompt, but keep enough details to maintain the tone, character, and content of the original. If nothing is relevant, then return an empty string:\n\n\`\`\`prompt\n${prompt}\`\`\`\n\n\`\`\`text\n${chunk}\n\`\`\``;
  const chunkSummary = await azureOpenai.chat.completions.create({
    model: modelId,
    messages: [
      {
        role: 'system',
        content:
          "You are an AI Text summarizer. You take the prompt of a user and rather than conclusively answering, you pull together all the relevant information for that prompt in a particular chunk of text and reshape that into brief statements capturing the nuanced intent of the original text. Focus on how the provided text answers the user's question. If it doesn't then briefly make that clear.",
      },
      {
        role: 'user',
        content: summaryPrompt,
      },
    ] as OpenAI.Chat.Completions.ChatCompletionMessageParam[],
    temperature: 0.1,
    max_tokens: 1000,
    stream: false,
    user: JSON.stringify(user),
  });
  return chunkSummary?.choices?.[0]?.message?.content?.trim() ?? '';
}

export async function parseAndQueryFileOpenAI({
  file,
  prompt,
  modelId,
  maxLength = 6000,
  user,
  botId,
  loggingService,
}: {
  file: File;
  prompt: string;
  modelId: string;
  maxLength?: number;
  user: any;
  botId: string | undefined;
  loggingService: AzureMonitorLoggingService;
}): Promise<StreamProcessingResult> {
  const startTime = Date.now();
  const fileContent = await loadDocument(file);
  let chunks: string[] = splitIntoChunks(fileContent);

  const scope = 'https://cognitiveservices.azure.com/.default';
  const azureADTokenProvider = getBearerTokenProvider(
    new DefaultAzureCredential(),
    scope,
  );

  const apiVersion = '2024-07-01-preview';
  const client = new AzureOpenAI({
    azureADTokenProvider,
    deployment: modelId,
    apiVersion,
  });

  let combinedSummary: string = '';

  while (chunks.length > 0) {
    const chunkPromises = chunks.map((chunk) =>
      summarizeChunk(client, modelId, prompt, chunk, user).catch((error) => {
        console.error(error);
        return null;
      }),
    );

    const summaries = await Promise.all(chunkPromises);
    const validSummaries = summaries.filter((summary) => summary !== null);

    let batchSummary = '';
    for (const summary of validSummaries) {
      if ((batchSummary + summary).length > maxLength) {
        break;
      }
      batchSummary += summary + ' ';
    }

    combinedSummary += batchSummary;
    chunks = chunks.slice(validSummaries.length);
  }

  const finalPrompt: string = `${combinedSummary}\n\nUser prompt: ${prompt}`;

  const commonParams = {
    model: modelId,
    messages: [
      {
        role: 'system',
        content:
          "You are a document analyzer AI Assistant. You perform all tasks the user requests of you, careful to make sure you are responding to the spirit and intentions behind their request. You make it clear how your responses relate to the base text that you are processing and provide your responses in markdown format when special formatting is necessary. Understand that you are analyzing text that you have previously summarized, so make sure your response is an amalgamation of your impressions over each chunk. Follow all user instructions on formatting but if none are provided make your response well structured, taking advantage of markdown formatting. Finally, make sure your final analysis is coherent and not just a listing out of details unless that's what the user specifically asks for.",
      },
      {
        role: 'user',
        content: finalPrompt,
      },
    ] as OpenAI.Chat.Completions.ChatCompletionMessageParam[],
    temperature: 0.1,
    max_tokens: null,
    stream: true,
    user: JSON.stringify(user),
  };

  let response;
  if (botId) {
    response = await client.chat.completions.create({
      ...commonParams,
      //@ts-ignore
      data_sources: [
        {
          type: 'azure_search',
          parameters: {
            endpoint: process.env.SEARCH_ENDPOINT,
            index_name: process.env.SEARCH_INDEX,
            authentication: {
              type: 'api_key',
              key: process.env.SEARCH_ENDPOINT_API_KEY,
            },
          },
        },
      ],
    });
  } else {
    response = await client.chat.completions.create(commonParams);
  }

  const { stream, contentAccumulator, citationsAccumulator } =
    //@ts-ignore
    createAzureOpenAIStreamProcessor(response);

  const endTime = Date.now();
  const duration = endTime - startTime;

  await loggingService.log({
    EventType: 'DocumentSummaryComplete',
    Status: 'success',
    ModelUsed: modelId,
    UserId: user.id,
    UserJobTitle: user.jobTitle,
    UserDisplayName: user.displayName,
    UserEmail: user.mail,
    UserCompanyName: user.companyName,
    FileUpload: true,
    FileName: file.name,
    FileSize: file.size,
    Duration: duration,
    ChunkCount: chunks.length,
  });

  return { stream, contentAccumulator, citationsAccumulator };
}

function splitIntoChunks(text: string, chunkSize: number = 6000): string[] {
  const chunks: string[] = [];
  for (let i = 0; i < text.length; i += chunkSize) {
    chunks.push(text.slice(i, i + chunkSize));
  }
  return chunks;
}
