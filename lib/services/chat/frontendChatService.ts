import { Conversation } from '@/types/chat';

/**
 * Frontend service for making chat API requests
 * This replaces the old makeRequest function from frontendChatServices.ts
 */

interface MakeRequestOptions {
  setRequestStatusMessage: (message: string) => void;
  conversation: Conversation;
  apiKey: string;
  systemPrompt: string;
  temperature: number;
  stream: boolean;
  setProgress: (progress: any) => void;
  stopConversationRef: { current: boolean };
}

interface MakeRequestResponse {
  response: Response;
  hasComplexContent: boolean;
}

/**
 * Makes a request to the chat API endpoint
 */
export async function makeRequest(
  setRequestStatusMessage: (message: string) => void,
  conversation: Conversation,
  apiKey: string,
  systemPrompt: string,
  temperature: number,
  stream: boolean,
  setProgress: (progress: any) => void,
  stopConversationRef: { current: boolean }
): Promise<MakeRequestResponse> {
  const { model, messages, bot, threadId } = conversation;

  const requestBody = {
    model,
    messages,
    prompt: systemPrompt,
    temperature,
    botId: bot,
    stream,
    threadId,
  };

  const response = await fetch('/api/chat', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(requestBody),
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.message || 'Failed to send message');
  }

  // Check if any messages contain complex content (files, images)
  const hasComplexContent = messages.some((message) => {
    if (Array.isArray(message.content)) {
      return message.content.some(
        (content: any) => content.type === 'image_url' || content.type === 'file'
      );
    }
    return false;
  });

  return {
    response,
    hasComplexContent,
  };
}
