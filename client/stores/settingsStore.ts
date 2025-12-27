'use client';

import {
  DEFAULT_MODEL_ORDER,
  OpenAIModel,
  OpenAIModelID,
} from '@/types/openai';
import { Prompt } from '@/types/prompt';
import { SearchMode } from '@/types/searchMode';
import { DisplayNamePreference } from '@/types/settings';
import { Tone } from '@/types/tone';

import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';

/** Model ordering mode for the model selection UI */
export type ModelOrderMode = 'usage' | 'name' | 'cutoff' | 'custom';

export interface CustomAgent {
  id: string;
  name: string;
  agentId: string; // Azure AI Foundry agent ID
  baseModelId: OpenAIModelID;
  description?: string;
  createdAt: string;

  // Team template metadata (optional)
  templateId?: string; // Unique ID of the template this was imported from
  templateName?: string; // Human-readable name of the template
  importedAt?: string; // ISO timestamp when imported from template
}

interface SettingsStore {
  // State
  temperature: number;
  systemPrompt: string;
  defaultModelId: OpenAIModelID | undefined;
  defaultSearchMode: SearchMode;
  autoSwitchOnFailure: boolean;
  displayNamePreference: DisplayNamePreference;
  customDisplayName: string;
  models: OpenAIModel[];
  prompts: Prompt[];
  tones: Tone[];
  customAgents: CustomAgent[];

  // Model ordering state
  modelOrderMode: ModelOrderMode;
  customModelOrder: string[];
  modelUsageStats: Record<string, number>;

  // Actions
  setTemperature: (temperature: number) => void;
  setSystemPrompt: (prompt: string) => void;
  setDefaultModelId: (id: OpenAIModelID | undefined) => void;
  setDefaultSearchMode: (mode: SearchMode) => void;
  setAutoSwitchOnFailure: (enabled: boolean) => void;
  setDisplayNamePreference: (preference: DisplayNamePreference) => void;
  setCustomDisplayName: (name: string) => void;
  setModels: (models: OpenAIModel[]) => void;
  setPrompts: (prompts: Prompt[]) => void;
  addPrompt: (prompt: Prompt) => void;
  updatePrompt: (id: string, updates: Partial<Prompt>) => void;
  deletePrompt: (id: string) => void;

  // Tone Actions
  setTones: (tones: Tone[]) => void;
  addTone: (tone: Tone) => void;
  updateTone: (id: string, updates: Partial<Tone>) => void;
  deleteTone: (id: string) => void;

  // Custom Agent Actions
  setCustomAgents: (agents: CustomAgent[]) => void;
  addCustomAgent: (agent: CustomAgent) => void;
  updateCustomAgent: (id: string, updates: Partial<CustomAgent>) => void;
  deleteCustomAgent: (id: string) => void;

  // Model Ordering Actions
  setModelOrderMode: (mode: ModelOrderMode) => void;
  setCustomModelOrder: (order: string[]) => void;
  moveModelInOrder: (modelId: string, direction: 'up' | 'down') => void;
  incrementModelUsage: (modelId: string) => void;
  resetModelOrder: () => void;

  // Reset
  resetSettings: () => void;
}

const DEFAULT_TEMPERATURE = 0.5;
const DEFAULT_SYSTEM_PROMPT = '';
const DEFAULT_DISPLAY_NAME_PREFERENCE: DisplayNamePreference = 'firstName';
const DEFAULT_CUSTOM_DISPLAY_NAME = '';

