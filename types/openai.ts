export interface OpenAIModel {
  id: string;
  name: string;
  maxLength: number; // maximum length of a message
  tokenLimit: number;
  temperature?: number;
  stream?: boolean;
  modelType?: 'foundational' | 'omni' | 'reasoning' | 'agent';
  description?: string;
  isLegacy?: boolean;
  isAgent?: boolean;
  agentId?: string; // Azure AI Agent ID for this model
  agentEnabled?: boolean; // Whether agent mode is currently enabled
}

export enum OpenAIModelID {
  GPT_3_5 = 'gpt-35-turbo',
  GPT_4o = 'gpt-4o',
  GPT_4o_mini = 'gpt-4o-mini',
  GPT_4 = 'gpt-4',
  GPT_41 = 'gpt-4.1',
  GPT_45 = 'gpt-45',
  GPT_5 = 'gpt-5',
  GPT_o1 = 'gpt-o1',
  GPT_o1_mini = 'gpt-o1-mini',
  GPT_o3_mini = 'o3-mini',
}

export enum OpenAIVisionModelID {
  GPT_4o = 'gpt-4o',
  GPT_4_VISION = 'gpt-4-vision-preview',
  GPT_5 = 'gpt-5',
}

// Fallback model ID
export const fallbackModelID = OpenAIModelID.GPT_4o;

export const OpenAIModels: Record<OpenAIModelID, OpenAIModel> = {
  [OpenAIModelID.GPT_3_5]: {
    id: OpenAIModelID.GPT_3_5,
    name: 'GPT-3.5',
    maxLength: 12000,
    tokenLimit: 4000,
    modelType: 'foundational',
    description: 'Fast and efficient for simple tasks. Legacy model with limitations.',
    isLegacy: true,
    agentId: 'asst_gpt35_agent',
  },
  [OpenAIModelID.GPT_4]: {
    id: OpenAIModelID.GPT_4,
    name: 'GPT-4',
    maxLength: 24000,
    tokenLimit: 8000,
    modelType: 'foundational',
    description: 'Advanced reasoning and analysis. Legacy model superseded by GPT-4o.',
    isLegacy: true,
    agentId: 'asst_gpt4_agent',
  },
  [OpenAIModelID.GPT_4o]: {
    id: OpenAIModelID.GPT_4o,
    name: 'GPT-4o',
    maxLength: 80000,
    tokenLimit: 8000,
    modelType: 'omni',
    description: 'Most capable omni-modal model. Excellent for complex tasks, vision, and file analysis.',
    isLegacy: false,
    agentId: 'asst_YE2WCgckdGgcD2nGtiWOhKhM',
  },
  [OpenAIModelID.GPT_4o_mini]: {
    id: OpenAIModelID.GPT_4o_mini,
    name: 'GPT-4o-mini',
    maxLength: 80000,
    tokenLimit: 8000,
    modelType: 'omni',
    description: 'Faster and more affordable version of GPT-4o. Great balance of speed and capability.',
    isLegacy: false,
    agentId: 'asst_gpt4omini_agent',
  },
  [OpenAIModelID.GPT_41]: {
    id: OpenAIModelID.GPT_41,
    name: 'GPT-4.1',
    maxLength: 80000,
    tokenLimit: 8000,
    modelType: 'foundational',
    description: 'Enhanced GPT-4 with improved performance and accuracy.',
    isLegacy: false,
    agentId: 'asst_gpt41_agent',
  },
  [OpenAIModelID.GPT_45]: {
    id: OpenAIModelID.GPT_45,
    name: 'gpt-4.5-preview',
    maxLength: 80000,
    tokenLimit: 8000,
    modelType: 'foundational',
    description: 'Preview of GPT-4.5. May have reliability issues.',
    isLegacy: true,
    agentId: 'asst_gpt45_agent',
  },
  [OpenAIModelID.GPT_5]: {
    id: OpenAIModelID.GPT_5,
    name: 'GPT-5',
    maxLength: 128000,
    tokenLimit: 16000,
    modelType: 'omni',
    description: 'Next generation model with extended context and advanced capabilities.',
    isLegacy: false,
  },
  [OpenAIModelID.GPT_o1]: {
    id: OpenAIModelID.GPT_o1,
    name: 'o1',
    maxLength: 80000,
    tokenLimit: 8000,
    stream: false,
    temperature: 1,
    modelType: 'reasoning',
    description: 'Optimized for complex reasoning tasks. Uses chain-of-thought processing.',
    isLegacy: false,
  },
  [OpenAIModelID.GPT_o1_mini]: {
    id: OpenAIModelID.GPT_o1_mini,
    name: 'o1-mini',
    maxLength: 80000,
    tokenLimit: 8000,
    stream: false,
    temperature: 1,
    modelType: 'reasoning',
    description: 'Faster reasoning model. Good for STEM and coding tasks.',
    isLegacy: false,
  },
  [OpenAIModelID.GPT_o3_mini]: {
    id: OpenAIModelID.GPT_o3_mini,
    name: 'o3-mini',
    maxLength: 80000,
    tokenLimit: 8000,
    stream: false,
    temperature: 1,
    modelType: 'reasoning',
    description: 'Advanced reasoning model with improved performance on complex problems.',
    isLegacy: false,
  },
};
