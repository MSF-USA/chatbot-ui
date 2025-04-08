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
): ReadableStream {
  // Initialize citation tracking once at the start
  // Important: preserve the source mapping that was set up during getCompletionMessages
  // if (ragService) {
  //   // Reset tracking state but preserve the source mapping
  //   ragService.resetCitationTracking(true);
  // }

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

          controller.close();
        } catch (error) {
          console.error('Stream processing error:', error);
          controller.error(error);
        }
      })();
    },
  });
}
