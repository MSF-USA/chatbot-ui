import { RAGService } from '@/lib/services/ragService';

import {
  appendMetadataToStream,
  createStreamEncoder,
} from '@/lib/utils/app/metadata';
import { parseThinkingContent } from '@/lib/utils/app/stream/thinking';

import { UI_CONSTANTS } from '@/lib/constants/ui';
import OpenAI from 'openai';

/**
 * Creates a stream processor for Azure OpenAI completions that handles citation tracking.
 *
 * @param {AsyncIterable<OpenAI.Chat.Completions.ChatCompletionChunk>} response - The streaming response from OpenAI.
 * @param {RAGService} [ragService] - Optional RAG service for citation processing.
 * @param {object} [stopConversationRef] - Reference to stop conversation flag.
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
      let allContent = '';
      let controllerClosed = false;
      let buffer = '';

      // Background task to stream buffered content character by character
      const streamBuffer = async () => {
        while (!controllerClosed) {
          if (buffer.length > 0) {
            // Send 3 characters at a time for smoother streaming
            const charsToSend = Math.min(3, buffer.length);
            const toSend = buffer.slice(0, charsToSend);
            buffer = buffer.slice(charsToSend);
            controller.enqueue(encoder.encode(toSend));
          }
          // Wait 8ms between sends for smoother streaming
          await new Promise((resolve) => setTimeout(resolve, 8));
        }
      };

      // Start the buffer streaming task
      streamBuffer();

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

              // Add to buffer for smooth streaming
              buffer += processedChunk;
            }
          }

          // Wait for buffer to drain
          while (buffer.length > 0 && !controllerClosed) {
            await new Promise((resolve) => setTimeout(resolve, 10));
          }

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
