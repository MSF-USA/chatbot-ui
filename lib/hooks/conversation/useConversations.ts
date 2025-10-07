import { useEffect } from 'react';
import { useConversationStore } from '@/lib/stores/conversationStore';
import {
  LocalStorageService,
  StorageKeys,
} from '@/lib/services/storage/localStorageService';
import { Conversation } from '@/types/chat';
import { FolderInterface } from '@/types/folder';

/**
 * Hook that manages conversations with localStorage persistence
 */
export function useConversations() {
  const store = useConversationStore();

  // Load from localStorage on mount
  useEffect(() => {
    const conversations =
      LocalStorageService.get<Conversation[]>(StorageKeys.CONVERSATIONS) || [];
    const folders =
      LocalStorageService.get<FolderInterface[]>(StorageKeys.FOLDERS) || [];
    const selectedId =
      LocalStorageService.get<string>(StorageKeys.SELECTED_CONVERSATION_ID) ||
      null;

    store.setConversations(conversations);
    store.setFolders(folders);

    // Validate that selectedId exists in conversations
    if (selectedId && conversations.find(c => c.id === selectedId)) {
      store.selectConversation(selectedId);
    } else if (conversations.length > 0) {
      // If no valid selection, select the first conversation
      store.selectConversation(conversations[0].id);
    }
  }, []);

  // Persist conversations to localStorage
  useEffect(() => {
    LocalStorageService.set(StorageKeys.CONVERSATIONS, store.conversations);
  }, [store.conversations]);

  // Persist folders to localStorage
  useEffect(() => {
    LocalStorageService.set(StorageKeys.FOLDERS, store.folders);
  }, [store.folders]);

  // Persist selected conversation ID
  useEffect(() => {
    if (store.selectedConversationId) {
      LocalStorageService.set(
        StorageKeys.SELECTED_CONVERSATION_ID,
        store.selectedConversationId
      );
    } else {
      LocalStorageService.remove(StorageKeys.SELECTED_CONVERSATION_ID);
    }
  }, [store.selectedConversationId]);

  return {
    // State
    conversations: store.conversations,
    selectedConversation: store.selectedConversation,
    folders: store.folders,
    searchTerm: store.searchTerm,
    filteredConversations: store.filteredConversations,

    // Actions
    addConversation: store.addConversation,
    updateConversation: store.updateConversation,
    deleteConversation: store.deleteConversation,
    selectConversation: store.selectConversation,
    setConversations: store.setConversations,

    // Folder actions
    addFolder: store.addFolder,
    updateFolder: store.updateFolder,
    deleteFolder: store.deleteFolder,
    setFolders: store.setFolders,

    // Search
    setSearchTerm: store.setSearchTerm,

    // Bulk
    clearAll: store.clearAll,
  };
}
