import { Session } from 'next-auth';

import { Conversation, Message } from '@/types/chat';
import { ErrorMessage } from '@/types/error';
import { FolderInterface } from '@/types/folder';
import { OpenAIModel, OpenAIModelID } from '@/types/openai';
import { PluginKey } from '@/types/plugin';
import { Prompt } from '@/types/prompt';
import { AgentSettings } from '@/types/settings';
import { AgentType } from '@/types/agent';

export interface HomeInitialState {
  user?: Session['user'];
  apiKey: string;
  pluginKeys: PluginKey[];
  loading: boolean;
  lightMode: 'light' | 'dark';
  messageIsStreaming: boolean;
  modelError: ErrorMessage | null;
  models: OpenAIModel[];
  folders: FolderInterface[];
  conversations: Conversation[];
  selectedConversation: Conversation | undefined;
  currentMessage: Message | undefined;
  prompts: Prompt[];
  temperature: number;
  showChatbar: boolean;
  showPromptbar: boolean;
  systemPrompt: string;
  currentFolder: FolderInterface | undefined;
  messageError: boolean;
  searchTerm: string;
  defaultModelId: OpenAIModelID | undefined;
  serverSideApiKeyIsSet: boolean;
  serverSidePluginKeysSet: boolean;
  // Agent settings for agentic chat functionality
  agentSettings: AgentSettings;
  agentRoutingEnabled: boolean;
}

/**
 * Create default agent settings
 */
const createDefaultAgentSettings = (): AgentSettings => ({
  enabled: true,
  confidenceThreshold: 0.5, // Lowered to capture web search queries (0.6-0.7 range)
  fallbackEnabled: true, // Always fallback to standard chat if agents fail
  enabledAgentTypes: [
    AgentType.WEB_SEARCH,
    AgentType.URL_PULL,
    AgentType.LOCAL_KNOWLEDGE,
    AgentType.CODE_INTERPRETER,
  ],
  agentConfigurations: {
    [AgentType.WEB_SEARCH]: {
      enabled: true,
      priority: 1,
      timeout: 30000,
      maxRetries: 2,
      confidenceThreshold: 0.5, // Web search patterns are well-established, lower threshold OK
      parameters: {
        maxResults: 5,
        defaultMarket: 'en-US',
        defaultSafeSearch: 'Moderate',
        enableCitations: true,
        enableCaching: true,
        cacheTtl: 300,
      },
    },
    [AgentType.URL_PULL]: {
      enabled: true,
      priority: 2,
      timeout: 30000,
      maxRetries: 2,
      confidenceThreshold: 0.6, // URL patterns are very specific, higher confidence needed
      parameters: {
        maxUrls: 3,
        enableParallelProcessing: true,
        concurrencyLimit: 3,
        enableContentExtraction: true,
        enableCaching: true,
        cacheTtl: 300,
      },
    },
    [AgentType.LOCAL_KNOWLEDGE]: {
      enabled: true,
      priority: 3,
      timeout: 30000,
      maxRetries: 2,
      confidenceThreshold: 0.5, // Broad knowledge queries, allow lower threshold
      parameters: {
        maxResults: 10,
        enableSemanticSearch: true,
        enableKeywordSearch: true,
        enableHybridSearch: true,
        confidenceThreshold: 0.7, // Keep existing parameter for internal agent logic
      },
    },
    [AgentType.CODE_INTERPRETER]: {
      enabled: true,
      priority: 4,
      timeout: 60000,
      maxRetries: 1,
      confidenceThreshold: 0.6, // Code patterns are distinctive, moderate threshold
      parameters: {
        enableCodeExecution: true,
        enablePythonSupport: true,
        enableJavaScriptSupport: true,
        enableDebugging: true,
      },
    },
    [AgentType.FOUNDRY]: {
      enabled: false,
      priority: 5,
      timeout: 30000,
      maxRetries: 2,
      parameters: {},
    },
    [AgentType.THIRD_PARTY]: {
      enabled: false,
      priority: 6,
      timeout: 30000,
      maxRetries: 2,
      parameters: {},
    },
    [AgentType.STANDARD_CHAT]: {
      enabled: true,
      priority: 0,
      timeout: 120000,
      maxRetries: 3,
      parameters: {},
    },
  },
  preferences: {
    preferredAgents: [AgentType.WEB_SEARCH, AgentType.LOCAL_KNOWLEDGE],
    disabledAgents: [],
    autoRouting: true,
    showAgentAttribution: true,
    confirmBeforeAgentUse: false,
    routingStrategy: 'balanced',
    fallbackChain: [AgentType.LOCAL_KNOWLEDGE, AgentType.WEB_SEARCH],
    maxRetryAttempts: 3,
    enableCaching: true,
  },
});

export const initialState: HomeInitialState = {
  apiKey: '',
  loading: false,
  pluginKeys: [],
  lightMode: 'dark',
  messageIsStreaming: false,
  modelError: null,
  models: [],
  folders: [],
  conversations: [],
  selectedConversation: undefined,
  currentMessage: undefined,
  prompts: [],
  temperature: 0.5,
  showPromptbar: true,
  systemPrompt: '',
  showChatbar: true,
  currentFolder: undefined,
  messageError: false,
  searchTerm: '',
  defaultModelId: undefined,
  serverSideApiKeyIsSet: false,
  serverSidePluginKeysSet: false,
  // Agent settings for intelligent chat routing
  agentSettings: createDefaultAgentSettings(),
  agentRoutingEnabled: true,
};
