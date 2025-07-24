/**
 * Centralized Agent Registry
 * 
 * This is the single source of truth for all agent configurations.
 * Instead of scattering configuration across 25+ files, all agent definitions
 * are centralized here and automatically processed throughout the application.
 */

import { AgentType, AgentExecutionEnvironment } from '@/types/agent';
import { AgentDefinition, AgentRegistry } from './schemas';

/**
 * Complete agent definitions for all supported agents
 */
const AGENT_DEFINITIONS: Record<AgentType, AgentDefinition> = {
  [AgentType.WEB_SEARCH]: {
    metadata: {
      type: AgentType.WEB_SEARCH,
      name: 'Web Search Agent',
      description: 'Search the web for current information using Azure AI Search',
      version: '1.0.0',
      enabled: true,
    },
    commands: {
      primary: 'search',
      aliases: ['web', 'google'],
      usage: '/search <query>',
      examples: [
        '/search latest news about AI',
        '/web current weather in London',
        '/google TypeScript best practices 2024'
      ],
    },
    execution: {
      environment: AgentExecutionEnvironment.FOUNDRY,
      timeout: 30000,
      skipStandardChatProcessing: false,
      supportedModels: ['gpt-4o', 'gpt-4o-mini', 'gpt-4'],
      capabilities: [
        'web-search',
        'real-time-information',
        'citation-extraction',
        'content-summarization'
      ],
      temperature: 0.3,
    },
    ui: {
      color: '#4F46E5',
      icon: 'search',
      displayOrder: 1,
      showInSelector: true,
    },
    api: {
      defaultConfig: {
        maxResults: 5,
        defaultMarket: 'en-US',
        defaultSafeSearch: 'Moderate',
        enableCitations: true,
        enableCaching: true,
        cacheTtl: 300,
      },
      caching: {
        enabled: true,
        ttl: 300,
        keyPrefix: 'web_search_',
      },
    },
    error: {
      maxRetries: 2,
      retryDelay: 1000,
      fallbackAgent: AgentType.STANDARD_CHAT,
      strategies: {
        timeout: 'retry',
        network: 'retry',
        quota: 'fallback',
        validation: 'fail',
      },
    },
    features: {
      intentAnalysis: {
        keywords: ['search', 'find', 'lookup', 'current', 'latest', 'news'],
        confidenceThreshold: 0.7,
      },
    },
    implementation: {
      agentClass: '@/services/agents/webSearchAgent',
      serviceClass: '@/services/webSearchService',
    },
  },

  [AgentType.URL_PULL]: {
    metadata: {
      type: AgentType.URL_PULL,
      name: 'URL Content Agent',
      description: 'Extract and analyze content from web URLs',
      version: '1.0.0',
      enabled: true,
    },
    commands: {
      primary: 'url',
      aliases: ['fetch', 'pull'],
      usage: '/url <url1> [url2] [url3]',
      examples: [
        '/url https://example.com',
        '/fetch https://docs.example.com/api',
        '/pull https://github.com/user/repo/blob/main/README.md'
      ],
    },
    execution: {
      environment: AgentExecutionEnvironment.FOUNDRY,
      timeout: 60000,
      skipStandardChatProcessing: false,
      supportedModels: ['gpt-4o', 'gpt-4o-mini'],
      capabilities: [
        'url-extraction',
        'content-parsing',
        'metadata-extraction',
        'parallel-processing'
      ],
      maxConcurrency: 3,
    },
    ui: {
      color: '#059669',
      icon: 'link',
      displayOrder: 2,
      showInSelector: true,
    },
    api: {
      defaultConfig: {
        maxUrls: 3,
        processingTimeout: 30000,
        enableParallelProcessing: true,
        concurrencyLimit: 3,
        enableContentExtraction: true,
        enableCaching: true,
        cacheTtl: 300,
      },
      caching: {
        enabled: true,
        ttl: 300,
        keyPrefix: 'url_pull_',
      },
    },
    error: {
      maxRetries: 2,
      retryDelay: 1000,
      fallbackAgent: AgentType.STANDARD_CHAT,
      strategies: {
        timeout: 'retry',
        network: 'retry',
        invalid_url: 'fail',
        content_error: 'retry',
      },
    },
    features: {
      intentAnalysis: {
        keywords: ['url', 'link', 'website', 'page', 'fetch', 'pull'],
        patterns: [/https?:\/\/[^\s]+/gi],
        confidenceThreshold: 0.8,
      },
    },
    implementation: {
      agentClass: '@/services/agents/urlPullAgent',
      serviceClass: '@/services/urlPullService',
    },
  },

  [AgentType.LOCAL_KNOWLEDGE]: {
    metadata: {
      type: AgentType.LOCAL_KNOWLEDGE,
      name: 'Local Knowledge Agent',
      description: 'Search and retrieve information from local knowledge base',
      version: '1.0.0',
      enabled: true,
    },
    commands: {
      primary: 'knowledge',
      aliases: ['kb', 'docs', 'local'],
      usage: '/knowledge <query>',
      examples: [
        '/knowledge API documentation',
        '/kb user authentication',
        '/docs deployment process'
      ],
    },
    execution: {
      environment: AgentExecutionEnvironment.LOCAL,
      timeout: 15000,
      skipStandardChatProcessing: false,
      supportedModels: ['gpt-4o', 'gpt-4o-mini'],
      capabilities: [
        'knowledge-search',
        'semantic-search',
        'document-retrieval',
        'contextual-answers'
      ],
    },
    ui: {
      color: '#DC2626',
      icon: 'book-open',
      displayOrder: 3,
      showInSelector: true,
    },
    api: {
      defaultConfig: {
        maxResults: 10,
        enableSemanticSearch: true,
        enableKeywordSearch: true,
        enableHybridSearch: true,
        confidenceThreshold: 0.7,
        enableCaching: true,
        cacheTtl: 600,
      },
      caching: {
        enabled: true,
        ttl: 600,
        keyPrefix: 'local_knowledge_',
      },
    },
    error: {
      maxRetries: 1,
      retryDelay: 500,
      fallbackAgent: AgentType.STANDARD_CHAT,
      strategies: {
        no_results: 'fallback',
        search_error: 'retry',
        timeout: 'fail',
      },
    },
    features: {
      intentAnalysis: {
        keywords: ['docs', 'documentation', 'knowledge', 'internal', 'company'],
        confidenceThreshold: 0.6,
      },
    },
    implementation: {
      agentClass: '@/services/agents/localKnowledgeAgent',
      serviceClass: '@/services/localKnowledgeService',
    },
  },

  [AgentType.CODE_INTERPRETER]: {
    metadata: {
      type: AgentType.CODE_INTERPRETER,
      name: 'Code Interpreter Agent',
      description: 'Execute and analyze code in secure sandboxed environment',
      version: '1.0.0',
      enabled: true,
    },
    commands: {
      primary: 'code',
      aliases: ['run', 'execute', 'python'],
      usage: '/code <programming_language> <code>',
      examples: [
        '/code python print("Hello World")',
        '/run javascript console.log("test")',
        '/python import numpy as np; np.array([1,2,3])'
      ],
    },
    execution: {
      environment: AgentExecutionEnvironment.CODE,
      timeout: 60000,
      skipStandardChatProcessing: false,
      supportedModels: ['gpt-4o', 'gpt-4o-mini'],
      capabilities: [
        'code-execution',
        'python-support',
        'javascript-support',
        'result-visualization',
        'error-analysis'
      ],
    },
    ui: {
      color: '#7C3AED',
      icon: 'code',
      displayOrder: 4,
      showInSelector: true,
    },
    api: {
      defaultConfig: {
        enableCodeExecution: true,
        enablePythonSupport: true,
        enableJavaScriptSupport: true,
        enableDebugging: true,
        timeout: 60000,
        maxMemoryMb: 512,
        enableCaching: true,
        cacheTtl: 3600,
      },
      caching: {
        enabled: true,
        ttl: 3600,
        keyPrefix: 'code_interpreter_',
      },
    },
    error: {
      maxRetries: 1,
      retryDelay: 1000,
      fallbackAgent: AgentType.STANDARD_CHAT,
      strategies: {
        execution_error: 'fail',
        timeout: 'fail',
        memory_limit: 'fail',
        security_violation: 'fail',
      },
    },
    features: {
      intentAnalysis: {
        keywords: ['code', 'python', 'javascript', 'execute', 'run', 'calculate'],
        confidenceThreshold: 0.8,
      },
    },
    implementation: {
      agentClass: '@/services/agents/codeInterpreterAgent',
      serviceClass: '@/services/codeInterpreterService',
    },
  },

  [AgentType.TRANSLATION]: {
    metadata: {
      type: AgentType.TRANSLATION,
      name: 'Translation Agent',
      description: 'Translate text between languages with automatic language detection',
      version: '1.0.0',
      enabled: true,
    },
    commands: {
      primary: 'translate',
      aliases: ['tr', 'trans'],
      usage: '/translate [source_lang] <target_lang> <text>',
      examples: [
        '/translate es Hello world',
        '/tr en zh 你好世界',
        '/translate auto fr Bonjour le monde'
      ],
    },
    execution: {
      environment: AgentExecutionEnvironment.FOUNDRY,
      timeout: 15000,
      skipStandardChatProcessing: true, // Direct response without additional processing
      supportedModels: ['gpt-4o', 'gpt-4o-mini'],
      capabilities: [
        'text-translation',
        'language-detection',
        'multi-language-support',
        'automatic-language-inference',
        'context-preservation'
      ],
      temperature: 0.3,
    },
    ui: {
      color: '#EA580C',
      icon: 'translate',
      displayOrder: 5,
      showInSelector: true,
    },
    api: {
      defaultConfig: {
        defaultSourceLanguage: '',
        defaultTargetLanguage: 'en',
        enableLanguageDetection: true,
        enableCaching: true,
        cacheTtl: 3600,
        maxTextLength: 10000,
        temperature: 0.3,
        skipStandardChatProcessing: true,
      },
      caching: {
        enabled: true,
        ttl: 3600,
        keyPrefix: 'translation_',
      },
    },
    error: {
      maxRetries: 2,
      retryDelay: 1000,
      fallbackAgent: AgentType.STANDARD_CHAT,
      strategies: {
        language_detection_failed: 'retry',
        translation_failed: 'retry',
        invalid_language: 'fail',
      },
    },
    features: {
      intentAnalysis: {
        keywords: ['translate', 'translation', 'language', 'convert'],
        confidenceThreshold: 0.9,
      },
      parameterExtraction: {
        patterns: {
          languageCode: /^[a-zA-Z]{2,5}([_-][a-zA-Z]{2,5})?$/,
        },
        defaults: {
          targetLanguage: 'en',
        },
      },
    },
    implementation: {
      agentClass: '@/services/agents/translationAgent',
      serviceClass: '@/services/translationService',
    },
  },

  [AgentType.STANDARD_CHAT]: {
    metadata: {
      type: AgentType.STANDARD_CHAT,
      name: 'Standard Chat Agent',
      description: 'Standard conversational AI for general questions and tasks',
      version: '1.0.0',
      enabled: true,
    },
    execution: {
      environment: AgentExecutionEnvironment.FOUNDRY,
      timeout: 30000,
      skipStandardChatProcessing: false,
      supportedModels: ['gpt-4o', 'gpt-4o-mini', 'gpt-4'],
      capabilities: [
        'general-conversation',
        'question-answering',
        'reasoning',
        'creative-writing'
      ],
    },
    ui: {
      color: '#6B7280',
      icon: 'chat',
      displayOrder: 99,
      showInSelector: false, // Hidden as it's the default fallback
    },
    api: {
      defaultConfig: {
        temperature: 0.7,
        enableCaching: false,
      },
    },
    error: {
      maxRetries: 1,
      retryDelay: 1000,
      // No fallback agent for standard chat - it's the final fallback
      strategies: {
        timeout: 'retry',
        general_error: 'fail',
      },
    },
    implementation: {
      agentClass: '@/services/agents/standardChatAgent',
    },
  },

  [AgentType.FOUNDRY]: {
    metadata: {
      type: AgentType.FOUNDRY,
      name: 'Azure AI Foundry Agent',
      description: 'Direct integration with Azure AI Foundry services',
      version: '1.0.0',
      enabled: true,
      developmentOnly: true, // Only available in development
    },
    execution: {
      environment: AgentExecutionEnvironment.FOUNDRY,
      timeout: 45000,
      skipStandardChatProcessing: false,
      supportedModels: ['gpt-4o', 'gpt-4o-mini'],
      capabilities: [
        'foundry-integration',
        'azure-ai-services',
        'advanced-reasoning'
      ],
    },
    ui: {
      color: '#0078D4',
      icon: 'cloud',
      displayOrder: 10,
      showInSelector: false,
    },
    api: {
      defaultConfig: {
        enableFoundryFeatures: true,
        timeout: 45000,
      },
    },
    implementation: {
      agentClass: '@/services/agents/foundryAgent',
    },
  },

  [AgentType.THIRD_PARTY]: {
    metadata: {
      type: AgentType.THIRD_PARTY,
      name: 'Third-Party Integration Agent',
      description: 'Integration with external third-party services and APIs',
      version: '1.0.0',
      enabled: false, // Disabled by default
    },
    execution: {
      environment: AgentExecutionEnvironment.THIRD_PARTY,
      timeout: 30000,
      skipStandardChatProcessing: false,
      supportedModels: ['gpt-4o', 'gpt-4o-mini'],
      capabilities: [
        'third-party-apis',
        'external-integrations',
        'custom-workflows'
      ],
    },
    ui: {
      color: '#F59E0B',
      icon: 'puzzle-piece',
      displayOrder: 20,
      showInSelector: false,
    },
    api: {
      defaultConfig: {
        enableThirdPartyIntegrations: false,
      },
    },
    implementation: {
      agentClass: '@/services/agents/thirdPartyAgent',
    },
  },
};

