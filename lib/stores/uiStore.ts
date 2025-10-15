import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';

type ThemeMode = 'light' | 'dark';

interface UIStore {
  // State
  showChatbar: boolean;
  showPromptbar: boolean;
  theme: ThemeMode;
  isSettingsOpen: boolean;
  isBotModalOpen: boolean;
  isTermsModalOpen: boolean;
  loading: boolean;

  // Actions
  setShowChatbar: (show: boolean) => void;
  toggleChatbar: () => void;
  setShowPromptbar: (show: boolean) => void;
  togglePromptbar: () => void;
  setTheme: (theme: ThemeMode) => void;
  toggleTheme: () => void;
  setIsSettingsOpen: (isOpen: boolean) => void;
  setIsBotModalOpen: (isOpen: boolean) => void;
  setIsTermsModalOpen: (isOpen: boolean) => void;
  setLoading: (loading: boolean) => void;

  // Reset
  resetUI: () => void;
}

export const useUIStore = create<UIStore>()(
  persist(
    (set) => ({
  // Initial state
  showChatbar: false,
  showPromptbar: true,
  theme: 'dark',
  isSettingsOpen: false,
  isBotModalOpen: false,
  isTermsModalOpen: false,
  loading: false,

  // Actions
  setShowChatbar: (show) => set({ showChatbar: show }),

  toggleChatbar: () => set((state) => ({ showChatbar: !state.showChatbar })),

  setShowPromptbar: (show) => set({ showPromptbar: show }),

  togglePromptbar: () =>
    set((state) => ({ showPromptbar: !state.showPromptbar })),

  setTheme: (theme) => set({ theme }),

  toggleTheme: () =>
    set((state) => ({ theme: state.theme === 'dark' ? 'light' : 'dark' })),

  setIsSettingsOpen: (isOpen) => set({ isSettingsOpen: isOpen }),

  setIsBotModalOpen: (isOpen) => set({ isBotModalOpen: isOpen }),

  setIsTermsModalOpen: (isOpen) => set({ isTermsModalOpen: isOpen }),

  setLoading: (loading) => set({ loading }),

  resetUI: () =>
    set({
      showChatbar: false,
      showPromptbar: true,
      theme: 'dark',
      isSettingsOpen: false,
      isBotModalOpen: false,
      isTermsModalOpen: false,
      loading: false,
    }),
    }),
    {
      name: 'ui-storage',
      version: 1, // Increment this when schema changes to trigger migrations
      storage: createJSONStorage(() => localStorage),
      partialize: (state) => ({
        showChatbar: state.showChatbar,
        showPromptbar: state.showPromptbar,
        theme: state.theme,
      }),
    }
  )
);
