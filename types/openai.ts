export interface OpenAIModel {
  id: string;
  name: string;
  maxLength: number; // Input context window (in tokens)
  tokenLimit: number; // Maximum output tokens
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

  // Advanced reasoning model parameters
  reasoningEffort?: 'minimal' | 'low' | 'medium' | 'high'; // Current reasoning effort setting
  supportsReasoningEffort?: boolean; // Whether model supports reasoning_effort parameter
  supportsMinimalReasoning?: boolean; // Whether model supports 'minimal' reasoning effort (GPT-5 only)
  verbosity?: 'low' | 'medium' | 'high'; // Current verbosity setting
  supportsVerbosity?: boolean; // Whether model supports verbosity parameter

  // Special handling flags
  avoidSystemPrompt?: boolean; // For DeepSeek-R1: merge system prompt into user message
  usesResponsesAPI?: boolean; // Uses Azure responses.create() instead of chat.completions
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
    description:
      'Advanced model with Bing grounding and real-time web search capabilities.',
    isLegacy: false,
    isAgent: true,
    agentId: 'asst_Puf3ldskHlYHmW5z9aQy5fZL',
    agentEnabled: true,
    provider: 'openai',
    knowledgeCutoff: 'Real-time web search',
    sdk: 'azure-openai',
    supportsTemperature: false,
    supportsReasoningEffort: false,
    supportsVerbosity: false,
  },
  [OpenAIModelID.GPT_5]: {
    id: OpenAIModelID.GPT_5,
    name: 'GPT-5',
    maxLength: 128000,
    tokenLimit: 16000,
    modelType: 'omni',
    description:
      'Next generation model with extended context and advanced capabilities. Supports reasoning effort and verbosity controls.',
    isLegacy: false,
    provider: 'openai',
    knowledgeCutoff: 'Aug 6, 2025 8:00 PM',
    sdk: 'azure-openai',
    supportsTemperature: false,
    reasoningEffort: 'medium',
    supportsReasoningEffort: true,
    supportsMinimalReasoning: true, // GPT-5 uniquely supports 'minimal' effort
    verbosity: 'medium',
    supportsVerbosity: true,
  },
  [OpenAIModelID.GPT_5_PRO]: {
    id: OpenAIModelID.GPT_5_PRO,
    name: 'GPT-5 Pro',
    maxLength: 128000,
    tokenLimit: 16000,
    modelType: 'omni',
    description:
      'Enhanced GPT-5 with improved performance and extended capabilities. Supports reasoning effort and verbosity controls.',
    isLegacy: false,
    provider: 'openai',
    knowledgeCutoff: 'Oct 5, 2025 8:00 PM',
    sdk: 'azure-openai',
    supportsTemperature: false,
    reasoningEffort: 'medium',
    supportsReasoningEffort: true,
    supportsMinimalReasoning: true,
    verbosity: 'medium',
    supportsVerbosity: true,
  },
  [OpenAIModelID.GPT_5_CHAT]: {
    id: OpenAIModelID.GPT_5_CHAT,
    name: 'GPT-5 Chat',
    maxLength: 128000,
    tokenLimit: 16000,
    modelType: 'omni',
    description:
      'GPT-5 with enhanced emotional intelligence and mental health capabilities. Specialized for empathetic interactions with improved understanding of emotional context and supportive responses. Supports reasoning effort and verbosity controls.',
    isLegacy: false,
    provider: 'openai',
    knowledgeCutoff: 'Oct 1, 2025 8:00 PM',
    sdk: 'azure-openai',
    supportsTemperature: false,
    reasoningEffort: 'medium',
    supportsReasoningEffort: true,
    supportsMinimalReasoning: true,
    verbosity: 'medium',
    supportsVerbosity: true,
  },
  [OpenAIModelID.GPT_o3]: {
    id: OpenAIModelID.GPT_o3,
    name: 'o3-mini',
    maxLength: 200000, // ← Fixed: was 128K, actually 200K input
    tokenLimit: 100000, // ← Fixed: was 16K, actually 100K output
    stream: false,
    temperature: 1,
    modelType: 'reasoning',
    description:
      'Latest reasoning model with enhanced problem-solving capabilities and extended context. Supports reasoning effort control.',
    isLegacy: false,
    provider: 'openai',
    knowledgeCutoff: 'Apr 8, 2025 8:00 PM',
    sdk: 'azure-openai',
    supportsTemperature: false,
    reasoningEffort: 'medium',
    supportsReasoningEffort: true,
    supportsMinimalReasoning: false, // o3 doesn't support 'minimal', only low/medium/high
    supportsVerbosity: false,
  },
  [OpenAIModelID.LLAMA_4_MAVERICK]: {
    id: OpenAIModelID.LLAMA_4_MAVERICK,
    name: 'Llama 4 Maverick',
    maxLength: 128000,
    tokenLimit: 16000,
    modelType: 'foundational',
    description:
      "Meta's Llama 4 Maverick with 17B parameters and 128 expert routing for advanced reasoning.",
    isLegacy: false,
    provider: 'meta',
    knowledgeCutoff: 'May 7, 2025 7:11 AM',
    sdk: 'openai',
    supportsTemperature: true,
    deploymentName: 'Llama-4-Maverick-17B-128E-Instruct-FP8',
    supportsReasoningEffort: false,
    supportsVerbosity: false,
  },
  [OpenAIModelID.DEEPSEEK_R1]: {
    id: OpenAIModelID.DEEPSEEK_R1,
    name: 'DeepSeek-R1',
    maxLength: 128000, // ← Fixed: was 64K, actually 128K
    tokenLimit: 32768, // ← Fixed: was 8K, actually 32K
    modelType: 'reasoning',
    description:
      "DeepSeek's reasoning model with 671B params (37B active MoE). Best without system prompts - include all instructions in user messages.",
    isLegacy: false,
    provider: 'deepseek',
    knowledgeCutoff: 'Jan 20, 2025',
    sdk: 'openai',
    supportsTemperature: true,
    deploymentName: 'DeepSeek-R1',
    avoidSystemPrompt: true, // ← Special handling: merge system prompts into user messages
    supportsReasoningEffort: false,
    supportsVerbosity: false,
  },
  [OpenAIModelID.DEEPSEEK_V3_1]: {
    id: OpenAIModelID.DEEPSEEK_V3_1,
    name: 'DeepSeek-V3.1',
    maxLength: 128000, // ← Updated to match R1
    tokenLimit: 32768, // ← Updated to match R1
    modelType: 'foundational',
    description:
      'Advanced open-source model optimized for reasoning and coding tasks. Best without system prompts.',
    isLegacy: false,
    provider: 'deepseek',
    knowledgeCutoff: 'Apr 16, 2025 12:45 AM',
    sdk: 'openai',
    supportsTemperature: true,
    deploymentName: 'DeepSeek-V3.1',
    avoidSystemPrompt: true, // ← Also benefits from avoiding system prompts
    supportsReasoningEffort: false,
    supportsVerbosity: false,
  },
  [OpenAIModelID.GROK_3]: {
    id: OpenAIModelID.GROK_3,
    name: 'Grok 3',
    maxLength: 128000,
    tokenLimit: 16000,
    modelType: 'omni',
    description:
      "xAI's latest model with advanced reasoning and multimodal capabilities.",
    isLegacy: false,
    provider: 'xai',
    knowledgeCutoff: 'May 13, 2025 12:16 AM',
    sdk: 'openai',
    supportsTemperature: true,
    supportsReasoningEffort: false,
    supportsVerbosity: false,
  },
  [OpenAIModelID.GROK_4_FAST_REASONING]: {
    id: OpenAIModelID.GROK_4_FAST_REASONING,
    name: 'Grok 4 Fast Reasoning',
    maxLength: 131000, // ← Updated to 131K per documentation
    tokenLimit: 16000,
    modelType: 'reasoning',
    description:
      'Fast reasoning variant of Grok 4 optimized for quick problem-solving.',
    isLegacy: false,
    provider: 'xai',
    knowledgeCutoff: 'Jun 26, 2025 8:00 PM',
    sdk: 'openai',
    supportsTemperature: true,
    supportsReasoningEffort: false,
    supportsVerbosity: false,
  },
};
