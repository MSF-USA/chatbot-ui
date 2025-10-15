import { describe, expect, it, beforeEach } from 'vitest';
import { useUIStore } from '@/lib/stores/uiStore';

describe('uiStore', () => {
  beforeEach(() => {
    // Reset store state before each test
    useUIStore.setState({
      showChatbar: false,
      showPromptbar: true,
      theme: 'dark',
      isSettingsOpen: false,
      isBotModalOpen: false,
      isTermsModalOpen: false,
      loading: false,
    });
  });

  describe('Initial State', () => {
    it('has correct initial state', () => {
      const state = useUIStore.getState();

      expect(state.showChatbar).toBe(false);
      expect(state.showPromptbar).toBe(true);
      expect(state.theme).toBe('dark');
      expect(state.isSettingsOpen).toBe(false);
      expect(state.isBotModalOpen).toBe(false);
      expect(state.isTermsModalOpen).toBe(false);
      expect(state.loading).toBe(false);
    });
  });

  describe('Chatbar', () => {
    describe('setShowChatbar', () => {
      it('shows chatbar', () => {
        useUIStore.getState().setShowChatbar(true);

        expect(useUIStore.getState().showChatbar).toBe(true);
      });

      it('hides chatbar', () => {
        useUIStore.getState().setShowChatbar(true);
        useUIStore.getState().setShowChatbar(false);

        expect(useUIStore.getState().showChatbar).toBe(false);
      });
    });

    describe('toggleChatbar', () => {
      it('toggles from false to true', () => {
        useUIStore.getState().toggleChatbar();

        expect(useUIStore.getState().showChatbar).toBe(true);
      });

      it('toggles from true to false', () => {
        useUIStore.getState().setShowChatbar(true);
        useUIStore.getState().toggleChatbar();

        expect(useUIStore.getState().showChatbar).toBe(false);
      });

      it('can toggle multiple times', () => {
        useUIStore.getState().toggleChatbar();
        expect(useUIStore.getState().showChatbar).toBe(true);

        useUIStore.getState().toggleChatbar();
        expect(useUIStore.getState().showChatbar).toBe(false);

        useUIStore.getState().toggleChatbar();
        expect(useUIStore.getState().showChatbar).toBe(true);
      });
    });
  });

  describe('Promptbar', () => {
    describe('setShowPromptbar', () => {
      it('shows promptbar', () => {
        useUIStore.getState().setShowPromptbar(true);

        expect(useUIStore.getState().showPromptbar).toBe(true);
      });

      it('hides promptbar', () => {
        useUIStore.getState().setShowPromptbar(false);

        expect(useUIStore.getState().showPromptbar).toBe(false);
      });
    });

    describe('togglePromptbar', () => {
      it('toggles from true to false', () => {
        useUIStore.getState().togglePromptbar();

        expect(useUIStore.getState().showPromptbar).toBe(false);
      });

      it('toggles from false to true', () => {
        useUIStore.getState().setShowPromptbar(false);
        useUIStore.getState().togglePromptbar();

        expect(useUIStore.getState().showPromptbar).toBe(true);
      });

      it('can toggle multiple times', () => {
        useUIStore.getState().togglePromptbar();
        expect(useUIStore.getState().showPromptbar).toBe(false);

        useUIStore.getState().togglePromptbar();
        expect(useUIStore.getState().showPromptbar).toBe(true);

        useUIStore.getState().togglePromptbar();
        expect(useUIStore.getState().showPromptbar).toBe(false);
      });
    });
  });

  describe('Theme', () => {
    describe('setTheme', () => {
      it('sets theme to dark', () => {
        useUIStore.getState().setTheme('dark');

        expect(useUIStore.getState().theme).toBe('dark');
      });

      it('sets theme to light', () => {
        useUIStore.getState().setTheme('light');

        expect(useUIStore.getState().theme).toBe('light');
      });

      it('changes theme', () => {
        useUIStore.getState().setTheme('light');
        expect(useUIStore.getState().theme).toBe('light');

        useUIStore.getState().setTheme('dark');
        expect(useUIStore.getState().theme).toBe('dark');
      });
    });

    describe('toggleTheme', () => {
      it('toggles from dark to light', () => {
        useUIStore.getState().toggleTheme();

        expect(useUIStore.getState().theme).toBe('light');
      });

      it('toggles from light to dark', () => {
        useUIStore.getState().setTheme('light');
        useUIStore.getState().toggleTheme();

        expect(useUIStore.getState().theme).toBe('dark');
      });

      it('can toggle multiple times', () => {
        useUIStore.getState().toggleTheme();
        expect(useUIStore.getState().theme).toBe('light');

        useUIStore.getState().toggleTheme();
        expect(useUIStore.getState().theme).toBe('dark');

        useUIStore.getState().toggleTheme();
        expect(useUIStore.getState().theme).toBe('light');
      });
    });
  });

  describe('Modal States', () => {
    describe('setIsSettingsOpen', () => {
      it('opens settings', () => {
        useUIStore.getState().setIsSettingsOpen(true);

        expect(useUIStore.getState().isSettingsOpen).toBe(true);
      });

      it('closes settings', () => {
        useUIStore.getState().setIsSettingsOpen(true);
        useUIStore.getState().setIsSettingsOpen(false);

        expect(useUIStore.getState().isSettingsOpen).toBe(false);
      });
    });

    describe('setIsBotModalOpen', () => {
      it('opens bot modal', () => {
        useUIStore.getState().setIsBotModalOpen(true);

        expect(useUIStore.getState().isBotModalOpen).toBe(true);
      });

      it('closes bot modal', () => {
        useUIStore.getState().setIsBotModalOpen(true);
        useUIStore.getState().setIsBotModalOpen(false);

        expect(useUIStore.getState().isBotModalOpen).toBe(false);
      });
    });

    describe('setIsTermsModalOpen', () => {
      it('opens terms modal', () => {
        useUIStore.getState().setIsTermsModalOpen(true);

        expect(useUIStore.getState().isTermsModalOpen).toBe(true);
      });

      it('closes terms modal', () => {
        useUIStore.getState().setIsTermsModalOpen(true);
        useUIStore.getState().setIsTermsModalOpen(false);

        expect(useUIStore.getState().isTermsModalOpen).toBe(false);
      });
    });

    it('can have multiple modals open simultaneously', () => {
      useUIStore.getState().setIsSettingsOpen(true);
      useUIStore.getState().setIsBotModalOpen(true);
      useUIStore.getState().setIsTermsModalOpen(true);

      const state = useUIStore.getState();
      expect(state.isSettingsOpen).toBe(true);
      expect(state.isBotModalOpen).toBe(true);
      expect(state.isTermsModalOpen).toBe(true);
    });
  });

  describe('Loading State', () => {
    describe('setLoading', () => {
      it('sets loading to true', () => {
        useUIStore.getState().setLoading(true);

        expect(useUIStore.getState().loading).toBe(true);
      });

      it('sets loading to false', () => {
        useUIStore.getState().setLoading(true);
        useUIStore.getState().setLoading(false);

        expect(useUIStore.getState().loading).toBe(false);
      });

      it('can toggle loading multiple times', () => {
        useUIStore.getState().setLoading(true);
        expect(useUIStore.getState().loading).toBe(true);

        useUIStore.getState().setLoading(false);
        expect(useUIStore.getState().loading).toBe(false);

        useUIStore.getState().setLoading(true);
        expect(useUIStore.getState().loading).toBe(true);
      });
    });
  });

  describe('resetUI', () => {
    it('resets all state to initial values', () => {
      // Set all state to non-initial values
      useUIStore.setState({
        showChatbar: true,
        showPromptbar: false,
        theme: 'light',
        isSettingsOpen: true,
        isBotModalOpen: true,
        isTermsModalOpen: true,
        loading: true,
      });

      useUIStore.getState().resetUI();

      const state = useUIStore.getState();
      expect(state.showChatbar).toBe(false);
      expect(state.showPromptbar).toBe(true);
      expect(state.theme).toBe('dark');
      expect(state.isSettingsOpen).toBe(false);
      expect(state.isBotModalOpen).toBe(false);
      expect(state.isTermsModalOpen).toBe(false);
      expect(state.loading).toBe(false);
    });

    it('can be called on already reset state', () => {
      useUIStore.getState().resetUI();

      const state = useUIStore.getState();
      expect(state.showChatbar).toBe(false);
      expect(state.showPromptbar).toBe(true);
      expect(state.theme).toBe('dark');
      expect(state.isSettingsOpen).toBe(false);
      expect(state.isBotModalOpen).toBe(false);
      expect(state.isTermsModalOpen).toBe(false);
      expect(state.loading).toBe(false);
    });
  });

  describe('Independent State Management', () => {
    it('chatbar and promptbar are independent', () => {
      useUIStore.getState().setShowChatbar(true);
      expect(useUIStore.getState().showPromptbar).toBe(true);

      useUIStore.getState().setShowPromptbar(false);
      expect(useUIStore.getState().showChatbar).toBe(true);
    });

    it('modal states are independent', () => {
      useUIStore.getState().setIsSettingsOpen(true);
      expect(useUIStore.getState().isBotModalOpen).toBe(false);
      expect(useUIStore.getState().isTermsModalOpen).toBe(false);

      useUIStore.getState().setIsBotModalOpen(true);
      expect(useUIStore.getState().isSettingsOpen).toBe(true);
      expect(useUIStore.getState().isTermsModalOpen).toBe(false);
    });

    it('theme changes do not affect other state', () => {
      useUIStore.getState().setShowChatbar(true);
      useUIStore.getState().setIsSettingsOpen(true);

      useUIStore.getState().toggleTheme();

      expect(useUIStore.getState().showChatbar).toBe(true);
      expect(useUIStore.getState().isSettingsOpen).toBe(true);
    });

    it('loading state is independent', () => {
      useUIStore.getState().setLoading(true);

      expect(useUIStore.getState().showChatbar).toBe(false);
      expect(useUIStore.getState().isSettingsOpen).toBe(false);
    });
  });

  describe('State Isolation', () => {
    it('changes do not affect subsequent tests', () => {
      useUIStore.getState().setShowChatbar(true);
      useUIStore.getState().setTheme('light');
      useUIStore.getState().setIsSettingsOpen(true);

      // Manually reset (beforeEach also does this)
      useUIStore.setState({
        showChatbar: false,
        showPromptbar: true,
        theme: 'dark',
        isSettingsOpen: false,
        isBotModalOpen: false,
        isTermsModalOpen: false,
        loading: false,
      });

      const state = useUIStore.getState();
      expect(state.showChatbar).toBe(false);
      expect(state.theme).toBe('dark');
      expect(state.isSettingsOpen).toBe(false);
    });
  });
});
