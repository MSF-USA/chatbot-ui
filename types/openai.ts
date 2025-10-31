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
  azureAgentMode?: boolean; // Whether Azure Agent Mode is enabled (direct AI Foundry routing)
  searchModeEnabled?: boolean; // Whether search mode is enabled (tool-aware routing)
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
  GPT_5_CHAT = 'gpt-5-chat',
  GPT_o3 = 'o3',
  LLAMA_4_MAVERICK = 'Llama-4-Maverick-17B-128E-Instruct-FP8',
  DEEPSEEK_R1 = 'DeepSeek-R1',
  DEEPSEEK_V3_1 = 'DeepSeek-V3.1',
  GROK_3 = 'grok-3',
}

export enum OpenAIVisionModelID {
  GPT_4_1 = 'gpt-4.1',
  GPT_5 = 'gpt-5',
  GPT_5_CHAT = 'gpt-5-chat',
  GROK_3 = 'grok-3',
}

// Fallback model ID
export const fallbackModelID = OpenAIModelID.GPT_4_1;

// Environment-specific model configurations
const OpenAIModelsDev: Record<OpenAIModelID, OpenAIModel> = {
  [OpenAIModelID.GPT_4_1]: {
    id: OpenAIModelID.GPT_4_1,
    name: 'GPT-4.1',
    maxLength: 128000,
    tokenLimit: 16000,
    modelType: 'agent',
    description:
      'AI model powered by GPT-4.1 with real-time web search via Bing. Provides up-to-date information, fact-checking, and current event awareness. Best for research requiring recent information, news analysis, and fact verification.',
    isLegacy: false,
    isAgent: true,
    agentId: 'asst_Puf3ldskHlYHmW5z9aQy5fZL', // Dev agent ID
    azureAgentMode: false, // Azure Agent Mode (direct AI Foundry) - off by default
    searchModeEnabled: true, // Search mode enabled by default
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
      "OpenAI's most advanced model, excelling at complex reasoning, code generation, and technical problem-solving. Best for analytical tasks, programming challenges, research, and detailed explanations. Supports adjustable reasoning effort and response verbosity.",
    isLegacy: false,
    searchModeEnabled: true, // Search mode enabled by default
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
  [OpenAIModelID.GPT_5_CHAT]: {
    id: OpenAIModelID.GPT_5_CHAT,
    name: 'GPT-5 Chat',
    maxLength: 128000,
    tokenLimit: 16000,
    modelType: 'omni',
    description:
      'Specialized variant of GPT-5 optimized for conversational interactions and emotional intelligence. Excels at empathetic communication, mental health support, creative writing, brainstorming, and natural dialogue. Best for casual conversations, counseling scenarios, and tasks requiring emotional awareness.',
    isLegacy: false,
    searchModeEnabled: true,
    provider: 'openai',
    knowledgeCutoff: 'Oct 1, 2025 8:00 PM',
    sdk: 'azure-openai',
    supportsTemperature: false,
    supportsReasoningEffort: false,
    supportsVerbosity: false,
  },
  [OpenAIModelID.GPT_o3]: {
    id: OpenAIModelID.GPT_o3,
    name: 'o3',
    maxLength: 200000, // ← Fixed: was 128K, actually 200K input
    tokenLimit: 100000, // ← Fixed: was 16K, actually 100K output
    stream: false,
    temperature: 1,
    modelType: 'reasoning',
    description:
      "OpenAI's most advanced reasoning model with breakthrough problem-solving capabilities. Excels at complex mathematics, scientific reasoning, coding challenges, and multi-step logical tasks. Extended 200K context window. Supports reasoning effort control.",
    isLegacy: false,
    searchModeEnabled: true,
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
      'Fast and cost-effective model from Meta. Great for everyday tasks like writing, summarization, and basic coding help. Good balance of speed and quality for routine work.',
    isLegacy: false,
    searchModeEnabled: true,
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
      'Reasoning specialist that shows its work step-by-step. Excellent for math problems, logic puzzles, and understanding complex concepts. See how it thinks through problems in real-time.',
    isLegacy: false,
    searchModeEnabled: true,
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
      'Strong all-around model especially good at coding and technical writing. Great for debugging code, writing documentation, and explaining technical concepts. Fast and reliable for development work.',
    isLegacy: false,
    searchModeEnabled: true,
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
      'Versatile model from xAI known for nuanced responses. Great for open-ended discussions, creative projects, and tackling complex problems.',
    isLegacy: true, // Disabled temporarily
    provider: 'xai',
    knowledgeCutoff: 'May 13, 2025 12:16 AM',
    sdk: 'openai',
    supportsTemperature: true,
    supportsReasoningEffort: false,
    supportsVerbosity: false,
  },
};

const OpenAIModelsProd: Record<OpenAIModelID, OpenAIModel> = {
  [OpenAIModelID.GPT_4_1]: {
    id: OpenAIModelID.GPT_4_1,
    name: 'GPT-4.1',
    maxLength: 128000,
    tokenLimit: 16000,
    modelType: 'agent',
    description:
      'AI model powered by GPT-4.1 with real-time web search via Bing. Provides up-to-date information, fact-checking, and current event awareness. Best for research requiring recent information, news analysis, and fact verification.',
    isLegacy: false,
    isAgent: true,
    agentId: 'asst_PROD_AGENT_ID_PLACEHOLDER', // Production agent ID - set in Terraform
    azureAgentMode: false, // Azure Agent Mode (direct AI Foundry) - off by default
    searchModeEnabled: true, // Search mode enabled by default
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
      "OpenAI's most advanced model, excelling at complex reasoning, code generation, and technical problem-solving. Best for analytical tasks, programming challenges, research, and detailed explanations. Supports adjustable reasoning effort and response verbosity.",
    isLegacy: false,
    searchModeEnabled: true,
    provider: 'openai',
    knowledgeCutoff: 'Aug 6, 2025 8:00 PM',
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
      'Specialized variant of GPT-5 optimized for conversational interactions and emotional intelligence. Excels at empathetic communication, mental health support, creative writing, brainstorming, and natural dialogue. Best for casual conversations, counseling scenarios, and tasks requiring emotional awareness.',
    isLegacy: false,
    searchModeEnabled: true,
    provider: 'openai',
    knowledgeCutoff: 'Oct 1, 2025 8:00 PM',
    sdk: 'azure-openai',
    supportsTemperature: false,
    supportsReasoningEffort: false,
    supportsVerbosity: false,
  },
  [OpenAIModelID.GPT_o3]: {
    id: OpenAIModelID.GPT_o3,
    name: 'o3',
    maxLength: 200000,
    tokenLimit: 100000,
    stream: false,
    temperature: 1,
    modelType: 'reasoning',
    description:
      "OpenAI's most advanced reasoning model with breakthrough problem-solving capabilities. Excels at complex mathematics, scientific reasoning, coding challenges, and multi-step logical tasks. Extended 200K context window. Supports reasoning effort control.",
    isLegacy: false,
    searchModeEnabled: true,
    provider: 'openai',
    knowledgeCutoff: 'Apr 8, 2025 8:00 PM',
    sdk: 'azure-openai',
    supportsTemperature: false,
    reasoningEffort: 'medium',
    supportsReasoningEffort: true,
    supportsMinimalReasoning: false,
    supportsVerbosity: false,
  },
  [OpenAIModelID.LLAMA_4_MAVERICK]: {
    id: OpenAIModelID.LLAMA_4_MAVERICK,
    name: 'Llama 4 Maverick',
    maxLength: 128000,
    tokenLimit: 16000,
    modelType: 'foundational',
    description:
      'Fast and cost-effective model from Meta. Great for everyday tasks like writing, summarization, and basic coding help. Good balance of speed and quality for routine work.',
    isLegacy: false,
    searchModeEnabled: true,
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
    maxLength: 128000,
    tokenLimit: 32768,
    modelType: 'reasoning',
    description:
      'Reasoning specialist that shows its work step-by-step. Excellent for math problems, logic puzzles, and understanding complex concepts. See how it thinks through problems in real-time.',
    isLegacy: false,
    searchModeEnabled: true,
    provider: 'deepseek',
    knowledgeCutoff: 'Jan 20, 2025',
    sdk: 'openai',
    supportsTemperature: true,
    deploymentName: 'DeepSeek-R1',
    avoidSystemPrompt: true,
    supportsReasoningEffort: false,
    supportsVerbosity: false,
  },
  [OpenAIModelID.DEEPSEEK_V3_1]: {
    id: OpenAIModelID.DEEPSEEK_V3_1,
    name: 'DeepSeek-V3.1',
    maxLength: 128000,
    tokenLimit: 32768,
    modelType: 'foundational',
    description:
      'Strong all-around model especially good at coding and technical writing. Great for debugging code, writing documentation, and explaining technical concepts. Fast and reliable for development work.',
    isLegacy: false,
    searchModeEnabled: true,
    provider: 'deepseek',
    knowledgeCutoff: 'Apr 16, 2025 12:45 AM',
    sdk: 'openai',
    supportsTemperature: true,
    deploymentName: 'DeepSeek-V3.1',
    avoidSystemPrompt: true,
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
      'Versatile model from xAI known for nuanced responses. Great for open-ended discussions, creative projects, and tackling complex problems.',
    isLegacy: true,
    provider: 'xai',
    knowledgeCutoff: 'May 13, 2025 12:16 AM',
    sdk: 'openai',
    supportsTemperature: true,
    supportsReasoningEffort: false,
    supportsVerbosity: false,
  },
};

// Select the appropriate configuration based on environment
// NEXT_PUBLIC_ENV is set in .env files: 'localhost', 'development', 'staging', 'beta', 'production'
const environment = process.env.NEXT_PUBLIC_ENV || 'localhost';
const isProduction = environment === 'production' || environment === 'beta';

export const OpenAIModels: Record<OpenAIModelID, OpenAIModel> = isProduction
  ? OpenAIModelsProd
  : OpenAIModelsDev;
