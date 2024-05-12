import { OpenAIModel } from './openai';

export enum MessageType {
  TEXT = 'text',
  IMAGE = 'image',
  AUDIO = 'audio',
  VIDEO = 'video',
}

export interface ImageMessageContent {
  type: 'image_url';
  image_url: {
    url: string;
  };
}

export interface TextMessageContent {
  type: 'text';
  text: string;
}

export function getChatMessageContent(message: Message): string {
  if (typeof message.content === "string")
    return message.content
  else if (Array.isArray(message.content)) {
    const imageContent = message.content.find(contentItem => contentItem.type === 'image_url') as ImageMessageContent;
    return imageContent.image_url.url
  } else if (message.content?.type === 'text')
    return message.content.text
  else
    throw new Error(`Invalid message type or structure: ${message}`)
}

export interface Message {
  role: Role;
  content: string | Array<TextMessageContent | ImageMessageContent> | TextMessageContent;
  messageType: MessageType | undefined;
}

export type Role = 'assistant' | 'user' | 'system';

export interface ChatBody {
  model: OpenAIModel;
  messages: Message[];
  key: string;
  prompt: string;
  temperature: number;
}

export interface Conversation {
  id: string;
  name: string;
  messages: Message[];
  model: OpenAIModel;
  prompt: string;
  temperature: number;
  folderId: string | null;
}

export type ChatInputSubmitTypes = "text" | "image" | "file";

