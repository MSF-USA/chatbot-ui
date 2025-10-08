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
  // Subscribe to the underlying state that affects selectedConversation
  const conversations = useConversationStore((state) => state.conversations);
  const selectedConversationId = useConversationStore((state) => state.selectedConversationId);
  const folders = useConversationStore((state) => state.folders);
  const searchTerm = useConversationStore((state) => state.searchTerm);
  const isLoaded = useConversationStore((state) => state.isLoaded);

  // Get actions
  const addConversation = useConversationStore((state) => state.addConversation);
  const updateConversation = useConversationStore((state) => state.updateConversation);
  const deleteConversation = useConversationStore((state) => state.deleteConversation);
  const selectConversation = useConversationStore((state) => state.selectConversation);
  const setConversations = useConversationStore((state) => state.setConversations);
  const setIsLoaded = useConversationStore((state) => state.setIsLoaded);
  const addFolder = useConversationStore((state) => state.addFolder);
  const updateFolder = useConversationStore((state) => state.updateFolder);
  const deleteFolder = useConversationStore((state) => state.deleteFolder);
  const setFolders = useConversationStore((state) => state.setFolders);
  const setSearchTerm = useConversationStore((state) => state.setSearchTerm);
  const clearAll = useConversationStore((state) => state.clearAll);

  // Compute selected conversation from state
  const selectedConversation = conversations.find(c => c.id === selectedConversationId) || null;

  // Compute filtered conversations
  const filteredConversations = !searchTerm
    ? conversations
    : conversations.filter(
        (c) =>
          c.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
          c.messages.some((m) =>
            m.content.toString().toLowerCase().includes(searchTerm.toLowerCase())
          )
      );

  // Note: localStorage loading is now handled by ConversationLoader component
  // to avoid multiple simultaneous reads on app initialization

  // Persist conversations to localStorage (skip initial save)
  useEffect(() => {
    if (!isLoaded) return; // Don't save until initial load is complete
    LocalStorageService.set(StorageKeys.CONVERSATIONS, conversations);
  }, [conversations, isLoaded]);

  // Persist folders to localStorage (skip initial save)
  useEffect(() => {
    if (!isLoaded) return; // Don't save until initial load is complete
    LocalStorageService.set(StorageKeys.FOLDERS, folders);
  }, [folders, isLoaded]);

  // Persist selected conversation ID (skip initial save)
  useEffect(() => {
    if (!isLoaded) return; // Don't save until initial load is complete
    if (selectedConversationId) {
      LocalStorageService.set(
        StorageKeys.SELECTED_CONVERSATION_ID,
        selectedConversationId
      );
    } else {
      LocalStorageService.remove(StorageKeys.SELECTED_CONVERSATION_ID);
    }
  }, [selectedConversationId, isLoaded]);

  return {
    // State
    conversations,
    selectedConversation,
    folders,
    searchTerm,
    filteredConversations,
    isLoaded,

    // Actions
    addConversation,
    updateConversation,
    deleteConversation,
    selectConversation,
    setConversations,

    // Folder actions
    addFolder,
    updateFolder,
    deleteFolder,
    setFolders,

    // Search
    setSearchTerm,

    // Bulk
    clearAll,
  };
}
