import { TranscriptMetadata } from '@/lib/utils/app/metadata';

import { OpenAIModel } from './openai';
import { Citation } from './rag';

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

export interface RequestResult {
  controller: AbortController;
  body: string;
  response: Response;
}

export interface ChatRequestResult extends RequestResult {
  hasComplexContent: boolean;
  setOnAbort?: (callback: () => void) => void;
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

export interface ThinkingContent {
  type: 'thinking';
  thinking: string;
}

export function getChatMessageContent(message: Message): string {
  if (typeof message.content === 'string') {
    return message.content;
  } else if (Array.isArray(message.content)) {
    const imageContent = message.content.find(
      (contentItem): contentItem is ImageMessageContent =>
        'type' in contentItem && contentItem.type === 'image_url',
    );
    if (imageContent && 'image_url' in imageContent) {
      return imageContent.image_url.url;
    }
    const fileContent = message.content.find(
      (contentItem): contentItem is FileMessageContent =>
        'type' in contentItem && contentItem.type === 'file_url',
    );
    if (fileContent && 'url' in fileContent) {
      return fileContent.url;
    }
    const textContent = message.content.find(
      (contentItem): contentItem is TextMessageContent =>
        'type' in contentItem && contentItem.type === 'text',
    );
    if (textContent && 'text' in textContent) {
      return textContent.text;
    }
  } else if ((message.content as TextMessageContent).type === 'text') {
    return (message.content as TextMessageContent).text;
  }
  throw new Error(
    `Invalid message type or structure: ${JSON.stringify(message)}`,
  );
}

export interface Message {
  role: Role;
  content:
    | string
    | Array<TextMessageContent | FileMessageContent>
    | Array<TextMessageContent | ImageMessageContent>
    | Array<TextMessageContent | FileMessageContent | ImageMessageContent> // Support mixed content (images + files + text)
    | TextMessageContent;
  messageType: MessageType | ChatInputSubmitTypes | undefined;
  citations?: Citation[];
  thinking?: string;
  transcript?: TranscriptMetadata;
  error?: boolean; // Indicates if the message generation failed
  toneId?: string | null; // Custom tone/voice profile to apply
  promptId?: string | null; // Saved prompt that was used
  promptVariables?: { [key: string]: string }; // Variable values used in the prompt
}

export type Role = 'system' | 'assistant' | 'user';

export interface ChatBody {
  model: OpenAIModel;
  messages: Message[];
  key: string;
  prompt: string;
  temperature: number;
  botId: string | undefined;
  stream?: boolean;
  threadId?: string; // Azure AI Agent thread ID
  reasoningEffort?: 'minimal' | 'low' | 'medium' | 'high'; // For GPT-5 and o3 models
  verbosity?: 'low' | 'medium' | 'high'; // For GPT-5 models
  forcedAgentType?: string; // Force routing to specific agent type (e.g., 'web_search')
}

export interface Conversation {
  id: string;
  name: string;
  messages: Message[];
  model: OpenAIModel;
  prompt: string;
  temperature: number;
  folderId: string | null;
  bot?: string;
  createdAt?: string;
  updatedAt?: string;
  threadId?: string; // Azure AI Agent thread ID
  reasoningEffort?: 'minimal' | 'low' | 'medium' | 'high'; // For GPT-5 and o3 models
  verbosity?: 'low' | 'medium' | 'high'; // For GPT-5 models
  defaultSearchMode?: import('./searchMode').SearchMode; // Default search mode for this conversation
}

export type ChatInputSubmitTypes = 'text' | 'image' | 'file' | 'multi-file';

export type FileFieldValue =
  | FileMessageContent
  | FileMessageContent[]
  | ImageMessageContent
  | ImageMessageContent[]
  | (FileMessageContent | ImageMessageContent)[]
  | null;

export type ImageFieldValue =
  | ImageMessageContent
  | ImageMessageContent[]
  | null;

type UploadStatus = 'pending' | 'uploading' | 'completed' | 'failed';

export interface FilePreview {
  name: string;
  type: string;
  status: UploadStatus;
  previewUrl: string;
}

// Tool Router Types
export type ToolType = 'web_search';

export interface ToolRouterResponse {
  tools: ToolType[];
  searchQuery?: string;
  reasoning?: string; // Optional reasoning for debugging
}

export interface ToolRouterRequest {
  messages: Message[];
  currentMessage: string;
  forceWebSearch?: boolean; // When true, always use web search (search mode enabled)
}
