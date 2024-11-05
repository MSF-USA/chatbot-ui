import { TextEncoder } from 'util';

export interface StreamProcessingResult {
  stream: ReadableStream;
  contentAccumulator: string;
  citationsAccumulator: any[];
}

export function createAzureOpenAIStreamProcessor(
  response:
    | AsyncIterable<any>
    | { [Symbol.asyncIterator](): AsyncIterator<any> },
): StreamProcessingResult {
  let contentAccumulator = '';
  let citationsAccumulator: any[] = [];
  let isFirstChunk = true;

  const stream = new ReadableStream({
    start: (controller) => {
      const encoder = new TextEncoder();

      (async () => {
        try {
          for await (const chunk of response) {
            if (chunk.choices && chunk.choices[0]) {
              const choice = chunk.choices[0];

              if ('delta' in choice) {
                const { content, context } = choice.delta as any;

                // Handle content
                if (content) {
                  if (!isFirstChunk) {
                    contentAccumulator += content;
                    controller.enqueue(encoder.encode(content));
                  } else {
                    // For first chunk, ensure we're not duplicating content
                    isFirstChunk = false;
                    contentAccumulator = content;
                    controller.enqueue(encoder.encode(content));
                  }
                }

                // Handle citations
                if (context && context.citations) {
                  const newCitations = Array.isArray(context.citations)
                    ? context.citations
                    : [context.citations];

                  citationsAccumulator =
                    citationsAccumulator.concat(newCitations);
                }
              } else if (
                choice.message &&
                typeof choice.message.content === 'string'
              ) {
                // Handle non-streaming response
                const messageContent = choice.message.content;
                if (!isFirstChunk) {
                  contentAccumulator += messageContent;
                  controller.enqueue(encoder.encode(messageContent));
                } else {
                  isFirstChunk = false;
                  contentAccumulator = messageContent;
                  controller.enqueue(encoder.encode(messageContent));
                }
              }
            }
          }

          // Add a small delay before appending citations
          await new Promise((resolve) => setTimeout(resolve, 100));

          // Append citations as JSON at the end if we have any
          if (citationsAccumulator.length > 0) {
            const citationsJson = JSON.stringify(
              {
                citations: citationsAccumulator.filter(
                  (citation, index, self) =>
                    index ===
                    self.findIndex(
                      (c) =>
                        c.id === citation.id && c.content === citation.content,
                    ),
                ),
              },
              null,
              2,
            );
            controller.enqueue(encoder.encode('\n\n' + citationsJson));
          }

          controller.close();
        } catch (error) {
          console.error('Stream processing error:', error);
          controller.error(error);
        }
      })();
    },
  });

  return { stream, contentAccumulator, citationsAccumulator };
}
