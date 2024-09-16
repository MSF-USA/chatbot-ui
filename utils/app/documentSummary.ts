import { JWT } from 'next-auth';
import { Session } from 'next-auth';

import {
  APIM_CHAT_ENDPONT,
  DEFAULT_SYSTEM_PROMPT,
  OPENAI_API_HOST,
  OPENAI_API_VERSION,
} from '@/utils/app/const';
import { loadDocument } from '@/utils/server/file-handling';

import { DocxLoader } from '@langchain/community/document_loaders/fs/docx';
import { OpenAIStream } from 'ai';
import mammoth from 'mammoth';
import { lookup } from 'mime-types';
import OpenAI from 'openai';
import pdfParse from 'pdf-parse';

interface parseAndQueryFilterOpenAIArguments {
  file: File;
  prompt: string;
  token: JWT;
  modelId: string;
  maxLength?: number;
  user: Session['user'];
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
    ],
    temperature: 0.1,
    max_tokens: 1000,
    stream: false,
    user: JSON.stringify(user),
    no_log: true,
  } as OpenAI.Chat.Completions.ChatCompletionCreateParams & {
    no_log: boolean;
  });

  const typedChunkSummary =
    chunkSummary as OpenAI.Chat.Completions.ChatCompletion;

  return typedChunkSummary?.choices?.[0]?.message?.content?.trim() ?? '';
}

export async function parseAndQueryFileOpenAI({
  file,
  prompt,
  token,
  modelId,
  maxLength = 6000,
  user,
}: parseAndQueryFilterOpenAIArguments): Promise<ReadableStream<any>> {
  const fileContent = await loadDocument(file);
  let chunks: string[] = splitIntoChunks(fileContent);

  const openAIArgs: any = {
    baseURL: `${OPENAI_API_HOST}/${APIM_CHAT_ENDPONT}/deployments/${modelId}`,
    defaultQuery: { 'api-version': OPENAI_API_VERSION },
    defaultHeaders: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token.accessToken}`,
    },
  };

  if (process.env.OPENAI_API_KEY)
    openAIArgs.apiKey = process.env.OPENAI_API_KEY;
  else openAIArgs.apiKey = '';

  const azureOpenai = new OpenAI(openAIArgs);

  let combinedSummary: string = '';

  while (chunks.length > 0) {
    const chunkPromises = chunks.map((chunk) =>
      summarizeChunk(azureOpenai, modelId, prompt, chunk, user).catch(
        (error) => {
          console.error(error);
          return null;
        },
      ),
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

  const response = await azureOpenai.chat.completions.create({
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
    ],
    temperature: 0.1,
    max_tokens: null,
    stream: true,
    user: JSON.stringify(user),
    file_upload: true,
  } as OpenAI.Chat.Completions.ChatCompletionCreateParams & {
    file_upload: boolean;
  });

  const stream: ReadableStream<any> = OpenAIStream(response as any);
  return stream;
}

function splitIntoChunks(text: string, chunkSize: number = 6000): string[] {
  const chunks: string[] = [];
  for (let i = 0; i < text.length; i += chunkSize) {
    chunks.push(text.slice(i, i + chunkSize));
  }
  return chunks;
}
