import { useEffect } from 'react';
import { useUIStore } from '@/lib/stores/uiStore';
import {
  LocalStorageService,
  StorageKeys,
} from '@/lib/services/storage/localStorageService';

/**
 * Hook that manages UI state with localStorage persistence
 */
export function useUI() {
  const store = useUIStore();

  // Note: localStorage loading is now handled by UILoader component
  // to avoid multiple simultaneous reads on app initialization

  // Persist showChatbar
  useEffect(() => {
    LocalStorageService.set(StorageKeys.SHOW_CHATBAR, store.showChatbar);
  }, [store.showChatbar]);

  // Persist showPromptbar
  useEffect(() => {
    LocalStorageService.set(StorageKeys.SHOW_PROMPTBAR, store.showPromptbar);
  }, [store.showPromptbar]);

  // Persist theme and update document
  useEffect(() => {
    LocalStorageService.set(StorageKeys.THEME, store.theme);

    if (store.theme === 'dark') {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  }, [store.theme]);

  return {
    // State
    showChatbar: store.showChatbar,
    showPromptbar: store.showPromptbar,
    theme: store.theme,
    isSettingsOpen: store.isSettingsOpen,
    isBotModalOpen: store.isBotModalOpen,
    isTermsModalOpen: store.isTermsModalOpen,
    loading: store.loading,

    // Actions
    setShowChatbar: store.setShowChatbar,
    toggleChatbar: store.toggleChatbar,
    setShowPromptbar: store.setShowPromptbar,
    togglePromptbar: store.togglePromptbar,
    setTheme: store.setTheme,
    toggleTheme: store.toggleTheme,
    setIsSettingsOpen: store.setIsSettingsOpen,
    setIsBotModalOpen: store.setIsBotModalOpen,
    setIsTermsModalOpen: store.setIsTermsModalOpen,
    setLoading: store.setLoading,
    resetUI: store.resetUI,
  };
}
