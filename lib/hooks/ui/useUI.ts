import { useEffect } from 'react';
import { useUIStore } from '@/lib/stores/uiStore';

/**
 * Hook that manages UI state
 * Persistence is handled automatically by Zustand persist middleware
 */
export function useUI() {
  const store = useUIStore();

  // Update document class for theme (not persisted, just DOM manipulation)
  useEffect(() => {
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
