import { Plugin, PluginID } from "@/types/plugin";
import {
  Conversation,
  ChatBody,
  TextMessageContent,
  ImageMessageContent,
  FileMessageContent,
  Message
} from '@/types/chat';
import { getEndpoint } from '@/utils/app/api';

const isComplexContent = (content: (TextMessageContent | ImageMessageContent | FileMessageContent)[]): boolean => {
  const contentTypes = content.map((section) => section.type);
  return (
    contentTypes.length > 2 ||
    (contentTypes.includes('file_url') && contentTypes.includes('image_url')) ||
    contentTypes.filter((type) => type === 'file_url').length > 1 ||
    contentTypes.filter((type) => type === 'image_url').length > 1
  );
};

const createChatBody = (
  conversation: Conversation,
  messages: Message[],
  apiKey: string,
  systemPrompt: string,
  temperature: number,
  stream: boolean,
): ChatBody => ({
  model: conversation.model,
  messages,
  key: apiKey,
  prompt: conversation.prompt || systemPrompt,
  temperature: conversation.temperature || temperature,
});

const appendPluginKeys = (chatBody: ChatBody, pluginKeys: { pluginId: PluginID; requiredKeys: any[] }[]) => ({
  ...chatBody,
  googleAPIKey: pluginKeys
    .find((key) => key.pluginId === PluginID.GOOGLE_SEARCH)
    ?.requiredKeys.find((key) => key.key === 'GOOGLE_API_KEY')?.value,
  googleCSEId: pluginKeys
    .find((key) => key.pluginId === PluginID.GOOGLE_SEARCH)
    ?.requiredKeys.find((key) => key.key === 'GOOGLE_CSE_ID')?.value,
});

const sendRequest = async (endpoint: string, body: string) => {
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
  return { controller, body, response };
};

export const makeRequest = async (
  plugin: Plugin | null,
  updatedConversation: Conversation,
  apiKey: string,
  pluginKeys: { pluginId: PluginID; requiredKeys: any[] }[],
  systemPrompt: string,
  temperature: number,
  stream: boolean = true
) => {
  const lastMessage: Message = updatedConversation.messages[updatedConversation.messages.length - 1];
  let hasComplexContent = false;

  if (Array.isArray(lastMessage.content) && isComplexContent(lastMessage.content)) {
    hasComplexContent = true;
    const messageContent = lastMessage.content as (TextMessageContent | ImageMessageContent | FileMessageContent)[];
    const messageText = messageContent.find(
      (content): content is TextMessageContent => content.type === 'text'
    );
    const nonTextContents = messageContent.filter(
      (content): content is ImageMessageContent | FileMessageContent => content.type !== 'text'
    );

    const allMessagesExceptFinal = updatedConversation.messages.slice(0, -1);

    const fileSummaries: any[] = [];

    for (const content of nonTextContents) {
      const temporaryLastMessage: Message = {
        role: lastMessage.role,
        content: [
          messageText, content
        ] as (TextMessageContent | ImageMessageContent)[] | (TextMessageContent | FileMessageContent)[],
        messageType: lastMessage.messageType
      };

      const chatBody = createChatBody(
        updatedConversation,
        [...allMessagesExceptFinal.slice(-5), temporaryLastMessage],
        apiKey, systemPrompt, temperature,
        false // don't stream intermediate steps
      );
      const endpoint = getEndpoint(null);
      const requestBody = JSON.stringify(chatBody, null, 2);

      const { controller, response, body } = await sendRequest(endpoint, requestBody);
      if (content.type === 'file_url') {
        fileSummaries.push({
          'filename': content.originalFilename,
          'summary': (response.json() as any).text ?? ''
        })
      } else {
        fileSummaries.push({
          'filename': `image:${content.image_url.url.split('/')[content.image_url.url.split('/').length - 1]}`,
          'summary': (response.json() as any).text ?? ''
        })
      }
    }
  }

  const chatBody = createChatBody(
    updatedConversation, updatedConversation.messages.slice(-6),
    apiKey, systemPrompt, temperature, stream
  );
  const endpoint = getEndpoint(plugin);

  let requestBody = plugin ? JSON.stringify(appendPluginKeys(chatBody, pluginKeys)) : JSON.stringify(chatBody);
  const { controller, body, response } = await sendRequest(endpoint, requestBody);

  return {
    controller,
    body,
    response,
    hasComplexContent
  };
};
