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

  // Get actions
  const addConversation = useConversationStore((state) => state.addConversation);
  const updateConversation = useConversationStore((state) => state.updateConversation);
  const deleteConversation = useConversationStore((state) => state.deleteConversation);
  const selectConversation = useConversationStore((state) => state.selectConversation);
  const setConversations = useConversationStore((state) => state.setConversations);
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

  // Load from localStorage on mount
  useEffect(() => {
    const savedConversations =
      LocalStorageService.get<Conversation[]>(StorageKeys.CONVERSATIONS) || [];
    const savedFolders =
      LocalStorageService.get<FolderInterface[]>(StorageKeys.FOLDERS) || [];
    const selectedId =
      LocalStorageService.get<string>(StorageKeys.SELECTED_CONVERSATION_ID) ||
      null;

    setConversations(savedConversations);
    setFolders(savedFolders);

    // Validate that selectedId exists in conversations
    if (selectedId && savedConversations.find(c => c.id === selectedId)) {
      selectConversation(selectedId);
    } else if (savedConversations.length > 0) {
      // If no valid selection, select the first conversation
      selectConversation(savedConversations[0].id);
    }
  }, []);

  // Persist conversations to localStorage
  useEffect(() => {
    LocalStorageService.set(StorageKeys.CONVERSATIONS, conversations);
  }, [conversations]);

  // Persist folders to localStorage
  useEffect(() => {
    LocalStorageService.set(StorageKeys.FOLDERS, folders);
  }, [folders]);

  // Persist selected conversation ID
  useEffect(() => {
    if (selectedConversationId) {
      LocalStorageService.set(
        StorageKeys.SELECTED_CONVERSATION_ID,
        selectedConversationId
      );
    } else {
      LocalStorageService.remove(StorageKeys.SELECTED_CONVERSATION_ID);
    }
  }, [selectedConversationId]);

  return {
    // State
    conversations,
    selectedConversation,
    folders,
    searchTerm,
    filteredConversations,

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
