export interface StreamProcessingResult {
  stream: ReadableStream;
  contentAccumulator: string;
  citationsAccumulator: any[];
}

export function createAzureOpenAIStreamProcessor(
  response: AsyncIterable<any>,
  isRagStream: boolean = true,
): StreamProcessingResult {
  let contentAccumulator = '';
  let citationsAccumulator: any[] = [];
  let partialJson = '';

  const stream = new ReadableStream({
    start: (controller) => {
      const encoder = new TextEncoder();

      (async () => {
        try {
          for await (const chunk of response) {
            if (!chunk?.choices?.[0]?.delta?.content) {
              continue;
            }

            const contentChunk = chunk.choices[0].delta.content;

            if (isRagStream) {
              partialJson += contentChunk;

              try {
                const jsonObject = JSON.parse(partialJson);

                // Stream the answer text immediately
                if (jsonObject.answer) {
                  const textToStream = jsonObject.answer;
                  controller.enqueue(encoder.encode(textToStream));
                  contentAccumulator += textToStream;
                }

                // Collect sources for the final metadata
                if (jsonObject.sources_used) {
                  citationsAccumulator = jsonObject.sources_used;
                }

                partialJson = '';
              } catch (jsonError) {
                if (!(jsonError instanceof SyntaxError)) {
                  console.error('JSON parsing error:', jsonError);
                }
              }
            } else {
              contentAccumulator += contentChunk;
              controller.enqueue(encoder.encode(contentChunk));
            }
          }

          // Send citations in the original format
          if (isRagStream && citationsAccumulator.length > 0) {
            const metadataString = JSON.stringify({
              metadata: {
                citations: citationsAccumulator,
              },
            });
            controller.enqueue(encoder.encode(metadataString));
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
