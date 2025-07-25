import { RAGService } from '@/services/ragService';

import OpenAI from 'openai';
import { TextEncoder } from 'util';

/**
 * Creates a stream processor for Azure OpenAI completions that handles citation tracking.
 *
 * @param {AsyncIterable<OpenAI.Chat.Completions.ChatCompletionChunk>} response - The streaming response from OpenAI.
 * @param {RAGService} [ragService] - Optional RAG service for citation processing.
 * @returns {ReadableStream} A processed stream with citation data appended.
 */
export function createAzureOpenAIStreamProcessor(
  response: AsyncIterable<OpenAI.Chat.Completions.ChatCompletionChunk>,
  ragService?: RAGService,
  stopConversationRef?: { current: boolean },
): ReadableStream {
  return new ReadableStream({
    start: (controller) => {
      const encoder = new TextEncoder();
      let allContent = '';
      let controllerClosed = false;

      (async function () {
        try {
          for await (const chunk of response) {
            // Check if stopConversationRef is true before processing each chunk
            if (stopConversationRef?.current || controllerClosed) {
              console.log('Stream processing stopped by user');
              if (!controllerClosed) {
                controllerClosed = true;
                controller.close();
              }
              return;
            }

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

          if (ragService && !controllerClosed) {
            // Get citations using the preserved source mapping
            const citations = ragService.getCurrentCitations();

            // Deduplicate citations for the final output
            const uniqueCitations = ragService.deduplicateCitations(citations);

            if (uniqueCitations.length > 0) {
              const citationsJson = JSON.stringify({
                citations: uniqueCitations,
              });
              controller.enqueue(
                encoder.encode('\n\n---CITATIONS_DATA---\n' + citationsJson),
              );
            }
          }

          if (!controllerClosed) {
            controllerClosed = true;
            controller.close();
          }
        } catch (error: any) {
          console.error('Stream processing error:', error);

          if (
            error.name === 'AbortError' ||
            error.message === 'Abort error: Fetch is already aborted' ||
            error.message?.includes('abort') ||
            error.message?.includes('Abort')
          ) {
            console.log('Stream aborted by user, closing cleanly');
            if (!controllerClosed) {
              controllerClosed = true;
              controller.close();
            }
          } else {
            if (!controllerClosed) {
              controllerClosed = true;
              controller.error(error);
            }
          }
        }
      })();
    },
  });
}
