import { TextEncoder } from 'util';

export interface StreamProcessingResult {
  stream: ReadableStream;
  contentAccumulator: string;
  citationsAccumulator: any[];
}

export function createAzureOpenAIStreamProcessor(
  response: AsyncIterable<any>,
  metadata?: {
    citations: any[];
    sources_used: number;
    dateRange: { newest: string | null; oldest: string | null };
    resultCount: number;
  },
): StreamProcessingResult {
  let contentAccumulator = '';
  let citationsAccumulator: any[] = [];

  const stream = new ReadableStream({
    start: (controller) => {
      const encoder = new TextEncoder();

      (async () => {
        try {
          for await (const chunk of response) {
            if (chunk.choices?.[0]?.delta?.content) {
              const content = chunk.choices[0].delta.content;
              contentAccumulator += content;
              controller.enqueue(encoder.encode(content));
            }
          }

          if (metadata) {
            controller.enqueue(
              encoder.encode('\n\n' + JSON.stringify(metadata)),
            );
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
