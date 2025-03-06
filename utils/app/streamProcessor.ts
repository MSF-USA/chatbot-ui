import { RAGService } from '@/services/ragService';

import OpenAI from 'openai';
import { TextEncoder } from 'util';

export function createAzureOpenAIStreamProcessor(
  response: AsyncIterable<OpenAI.Chat.Completions.ChatCompletionChunk>,
  ragService?: RAGService,
): ReadableStream {
  return new ReadableStream({
    start: (controller) => {
      const encoder = new TextEncoder();
      let allContent = '';

      (async function () {
        try {
          for await (const chunk of response) {
            if (chunk?.choices?.[0]?.delta?.content) {
              const contentChunk = chunk.choices[0].delta.content;
              allContent += contentChunk;

              // Process the chunk if it's a RAG stream
              let processedChunk = contentChunk;
              if (ragService) {
                processedChunk =
                  ragService.processCitationInChunk(contentChunk);
              }

              controller.enqueue(encoder.encode(processedChunk));
            }
          }

          if (ragService) {
            const citations = ragService.getCurrentCitations();
            if (citations.length > 0) {
              const citationsJson = JSON.stringify({ citations });
              controller.enqueue(
                encoder.encode('\n\n---CITATIONS_DATA---\n' + citationsJson),
              );
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
}
