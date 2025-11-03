import { Session } from 'next-auth';

import { AzureMonitorLoggingService } from '@/lib/services/loggingService';

import { OPENAI_API_VERSION } from '@/lib/utils/app/const';
import { createAzureOpenAIStreamProcessor } from '@/lib/utils/app/stream/streamProcessor';
import { loadDocument } from '@/lib/utils/server/file-handling';
import { sanitizeForLog } from '@/lib/utils/server/logSanitization';

import {
  DefaultAzureCredential,
  getBearerTokenProvider,
} from '@azure/identity';
import OpenAI from 'openai';
import { AzureOpenAI } from 'openai';
import { ChatCompletion } from 'openai/resources';

interface ParseAndQueryFilterOpenAIArguments {
  file: File;
  prompt: string;
  modelId: string;
  maxLength?: number;
  user: Session['user'];
  botId?: string;
  loggingService: AzureMonitorLoggingService;
  stream?: boolean;
}

async function summarizeChunk(
  azureOpenai: OpenAI,
  modelId: string,
  prompt: string,
  chunk: string,
  user: Session['user'],
  loggingService: AzureMonitorLoggingService,
  startTimeChunk: number,
  filename?: string,
  fileSize?: number,
): Promise<string | null> {
  const summaryPrompt: string = `Summarize the following text with relevance to the prompt, but keep enough details to maintain the tone, character, and content of the original. If nothing is relevant, then return an empty string:\n\n\`\`\`prompt\n${prompt}\`\`\`\n\n\`\`\`text\n${chunk}\n\`\`\``;

  try {
    const chunkSummary = await azureOpenai.chat.completions.create({
      model: modelId,
      messages: [
        {
          role: 'system',
          content:
            'You are an AI Text summarizer. You take the prompt of a user and rather than conclusively answering, you pull together all the relevant information for that prompt in a particular chunk of text and reshape that into brief statements capturing the nuanced intent of the original text.',
        },
        {
          role: 'user',
          content: summaryPrompt,
        },
      ],
      temperature: 0.1,
      max_tokens: 1000,
      stream: false,
      user: JSON.stringify(user),
    });

    return chunkSummary?.choices?.[0]?.message?.content?.trim() ?? '';
  } catch (error: any) {
    await loggingService.logFileError(
      startTimeChunk,
      error,
      modelId,
      user,
      filename,
      fileSize,
      undefined,
      'chunkSummarization',
    );
    console.error('Error summarizing chunk:', error);
    return null;
  }
}

export async function parseAndQueryFileOpenAI({
  file,
  prompt,
  modelId,
  maxLength = 6000,
  user,
  botId,
  loggingService,
  stream = true,
}: ParseAndQueryFilterOpenAIArguments): Promise<ReadableStream | string> {
  const startTime = Date.now();
  console.log(
    '[parseAndQueryFileOpenAI] Starting with file:',
    sanitizeForLog(file.name),
    'size:',
    sanitizeForLog(file.size),
    'stream:',
    sanitizeForLog(stream),
  );
  console.log(
    '[parseAndQueryFileOpenAI] Prompt length:',
    sanitizeForLog(prompt.length),
  );

  const fileContent = await loadDocument(file);
  console.log(
    '[parseAndQueryFileOpenAI] File content loaded, length:',
    fileContent.length,
  );

  let chunks: string[] = splitIntoChunks(fileContent);
  console.log('[parseAndQueryFileOpenAI] Split into chunks:', chunks.length);

  const scope = 'https://cognitiveservices.azure.com/.default';
  const azureADTokenProvider = getBearerTokenProvider(
    new DefaultAzureCredential(),
    scope,
  );

  const client = new AzureOpenAI({
    azureADTokenProvider,
    deployment: modelId,
    apiVersion: OPENAI_API_VERSION,
  });

  let combinedSummary: string = '';
  let processedChunkCount = 0;
  let totalChunkCount = chunks.length;

  while (chunks.length > 0) {
    const currentChunks = chunks.splice(0, 5);
    console.log(
      `[parseAndQueryFileOpenAI] Processing batch of ${currentChunks.length} chunks, ${chunks.length} remaining`,
    );

    const summaryPromises = currentChunks.map((chunk) =>
      summarizeChunk(
        client,
        modelId,
        prompt,
        chunk,
        user,
        loggingService,
        Date.now(),
        file.name,
        file.size,
      ),
    );

    const summaries = await Promise.all(summaryPromises);
    console.log(
      '[parseAndQueryFileOpenAI] Batch completed, summaries received:',
      summaries.filter((s) => s !== null).length,
    );

    const validSummaries = summaries.filter((summary) => summary !== null);
    processedChunkCount += validSummaries.length;

    let batchSummary = '';
    for (const summary of validSummaries) {
      if ((batchSummary + summary).length > maxLength) {
        break;
      }
      batchSummary += summary + ' ';
    }

    combinedSummary += batchSummary;
  }

  const finalPrompt: string = `${combinedSummary}\n\nUser prompt: ${prompt}`;

  const commonParams = {
    model: modelId,
    messages: [
      {
        role: 'system',
        content:
          'You are a document analyzer AI Assistant. You perform all tasks the user requests of you, careful to make sure you are responding to the spirit and intentions behind their request. You make it clear how your responses relate to the base text that you are processing and provide your responses in markdown format when special formatting is necessary.',
      },
      {
        role: 'user',
        content: finalPrompt,
      },
    ] as OpenAI.Chat.Completions.ChatCompletionMessageParam[],
    temperature: 0.1,
    max_tokens: null,
    stream: stream,
    user: JSON.stringify(user),
  };

  try {
    console.log(
      '[parseAndQueryFileOpenAI] Creating chat completion, botId:',
      sanitizeForLog(botId),
    );
    let response;
    if (botId) {
      console.log('[parseAndQueryFileOpenAI] Using bot with data sources');
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
      console.log('[parseAndQueryFileOpenAI] Using standard chat completion');
      response = await client.chat.completions.create(commonParams);
    }

    console.log(
      '[parseAndQueryFileOpenAI] Got response, stream:',
      sanitizeForLog(stream),
    );

    if (stream) {
      await loggingService.logFileSuccess(
        startTime,
        modelId,
        user,
        file.name,
        file.size,
        botId,
        'documentSummary',
        totalChunkCount,
        processedChunkCount,
        totalChunkCount - processedChunkCount,
        true,
      );

      return createAzureOpenAIStreamProcessor(
        response as AsyncIterable<OpenAI.Chat.Completions.ChatCompletionChunk>,
      );
    } else {
      const completionText =
        (response as ChatCompletion)?.choices?.[0]?.message?.content?.trim() ??
        '';
      if (!completionText) {
        throw new Error(
          `Empty response returned from API! ${JSON.stringify(response)}`,
        );
      }

      await loggingService.logFileSuccess(
        startTime,
        modelId,
        user,
        file.name,
        file.size,
        botId,
        'documentSummary',
        totalChunkCount,
        processedChunkCount,
        totalChunkCount - processedChunkCount,
        false,
      );

      return completionText;
    }
  } catch (error) {
    await loggingService.logFileError(
      startTime,
      error,
      modelId,
      user,
      file.name,
      file.size,
      botId,
      'documentSummary',
    );
    throw error;
  }
}

export function splitIntoChunks(
  text: string,
  chunkSize: number = 6000,
): string[] {
  const chunks: string[] = [];
  for (let i = 0; i < text.length; i += chunkSize) {
    chunks.push(text.slice(i, i + chunkSize));
  }
  return chunks;
}
