import { create } from 'zustand';

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

export const useUIStore = create<UIStore>((set, get) => ({
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
}));
