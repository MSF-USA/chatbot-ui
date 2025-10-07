import { useEffect } from 'react';
import { useSettingsStore } from '@/lib/stores/settingsStore';
import {
  LocalStorageService,
  StorageKeys,
} from '@/lib/services/storage/localStorageService';
import { Prompt } from '@/types/prompt';
import { PluginKey } from '@/types/plugin';

/**
 * Hook that manages settings with localStorage persistence
 */
export function useSettings() {
  const store = useSettingsStore();

  // Load from localStorage on mount
  useEffect(() => {
    const temperature =
      LocalStorageService.get<number>(StorageKeys.TEMPERATURE) ?? 0.5;
    const systemPrompt =
      LocalStorageService.get<string>(StorageKeys.SYSTEM_PROMPT) ?? '';
    const apiKey = LocalStorageService.get<string>(StorageKeys.API_KEY) ?? '';
    const pluginKeys =
      LocalStorageService.get<PluginKey[]>(StorageKeys.PLUGIN_KEYS) ?? [];
    const prompts =
      LocalStorageService.get<Prompt[]>(StorageKeys.PROMPTS) ?? [];

    store.setTemperature(temperature);
    store.setSystemPrompt(systemPrompt);
    store.setApiKey(apiKey);
    store.setPluginKeys(pluginKeys);
    store.setPrompts(prompts);
  }, []);

  // Persist temperature
  useEffect(() => {
    LocalStorageService.set(StorageKeys.TEMPERATURE, store.temperature);
  }, [store.temperature]);

  // Persist system prompt
  useEffect(() => {
    LocalStorageService.set(StorageKeys.SYSTEM_PROMPT, store.systemPrompt);
  }, [store.systemPrompt]);

  // Persist API key
  useEffect(() => {
    LocalStorageService.set(StorageKeys.API_KEY, store.apiKey);
  }, [store.apiKey]);

  // Persist plugin keys
  useEffect(() => {
    LocalStorageService.set(StorageKeys.PLUGIN_KEYS, store.pluginKeys);
  }, [store.pluginKeys]);

  // Persist prompts
  useEffect(() => {
    LocalStorageService.set(StorageKeys.PROMPTS, store.prompts);
  }, [store.prompts]);

  return {
    // State
    temperature: store.temperature,
    systemPrompt: store.systemPrompt,
    apiKey: store.apiKey,
    pluginKeys: store.pluginKeys,
    defaultModelId: store.defaultModelId,
    models: store.models,
    prompts: store.prompts,
    serverSideApiKeyIsSet: store.serverSideApiKeyIsSet,
    serverSidePluginKeysSet: store.serverSidePluginKeysSet,

    // Actions
    setTemperature: store.setTemperature,
    setSystemPrompt: store.setSystemPrompt,
    setApiKey: store.setApiKey,
    setPluginKeys: store.setPluginKeys,
    setDefaultModelId: store.setDefaultModelId,
    setModels: store.setModels,
    addPrompt: store.addPrompt,
    updatePrompt: store.updatePrompt,
    deletePrompt: store.deletePrompt,
    setServerSideApiKeyIsSet: store.setServerSideApiKeyIsSet,
    setServerSidePluginKeysSet: store.setServerSidePluginKeysSet,
    resetSettings: store.resetSettings,
  };
}
