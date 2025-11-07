import { sanitizeForLog } from '@/lib/utils/server/logSanitization';

import { Message } from '@/types/chat';

import { StandardChatService } from '../StandardChatService';
import { ChatContext } from '../pipeline/ChatContext';
import { BasePipelineStage } from '../pipeline/PipelineStage';

/**
 * StandardChatHandler executes the final chat request.
 *
 * Responsibilities:
 * - Takes processed content and enriched messages
 * - Calls the appropriate chat service (standard or agent)
 * - Returns the Response object
 *
 * Modifies context:
 * - context.response (the final HTTP Response)
 *
 * This is always the LAST stage in the pipeline.
 */
export class StandardChatHandler extends BasePipelineStage {
  readonly name = 'StandardChatHandler';

  constructor(private standardChatService: StandardChatService) {
    super();
  }

  shouldRun(context: ChatContext): boolean {
    // Always run unless agent execution is specified
    return context.executionStrategy !== 'agent';
  }

  protected async executeStage(context: ChatContext): Promise<ChatContext> {
    console.log('[StandardChatHandler] Executing chat request');

    // Extract transcript metadata if available (for audio/video transcriptions)
    const transcript = context.processedContent?.transcripts?.[0]
      ? {
          filename: context.processedContent.transcripts[0].filename,
          transcript: context.processedContent.transcripts[0].transcript,
          processedContent: undefined, // Will be filled by LLM response
        }
      : undefined;

    // Check if we have a transcript with no user message (just transcription request)
    if (transcript) {
      const lastMessage = context.messages[context.messages.length - 1];
      let userText = '';

      // Extract user text from message content
      if (typeof lastMessage.content === 'string') {
        userText = lastMessage.content.trim();
      } else if (Array.isArray(lastMessage.content)) {
        const textContent = lastMessage.content.find((c) => c.type === 'text');
        if (textContent && 'text' in textContent) {
          userText = textContent.text.trim();
        }
      }

      // If user text is empty or just a filename pattern, skip LLM and return transcription only
      const isEmptyOrFilename =
        !userText ||
        /^(?:\[Audio\/Video:\s*[^\]]+\]|\[[^\]]+\])?$/i.test(userText);

      if (isEmptyOrFilename) {
        console.log(
          '[StandardChatHandler] No user message detected, returning transcription only',
        );

        // Create a minimal response that just returns the transcript
        const encoder = new TextEncoder();
        const stream = new ReadableStream({
          start(controller) {
            // Send metadata with transcript only (no LLM processing)
            const metadata = {
              transcript: {
                filename: transcript.filename,
                transcript: transcript.transcript,
                processedContent: undefined, // No LLM processing
              },
            };

            const metadataStr = `\n\n<<<METADATA_START>>>${JSON.stringify(metadata)}<<<METADATA_END>>>`;
            controller.enqueue(encoder.encode(metadataStr));
            controller.close();
          },
        });

        return {
          ...context,
          response: new Response(stream, {
            headers: {
              'Content-Type': 'text/plain; charset=utf-8',
              'Cache-Control': 'no-cache',
              Connection: 'keep-alive',
            },
          }),
        };
      }
    }

    // Build final messages from enriched messages or processed content
    const messagesToSend = this.buildFinalMessages(context);

    console.log(
      '[StandardChatHandler] Final message count:',
      messagesToSend.length,
    );
    console.log(
      '[StandardChatHandler] Model:',
      sanitizeForLog(context.modelId),
    );
    console.log(
      '[StandardChatHandler] Stream:',
      sanitizeForLog(context.stream),
    );

    // Check if RAG is enabled
    const ragConfig = context.processedContent?.metadata?.ragConfig;

    // Extract citations from web search results
    const citations = context.processedContent?.metadata?.citations;

    if (transcript) {
      console.log(
        '[StandardChatHandler] Including transcript metadata:',
        sanitizeForLog(transcript.filename),
      );
    }

    if (citations) {
      console.log(
        '[StandardChatHandler] Including search citations:',
        sanitizeForLog(citations.length),
        'citations',
      );
    }

    // Execute chat
    const response = await this.standardChatService.handleChat({
      messages: messagesToSend,
      model: context.model,
      user: context.user,
      systemPrompt: context.systemPrompt,
      temperature: context.temperature,
      stream: context.stream,
      reasoningEffort: context.reasoningEffort,
      verbosity: context.verbosity,
      botId: ragConfig?.botId,
      transcript,
      citations,
    });

    console.log('[StandardChatHandler] Chat execution completed');

    return {
      ...context,
      response,
    };
  }

  /**
   * Builds the final messages array from processed content and enrichments.
   *
   * Priority:
   * 1. Use enrichedMessages if available (from enrichers)
   * 2. Use processed content + original messages (from processors)
   * 3. Use original messages (if no processing)
   */
  private buildFinalMessages(context: ChatContext): Message[] {
    // If enrichers modified messages, use those
    if (context.enrichedMessages) {
      return context.enrichedMessages;
    }

    // If we have processed content, inject it into messages
    if (context.processedContent) {
      const { fileSummaries, transcripts, images } = context.processedContent;

      // Start with original messages
      let messages = [...context.messages];

      // Add processed content to the last message
      const lastMessage = messages[messages.length - 1];

      if (Array.isArray(lastMessage.content)) {
        const enrichedContent = [...lastMessage.content];

        // Collect all text parts (existing + processed content)
        const textParts: string[] = [];

        // Extract existing text content
        enrichedContent.forEach((c) => {
          if (c.type === 'text' && c.text) {
            textParts.push(c.text);
          }
        });

        // Add file summaries
        if (fileSummaries && fileSummaries.length > 0) {
          const summaryText = fileSummaries
            .map((f) => `[File: ${f.filename}]\n${f.summary}`)
            .join('\n\n');
          textParts.push(summaryText);
        }

        // Add transcripts
        if (transcripts && transcripts.length > 0) {
          const transcriptText = transcripts
            .map((t) => `[Audio/Video: ${t.filename}]\n${t.transcript}`)
            .join('\n\n');
          textParts.push(transcriptText);
        }

        // Filter out text and file_url content (will be replaced with merged text)
        const nonTextContent = enrichedContent.filter(
          (c) => c.type !== 'file_url' && c.type !== 'text',
        );

        // Build final content array
        const finalContent: typeof enrichedContent = [];

        // Add merged text content as first item
        if (textParts.length > 0) {
          finalContent.push({
            type: 'text',
            text: textParts.join('\n\n'),
          });
        }

        // Add non-text content (e.g., images)
        finalContent.push(...nonTextContent);

        // Replace last message with enriched content
        messages[messages.length - 1] = {
          ...lastMessage,
          content:
            finalContent.length === 1 && finalContent[0].type === 'text'
              ? finalContent[0].text // Convert to string if only text
              : finalContent,
        };
      }

      return messages;
    }

    // No processing, return original messages
    return context.messages;
  }
}
