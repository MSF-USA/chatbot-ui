import { Session } from 'next-auth';

import {
  appendMetadataToStream,
  createStreamEncoder,
} from '@/lib/utils/app/metadata';

import {
  FileMessageContent,
  ImageMessageContent,
  Message,
  TextMessageContent,
} from '@/types/chat';

import { AzureMonitorLoggingService } from '../loggingService';

/**
 * Handles Azure AI Foundry Agent-based chat completions with Bing grounding
 *
 * Package structure:
 * - Uses @azure/ai-agents (AgentsClient) for streaming support
 *
 * API structure:
 * - client.threads.create() - creates a new thread
 * - client.messages.create(threadId, role, content) - adds a message
 * - client.runs.create(threadId, agentId) - returns run object with stream() method (DO NOT await!)
 * - run.stream() - returns async iterator of streaming events
 */
export class AIFoundryAgentHandler {
  constructor(private loggingService: AzureMonitorLoggingService) {}

  /**
   * Handles chat completion using Azure AI Foundry Agents
   */
  async handleAgentChat(
    modelId: string,
    modelConfig: Record<string, unknown>,
    messages: Message[],
    temperature: number,
    user: Session['user'],
    botId: string | undefined,
    threadId?: string,
  ): Promise<Response> {
    const startTime = Date.now();

    try {
      // Use Azure AI Agents SDK for streaming support
      const aiAgents = await import('@azure/ai-agents');
      const { DefaultAzureCredential } = await import('@azure/identity');

      // AI Foundry uses a separate project endpoint (services.ai.azure.com)
      const endpoint = process.env.AZURE_AI_FOUNDRY_ENDPOINT;
      const agentId = modelConfig.agentId;

      if (!endpoint || !agentId) {
        throw new Error('Azure AI Foundry endpoint or Agent ID not configured');
      }

      const client = new aiAgents.AgentsClient(
        endpoint,
        new DefaultAzureCredential(),
      );

      // Create a thread and run for this conversation with streaming
      const lastMessage = messages[messages.length - 1];

      let thread;
      let isNewThread = false;

      try {
        if (threadId) {
          // For existing thread, just reuse it
          // The thread already has all previous messages persisted
          thread = { id: threadId };
        } else {
          // Create a new thread for the first message
          thread = await client.threads.create();
          isNewThread = true;
        }
      } catch (threadError) {
        console.error('Error with thread:', threadError);
        throw threadError;
      }

      try {
        // The SDK expects parameters to be passed separately: (threadId, role, content)
        // For multimodal content (images, files), convert to SDK format
        let messageContent:
          | string
          | Array<
              | { type: 'text'; text: string }
              | { type: 'image_url'; imageUrl: { url: string; detail: string } }
            >;

        if (typeof lastMessage.content === 'string') {
          // Simple text message
          messageContent = lastMessage.content;
        } else if (Array.isArray(lastMessage.content)) {
          // Multimodal content - convert to Azure SDK format
          messageContent = lastMessage.content.map(
            (
              item:
                | TextMessageContent
                | ImageMessageContent
                | FileMessageContent,
            ) => {
              if (item.type === 'text') {
                return { type: 'text', text: item.text };
              } else if (item.type === 'image_url') {
                // Convert image_url to imageUrl (Azure SDK uses camelCase)
                return {
                  type: 'image_url',
                  imageUrl: {
                    url: item.image_url.url,
                    detail: item.image_url.detail || 'auto',
                  },
                };
              } else if (item.type === 'file_url') {
                // For non-image files, add as text with context
                // Note: Azure AI Agents SDK handles files via file search tool
                return {
                  type: 'text',
                  text: `[File attached: ${item.originalFilename || 'file'}]`,
                };
              }
              return item;
            },
          );
        } else if (
          typeof lastMessage.content === 'object' &&
          'text' in lastMessage.content
        ) {
          // Single TextMessageContent object
          messageContent = (lastMessage.content as TextMessageContent).text;
        } else {
          // Fallback
          messageContent = String(lastMessage.content);
        }

        await client.messages.create(thread.id, 'user', messageContent);
      } catch (messageError) {
        console.error('Error creating message:', messageError);
        console.error(
          'Full error object:',
          JSON.stringify(messageError, null, 2),
        );
        throw messageError;
      }

      // Create a run and get the stream
      let streamEventMessages;
      try {
        // Debug logging
        console.log('Creating run with:', {
          threadId: thread.id,
          agentId: String(agentId),
          endpoint: endpoint,
        });

        // Check if client.runs exists
        if (!client.runs) {
          console.error(
            'client.runs is undefined. Client structure:',
            Object.keys(client),
          );
          throw new Error(
            'AgentsClient does not have runs property - check SDK version',
          );
        }

        // The Azure AI Agents SDK expects the agentId as the second parameter
        // and returns an object with a stream() method (DO NOT await the create call!)
        const run = client.runs.create(thread.id, String(agentId));

        // Call stream() on the run object
        streamEventMessages = await run.stream();
      } catch (streamError: any) {
        console.error('Error creating stream:', streamError);
        if (streamError instanceof Error) {
          console.error('Error stack:', streamError.stack);
        }
        // Log the full error details including response body if available
        if (streamError.response) {
          console.error('Error response status:', streamError.response.status);
          console.error('Error response body:', streamError.response.body);
        }
        if (streamError.details) {
          console.error(
            'Error details:',
            JSON.stringify(streamError.details, null, 2),
          );
        }
        throw streamError;
      }

      // Create a readable stream for the response
      const stream = new ReadableStream({
        async start(controller) {
          const encoder = createStreamEncoder();
          let citations: Array<{
            number: number;
            title: string;
            url: string;
            date: string;
          }> = [];
          let citationIndex = 1;
          const citationMap = new Map<string, number>();
          let hasCompletedMessage = false;

          try {
            for await (const eventMessage of streamEventMessages) {
              // Handle different event types
              if (eventMessage.event === 'thread.message.delta') {
                const messageData = eventMessage.data as {
                  delta?: {
                    content?: Array<{
                      type: string;
                      text?: { value: string };
                    }>;
                  };
                };
                if (
                  messageData?.delta?.content &&
                  Array.isArray(messageData.delta.content)
                ) {
                  messageData.delta.content.forEach(
                    (contentPart: {
                      type: string;
                      text?: { value: string };
                    }) => {
                      if (
                        contentPart.type === 'text' &&
                        contentPart.text?.value
                      ) {
                        let textChunk = contentPart.text.value;

                        // Convert citation format on the fly
                        textChunk = textChunk.replace(
                          /【(\d+):(\d+)†source】/g,
                          (match: string) => {
                            if (!citationMap.has(match)) {
                              citationMap.set(match, citationIndex);
                              citationIndex++;
                            }
                            return `[${citationMap.get(match)}]`;
                          },
                        );

                        controller.enqueue(encoder.encode(textChunk));
                      }
                    },
                  );
                }
              } else if (eventMessage.event === 'thread.message.completed') {
                hasCompletedMessage = true;
                // Extract citations from annotations
                const messageData = eventMessage.data as {
                  content?: Array<{
                    text?: {
                      annotations?: Array<{
                        type: string;
                        urlCitation?: { title?: string; url?: string };
                      }>;
                    };
                  }>;
                };
                if (messageData?.content?.[0]?.text?.annotations) {
                  const annotations = messageData.content[0].text.annotations;
                  citations = [];
                  citationIndex = 1;

                  annotations.forEach(
                    (annotation: {
                      type: string;
                      urlCitation?: { title?: string; url?: string };
                    }) => {
                      if (
                        annotation.type === 'url_citation' &&
                        annotation.urlCitation
                      ) {
                        citations.push({
                          number: citationIndex++,
                          title:
                            annotation.urlCitation.title ||
                            `Source ${citationIndex}`,
                          url: annotation.urlCitation.url || '',
                          date: '', // Agent citations don't have publication dates
                        });
                      }
                    },
                  );
                }
              } else if (eventMessage.event === 'thread.run.completed') {
                // Append metadata at the very end using utility function
                appendMetadataToStream(controller, {
                  citations: citations.length > 0 ? citations : undefined,
                  threadId: isNewThread ? thread.id : undefined,
                });
              } else if (eventMessage.event === 'error') {
                controller.error(
                  new Error(
                    `Agent error: ${JSON.stringify(eventMessage.data)}`,
                  ),
                );
              } else if (eventMessage.event === 'done') {
                controller.close();
              }
            }
          } catch (error) {
            controller.error(error);
          }
        },
      });

      // Log the completion
      await this.loggingService.logChatCompletion(
        startTime,
        modelId,
        messages.length,
        temperature,
        user,
        botId,
      );

      return new Response(stream, {
        headers: {
          'Content-Type': 'text/plain; charset=utf-8',
          'Cache-Control': 'no-cache',
          Connection: 'keep-alive',
        },
      });
    } catch (error) {
      // Log error
      await this.loggingService.logError(
        startTime,
        error,
        modelId,
        messages.length,
        temperature,
        user,
        botId,
      );
      throw error;
    }
  }
}
