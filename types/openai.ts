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
  provider?: 'openai' | 'deepseek' | 'xai' | 'meta'; // Model provider
  knowledgeCutoff?: string; // Knowledge cutoff date
  sdk?: 'azure-openai' | 'openai'; // Which SDK this model requires
  supportsTemperature?: boolean; // Whether this model supports custom temperature values
  deploymentName?: string; // Azure AI Foundry deployment name (for third-party models)
}

export enum OpenAIModelID {
  GPT_4_1 = 'gpt-4.1',
  GPT_5 = 'gpt-5',
  GPT_5_PRO = 'gpt-5-pro',
  GPT_5_CHAT = 'gpt-5-chat',
  GPT_o3 = 'o3',
  LLAMA_4_MAVERICK = 'Llama-4-Maverick-17B-128E-Instruct-FP8',
  DEEPSEEK_R1 = 'DeepSeek-R1',
  DEEPSEEK_V3_1 = 'DeepSeek-V3.1',
  GROK_3 = 'grok-3',
  GROK_4_FAST_REASONING = 'grok-4-fast-reasoning',
}

export enum OpenAIVisionModelID {
  GPT_4_1 = 'gpt-4.1',
  GPT_5 = 'gpt-5',
  GPT_5_PRO = 'gpt-5-pro',
  GPT_5_CHAT = 'gpt-5-chat',
  GROK_3 = 'grok-3',
  GROK_4_FAST_REASONING = 'grok-4-fast-reasoning',
}

// Fallback model ID
export const fallbackModelID = OpenAIModelID.GPT_4_1;

export const OpenAIModels: Record<OpenAIModelID, OpenAIModel> = {
  [OpenAIModelID.GPT_4_1]: {
    id: OpenAIModelID.GPT_4_1,
    name: 'GPT-4.1',
    maxLength: 128000,
    tokenLimit: 16000,
    modelType: 'agent',
    description: 'Advanced model with Bing grounding and real-time web search capabilities.',
    isLegacy: false,
    isAgent: true,
    agentId: 'asst_Puf3ldskHlYHmW5z9aQy5fZL',
    agentEnabled: true,
    provider: 'openai',
    knowledgeCutoff: 'Real-time web search',
    sdk: 'azure-openai',
    supportsTemperature: false,
  },
  [OpenAIModelID.GPT_5]: {
    id: OpenAIModelID.GPT_5,
    name: 'GPT-5',
    maxLength: 128000,
    tokenLimit: 16000,
    modelType: 'omni',
    description: 'Next generation model with extended context and advanced capabilities.',
    isLegacy: false,
    provider: 'openai',
    knowledgeCutoff: 'Aug 6, 2025 8:00 PM',
    sdk: 'azure-openai',
    supportsTemperature: false,
  },
  [OpenAIModelID.GPT_5_PRO]: {
    id: OpenAIModelID.GPT_5_PRO,
    name: 'GPT-5 Pro',
    maxLength: 128000,
    tokenLimit: 16000,
    modelType: 'omni',
    description: 'Enhanced GPT-5 with improved performance and extended capabilities.',
    isLegacy: false,
    provider: 'openai',
    knowledgeCutoff: 'Oct 5, 2025 8:00 PM',
    sdk: 'azure-openai',
    supportsTemperature: false,
  },
  [OpenAIModelID.GPT_5_CHAT]: {
    id: OpenAIModelID.GPT_5_CHAT,
    name: 'GPT-5 Chat',
    maxLength: 128000,
    tokenLimit: 16000,
    modelType: 'omni',
    description: 'GPT-5 with enhanced emotional intelligence and mental health capabilities. Specialized for empathetic interactions with improved understanding of emotional context and supportive responses.',
    isLegacy: false,
    provider: 'openai',
    knowledgeCutoff: 'Oct 1, 2025 8:00 PM',
    sdk: 'azure-openai',
    supportsTemperature: false,
  },
  [OpenAIModelID.GPT_o3]: {
    id: OpenAIModelID.GPT_o3,
    name: 'o3',
    maxLength: 128000,
    tokenLimit: 16000,
    stream: false,
    temperature: 1,
    modelType: 'reasoning',
    description: 'Latest reasoning model with enhanced problem-solving capabilities and extended context.',
    isLegacy: false,
    provider: 'openai',
    knowledgeCutoff: 'Apr 8, 2025 8:00 PM',
    sdk: 'azure-openai',
    supportsTemperature: false,
  },
  [OpenAIModelID.LLAMA_4_MAVERICK]: {
    id: OpenAIModelID.LLAMA_4_MAVERICK,
    name: 'Llama 4 Maverick',
    maxLength: 128000,
    tokenLimit: 16000,
    modelType: 'foundational',
    description: 'Meta\'s Llama 4 Maverick with 17B parameters and 128 expert routing for advanced reasoning.',
    isLegacy: false,
    provider: 'meta',
    knowledgeCutoff: 'May 7, 2025 7:11 AM',
    sdk: 'openai',
    supportsTemperature: true,
    deploymentName: 'Llama-4-Maverick-17B-128E-Instruct-FP8',
  },
  [OpenAIModelID.DEEPSEEK_R1]: {
    id: OpenAIModelID.DEEPSEEK_R1,
    name: 'DeepSeek-R1',
    maxLength: 64000,
    tokenLimit: 8000,
    modelType: 'reasoning',
    description: 'DeepSeek\'s reasoning model with advanced problem-solving capabilities.',
    isLegacy: false,
    provider: 'deepseek',
    knowledgeCutoff: 'Jan 20, 2025',
    sdk: 'openai',
    supportsTemperature: true,
    deploymentName: 'DeepSeek-R1', // Must match Azure AI Foundry deployment name
  },
  [OpenAIModelID.DEEPSEEK_V3_1]: {
    id: OpenAIModelID.DEEPSEEK_V3_1,
    name: 'DeepSeek-V3.1',
    maxLength: 64000,
    tokenLimit: 8000,
    modelType: 'foundational',
    description: 'Advanced open-source model optimized for reasoning and coding tasks.',
    isLegacy: false,
    provider: 'deepseek',
    knowledgeCutoff: 'Apr 16, 2025 12:45 AM',
    sdk: 'openai',
    supportsTemperature: true,
    deploymentName: 'DeepSeek-V3.1', // Must match Azure AI Foundry deployment name
  },
  [OpenAIModelID.GROK_3]: {
    id: OpenAIModelID.GROK_3,
    name: 'Grok 3',
    maxLength: 128000,
    tokenLimit: 16000,
    modelType: 'omni',
    description: 'xAI\'s latest model with advanced reasoning and multimodal capabilities.',
    isLegacy: false,
    provider: 'xai',
    knowledgeCutoff: 'May 13, 2025 12:16 AM',
    sdk: 'openai',
    supportsTemperature: true,
  },
  [OpenAIModelID.GROK_4_FAST_REASONING]: {
    id: OpenAIModelID.GROK_4_FAST_REASONING,
    name: 'Grok 4 Fast Reasoning',
    maxLength: 128000,
    tokenLimit: 16000,
    stream: false,
    temperature: 1,
    modelType: 'reasoning',
    description: 'Fast reasoning variant of Grok 4 optimized for quick problem-solving.',
    isLegacy: false,
    provider: 'xai',
    knowledgeCutoff: 'Jun 26, 2025 8:00 PM',
    sdk: 'openai',
    supportsTemperature: true,
  },
};
