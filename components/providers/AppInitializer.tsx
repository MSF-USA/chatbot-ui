'use client';

import { useEffect, useRef } from 'react';
import { useConversationStore } from '@/lib/stores/conversationStore';
import { useSettingsStore } from '@/lib/stores/settingsStore';
import { OpenAIModel, OpenAIModelID, OpenAIModels } from '@/types/openai';
import { getDefaultModel, isModelDisabled } from '@/config/models';
import { LocalStorageService } from '@/lib/services/storage/localStorageService';

/**
 * AppInitializer - Handles app initialization logic
 *
 * With Zustand persist middleware, localStorage hydration is automatic.
 * This component handles:
 * 1. Automatic background data migration (from old localStorage format)
 * 2. Model filtering (based on environment config)
 * 3. Default model selection (from environment if not persisted)
 * 4. Selected conversation validation
 */
export function AppInitializer() {
  const hasLoadedRef = useRef(false);

  useEffect(() => {
    // Ensure we only initialize once, even in React StrictMode
    if (hasLoadedRef.current) return;
    hasLoadedRef.current = true;

    try {
      // Run automatic background migration first (if needed)
      // This safely copies old data to new Zustand format without deleting anything
      if (LocalStorageService.hasLegacyData()) {
        const result = LocalStorageService.migrateFromLegacy();

        if (!result.success) {
          console.error('Migration failed:', result.errors);
          // Continue anyway - stores will use defaults or partial data
        }
        // No reload needed - Zustand will use the newly created data
      }

      // Continue with normal initialization
      // Access stores directly for one-time initialization
      const { setModels, defaultModelId, setDefaultModelId } = useSettingsStore.getState();
      const { conversations, selectedConversationId, selectConversation, setIsLoaded } = useConversationStore.getState();

      // 1. Initialize models list (filtered by environment)
      const models: OpenAIModel[] = Object.values(OpenAIModels).filter(
        m => !m.isLegacy && !isModelDisabled(m.id)
      );
      setModels(models);

      // 2. Set default model if not already persisted
      if (!defaultModelId && models.length > 0) {
        const envDefaultModelId = getDefaultModel();
        const defaultModel = models.find(m => m.id === envDefaultModelId) || models[0];
        if (defaultModel) {
          setDefaultModelId(defaultModel.id as OpenAIModelID);
        }
      }

      // 3. Validate selected conversation exists
      if (selectedConversationId && !conversations.find(c => c.id === selectedConversationId)) {
        // Selected conversation no longer exists, select first available
        if (conversations.length > 0) {
          selectConversation(conversations[0].id);
        } else {
          selectConversation(null);
        }
      }

      // Mark as loaded
      setIsLoaded(true);
    } catch (error) {
      console.error('Error initializing app state:', error);
      // On error, mark as loaded anyway to prevent blocking the app
      useConversationStore.getState().setIsLoaded(true);
    }
  }, []); // Empty deps - only run once

  return null; // This component doesn't render anything
}