/**
 * The centralized agent registry
 */
export const AGENT_REGISTRY: AgentRegistry = {
  agents: AGENT_DEFINITIONS,
  global: {
    defaultTimeout: 30000,
    enableLogging: true,
    environment: process.env.NODE_ENV as 'development' | 'staging' | 'production' || 'development',
  },
  globalFeatures: {
    enableAgentRouting: true,
    enableIntentAnalysis: true,
    enableErrorFallbacks: true,
    enableCaching: true,
    enableMetrics: true,
  },
};

/**
 * Get agent definition by type
 */
export function getAgentDefinition(type: AgentType): AgentDefinition | undefined {
  return AGENT_REGISTRY.agents[type];
}

/**
 * Get all enabled agent definitions
 */
export function getEnabledAgents(): AgentDefinition[] {
  return Object.values(AGENT_REGISTRY.agents).filter(agent => agent.metadata.enabled);
}

/**
 * Get agents available in current environment
 */
export function getAvailableAgents(): AgentDefinition[] {
  const isDevelopment = process.env.NODE_ENV === 'development';
  return getEnabledAgents().filter(agent => 
    !agent.metadata.developmentOnly || isDevelopment
  );
}

/**
 * Get agent definitions that have commands
 */
export function getAgentsWithCommands(): AgentDefinition[] {
  return getAvailableAgents().filter(agent => agent.commands);
}

/**
 * Get agent definition by command name (primary or alias)
 */
export function getAgentByCommand(command: string): AgentDefinition | undefined {
  return getAvailableAgents().find(agent => {
    if (!agent.commands) return false;
    return agent.commands.primary === command || 
           agent.commands.aliases?.includes(command);
  });
}