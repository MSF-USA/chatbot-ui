import { useEffect } from 'react';
import { useSettingsStore, CustomAgent } from '@/lib/stores/settingsStore';
import {
  LocalStorageService,
  StorageKeys,
} from '@/lib/services/storage/localStorageService';

/**
 * Hook that manages custom agents with localStorage persistence
 */
export function useCustomAgents() {
  const customAgents = useSettingsStore((state) => state.customAgents);
  const setCustomAgents = useSettingsStore((state) => state.setCustomAgents);
  const addCustomAgent = useSettingsStore((state) => state.addCustomAgent);
  const updateCustomAgent = useSettingsStore((state) => state.updateCustomAgent);
  const deleteCustomAgent = useSettingsStore((state) => state.deleteCustomAgent);

  // Load custom agents from localStorage on mount
  useEffect(() => {
    const savedAgents = LocalStorageService.get<CustomAgent[]>(StorageKeys.CUSTOM_AGENTS);
    if (savedAgents && Array.isArray(savedAgents)) {
      setCustomAgents(savedAgents);
    }
  }, [setCustomAgents]);

  // Persist custom agents to localStorage whenever they change
  useEffect(() => {
    if (customAgents.length >= 0) {
      LocalStorageService.set(StorageKeys.CUSTOM_AGENTS, customAgents);
    }
  }, [customAgents]);

  return {
    customAgents,
    addCustomAgent,
    updateCustomAgent,
    deleteCustomAgent,
  };
}
