import { Conversation } from '@/types/chat';
import {OpenAIModel, OpenAIModelID, OpenAIModels} from '@/types/openai';

import { DEFAULT_SYSTEM_PROMPT, DEFAULT_TEMPERATURE } from './const';

export const cleanSelectedConversation = (conversation: Conversation) => {
  // added model for each conversation (3/20/23)
  // added system prompt for each conversation (3/21/23)
  // added folders (3/23/23)
  // added prompts (3/26/23)
  // added messages (4/16/23)

  let updatedConversation = conversation;

  // check for model on each conversation
  if (!updatedConversation.model) {
    updatedConversation = {
      ...updatedConversation,
      model: updatedConversation.model || OpenAIModels[OpenAIModelID.GPT_3_5],
    };
  }

  // check for system prompt on each conversation
  if (!updatedConversation.prompt) {
    updatedConversation = {
      ...updatedConversation,
      prompt: updatedConversation.prompt || DEFAULT_SYSTEM_PROMPT,
    };
  }

  if (!updatedConversation.temperature) {
    updatedConversation = {
      ...updatedConversation,
      temperature: updatedConversation.temperature || DEFAULT_TEMPERATURE,
    };
  }

  if (!updatedConversation.folderId) {
    updatedConversation = {
      ...updatedConversation,
      folderId: updatedConversation.folderId || null,
    };
  }

  if (!updatedConversation.messages) {
    updatedConversation = {
      ...updatedConversation,
      messages: updatedConversation.messages || [],
    };
  }

  return updatedConversation;
};

export const cleanConversationHistory = (history: any[]): Conversation[] => {
  // added model for each conversation (3/20/23)
  // added system prompt for each conversation (3/21/23)
  // added folders (3/23/23)
  // added prompts (3/26/23)
  // added messages (4/16/23)

  if (!Array.isArray(history)) {
    console.warn('history is not an array. Returning an empty array.');
    return [];
  }

  return history.reduce((acc: any[], conversation) => {
    try {
      if (!conversation.model || (conversation.model as OpenAIModel)?.isLegacy) {
        // TODO: Replace with environmentally set default model so fixing doesn't require code change
        conversation.model = OpenAIModels[OpenAIModelID.GPT_4o];
      }

      if (!conversation.prompt) {
        conversation.prompt = DEFAULT_SYSTEM_PROMPT;
      }

      if (!conversation.temperature) {
        conversation.temperature = DEFAULT_TEMPERATURE;
      }

      if (!conversation.folderId) {
        conversation.folderId = null;
      }

      if (!conversation.messages) {
        conversation.messages = [];
      }

      acc.push(conversation);
      return acc;
    } catch (error) {
      console.warn(
        `error while cleaning conversations' history. Removing culprit`,
        error,
      );
    }
    return acc;
  }, []);
};

export const cleanMarkdown = (text: string): string => {
  // Remove headers (# symbols)
  text = text.replace(/^#+\s*/gm, '');
  // Remove asterisks for bold and italic
  text = text.replace(/[*_]{1,3}(.*?)[*_]{1,3}/g, '$1');
  // Remove inline code backticks
  text = text.replace(/`([^`]+)`/g, '$1');
  // Remove links, keeping only the text
  text = text.replace(/\[([^\]]+)\]\([^\)]+\)/g, '$1');
  // Remove horizontal rules
  text = text.replace(/^(-{3,}|\*{3,})$/gm, '');
  // Remove blockquotes
  text = text.replace(/^>\s*/gm, '');

  return text.trim();
}
