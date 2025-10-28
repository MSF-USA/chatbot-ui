import { Session } from 'next-auth';

import { Message } from '@/types/chat';
import { OpenAIModel } from '@/types/openai';

/**
 * Context object containing all information needed to handle a chat request.
 * This is passed to each handler in the chain.
 */
export interface ChatContext {
  // Request data
  messages: Message[];
  model: OpenAIModel;

  // User context
  user: Session['user'];

  // Configuration
  temperature: number;
  systemPrompt: string;
  streamResponse: boolean;

  // Optional parameters
  botId?: string;
  threadId?: string;
  reasoningEffort?: 'minimal' | 'low' | 'medium' | 'high';
  verbosity?: 'low' | 'medium' | 'high';
  forcedAgentType?: string;
}
