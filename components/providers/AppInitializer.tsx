'use client';

import { useEffect, useRef } from 'react';
import { useConversationStore } from '@/lib/stores/conversationStore';
import { useSettingsStore } from '@/lib/stores/settingsStore';
import { useUIStore } from '@/lib/stores/uiStore';
import {
  LocalStorageService,
  StorageKeys,
} from '@/lib/services/storage/localStorageService';
import { Conversation } from '@/types/chat';
import { FolderInterface } from '@/types/folder';
import { Prompt } from '@/types/prompt';
import { PluginKey } from '@/types/plugin';
import { OpenAIModel, OpenAIModelID, OpenAIModels } from '@/types/openai';
import { getDefaultModel, isModelDisabled } from '@/config/models';

/**
 * AppInitializer - Centralized initialization for all app state
 *
 * Loads data from localStorage in the correct order:
 * 1. UI state (theme, sidebar visibility)
 * 2. Settings (temperature, prompts, API keys, defaultModelId)
 * 3. Models (filtered based on environment)
 * 4. Conversations (needs models to be available)
 *
 * This ensures only ONE localStorage read per key on app startup,
 * preventing performance issues from multiple simultaneous reads.
 */
export function AppInitializer() {
  const hasLoadedRef = useRef(false);

  // Get store setters
  const uiStore = useUIStore();
  const settingsStore = useSettingsStore();
  const conversationStore = useConversationStore();

  useEffect(() => {
    // Ensure we only load once, even in React StrictMode
    if (hasLoadedRef.current) return;
    hasLoadedRef.current = true;

    try {
      // 1. Load UI state first (especially theme for visual consistency)
      const showChatbar =
        LocalStorageService.get<boolean>(StorageKeys.SHOW_CHATBAR) ?? false;
      const showPromptbar =
        LocalStorageService.get<boolean>(StorageKeys.SHOW_PROMPTBAR) ?? true;
      const theme =
        LocalStorageService.get<'light' | 'dark'>(StorageKeys.THEME) ?? 'dark';

      uiStore.setShowChatbar(showChatbar);
      uiStore.setShowPromptbar(showPromptbar);
      uiStore.setTheme(theme);

      // Apply theme to document immediately
      if (theme === 'dark') {
        document.documentElement.classList.add('dark');
      } else {
        document.documentElement.classList.remove('dark');
      }

      // 2. Load settings
      const temperature =
        LocalStorageService.get<number>(StorageKeys.TEMPERATURE) ?? 0.5;
      const systemPrompt =
        LocalStorageService.get<string>(StorageKeys.SYSTEM_PROMPT) ?? '';
      const apiKey = LocalStorageService.get<string>(StorageKeys.API_KEY) ?? '';
      const pluginKeys =
        LocalStorageService.get<PluginKey[]>(StorageKeys.PLUGIN_KEYS) ?? [];
      const prompts =
        LocalStorageService.get<Prompt[]>(StorageKeys.PROMPTS) ?? [];
      const defaultModelId =
        LocalStorageService.get<OpenAIModelID>(StorageKeys.DEFAULT_MODEL_ID);

      settingsStore.setTemperature(temperature);
      settingsStore.setSystemPrompt(systemPrompt);
      settingsStore.setApiKey(apiKey);
      settingsStore.setPluginKeys(pluginKeys);
      settingsStore.setPrompts(prompts);

      // 3. Load models (filtered by environment)
      const models: OpenAIModel[] = Object.values(OpenAIModels).filter(
        m => !m.isLegacy && !isModelDisabled(m.id)
      );
      settingsStore.setModels(models);

      // Set default model (from localStorage or environment config)
      if (defaultModelId) {
        settingsStore.setDefaultModelId(defaultModelId);
      } else {
        const envDefaultModelId = getDefaultModel();
        const defaultModel = models.find(m => m.id === envDefaultModelId) || models[0];
        if (defaultModel) {
          settingsStore.setDefaultModelId(defaultModel.id as OpenAIModelID);
        }
      }

      // 4. Load conversations (needs models to be available for validation)
      const savedConversations =
        LocalStorageService.get<Conversation[]>(StorageKeys.CONVERSATIONS) || [];
      const savedFolders =
        LocalStorageService.get<FolderInterface[]>(StorageKeys.FOLDERS) || [];
      const selectedId =
        LocalStorageService.get<string>(StorageKeys.SELECTED_CONVERSATION_ID) ||
        null;

      conversationStore.setConversations(savedConversations);
      conversationStore.setFolders(savedFolders);

      // Validate that selectedId exists in conversations
      if (selectedId && savedConversations.find(c => c.id === selectedId)) {
        conversationStore.selectConversation(selectedId);
      } else if (savedConversations.length > 0) {
        // If no valid selection, select the first conversation
        conversationStore.selectConversation(savedConversations[0].id);
      }

      // Mark conversations as loaded
      conversationStore.setIsLoaded(true);
    } catch (error) {
      console.error('Error initializing app state from localStorage:', error);
      // On error, mark as loaded anyway to prevent blocking the app
      conversationStore.setIsLoaded(true);
    }
  }, [uiStore, settingsStore, conversationStore]);

  return null; // This component doesn't render anything
}
