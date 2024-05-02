import { OpenAIModel } from './openai';

export enum MessageType {
  TEXT = 'text',
  IMAGE = 'image',
  AUDIO = 'audio',
  VIDEO = 'video',
}

export interface ImageMessageContent {
  type: 'image_url';
  image_url: string;
}

export interface TextMessageContent {
  type: 'text';
  text: string;
}

export function getChatMessageContent(message: Message): string {
  if (typeof message.content === "string")
    return message.content
  else if (message.content?.type === 'text')
    return message.content.text
  else if (message.content?.type === 'image_url')
    return message.content?.image_url
  else
    throw new Error(`Invalid message type or structure: ${message}`)
}

export interface Message {
  role: Role;
  content: string | ImageMessageContent | TextMessageContent;
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
