import { useSettingsStore } from '@/lib/stores/settingsStore';

/**
 * Hook that manages settings
 * Persistence is handled automatically by Zustand persist middleware
 */
export function useSettings() {
  const store = useSettingsStore();

  return {
    // State
    temperature: store.temperature,
    systemPrompt: store.systemPrompt,
    defaultModelId: store.defaultModelId,
    models: store.models,
    prompts: store.prompts,

    // Actions
    setTemperature: store.setTemperature,
    setSystemPrompt: store.setSystemPrompt,
    setDefaultModelId: store.setDefaultModelId,
    setModels: store.setModels,
    addPrompt: store.addPrompt,
    updatePrompt: store.updatePrompt,
    deletePrompt: store.deletePrompt,
    resetSettings: store.resetSettings,
  };
}