export const useSettingsStore = create<SettingsStore>()(
  persist(
    (set) => ({
      // Initial state
      temperature: DEFAULT_TEMPERATURE,
      systemPrompt: DEFAULT_SYSTEM_PROMPT,
      defaultModelId: undefined,
      defaultSearchMode: SearchMode.INTELLIGENT, // Privacy-focused intelligent search by default
      autoSwitchOnFailure: false,
      displayNamePreference: DEFAULT_DISPLAY_NAME_PREFERENCE,
      customDisplayName: DEFAULT_CUSTOM_DISPLAY_NAME,
      models: [],
      prompts: [],
      tones: [],
      customAgents: [],

      // Model ordering initial state
      modelOrderMode: 'usage',
      customModelOrder: [],
      modelUsageStats: {},

      // Actions
      setTemperature: (temperature) => set({ temperature }),

      setSystemPrompt: (prompt) => set({ systemPrompt: prompt }),

      setDefaultModelId: (id) => set({ defaultModelId: id }),

      setDefaultSearchMode: (mode) => set({ defaultSearchMode: mode }),

      setAutoSwitchOnFailure: (enabled) =>
        set({ autoSwitchOnFailure: enabled }),

      setDisplayNamePreference: (preference) =>
        set({ displayNamePreference: preference }),

      setCustomDisplayName: (name) => set({ customDisplayName: name }),

      setModels: (models) => set({ models }),

      setPrompts: (prompts) => set({ prompts }),

      addPrompt: (prompt) =>
        set((state) => ({
          prompts: [...state.prompts, prompt],
        })),

      updatePrompt: (id, updates) =>
        set((state) => ({
          prompts: state.prompts.map((p) =>
            p.id === id ? { ...p, ...updates } : p,
          ),
        })),

      deletePrompt: (id) =>
        set((state) => ({
          prompts: state.prompts.filter((p) => p.id !== id),
        })),

      // Tone Actions
      setTones: (tones) => set({ tones }),

      addTone: (tone) =>
        set((state) => ({
          tones: [...state.tones, tone],
        })),

      updateTone: (id, updates) =>
        set((state) => ({
          tones: state.tones.map((t) =>
            t.id === id ? { ...t, ...updates } : t,
          ),
        })),

      deleteTone: (id) =>
        set((state) => ({
          tones: state.tones.filter((t) => t.id !== id),
        })),

      // Custom Agent Actions
      setCustomAgents: (agents) => set({ customAgents: agents }),

      addCustomAgent: (agent) =>
        set((state) => ({
          customAgents: [...state.customAgents, agent],
        })),

      updateCustomAgent: (id, updates) =>
        set((state) => ({
          customAgents: state.customAgents.map((a) =>
            a.id === id ? { ...a, ...updates } : a,
          ),
        })),

      deleteCustomAgent: (id) =>
        set((state) => ({
          customAgents: state.customAgents.filter((a) => a.id !== id),
        })),

      // Model Ordering Actions
      setModelOrderMode: (mode) => set({ modelOrderMode: mode }),

      setCustomModelOrder: (order) => set({ customModelOrder: order }),

      moveModelInOrder: (modelId, direction) =>
        set((state) => {
          // Initialize from default order if empty
          const order =
            state.customModelOrder.length > 0
              ? [...state.customModelOrder]
              : [...DEFAULT_MODEL_ORDER];

          const index = order.indexOf(modelId);
          if (index === -1) return state;

          const newIndex = direction === 'up' ? index - 1 : index + 1;
          if (newIndex < 0 || newIndex >= order.length) return state;

          // Swap the elements
          [order[index], order[newIndex]] = [order[newIndex], order[index]];

          return {
            customModelOrder: order,
            modelOrderMode: 'custom' as ModelOrderMode,
          };
        }),

      incrementModelUsage: (modelId) =>
        set((state) => ({
          modelUsageStats: {
            ...state.modelUsageStats,
            [modelId]: (state.modelUsageStats[modelId] ?? 0) + 1,
          },
        })),

      resetModelOrder: () =>
        set({
          modelOrderMode: 'usage' as ModelOrderMode,
          customModelOrder: [],
        }),

      resetSettings: () =>
        set({
          temperature: DEFAULT_TEMPERATURE,
          systemPrompt: DEFAULT_SYSTEM_PROMPT,
          defaultSearchMode: SearchMode.INTELLIGENT,
          displayNamePreference: DEFAULT_DISPLAY_NAME_PREFERENCE,
          customDisplayName: DEFAULT_CUSTOM_DISPLAY_NAME,
          prompts: [],
          tones: [],
          customAgents: [],
          modelOrderMode: 'usage' as ModelOrderMode,
          customModelOrder: [],
          modelUsageStats: {},
        }),
    }),
    {
      name: 'settings-storage',
      version: 5, // Increment this when schema changes to trigger migrations
      storage: createJSONStorage(() => localStorage),
      partialize: (state) => ({
        temperature: state.temperature,
        systemPrompt: state.systemPrompt,
        defaultModelId: state.defaultModelId,
        defaultSearchMode: state.defaultSearchMode,
        autoSwitchOnFailure: state.autoSwitchOnFailure,
        displayNamePreference: state.displayNamePreference,
        customDisplayName: state.customDisplayName,
        prompts: state.prompts,
        tones: state.tones,
        customAgents: state.customAgents,
        modelOrderMode: state.modelOrderMode,
        customModelOrder: state.customModelOrder,
        modelUsageStats: state.modelUsageStats,
      }),
      migrate: (persistedState, version) => {
        const state = persistedState as Record<string, unknown>;

        // Version 4 → 5: Convert 'default' mode to 'usage'
        if (version < 5 && state.modelOrderMode === 'default') {
          state.modelOrderMode = 'usage';
        }

        return state;
      },
    },
  ),
);
