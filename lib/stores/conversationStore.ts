import { create } from 'zustand';
import { Conversation } from '@/types/chat';
import { FolderInterface } from '@/types/folder';

interface ConversationStore {
  // State
  conversations: Conversation[];
  selectedConversationId: string | null;
  folders: FolderInterface[];
  searchTerm: string;

  // Computed
  selectedConversation: Conversation | null;
  filteredConversations: Conversation[];

  // Conversation actions
  setConversations: (conversations: Conversation[]) => void;
  addConversation: (conversation: Conversation) => void;
  updateConversation: (id: string, updates: Partial<Conversation>) => void;
  deleteConversation: (id: string) => void;
  selectConversation: (id: string | null) => void;

  // Folder actions
  setFolders: (folders: FolderInterface[]) => void;
  addFolder: (folder: FolderInterface) => void;
  updateFolder: (id: string, name: string) => void;
  deleteFolder: (id: string) => void;

  // Search
  setSearchTerm: (term: string) => void;

  // Bulk operations
  clearAll: () => void;
}

export const useConversationStore = create<ConversationStore>((set, get) => ({
  // Initial state
  conversations: [],
  selectedConversationId: null,
  folders: [],
  searchTerm: '',

  // Computed getters
  get selectedConversation() {
    const state = get();
    return (
      state.conversations.find((c) => c.id === state.selectedConversationId) ||
      null
    );
  },

  get filteredConversations() {
    const state = get();
    if (!state.searchTerm) return state.conversations;

    const term = state.searchTerm.toLowerCase();
    return state.conversations.filter(
      (c) =>
        c.name.toLowerCase().includes(term) ||
        c.messages.some((m) =>
          m.content.toString().toLowerCase().includes(term)
        )
    );
  },

  // Conversation actions
  setConversations: (conversations) => set({ conversations }),

  addConversation: (conversation) =>
    set((state) => ({
      conversations: [...state.conversations, conversation],
      selectedConversationId: conversation.id,
    })),

  updateConversation: (id, updates) =>
    set((state) => ({
      conversations: state.conversations.map((c) =>
        c.id === id
          ? { ...c, ...updates, updatedAt: new Date().toISOString() }
          : c
      ),
    })),

  deleteConversation: (id) =>
    set((state) => ({
      conversations: state.conversations.filter((c) => c.id !== id),
      selectedConversationId:
        state.selectedConversationId === id ? null : state.selectedConversationId,
    })),

  selectConversation: (id) => set({ selectedConversationId: id }),

  // Folder actions
  setFolders: (folders) => set({ folders }),

  addFolder: (folder) =>
    set((state) => ({
      folders: [...state.folders, folder],
    })),

  updateFolder: (id, name) =>
    set((state) => ({
      folders: state.folders.map((f) => (f.id === id ? { ...f, name } : f)),
    })),

  deleteFolder: (id) =>
    set((state) => ({
      folders: state.folders.filter((f) => f.id !== id),
      // Remove folder from conversations
      conversations: state.conversations.map((c) =>
        c.folderId === id ? { ...c, folderId: null } : c
      ),
    })),

  // Search
  setSearchTerm: (term) => set({ searchTerm: term }),

  // Bulk operations
  clearAll: () =>
    set({
      conversations: [],
      selectedConversationId: null,
      folders: [],
      searchTerm: '',
    }),
}));
