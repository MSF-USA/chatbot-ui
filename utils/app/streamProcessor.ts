import { RAGService } from '@/services/ragService';

import { Citation, StreamProcessingResult } from '@/types/rag';

import OpenAI from 'openai';
import { TextEncoder } from 'util';

export function createAzureOpenAIStreamProcessor(
  response: AsyncIterable<OpenAI.Chat.Completions.ChatCompletionChunk>,
  isRagStream: boolean = true,
  ragService?: RAGService,
): StreamProcessingResult {
  let contentAccumulator = '';
  let citationsAccumulator: Citation[] = [];

  const stream = new ReadableStream({
    start: (controller) => {
      const encoder = new TextEncoder();

      (async () => {
        try {
          for await (const chunk of response) {
            if (chunk?.choices?.[0]?.delta?.content) {
              const contentChunk = chunk.choices[0].delta.content;
              contentAccumulator += contentChunk;
              controller.enqueue(encoder.encode(contentChunk));
            }
          }

          // Process and send citations once at the end
          if (isRagStream && ragService) {
            const citationsAccumulator =
              ragService.findCitationsInContent(contentAccumulator);
            if (citationsAccumulator.length > 0) {
              const citationsJson = JSON.stringify({
                citations: citationsAccumulator,
              });
              controller.enqueue(encoder.encode('\n\n' + citationsJson));
              console.log(citationsJson);
            }
          }

          controller.close();
        } catch (error) {
          console.error('Stream processing error:', error);
          controller.error(error);
        }
      })();
    },
  });

  return {
    stream,
    contentAccumulator,
    citationsAccumulator,
  };
}
