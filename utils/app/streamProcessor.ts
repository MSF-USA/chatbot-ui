import { TextEncoder } from 'util';

export interface StreamProcessingResult {
  stream: ReadableStream;
  contentAccumulator: string;
  citationsAccumulator: any[];
}

export function createAzureOpenAIStreamProcessor(
  response: AsyncIterable<any>,
): StreamProcessingResult {
  let contentAccumulator = '';
  let citationsAccumulator: any[] = [];

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
                if (content) {
                  contentAccumulator += content;
                  controller.enqueue(encoder.encode(content));
                }
                if (context && context.citations) {
                  citationsAccumulator = citationsAccumulator.concat(
                    context.citations,
                  );
                }
              }
            }
          }

          // Append citations as JSON at the end of the content
          if (citationsAccumulator.length > 0) {
            const citationsJson = JSON.stringify({
              citations: citationsAccumulator,
            });
            controller.enqueue(encoder.encode('\n\n' + citationsJson));
          }

          controller.close();
        } catch (error) {
          controller.error(error);
        }
      })();
    },
  });

  return { stream, contentAccumulator, citationsAccumulator };
}
