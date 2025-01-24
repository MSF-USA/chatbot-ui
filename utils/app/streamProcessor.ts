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
            if (
              !chunk ||
              !chunk.choices ||
              !chunk.choices[0] ||
              !chunk.choices[0].delta ||
              !chunk.choices[0].delta.content
            ) {
              console.log('Skipping invalid chunk:', chunk);
              continue;
            }

            const contentChunk = chunk.choices[0].delta.content;

            if (isRagStream) {
              partialJson += contentChunk;

              try {
                const jsonObject = JSON.parse(partialJson);

                if (jsonObject.answer) {
                  contentAccumulator += jsonObject.answer;
                  controller.enqueue(encoder.encode(jsonObject.answer));
                }

                if (jsonObject.metadata && jsonObject.metadata.citations) {
                  citationsAccumulator.push(...jsonObject.metadata.citations);
                  console.log('citations', citationsAccumulator); //Check if citations are being added
                }

                partialJson = ''; // Clear after successful parse
              } catch (jsonError) {
                if (!(jsonError instanceof SyntaxError)) {
                  console.error('JSON parsing error:', jsonError);
                }
                // Incomplete JSON, wait for more data
              }
            } else {
              contentAccumulator += contentChunk;
              controller.enqueue(encoder.encode(contentChunk));
            }
          }

          if (isRagStream && citationsAccumulator.length > 0) {
            const metadataString = JSON.stringify({
              metadata: { citations: citationsAccumulator },
            });
            controller.enqueue(encoder.encode(metadataString));
          } else {
            console.log('No citations found'); //Check if this is being logged
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
