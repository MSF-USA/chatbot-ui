import { RAGService } from '@/lib/services/ragService';

import {
  appendMetadataToStream,
  createStreamEncoder,
} from '@/lib/utils/app/metadata';
import { parseThinkingContent } from '@/lib/utils/app/stream/thinking';

import { UI_CONSTANTS } from '@/lib/constants/ui';
import OpenAI from 'openai';

/**
 * Creates a smooth buffering stream that releases characters at a controlled rate
 * Simpler than word-based - just releases N characters every M milliseconds
 */
function createSmoothBuffer(
  controller: ReadableStreamDefaultController,
  encoder: TextEncoder,
  charsPerChunk: number = UI_CONSTANTS.STREAMING.CHARS_PER_CHUNK,
  delayMs: number = UI_CONSTANTS.STREAMING.DELAY_MS,
) {
  let buffer = '';
  let sentChars = 0;
  let isReleasing = false;

  const releaseChars = async () => {
    if (isReleasing) return;
    isReleasing = true;

    while (sentChars < buffer.length) {
      const chunk = buffer.substring(sentChars, sentChars + charsPerChunk);

      if (!chunk) break;

      try {
        controller.enqueue(encoder.encode(chunk));
        sentChars += chunk.length;
      } catch (error) {
        // Controller might be closed
        isReleasing = false;
        return;
      }

      // Only delay if there's more to send
      if (sentChars < buffer.length) {
        await new Promise((resolve) => setTimeout(resolve, delayMs));
      }
    }

    isReleasing = false;
  };

  return {
    add: (content: string) => {
      buffer += content;
      releaseChars();
    },
    flush: async () => {
      // Wait for any pending releases to complete
      while (isReleasing) {
        await new Promise((resolve) => setTimeout(resolve, 10));
      }
    },
  };
}

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
      const encoder = createStreamEncoder();
      const smoothBuffer = createSmoothBuffer(controller, encoder, 5, 20);
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
                try {
                  controller.close();
                } catch (closeError: any) {
                  // Ignore errors if controller is already closed
                  if (closeError.code !== 'ERR_INVALID_STATE') {
                    console.error('Error closing controller:', closeError);
                  }
                }
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

              // Add to smooth buffer instead of direct enqueue
              smoothBuffer.add(processedChunk);
            }
          }

          // Wait for buffer to flush all remaining content
          await smoothBuffer.flush();

          if (!controllerClosed) {
            // Parse thinking content from the accumulated content
            const { thinking, content } = parseThinkingContent(allContent);

            // Get citations if available
            let citations;
            if (ragService) {
              const rawCitations = ragService.getCurrentCitations();
              const uniqueCitations =
                ragService.deduplicateCitations(rawCitations);
              citations =
                uniqueCitations.length > 0 ? uniqueCitations : undefined;
            }

            // Append metadata directly to controller (bypass smooth buffer)
            // Metadata should be sent immediately, not buffered
            appendMetadataToStream(controller, {
              citations,
              thinking,
            });
          }

          if (!controllerClosed) {
            controllerClosed = true;
            try {
              controller.close();
            } catch (closeError: any) {
              // Ignore errors if controller is already closed
              if (closeError.code !== 'ERR_INVALID_STATE') {
                console.error('Error closing controller:', closeError);
              }
            }
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
              try {
                controller.close();
              } catch (closeError: any) {
                // Ignore errors if controller is already closed
                if (closeError.code !== 'ERR_INVALID_STATE') {
                  console.error('Error closing controller:', closeError);
                }
              }
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
