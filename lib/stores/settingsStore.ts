import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import { OpenAIModel, OpenAIModelID } from '@/types/openai';
import { Prompt } from '@/types/prompt';

export interface CustomAgent {
  id: string;
  name: string;
  agentId: string;  // Azure AI Foundry agent ID
  baseModelId: OpenAIModelID;
  description?: string;
  createdAt: string;
}

interface SettingsStore {
  // State
  temperature: number;
  systemPrompt: string;
  defaultModelId: OpenAIModelID | undefined;
  models: OpenAIModel[];
  prompts: Prompt[];
  customAgents: CustomAgent[];

  // Streaming settings
  smoothStreamingEnabled: boolean;
  charsPerFrame: number;
  frameDelay: number;

  // Actions
  setTemperature: (temperature: number) => void;
  setSystemPrompt: (prompt: string) => void;
  setDefaultModelId: (id: OpenAIModelID | undefined) => void;
  setModels: (models: OpenAIModel[]) => void;
  setPrompts: (prompts: Prompt[]) => void;
  addPrompt: (prompt: Prompt) => void;
  updatePrompt: (id: string, updates: Partial<Prompt>) => void;
  deletePrompt: (id: string) => void;

  // Streaming Actions
  setSmoothStreamingEnabled: (enabled: boolean) => void;
  setCharsPerFrame: (chars: number) => void;
  setFrameDelay: (delay: number) => void;

  // Custom Agent Actions
  setCustomAgents: (agents: CustomAgent[]) => void;
  addCustomAgent: (agent: CustomAgent) => void;
  updateCustomAgent: (id: string, updates: Partial<CustomAgent>) => void;
  deleteCustomAgent: (id: string) => void;

  // Reset
  resetSettings: () => void;
}

const DEFAULT_TEMPERATURE = 0.5;
const DEFAULT_SYSTEM_PROMPT = '';
const DEFAULT_SMOOTH_STREAMING_ENABLED = true;
const DEFAULT_CHARS_PER_FRAME = 3;
const DEFAULT_FRAME_DELAY = 10;

export const useSettingsStore = create<SettingsStore>()(
  persist(
    (set) => ({
  // Initial state
  temperature: DEFAULT_TEMPERATURE,
  systemPrompt: DEFAULT_SYSTEM_PROMPT,
  defaultModelId: undefined,
  models: [],
  prompts: [],
  customAgents: [],
  smoothStreamingEnabled: DEFAULT_SMOOTH_STREAMING_ENABLED,
  charsPerFrame: DEFAULT_CHARS_PER_FRAME,
  frameDelay: DEFAULT_FRAME_DELAY,

  // Actions
  setTemperature: (temperature) => set({ temperature }),

  setSystemPrompt: (prompt) => set({ systemPrompt: prompt }),

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

  // Streaming Actions
  setSmoothStreamingEnabled: (enabled) => set({ smoothStreamingEnabled: enabled }),

  setCharsPerFrame: (chars) => set({ charsPerFrame: chars }),

  setFrameDelay: (delay) => set({ frameDelay: delay }),

  // Custom Agent Actions
  setCustomAgents: (agents) => set({ customAgents: agents }),

  addCustomAgent: (agent) =>
    set((state) => ({
      customAgents: [...state.customAgents, agent],
    })),

  updateCustomAgent: (id, updates) =>
    set((state) => ({
      customAgents: state.customAgents.map((a) =>
        a.id === id ? { ...a, ...updates } : a
      ),
    })),

  deleteCustomAgent: (id) =>
    set((state) => ({
      customAgents: state.customAgents.filter((a) => a.id !== id),
    })),

  resetSettings: () =>
    set({
      temperature: DEFAULT_TEMPERATURE,
      systemPrompt: DEFAULT_SYSTEM_PROMPT,
      prompts: [],
      customAgents: [],
      smoothStreamingEnabled: DEFAULT_SMOOTH_STREAMING_ENABLED,
      charsPerFrame: DEFAULT_CHARS_PER_FRAME,
      frameDelay: DEFAULT_FRAME_DELAY,
    }),
    }),
    {
      name: 'settings-storage',
      version: 1, // Increment this when schema changes to trigger migrations
      storage: createJSONStorage(() => localStorage),
      partialize: (state) => ({
        temperature: state.temperature,
        systemPrompt: state.systemPrompt,
        defaultModelId: state.defaultModelId,
        prompts: state.prompts,
        customAgents: state.customAgents,
        smoothStreamingEnabled: state.smoothStreamingEnabled,
        charsPerFrame: state.charsPerFrame,
        frameDelay: state.frameDelay,
      }),
    }
  )
);
