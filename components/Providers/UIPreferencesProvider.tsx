'use client';

import { createContext, useContext, useState } from 'react';

type ThemeMode = 'light' | 'dark';

interface UIPreferences {
  showChatbar: boolean;
  showPromptbar: boolean;
  theme: ThemeMode;
}

interface UIPreferencesContextValue extends UIPreferences {
  setShowChatbar: (show: boolean) => void;
  toggleChatbar: () => void;
  setShowPromptbar: (show: boolean) => void;
  togglePromptbar: () => void;
  setTheme: (theme: ThemeMode) => void;
  toggleTheme: () => void;
}

const UIPreferencesContext = createContext<UIPreferencesContextValue | null>(
  null,
);

const STORAGE_KEY = 'ui-preferences';
const DEFAULT_PREFERENCES: UIPreferences = {
  showChatbar: false,
  showPromptbar: true,
  theme: 'dark',
};

/**
 * Simple provider for UI preferences using direct localStorage
 * No Zustand, no hydration complexity - reads from data attributes set by blocking script
 */
export function UIPreferencesProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  // Read initial state from data attributes (set by blocking script before hydration)
  // The blocking script already read from localStorage, so we don't need to read it again
  const [preferences, setPreferences] = useState<UIPreferences>(() => {
    if (typeof window === 'undefined') {
      return DEFAULT_PREFERENCES;
    }

    const sidebarState =
      document.documentElement.getAttribute('data-sidebar-state');
    const promptbarState = document.documentElement.getAttribute(
      'data-promptbar-state',
    );
    const themeState = document.documentElement.classList.contains('dark')
      ? 'dark'
      : 'light';

    return {
      showChatbar: sidebarState === 'expanded',
      showPromptbar: promptbarState !== 'collapsed', // default to true
      theme: themeState,
    };
  });

  // Save to localStorage whenever preferences change
  const updatePreferences = (updates: Partial<UIPreferences>) => {
    const newPreferences = { ...preferences, ...updates };
    setPreferences(newPreferences);

    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(newPreferences));
    } catch (e) {
      console.error('Failed to save UI preferences:', e);
    }

    // Update DOM for theme
    if (updates.theme !== undefined) {
      if (updates.theme === 'dark') {
        document.documentElement.classList.add('dark');
      } else {
        document.documentElement.classList.remove('dark');
      }
    }
  };

  const value: UIPreferencesContextValue = {
    ...preferences,
    setShowChatbar: (show: boolean) => updatePreferences({ showChatbar: show }),
    toggleChatbar: () =>
      updatePreferences({ showChatbar: !preferences.showChatbar }),
    setShowPromptbar: (show: boolean) =>
      updatePreferences({ showPromptbar: show }),
    togglePromptbar: () =>
      updatePreferences({ showPromptbar: !preferences.showPromptbar }),
    setTheme: (theme: ThemeMode) => updatePreferences({ theme }),
    toggleTheme: () =>
      updatePreferences({
        theme: preferences.theme === 'dark' ? 'light' : 'dark',
      }),
  };

  return (
    <UIPreferencesContext.Provider value={value}>
      {children}
    </UIPreferencesContext.Provider>
  );
}

export function useUIPreferences() {
  const context = useContext(UIPreferencesContext);
  if (!context) {
    throw new Error(
      'useUIPreferences must be used within UIPreferencesProvider',
    );
  }
  return context;
}
