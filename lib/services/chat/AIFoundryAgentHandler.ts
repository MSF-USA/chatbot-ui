import { Session } from 'next-auth';
import { StreamingTextResponse } from 'ai';
import { Message } from '@/types/chat';
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

      const client = new aiAgents.AgentsClient(endpoint, new DefaultAzureCredential());

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
        await client.messages.create(
          thread.id,
          'user',
          String(lastMessage.content)
        );
      } catch (messageError) {
        console.error('Error creating message:', messageError);
        console.error('Full error object:', JSON.stringify(messageError, null, 2));
        throw messageError;
      }

      // Create a run and get the stream
      let streamEventMessages;
      try {
        // Debug logging
        console.log('Creating run with:', {
          threadId: thread.id,
          agentId: String(agentId),
          endpoint: endpoint
        });

        // Check if client.runs exists
        if (!client.runs) {
          console.error('client.runs is undefined. Client structure:', Object.keys(client));
          throw new Error('AgentsClient does not have runs property - check SDK version');
        }

        // The Azure AI Agents SDK expects the agentId as the second parameter
        // and returns an object with a stream() method (DO NOT await the create call!)
        const run = client.runs.create(thread.id, String(agentId));

        // Call stream() on the run object
        streamEventMessages = await run.stream();
      } catch (streamError) {
        console.error('Error creating stream:', streamError);
        if (streamError instanceof Error) {
          console.error('Error stack:', streamError.stack);
        }
        throw streamError;
      }

      // Create a readable stream for the response
      const stream = new ReadableStream({
        async start(controller) {
          const encoder = new TextEncoder();
          let citations: any[] = [];
          let citationIndex = 1;
          const citationMap = new Map();
          let hasCompletedMessage = false;

          try {
            for await (const eventMessage of streamEventMessages) {
              // Handle different event types
              if (eventMessage.event === 'thread.message.delta') {
                const messageData = eventMessage.data as any;
                if (messageData?.delta?.content && Array.isArray(messageData.delta.content)) {
                  messageData.delta.content.forEach((contentPart: { type: string; text?: { value: string } }) => {
                    if (contentPart.type === 'text' && contentPart.text?.value) {
                      let textChunk = contentPart.text.value;

                      // Convert citation format on the fly
                      textChunk = textChunk.replace(/【(\d+):(\d+)†source】/g, (match: string) => {
                        if (!citationMap.has(match)) {
                          citationMap.set(match, citationIndex);
                          citationIndex++;
                        }
                        return `[${citationMap.get(match)}]`;
                      });

                      controller.enqueue(encoder.encode(textChunk));
                    }
                  });
                }
              } else if (eventMessage.event === 'thread.message.completed') {
                hasCompletedMessage = true;
                // Extract citations from annotations
                const messageData = eventMessage.data as any;
                if (messageData?.content?.[0]?.text?.annotations) {
                  const annotations = messageData.content[0].text.annotations;
                  citations = [];
                  citationIndex = 1;

                  annotations.forEach((annotation: { type: string; urlCitation?: { title?: string; url?: string } }) => {
                    if (annotation.type === 'url_citation' && annotation.urlCitation) {
                      citations.push({
                        number: citationIndex++,
                        title: annotation.urlCitation.title || `Source ${citationIndex}`,
                        url: annotation.urlCitation.url || '',
                        date: '' // Agent citations don't have publication dates
                      });
                    }
                  });
                }
              } else if (eventMessage.event === 'thread.run.completed') {
                // Only append metadata at the very end, after we have everything
                if (citations.length > 0 || isNewThread) {
                  // Use a unique separator that won't appear in normal content
                  const separator = '\n\n<<<METADATA_START>>>';
                  const metadata = {
                    citations: citations.length > 0 ? citations : undefined,
                    threadId: isNewThread ? thread.id : undefined
                  };
                  const metadataStr = `${separator}${JSON.stringify(metadata)}<<<METADATA_END>>>`;
                  controller.enqueue(encoder.encode(metadataStr));
                }
              } else if (eventMessage.event === 'error') {
                controller.error(new Error(`Agent error: ${JSON.stringify(eventMessage.data)}`));
              } else if (eventMessage.event === 'done') {
                controller.close();
              }
            }
          } catch (error) {
            controller.error(error);
          }
        }
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

      return new StreamingTextResponse(stream);
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
