import { create } from 'zustand';
import { OpenAIModel, OpenAIModelID } from '@/types/openai';
import { Prompt } from '@/types/prompt';
import { PluginKey } from '@/types/plugin';

interface SettingsStore {
  // State
  temperature: number;
  systemPrompt: string;
  apiKey: string;
  pluginKeys: PluginKey[];
  defaultModelId: OpenAIModelID | undefined;
  models: OpenAIModel[];
  prompts: Prompt[];

  // Server-side flags
  serverSideApiKeyIsSet: boolean;
  serverSidePluginKeysSet: boolean;

  // Actions
  setTemperature: (temperature: number) => void;
  setSystemPrompt: (prompt: string) => void;
  setApiKey: (key: string) => void;
  setPluginKeys: (keys: PluginKey[]) => void;
  setDefaultModelId: (id: OpenAIModelID | undefined) => void;
  setModels: (models: OpenAIModel[]) => void;
  setPrompts: (prompts: Prompt[]) => void;
  addPrompt: (prompt: Prompt) => void;
  updatePrompt: (id: string, updates: Partial<Prompt>) => void;
  deletePrompt: (id: string) => void;
  setServerSideApiKeyIsSet: (isSet: boolean) => void;
  setServerSidePluginKeysSet: (isSet: boolean) => void;

  // Reset
  resetSettings: () => void;
}

const DEFAULT_TEMPERATURE = 0.5;
const DEFAULT_SYSTEM_PROMPT = '';

export const useSettingsStore = create<SettingsStore>((set) => ({
  // Initial state
  temperature: DEFAULT_TEMPERATURE,
  systemPrompt: DEFAULT_SYSTEM_PROMPT,
  apiKey: '',
  pluginKeys: [],
  defaultModelId: undefined,
  models: [],
  prompts: [],
  serverSideApiKeyIsSet: false,
  serverSidePluginKeysSet: false,

  // Actions
  setTemperature: (temperature) => set({ temperature }),

  setSystemPrompt: (prompt) => set({ systemPrompt: prompt }),

  setApiKey: (key) => set({ apiKey: key }),

  setPluginKeys: (keys) => set({ pluginKeys: keys }),

  setDefaultModelId: (id) => set({ defaultModelId: id }),

  setModels: (models) => set({ models }),

  setPrompts: (prompts) => set({ prompts }),

  addPrompt: (prompt) =>
    set((state) => ({
      prompts: [...state.prompts, prompt],
    })),

  updatePrompt: (id, updates) =>
    set((state) => ({
      prompts: state.prompts.map((p) => (p.id === id ? { ...p, ...updates } : p)),
    })),

  deletePrompt: (id) =>
    set((state) => ({
      prompts: state.prompts.filter((p) => p.id !== id),
    })),

  setServerSideApiKeyIsSet: (isSet) => set({ serverSideApiKeyIsSet: isSet }),

  setServerSidePluginKeysSet: (isSet) => set({ serverSidePluginKeysSet: isSet }),

  resetSettings: () =>
    set({
      temperature: DEFAULT_TEMPERATURE,
      systemPrompt: DEFAULT_SYSTEM_PROMPT,
      apiKey: '',
      pluginKeys: [],
      prompts: [],
    }),
}));
