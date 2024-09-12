// chatService.ts

import {Plugin, PluginID} from "@/types/plugin";
import {
  Conversation,
  ChatBody,
  TextMessageContent,
  ImageMessageContent,
  FileMessageContent,
  Message
} from '@/types/chat';
import { getEndpoint } from '@/utils/app/api';

export const makeRequest = async (
  plugin: Plugin | null,
  updatedConversation: Conversation,
  apiKey: string,
  pluginKeys: {pluginId: PluginID; requiredKeys: any[]}[],
  systemPrompt: string,
  temperature: number
) => {
  // Logic for determining if multi-file handling is needed
  const lastMessage: Message = updatedConversation.messages[updatedConversation.messages.length - 1];
  let hasComplexContent = false;

  if (Array.isArray(lastMessage.content)) {
    const contentTypes = lastMessage.content.map((section) => section.type);
    hasComplexContent = contentTypes.length > 2 ||
      (contentTypes.includes('file_url') && contentTypes.includes('image_url')) ||
      contentTypes.filter((type) => type === 'file_url').length > 1 ||
      contentTypes.filter((type) => type === 'image_url').length > 1;
  }

  if (hasComplexContent && Array.isArray(lastMessage.content)) {
    // TODO: Implement logic for parsing each file, updating the frontend, and consolidating the data
    const messageContent = lastMessage.content as (TextMessageContent | ImageMessageContent | FileMessageContent)[];

    const messageText = messageContent.find(
      (content): content is TextMessageContent => content.type === 'text'
    );

    const nonTextContents = messageContent.filter(
      (content): content is ImageMessageContent | FileMessageContent => content.type !== 'text'
    );

    const consolidatedMessages: Message[] = [];

    for (const content of nonTextContents) {
      const temporaryLastMessage: Message = {
        role: lastMessage.role,
        content: [
          messageText, content
        ] as (TextMessageContent | ImageMessageContent)[] | (TextMessageContent | FileMessageContent)[],
        messageType: lastMessage.messageType
      };

      // Here you would implement the logic to process this temporary message
      // For example, you might want to send it to an API or process it locally

      // After processing, you might want to add the result to consolidatedMessages
      // consolidatedMessages.push(processedMessage);
    }

  }


  const chatBody: ChatBody = {
    model: updatedConversation.model,
    messages: updatedConversation.messages.slice(-6),
    key: apiKey,
    prompt: updatedConversation.prompt || systemPrompt,
    temperature: updatedConversation.temperature || temperature,
  };

  const endpoint = getEndpoint(plugin);
  let body;

  if (!plugin) {
    body = JSON.stringify(chatBody);
  } else {
    body = JSON.stringify({
      ...chatBody,
      googleAPIKey: pluginKeys
        .find((key) => key.pluginId === 'google-search')
        ?.requiredKeys.find((key) => key.key === 'GOOGLE_API_KEY')?.value,
      googleCSEId: pluginKeys
        .find((key) => key.pluginId === 'google-search')
        ?.requiredKeys.find((key) => key.key === 'GOOGLE_CSE_ID')?.value,
    });
  }

  const controller = new AbortController();
  const response = await fetch(endpoint, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    signal: controller.signal,
    body,
    mode: 'cors',
  });


  return {
    controller,
    body,
    response,
    hasComplexContent
  };
};
