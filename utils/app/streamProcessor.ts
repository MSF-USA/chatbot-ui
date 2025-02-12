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

      if (isRagStream && ragService) {
        console.log('Starting stream processing with RAG');
        ragService.resetCitationTracking();
      }

      (async function () {
        try {
          let chunkCount = 0;
          for await (const chunk of response) {
            if (chunk?.choices?.[0]?.delta?.content) {
              const contentChunk = chunk.choices[0].delta.content;
              chunkCount++;

              // Process the chunk if it's a RAG stream
              let processedChunk = contentChunk;
              if (isRagStream && ragService) {
                processedChunk =
                  ragService.processCitationInChunk(contentChunk);
              }

              contentAccumulator += processedChunk;
              controller.enqueue(encoder.encode(processedChunk));
            }
          }

          console.log(
            'Stream completed, final content:',
            JSON.stringify(contentAccumulator),
          );
          console.log(
            'Citation map:',
            Array.from(ragService?.['sourceToSequentialMap'].entries() || []),
          );

          if (isRagStream && ragService) {
            const finalProcessedChunk = ragService.processCitationInChunk('');
            if (finalProcessedChunk) {
              console.log(
                'Final chunk processing:',
                JSON.stringify(finalProcessedChunk),
              );
              contentAccumulator += finalProcessedChunk;
              controller.enqueue(encoder.encode(finalProcessedChunk));
            }

            const finalCitations = ragService.getCurrentCitations();
            console.log('Final citations:', finalCitations);

            if (finalCitations.length > 0) {
              const citationsJson = JSON.stringify({
                citations: finalCitations,
              });
              controller.enqueue(encoder.encode('\n\n' + citationsJson));
              citationsAccumulator = finalCitations;
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
