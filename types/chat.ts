import { Session } from 'next-auth';

import { OpenAIModel } from './openai';

export enum MessageType {
  TEXT = 'text',
  IMAGE = 'image',
  AUDIO = 'audio',
  VIDEO = 'video',
  FILE = 'file',
}

export interface ImageMessageContent {
  type: 'image_url';
  image_url: {
    url: string;
    detail: 'auto' | 'high' | 'low';
  };
}

/*
 * This is an arbitrary content type since we are just using it to handle
 * the retrieval and parsing on the server-side. This is unlike ImageMessageContent,
 * which is a genuine type that some gpt models can handle directly
 */
export interface FileMessageContent {
  type: 'file_url';
  url: string;
  originalFilename?: string;
}

export interface TextMessageContent {
  type: 'text';
  text: string;
}

export function getChatMessageContent(message: Message): string {
  if (typeof message.content === 'string') {
    return message.content;
  } else if (
    Array.isArray(message.content) &&
    message.content.some((contentItem) => contentItem.type !== 'text')
  ) {
    // @ts-ignore
    const imageContent = message.content.find(
      // @ts-ignore
      (contentItem) => contentItem.type === 'image_url',
    ) as ImageMessageContent;
    if (imageContent) {
      return imageContent.image_url.url;
    } else {
      // @ts-ignore
      const fileContent = message.content.find(
        // @ts-ignore
        (contentItem) => contentItem.type === 'file_url',
      ) as FileMessageContent;
      return fileContent.url;
    }
  } else if ((message.content as TextMessageContent).type === 'text') {
    return (message.content as TextMessageContent).text;
  } else {
    throw new Error(`Invalid message type or structure: ${message}`);
  }
}

export interface Citation {
  content: string;
  title?: string;
  filepath?: string;
  url?: string;
  chunk_id?: string;
}

export interface Message {
  role: Role;
  content:
    | string
    | Array<TextMessageContent | FileMessageContent>
    | Array<TextMessageContent | ImageMessageContent>
    | TextMessageContent;
  messageType: MessageType | ChatInputSubmitTypes | undefined;
}

export type Role = 'system' | 'assistant' | 'user';

export interface ChatBody {
  model: OpenAIModel;
  messages: Message[];
  key: string;
  prompt: string;
  temperature: number;
  useKnowledgeBase: boolean;
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

export type ChatInputSubmitTypes = 'text' | 'image' | 'file';
