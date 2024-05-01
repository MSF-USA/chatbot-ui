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
