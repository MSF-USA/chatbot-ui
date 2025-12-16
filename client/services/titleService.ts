/**
 * Title Service
 *
 * Client-side service for generating AI-powered conversation titles.
 */
import { Message, MessageGroup } from '@/types/chat';

export interface TitleGenerationResult {
  title: string;
  fullTitle: string;
}

/**
 * Converts MessageGroups to flat Messages array for the API.
 */
function flattenMessageGroups(groups: MessageGroup[]): Message[] {
  const messages: Message[] = [];

  for (const group of groups) {
    // Add user message
    messages.push({
      role: 'user',
      content: group.userMessage.content,
    });

    // Add assistant message if present
    if (group.assistantMessage) {
      messages.push({
        role: 'assistant',
        content: group.assistantMessage.content,
      });
    }
  }

  return messages;
}

/**
 * Generates an AI-powered title for a conversation.
 *
 * @param messageGroups - The conversation message groups
 * @param modelId - The model ID to use for generation context
 * @returns The generated title, or null if generation failed
 */
export async function generateConversationTitle(
  messageGroups: MessageGroup[],
  modelId: string,
): Promise<TitleGenerationResult | null> {
  try {
    // Convert groups to flat messages
    const messages = flattenMessageGroups(messageGroups);

    if (messages.length === 0) {
      return null;
    }

    const response = await fetch('/api/chat/title', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        messages,
        modelId,
      }),
    });

    if (!response.ok) {
      console.error(
        '[TitleService] Failed to generate title:',
        response.status,
      );
      return null;
    }

    const result = await response.json();
    return {
      title: result.title,
      fullTitle: result.fullTitle,
    };
  } catch (error) {
    console.error('[TitleService] Error generating title:', error);
    return null;
  }
}
