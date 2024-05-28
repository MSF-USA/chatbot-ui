import { Conversation } from '@/types/chat';
import { Prompt } from '@/types/prompt';

export interface ChatbarInitialState {
  searchTerm: string;
  filteredConversations: Conversation[];
  promptSearchTerm: string;
  filteredPrompts: Prompt[];
}

export const initialState: ChatbarInitialState = {
  searchTerm: '',
  filteredConversations: [],
  promptSearchTerm: '',
  filteredPrompts: [],
};
