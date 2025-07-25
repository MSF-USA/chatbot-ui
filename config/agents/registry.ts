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
      intentClassification: {
        keywords: [
          'latest', 'recent', 'current', 'today', 'now', 'breaking', 'news', 'search',
          'find', 'look up', 'google', 'what is happening', 'price', 'stock', 'weather',
          'score', 'update', 'live', 'trending', 'market', 'real-time', 'immediate',
          'fresh', 'this week', 'this month', 'this year', 'compare', 'reviews',
          'who won', 'results', 'election', 'poll', 'statistics', 'what is', 'who is',
          'when did', 'where is', 'how much'
        ],
        patterns: [
          '\\b(latest|recent|current|today|now|breaking|trending|immediate)\\b',
          '\\b(what\'?s happening|breaking news|live updates?|real-?time)\\b',
          '\\b(price of|stock price|weather in|score of|market data)\\b',
          '\\b(who won|results of|outcome of|winner of)\\b',
          '\\b(compare|vs|versus|difference between|better than)\\b',
          '\\b(reviews?|ratings?|opinions? on|feedback about)\\b',
          '\\b(this (week|month|year)|in \\d{4}|since \\d{4})\\b',
          '\\b(trending|viral|popular|top \\d+|best \\d+)\\b'
        ],
        regexPatterns: [
          /\b(latest|recent|current|today|now|breaking|trending|immediate)\b/i,
          /\b(what'?s happening|breaking news|live updates?|real-?time)\b/i,
          /\b(price of|stock price|weather in|score of|market data)\b/i,
          /\b(who won|results of|outcome of|winner of)\b/i,
          /\b(compare|vs|versus|difference between|better than)\b/i,
          /\b(reviews?|ratings?|opinions? on|feedback about)\b/i,
          /\b(this (week|month|year)|in \d{4}|since \d{4})\b/i,
          /\b(trending|viral|popular|top \d+|best \d+)\b/i
        ],
        threshold: 0.3,
        intentCategory: 'web-search',
        prompts: {
          en: 'Search for current information about: {query}',
          es: 'Buscar información actual sobre: {query}',
          fr: 'Rechercher des informations actuelles sur: {query}',
        },
        examples: [
          'latest news about climate change',
          'current stock price of Apple',
          'what happened today in politics',
          'compare iPhone 15 vs Samsung Galaxy S24',
          'reviews of the new Tesla Model 3',
          'trending topics on social media',
          'who won the election yesterday',
          'real-time weather in New York',
          'what does MSF do in Sudan?',
          'tell me about the latest news'
        ],
        urgencyIndicators: [
          'urgent', 'asap', 'quickly', 'fast', 'immediate', 'now',
          'right now', 'emergency', 'critical', 'deadline', 'soon'
        ],
      },
      confidenceGuidelines: {
        ranges: {
          very_high: {
            range: [0.9, 1.0],
            description: 'Very clear time-sensitive indicators present',
            examples: ['URLs in query', 'Time references', 'Breaking news mentions']
          },
          high: {
            range: [0.75, 0.89],
            description: 'Strong contextual clues for real-time information',
            examples: ['Multiple relevant keywords', 'Clear time patterns', 'Current event language']
          },
          medium: {
            range: [0.5, 0.74],
            description: 'Moderate confidence based on search context',
            examples: ['Some search keywords', 'Partial pattern matches', 'General information seeking']
          }
        }
      },
      exclusionPatterns: {
        avoidancePatterns: [
          "don't search the web", 'without searching', 'no web search', 'avoid search',
          "don't look online", 'offline only', 'without internet', 'no online search',
          "don't browse", 'without browsing', 'no external search', 'local only',
          "don't fetch online", 'avoid web lookup'
        ],
        negativePatterns: [
          /don't\s+(search|look|browse|fetch|find)\s+(the\s+)?(web|online|internet)/i,
          /without\s+(searching|browsing|looking)\s+(the\s+)?(web|online|internet)/i,
          /no\s+(web\s+)?(search|browsing|online\s+search)/i,
          /avoid\s+(web\s+)?(search|browsing)/i,
          /not?\s+(search|look|browse)\s+(online|web)/i
        ],
        exclusionKeywords: ['offline', 'local only', 'no internet', 'internal only', 'cached only']
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
      intentClassification: {
        keywords: [
          'website', 'url', 'link', 'page', 'site', 'analyze', 'webpage', 'extract',
          'scrape', 'content', 'article', 'read', 'parse', 'fetch', 'pull', 'crawl',
          'download', 'metadata', 'html', 'compare websites', 'website comparison',
          'seo analysis', 'multiple urls', 'several links', 'batch process', 'parallel'
        ],
        patterns: [
          'https?://[^\\s<>\"{}|\\\\^`[\\]]+',
          'www\\.[^\\s<>\"{}|\\\\^`[\\]]+',
          '\\b[a-zA-Z0-9.-]+\\.[a-zA-Z]{2,}(?:/[^\\s<>\"{}|\\\\^`[\\]]*)?',
          '\\b(analyze|extract|scrape|fetch|pull|crawl)\\s+.*?(url|link|website|page|site)\\b',
          '\\b(multiple|several|batch|parallel)\\s+.*?(url|link|website|page)\\b',
          '\\b(compare|comparison)\\s+.*?(website|url|link|page)\\b'
        ],
        regexPatterns: [
          /https?:\/\/[^\s<>"{}|\\^`[\]]+/g,
          /www\.[^\s<>"{}|\\^`[\]]+/g,
          /\b[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}(?:\/[^\s<>"{}|\\^`[\]]*)?/g,
          /\b(analyze|extract|scrape|fetch|pull|crawl)\s+.*?(url|link|website|page|site)\b/i,
          /\b(multiple|several|batch|parallel)\s+.*?(url|link|website|page)\b/i,
          /\b(compare|comparison)\s+.*?(website|url|link|page)\b/i
        ],
        threshold: 0.8,
        intentCategory: 'url-extraction',
        prompts: {
          en: 'Extract and analyze content from: {query}',
          es: 'Extraer y analizar contenido de: {query}',
          fr: 'Extraire et analyser le contenu de: {query}',
        },
        examples: [
          'analyze this website: https://example.com',
          'what does this article say? https://news.example.com/article',
          'extract data from this webpage',
          'compare these websites: https://site1.com and https://site2.com',
          'process these URLs: https://example1.com, https://example2.com',
          'analyze SEO for this site: https://business.com'
        ],
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
      intentClassification: {
        keywords: [
          // General knowledge indicators
          'explain', 'how to', 'why does', 'what does', 'define', 'meaning',
          'difference between', 'compare', 'tutorial', 'guide', 'best practices',
          'recommend', 'suggest', 'advice',
          // FAQ-specific indicators
          'msf ai assistant', 'msf ai', 'ai assistant', 'chatbot', 'assistant',
          'ai tool', 'chat tool', 'médecins sans frontières', 'doctors without borders',
          'msf', 'humanitarian', 'what is', 'what can', 'how can', 'how do',
          'where', 'can you', 'what are', 'should', 'capabilities', 'features',
          'assist', 'help', 'tasks', 'employees', 'staff', 'technical questions',
          'reports', 'documentation', 'translation', 'brainstorming',
          // Privacy and security indicators
          'privacy', 'data protection', 'privacy policy', 'terms of use',
          'privacy guarantees', 'data', 'storage', 'stored', 'where stored',
          'data storage', 'local', 'computer', 'msf systems', 'microsoft azure',
          'within msf', 'processed by msf', 'secure', 'safety', 'safer',
          'external tools', 'internal', 'control', 'prohibited', 'personal data',
          'sensitive data', 'what not to put', 'should not', 'names',
          'phone numbers', 'cvs', 'testimonies', 'identify individual'
        ],
        threshold: 0.1,
        intentCategory: 'local-knowledge',
        prompts: {
          en: 'Search local knowledge base for: {query}',
          es: 'Buscar en la base de conocimiento local: {query}',
          fr: 'Rechercher dans la base de connaissances locale: {query}',
        },
        questionPatterns: [
          'what is', 'what can', 'how can', 'how do', 'where', 'can you',
          'what are', 'should', 'explain', 'how to', 'why does', 'what does'
        ],
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
      intentClassification: {
        keywords: [
          'code', 'program', 'script', 'function', 'debug', 'error', 'execute', 'run',
          'python', 'javascript', 'sql', 'bash', 'typescript', 'r', 'data', 'analysis',
          'calculate', 'compute', 'process', 'algorithm', 'parse', 'csv', 'json',
          'file', 'dataset', 'visualization', 'chart', 'graph', 'plot', 'matplotlib',
          'pandas', 'numpy', 'dataframe', 'statistics', 'math', 'database', 'query',
          'select', 'insert', 'update', 'machine learning', 'ml', 'model', 'predict', 'train'
        ],
        patterns: [
          '```[\\w]*\\n[\\s\\S]*?\\n```',
          '`[^`\\n]+`',
          '\\b(def|function|class|import|from|console\\.log|print\\(|SELECT|INSERT|UPDATE)\\b',
          '\\b(execute|run|debug|analyze|calculate|compute)\\s+.*?(code|script|function|program)\\b',
          '\\b(python|javascript|sql|bash|typescript)\\s+.*?(code|script|program)\\b',
          '\\b(data\\s+analysis|data\\s+processing|machine\\s+learning|ml\\s+model)\\b',
          '\\b(plot|chart|graph|visualization|matplotlib|pandas|numpy)\\b'
        ],
        regexPatterns: [
          /```[\w]*\n[\s\S]*?\n```/g,
          /`[^`\n]+`/g,
          /\b(def|function|class|import|from|console\.log|print\(|SELECT|INSERT|UPDATE)\b/i,
          /\b(execute|run|debug|analyze|calculate|compute)\s+.*?(code|script|function|program)\b/i,
          /\b(python|javascript|sql|bash|typescript)\s+.*?(code|script|program)\b/i,
          /\b(data\s+analysis|data\s+processing|machine\s+learning|ml\s+model)\b/i,
          /\b(plot|chart|graph|visualization|matplotlib|pandas|numpy)\b/i
        ],
        threshold: 0.2,
        intentCategory: 'code-assistance',
        prompts: {
          en: 'Execute or analyze code: {query}',
          es: 'Ejecutar o analizar código: {query}',
          fr: 'Exécuter ou analyser le code: {query}',
        },
        examples: [
          'debug this Python code: def func()...',
          'analyze this CSV data with pandas',
          'calculate the average of these numbers: [1,2,3,4,5]',
          'write a JavaScript function to sort an array',
          'execute this SQL query: SELECT * FROM users',
          'create a visualization of this data',
          'run this Python script for data analysis',
          'help me debug this code error',
          'process this dataset and show statistics'
        ],
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
      intentClassification: {
        keywords: [
          'translate', 'translation', 'language', 'convert', 'interpret',
          'translate to', 'from english', 'to spanish', 'in french', 'mean in',
          'say in', 'how do you say', 'what does', 'meaning'
        ],
        patterns: [
          'translate\\s+.+\\s+to\\s+\\w+',
          'translate\\s+from\\s+\\w+\\s+to\\s+\\w+',
          'how\\s+do\\s+you\\s+say\\s+.+\\s+in\\s+\\w+',
          'what\\s+does\\s+.+\\s+mean\\s+in\\s+\\w+',
          'convert\\s+.+\\s+to\\s+\\w+',
          'interpret\\s+.+\\s+from\\s+\\w+'
        ],
        regexPatterns: [
          /translate\s+.+\s+to\s+\w+/i,
          /translate\s+from\s+\w+\s+to\s+\w+/i,
          /how\s+do\s+you\s+say\s+.+\s+in\s+\w+/i,
          /what\s+does\s+.+\s+mean\s+in\s+\w+/i,
          /convert\s+.+\s+to\s+\w+/i,
          /interpret\s+.+\s+from\s+\w+/i
        ],
        threshold: 0.9,
        intentCategory: 'translation',
        prompts: {
          en: 'Translate text: {query}',
          es: 'Traducir texto: {query}',
          fr: 'Traduire le texte: {query}',
        },
        examples: [
          'translate hello to spanish',
          'translate from english to french: hello world',
          'what does hola mean in english',
          'how do you say goodbye in german',
          'convert this text to mandarin',
          'interpret this from japanese'
        ],
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
    features: {
      intentClassification: {
        keywords: [
          'tell', 'explain', 'what', 'how', 'why', 'chat', 'talk', 'discuss',
          'opinion', 'think', 'help', 'advice', 'suggestion', 'recommend',
          'general', 'conversation', 'casual', 'personal', 'brainstorm'
        ],
        patterns: [
          '\\b(tell me|explain|what do you think|how do you|opinion|advice|help me)\\b',
          '\\b(chat|talk|discuss|conversation|brainstorm|general question)\\b',
          '\\b(recommend|suggest|what would you|personal)\\b'
        ],
        regexPatterns: [
          /\b(tell me|explain|what do you think|how do you|opinion|advice|help me)\b/i,
          /\b(chat|talk|discuss|conversation|brainstorm|general question)\b/i,
          /\b(recommend|suggest|what would you|personal)\b/i
        ],
        threshold: 0.5,
        intentCategory: 'general',
        prompts: {
          en: 'General conversation: {query}',
          es: 'Conversación general: {query}',
          fr: 'Conversation générale: {query}',
        },
        examples: [
          'tell me a joke',
          'what do you think about this?',
          'help me brainstorm ideas',
          'explain this concept',
          'give me your opinion on...',
          'what is the sphere handbook'
        ],
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
    features: {
      intentClassification: {
        keywords: [
          'complex', 'advanced', 'sophisticated', 'deep', 'thorough', 'comprehensive',
          'analysis', 'reasoning', 'logic', 'philosophy', 'research', 'academic',
          'multi-step', 'strategy', 'detailed', 'in-depth'
        ],
        patterns: [
          '\\b(complex|advanced|sophisticated|deep|thorough|comprehensive)\\b',
          '\\b(analysis|reasoning|logic|philosophy|research|academic)\\b',
          '\\b(multi-step|strategy|detailed|in-depth)\\b'
        ],
        regexPatterns: [
          /\b(complex|advanced|sophisticated|deep|thorough|comprehensive)\b/i,
          /\b(analysis|reasoning|logic|philosophy|research|academic)\b/i,
          /\b(multi-step|strategy|detailed|in-depth)\b/i
        ],
        threshold: 0.7,
        intentCategory: 'complex-reasoning',
        prompts: {
          en: 'Complex reasoning task: {query}',
          es: 'Tarea de razonamiento complejo: {query}',
          fr: 'Tâche de raisonnement complexe: {query}',
        },
        examples: [
          'analyze the philosophical implications of...',
          'create a complex business strategy',
          'provide in-depth analysis of...',
          'solve this multi-step problem'
        ],
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
    features: {
      intentClassification: {
        keywords: [
          'github', 'slack', 'jira', 'salesforce', 'calendar', 'email', 'api',
          'webhook', 'integration', 'create issue', 'send message'
        ],
        patterns: [
          '\\b(github|slack|jira|salesforce|calendar|email)\\b',
          '\\b(create .* in|send .* to|update .* with)\\b'
        ],
        regexPatterns: [
          /\b(github|slack|jira|salesforce|calendar|email)\b/i,
          /\b(create .* in|send .* to|update .* with)\b/i
        ],
        threshold: 0.8,
        intentCategory: 'third-party-integration',
        prompts: {
          en: 'Third-party integration: {query}',
          es: 'Integración de terceros: {query}',
          fr: 'Intégration tierce: {query}',
        },
        examples: [
          'create a GitHub issue',
          'send a Slack message',
          'update my calendar'
        ],
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