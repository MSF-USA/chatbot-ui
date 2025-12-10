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
        systemPrompts: {
          en: {
            useCases: [
              'Current events, breaking news, recent information',
              'Real-time data (stock prices, weather, sports scores)',
              'Information requiring freshness (today, this week, latest, recent)',
              'Market research, product reviews, comparative analysis',
              'Fact-checking and verification',
              'General knowledge questions about recent topics',
              'MSF\'s field activities and events',
              'Any factual questions that you do not know the answer to or seem to imply events you are unfamiliar with'
            ],
            guidelines: 'Use for time-sensitive queries requiring current information'
          },
          es: {
            useCases: [
              'Eventos actuales, noticias de última hora, información reciente',
              'Datos en tiempo real (precios de acciones, clima, resultados deportivos)',
              'Información que requiere frescura (hoy, esta semana, último, reciente)',
              'Investigación de mercado, reseñas de productos, análisis comparativo',
              'Verificación de hechos',
              'Preguntas de conocimiento general sobre temas recientes'
            ],
            guidelines: 'Usar para consultas sensibles al tiempo que requieren información actual'
          },
          fr: {
            useCases: [
              'Événements actuels, dernières nouvelles, informations récentes',
              'Données en temps réel (prix des actions, météo, scores sportifs)',
              'Informations nécessitant de la fraîcheur (aujourd\'hui, cette semaine, dernier, récent)',
              'Recherche de marché, avis produits, analyse comparative',
              'Vérification des faits',
              'Questions de culture générale sur des sujets récents'
            ],
            guidelines: 'Utiliser pour les requêtes sensibles au temps nécessitant des informations actuelles'
          },
          de: {
            useCases: [
              'Aktuelle Ereignisse, Eilmeldungen, neueste Informationen',
              'Echtzeit-Daten (Aktienkurse, Wetter, Sportergebnisse)',
              'Informationen, die Aktualität erfordern (heute, diese Woche, neueste, aktuell)',
              'Marktforschung, Produktbewertungen, vergleichende Analysen',
              'Faktenprüfung und Verifizierung',
              'Allgemeine Wissensfragen zu aktuellen Themen'
            ],
            guidelines: 'Verwenden für zeitkritische Anfragen, die aktuelle Informationen erfordern'
          },
          it: {
            useCases: [
              'Eventi attuali, ultime notizie, informazioni recenti',
              'Dati in tempo reale (prezzi delle azioni, meteo, risultati sportivi)',
              'Informazioni che richiedono freschezza (oggi, questa settimana, ultimo, recente)',
              'Ricerche di mercato, recensioni di prodotti, analisi comparative',
              'Verifica dei fatti',
              'Domande di conoscenza generale su argomenti recenti'
            ],
            guidelines: 'Utilizzare per query sensibili al tempo che richiedono informazioni attuali'
          },
          pt: {
            useCases: [
              'Eventos atuais, notícias de última hora, informações recentes',
              'Dados em tempo real (preços de ações, clima, resultados esportivos)',
              'Informações que requerem atualidade (hoje, esta semana, mais recente, atual)',
              'Pesquisa de mercado, avaliações de produtos, análise comparativa',
              'Verificação de fatos',
              'Perguntas de conhecimento geral sobre tópicos recentes'
            ],
            guidelines: 'Usar para consultas sensíveis ao tempo que requerem informações atuais'
          },
          ja: {
            useCases: [
              '最新の出来事、速報ニュース、最近の情報',
              'リアルタイムデータ（株価、天気、スポーツのスコア）',
              '鮮度が必要な情報（今日、今週、最新、最近）',
              '市場調査、製品レビュー、比較分析',
              '事実確認と検証',
              '最近のトピックに関する一般的な知識の質問'
            ],
            guidelines: '最新情報が必要な時間的制約のあるクエリに使用'
          },
          ko: {
            useCases: [
              '현재 이벤트, 속보 뉴스, 최신 정보',
              '실시간 데이터(주식 가격, 날씨, 스포츠 점수)',
              '신선도가 필요한 정보(오늘, 이번 주, 최신, 최근)',
              '시장 조사, 제품 리뷰, 비교 분석',
              '사실 확인 및 검증',
              '최근 주제에 관한 일반 지식 질문'
            ],
            guidelines: '최신 정보가 필요한 시간 민감한 쿼리에 사용'
          },
          zh: {
            useCases: [
              '当前事件、突发新闻、最新信息',
              '实时数据（股票价格、天气、体育比分）',
              '需要新鲜度的信息（今天、本周、最新、最近）',
              '市场研究、产品评论、比较分析',
              '事实核查和验证',
              '关于最近话题的一般知识问题'
            ],
            guidelines: '用于需要当前信息的时间敏感查询'
          }
        },
        usageCriteria: [
          'Time sensitivity indicators present',
          'Request for current or recent information',
          'Need for real-time data',
          'Fact-checking recent events',
          'Market or trend analysis'
        ],
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
        systemPrompts: {
          en: {
            useCases: [
              'Analyzing specific websites or web pages',
              'Extracting content from URLs',
              'Website comparison or evaluation',
              'Reading articles, documentation, or web content',
              'Scraping or parsing web data',
              'SEO analysis and website auditing'
            ],
            guidelines: 'Use when URLs are present or specific web content analysis is needed'
          },
          es: {
            useCases: [
              'Análisis de sitios web o páginas web específicas',
              'Extracción de contenido de URLs',
              'Comparación o evaluación de sitios web',
              'Lectura de artículos, documentación o contenido web',
              'Extracción o análisis de datos web',
              'Análisis SEO y auditoría de sitios web'
            ],
            guidelines: 'Usar cuando hay URLs presentes o se necesita análisis de contenido web específico'
          },
          fr: {
            useCases: [
              'Analyse de sites web ou pages web spécifiques',
              'Extraction de contenu à partir d\'URLs',
              'Comparaison ou évaluation de sites web',
              'Lecture d\'articles, documentation ou contenu web',
              'Extraction ou analyse de données web',
              'Analyse SEO et audit de sites web'
            ],
            guidelines: 'Utiliser lorsque des URLs sont présentes ou qu\'une analyse de contenu web spécifique est nécessaire'
          },
          de: {
            useCases: [
              'Analyse bestimmter Websites oder Webseiten',
              'Extrahieren von Inhalten aus URLs',
              'Website-Vergleich oder -Bewertung',
              'Lesen von Artikeln, Dokumentationen oder Web-Inhalten',
              'Scraping oder Parsing von Web-Daten',
              'SEO-Analyse und Website-Auditing'
            ],
            guidelines: 'Verwenden, wenn URLs vorhanden sind oder spezifische Web-Inhaltsanalyse benötigt wird'
          },
          it: {
            useCases: [
              'Analisi di siti web o pagine web specifiche',
              'Estrazione di contenuti da URL',
              'Confronto o valutazione di siti web',
              'Lettura di articoli, documentazione o contenuti web',
              'Scraping o parsing di dati web',
              'Analisi SEO e audit di siti web'
            ],
            guidelines: 'Utilizzare quando sono presenti URL o è necessaria un\'analisi specifica del contenuto web'
          },
          pt: {
            useCases: [
              'Análise de sites ou páginas web específicas',
              'Extração de conteúdo de URLs',
              'Comparação ou avaliação de sites',
              'Leitura de artigos, documentação ou conteúdo web',
              'Scraping ou análise de dados web',
              'Análise SEO e auditoria de sites'
            ],
            guidelines: 'Usar quando URLs estão presentes ou análise específica de conteúdo web é necessária'
          },
          ja: {
            useCases: [
              '特定のウェブサイトやウェブページの分析',
              'URLからのコンテンツ抽出',
              'ウェブサイトの比較や評価',
              '記事、ドキュメント、ウェブコンテンツの読み取り',
              'ウェブデータのスクレイピングまたはパース',
              'SEO分析とウェブサイト監査'
            ],
            guidelines: 'URLが存在するか、特定のウェブコンテンツ分析が必要な場合に使用'
          },
          ko: {
            useCases: [
              '특정 웹사이트 또는 웹 페이지 분석',
              'URL에서 콘텐츠 추출',
              '웹사이트 비교 또는 평가',
              '기사, 문서 또는 웹 콘텐츠 읽기',
              '웹 데이터 스크래핑 또는 파싱',
              'SEO 분석 및 웹사이트 감사'
            ],
            guidelines: 'URL이 있거나 특정 웹 콘텐츠 분석이 필요할 때 사용'
          },
          zh: {
            useCases: [
              '分析特定网站或网页',
              '从URL提取内容',
              '网站比较或评估',
              '阅读文章、文档或网络内容',
              '抓取或解析网络数据',
              'SEO分析和网站审计'
            ],
            guidelines: '当存在URL或需要特定网络内容分析时使用'
          }
        },
        usageCriteria: [
          'URLs present in query',
          'Request for website analysis',
          'Need to extract web content',
          'Website comparison tasks',
          'SEO or web audit requirements'
        ],
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
        systemPrompts: {
          en: {
            useCases: [
              'Questions about the MSF AI Assistant itself ("What is the MSF AI Assistant?", capabilities, features, how it assists MSF staff)',
              'FAQ about the AI chatbot (prompts, reusable prompts, slash commands, automation, examples)',
              'Data storage and privacy questions ("Where is my data stored?", conversation storage, local storage, browser storage)',
              'Privacy policy and terms of use (prohibited data, responsible use, prohibited uses, accuracy disclaimers)',
              'MSF-specific AI policies and guidelines (what not to put in the AI, security, data protection)',
              'Reliability and trust questions (fact-checking, verification, human judgment)',
              'Support and contact information (bug reports, feedback, ai@newyork.msf.org, ai.team@amsterdam.msf.org)',
              'Help with chatbot features (creating prompts, custom bots, interface navigation)',
              'Médecins Sans Frontières / Doctors Without Borders organizational AI usage'
            ],
            guidelines: 'Use for questions about the AI assistant, MSF policies, privacy, or internal documentation'
          },
          es: {
            useCases: [
              'Preguntas sobre el Asistente de IA de MSF ("¿Qué es el Asistente de IA de MSF?", capacidades, características, cómo ayuda al personal de MSF)',
              'Preguntas frecuentes sobre el chatbot de IA (prompts, prompts reutilizables, comandos de barra, automatización, ejemplos)',
              'Preguntas sobre almacenamiento de datos y privacidad ("¿Dónde se almacenan mis datos?", almacenamiento de conversaciones, almacenamiento local, almacenamiento del navegador)',
              'Política de privacidad y términos de uso (datos prohibidos, uso responsable, usos prohibidos, descargos de responsabilidad de precisión)',
              'Políticas y directrices específicas de MSF sobre IA (qué no poner en la IA, seguridad, protección de datos)',
              'Preguntas sobre fiabilidad y confianza (verificación de hechos, verificación, juicio humano)',
              'Información de soporte y contacto (informes de errores, comentarios, ai@newyork.msf.org, ai.team@amsterdam.msf.org)',
              'Ayuda con las características del chatbot (creación de prompts, bots personalizados, navegación de la interfaz)',
              'Uso de IA en la organización Médicos Sin Fronteras'
            ],
            guidelines: 'Usar para preguntas sobre el asistente de IA, políticas de MSF, privacidad o documentación interna'
          },
          fr: {
            useCases: [
              'Questions sur l\'Assistant IA MSF ("Qu\'est-ce que l\'Assistant IA MSF?", capacités, fonctionnalités, comment il aide le personnel MSF)',
              'FAQ sur le chatbot IA (prompts, prompts réutilisables, commandes slash, automatisation, exemples)',
              'Questions sur le stockage des données et la confidentialité ("Où sont stockées mes données?", stockage des conversations, stockage local, stockage du navigateur)',
              'Politique de confidentialité et conditions d\'utilisation (données interdites, utilisation responsable, utilisations interdites, avertissements de précision)',
              'Politiques et directives spécifiques à MSF concernant l\'IA (ce qu\'il ne faut pas mettre dans l\'IA, sécurité, protection des données)',
              'Questions sur la fiabilité et la confiance (vérification des faits, vérification, jugement humain)',
              'Informations de support et de contact (rapports de bugs, commentaires, ai@newyork.msf.org, ai.team@amsterdam.msf.org)',
              'Aide avec les fonctionnalités du chatbot (création de prompts, bots personnalisés, navigation dans l\'interface)',
              'Utilisation de l\'IA dans l\'organisation Médecins Sans Frontières'
            ],
            guidelines: 'Utiliser pour les questions sur l\'assistant IA, les politiques MSF, la confidentialité ou la documentation interne'
          },
          de: {
            useCases: [
              'Fragen zum MSF AI Assistant selbst ("Was ist der MSF AI Assistant?", Fähigkeiten, Funktionen, wie er MSF-Mitarbeitern hilft)',
              'FAQ zum AI Chatbot (Prompts, wiederverwendbare Prompts, Slash-Befehle, Automatisierung, Beispiele)',
              'Fragen zu Datenspeicherung und Datenschutz ("Wo werden meine Daten gespeichert?", Konversationsspeicherung, lokale Speicherung, Browser-Speicherung)',
              'Datenschutzrichtlinien und Nutzungsbedingungen (verbotene Daten, verantwortungsvolle Nutzung, verbotene Verwendungen, Genauigkeits-Disclaimer)',
              'MSF-spezifische KI-Richtlinien (was nicht in die KI eingegeben werden sollte, Sicherheit, Datenschutz)',
              'Fragen zu Zuverlässigkeit und Vertrauen (Faktenprüfung, Verifizierung, menschliches Urteilsvermögen)',
              'Support- und Kontaktinformationen (Fehlerberichte, Feedback, ai@newyork.msf.org, ai.team@amsterdam.msf.org)',
              'Hilfe bei Chatbot-Funktionen (Erstellen von Prompts, benutzerdefinierte Bots, Navigieren der Benutzeroberfläche)',
              'KI-Nutzung bei Ärzte ohne Grenzen'
            ],
            guidelines: 'Verwenden für Fragen zum KI-Assistenten, MSF-Richtlinien, Datenschutz oder interne Dokumentation'
          },
          it: {
            useCases: [
              'Domande sull\'Assistente IA MSF stesso ("Cos\'è l\'Assistente IA MSF?", capacità, funzionalità, come assiste il personale MSF)',
              'FAQ sul chatbot IA (prompt, prompt riutilizzabili, comandi slash, automazione, esempi)',
              'Domande su archiviazione dati e privacy ("Dove sono archiviati i miei dati?", archiviazione conversazioni, archiviazione locale, archiviazione browser)',
              'Politica sulla privacy e termini d\'uso (dati proibiti, uso responsabile, usi proibiti, disclaimer di accuratezza)',
              'Politiche e linee guida specifiche MSF sull\'IA (cosa non mettere nell\'IA, sicurezza, protezione dei dati)',
              'Domande su affidabilità e fiducia (verifica dei fatti, verifica, giudizio umano)',
              'Informazioni di supporto e contatto (segnalazioni di bug, feedback, ai@newyork.msf.org, ai.team@amsterdam.msf.org)',
              'Aiuto con le funzionalità del chatbot (creazione di prompt, bot personalizzati, navigazione dell\'interfaccia)',
              'Utilizzo dell\'IA nell\'organizzazione Medici Senza Frontiere'
            ],
            guidelines: 'Utilizzare per domande sull\'assistente IA, politiche MSF, privacy o documentazione interna'
          },
          pt: {
            useCases: [
              'Perguntas sobre o próprio Assistente de IA MSF ("O que é o Assistente de IA MSF?", capacidades, recursos, como ajuda a equipe MSF)',
              'FAQ sobre o chatbot de IA (prompts, prompts reutilizáveis, comandos de barra, automação, exemplos)',
              'Perguntas sobre armazenamento de dados e privacidade ("Onde meus dados são armazenados?", armazenamento de conversas, armazenamento local, armazenamento do navegador)',
              'Política de privacidade e termos de uso (dados proibidos, uso responsável, usos proibidos, avisos de precisão)',
              'Políticas e diretrizes específicas da MSF sobre IA (o que não colocar na IA, segurança, proteção de dados)',
              'Perguntas sobre confiabilidade e confiança (verificação de fatos, verificação, julgamento humano)',
              'Informações de suporte e contato (relatórios de bugs, feedback, ai@newyork.msf.org, ai.team@amsterdam.msf.org)',
              'Ajuda com recursos do chatbot (criação de prompts, bots personalizados, navegação na interface)',
              'Uso de IA na organização Médicos Sem Fronteiras'
            ],
            guidelines: 'Usar para perguntas sobre o assistente de IA, políticas da MSF, privacidade ou documentação interna'
          },
          ja: {
            useCases: [
              'MSF AIアシスタント自体に関する質問（「MSF AIアシスタントとは何ですか？」、機能、特徴、MSFスタッフをどのように支援するか）',
              'AIチャットボットに関するFAQ（プロンプト、再利用可能なプロンプト、スラッシュコマンド、自動化、例）',
              'データストレージとプライバシーに関する質問（「私のデータはどこに保存されていますか？」、会話ストレージ、ローカルストレージ、ブラウザストレージ）',
              'プライバシーポリシーと利用規約（禁止データ、責任ある使用、禁止される使用、精度の免責事項）',
              'MSF固有のAIポリシーとガイドライン（AIに入れるべきでないもの、セキュリティ、データ保護）',
              '信頼性と信頼に関する質問（事実確認、検証、人間の判断）',
              'サポートと連絡先情報（バグレポート、フィードバック、ai@newyork.msf.org、ai.team@amsterdam.msf.org）',
              'チャットボット機能のヘルプ（プロンプトの作成、カスタムボット、インターフェースナビゲーション）',
              '国境なき医師団（MSF）組織でのAI使用'
            ],
            guidelines: 'AIアシスタント、MSFポリシー、プライバシー、内部ドキュメントに関する質問に使用'
          },
          ko: {
            useCases: [
              'MSF AI 어시스턴트 자체에 관한 질문("MSF AI 어시스턴트란 무엇인가요?", 기능, 특징, MSF 직원을 어떻게 지원하는지)',
              'AI 챗봇에 관한 FAQ(프롬프트, 재사용 가능한 프롬프트, 슬래시 명령, 자동화, 예시)',
              '데이터 저장 및 개인정보 보호 질문("내 데이터는 어디에 저장되나요?", 대화 저장, 로컬 저장, 브라우저 저장)',
              '개인정보 보호 정책 및 이용 약관(금지된 데이터, 책임 있는 사용, 금지된 사용, 정확성 면책 조항)',
              'MSF 특정 AI 정책 및 지침(AI에 넣지 말아야 할 것, 보안, 데이터 보호)',
              '신뢰성 및 신뢰 질문(사실 확인, 검증, 인간 판단)',
              '지원 및 연락처 정보(버그 신고, 피드백, ai@newyork.msf.org, ai.team@amsterdam.msf.org)',
              '챗봇 기능 도움말(프롬프트 생성, 커스텀 봇, 인터페이스 탐색)',
              '국경없는 의사회(MSF) 조직의 AI 사용'
            ],
            guidelines: 'AI 어시스턴트, MSF 정책, 개인정보 보호 또는 내부 문서에 대한 질문에 사용'
          },
          zh: {
            useCases: [
              '关于MSF AI助手本身的问题（"什么是MSF AI助手？"、功能、特点、如何帮助MSF员工）',
              '关于AI聊天机器人的常见问题（提示、可重用提示、斜杠命令、自动化、示例）',
              '数据存储和隐私问题（"我的数据存储在哪里？"、对话存储、本地存储、浏览器存储）',
              '隐私政策和使用条款（禁止数据、负责任使用、禁止用途、准确性免责声明）',
              'MSF特定的AI政策和指南（不应放入AI的内容、安全性、数据保护）',
              '关于可靠性和信任的问题（事实核查、验证、人类判断）',
              '支持和联系信息（错误报告、反馈、ai@newyork.msf.org、ai.team@amsterdam.msf.org）',
              '聊天机器人功能帮助（创建提示、自定义机器人、界面导航）',
              '无国界医生组织（MSF）的AI使用'
            ],
            guidelines: '用于关于AI助手、MSF政策、隐私或内部文档的问题'
          }
        },
        usageCriteria: [
          'Questions about the AI assistant itself',
          'MSF-specific policies and guidelines',
          'Privacy and data protection queries',
          'Internal documentation requests',
          'Support and help questions'
        ],
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
      enabled: false, // Disabled - not ready for production yet
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
        systemPrompts: {
          en: {
            useCases: [
              'Code execution, debugging, and analysis',
              'Data analysis and visualization',
              'Mathematical calculations and modeling',
              'File processing (CSV, JSON, logs)',
              'Programming tutorials and explanations',
              'Algorithm implementation and testing',
              'Scientific computing and research'
            ],
            guidelines: 'Use when code execution or technical analysis is required'
          },
          es: {
            useCases: [
              'Ejecución, depuración y análisis de código',
              'Análisis y visualización de datos',
              'Cálculos matemáticos y modelado',
              'Procesamiento de archivos (CSV, JSON, logs)',
              'Tutoriales y explicaciones de programación',
              'Implementación y prueba de algoritmos',
              'Computación científica e investigación'
            ],
            guidelines: 'Usar cuando se requiere ejecución de código o análisis técnico'
          },
          fr: {
            useCases: [
              'Exécution, débogage et analyse de code',
              'Analyse et visualisation de données',
              'Calculs mathématiques et modélisation',
              'Traitement de fichiers (CSV, JSON, logs)',
              'Tutoriels et explications de programmation',
              'Implémentation et test d\'algorithmes',
              'Informatique scientifique et recherche'
            ],
            guidelines: 'Utiliser lorsque l\'exécution de code ou l\'analyse technique est requise'
          },
          de: {
            useCases: [
              'Code-Ausführung, Debugging und Analyse',
              'Datenanalyse und Visualisierung',
              'Mathematische Berechnungen und Modellierung',
              'Dateiverarbeitung (CSV, JSON, Logs)',
              'Programmier-Tutorials und Erklärungen',
              'Algorithmus-Implementierung und -Tests',
              'Wissenschaftliches Rechnen und Forschung'
            ],
            guidelines: 'Verwenden, wenn Code-Ausführung oder technische Analyse erforderlich ist'
          },
          it: {
            useCases: [
              'Esecuzione, debug e analisi del codice',
              'Analisi e visualizzazione dei dati',
              'Calcoli matematici e modellazione',
              'Elaborazione di file (CSV, JSON, log)',
              'Tutorial e spiegazioni di programmazione',
              'Implementazione e test di algoritmi',
              'Calcolo scientifico e ricerca'
            ],
            guidelines: 'Utilizzare quando è richiesta l\'esecuzione di codice o l\'analisi tecnica'
          },
          pt: {
            useCases: [
              'Execução, depuração e análise de código',
              'Análise e visualização de dados',
              'Cálculos matemáticos e modelagem',
              'Processamento de arquivos (CSV, JSON, logs)',
              'Tutoriais e explicações de programação',
              'Implementação e teste de algoritmos',
              'Computação científica e pesquisa'
            ],
            guidelines: 'Usar quando a execução de código ou análise técnica é necessária'
          },
          ja: {
            useCases: [
              'コードの実行、デバッグ、分析',
              'データ分析と可視化',
              '数学的計算とモデリング',
              'ファイル処理（CSV、JSON、ログ）',
              'プログラミングのチュートリアルと説明',
              'アルゴリズムの実装とテスト',
              '科学計算と研究'
            ],
            guidelines: 'コード実行や技術的分析が必要な場合に使用'
          },
          ko: {
            useCases: [
              '코드 실행, 디버깅 및 분석',
              '데이터 분석 및 시각화',
              '수학적 계산 및 모델링',
              '파일 처리(CSV, JSON, 로그)',
              '프로그래밍 튜토리얼 및 설명',
              '알고리즘 구현 및 테스트',
              '과학적 컴퓨팅 및 연구'
            ],
            guidelines: '코드 실행이나 기술적 분석이 필요할 때 사용'
          },
          zh: {
            useCases: [
              '代码执行、调试和分析',
              '数据分析和可视化',
              '数学计算和建模',
              '文件处理（CSV、JSON、日志）',
              '编程教程和解释',
              '算法实现和测试',
              '科学计算和研究'
            ],
            guidelines: '需要代码执行或技术分析时使用'
          }
        },
        usageCriteria: [
          'Code blocks or programming language mentioned',
          'Request for data analysis or visualization',
          'Mathematical or computational tasks',
          'File processing requirements',
          'Algorithm or technical implementation needs'
        ],
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
        systemPrompts: {
          en: {
            useCases: [
              'Translate text between languages with automatic language detection',
              'Language-specific phrase translations',
              'Multi-language document conversion',
              'Cross-language communication support'
            ],
            guidelines: 'Use when translation between languages is explicitly requested'
          },
          es: {
            useCases: [
              'Traducir texto entre idiomas con detección automática de idioma',
              'Traducciones de frases específicas del idioma',
              'Conversión de documentos multiidioma',
              'Soporte de comunicación entre idiomas'
            ],
            guidelines: 'Usar cuando se solicita explícitamente traducción entre idiomas'
          },
          fr: {
            useCases: [
              'Traduire du texte entre langues avec détection automatique de langue',
              'Traductions de phrases spécifiques à la langue',
              'Conversion de documents multilingues',
              'Support de communication inter-langues'
            ],
            guidelines: 'Utiliser lorsque la traduction entre langues est explicitement demandée'
          },
          de: {
            useCases: [
              'Text zwischen Sprachen mit automatischer Spracherkennung übersetzen',
              'Sprachspezifische Phrasenübersetzungen',
              'Mehrsprachige Dokumentkonvertierung',
              'Sprachübergreifende Kommunikationsunterstützung'
            ],
            guidelines: 'Verwenden, wenn Übersetzung zwischen Sprachen explizit angefordert wird'
          },
          it: {
            useCases: [
              'Tradurre testo tra lingue con rilevamento automatico della lingua',
              'Traduzioni di frasi specifiche della lingua',
              'Conversione di documenti multilingue',
              'Supporto alla comunicazione interlinguistica'
            ],
            guidelines: 'Utilizzare quando è esplicitamente richiesta la traduzione tra lingue'
          },
          pt: {
            useCases: [
              'Traduzir texto entre idiomas com detecção automática de idioma',
              'Traduções de frases específicas do idioma',
              'Conversão de documentos multilíngues',
              'Suporte de comunicação entre idiomas'
            ],
            guidelines: 'Usar quando a tradução entre idiomas é explicitamente solicitada'
          },
          ja: {
            useCases: [
              '自動言語検出による言語間のテキスト翻訳',
              '言語固有のフレーズ翻訳',
              '多言語ドキュメント変換',
              '言語間コミュニケーションサポート'
            ],
            guidelines: '言語間の翻訳が明示的に要求された場合に使用'
          },
          ko: {
            useCases: [
              '자동 언어 감지를 통한 언어 간 텍스트 번역',
              '언어별 구문 번역',
              '다국어 문서 변환',
              '언어 간 커뮤니케이션 지원'
            ],
            guidelines: '언어 간 번역이 명시적으로 요청될 때 사용'
          },
          zh: {
            useCases: [
              '具有自动语言检测的语言间文本翻译',
              '特定语言短语翻译',
              '多语言文档转换',
              '跨语言交流支持'
            ],
            guidelines: '明确要求语言间翻译时使用'
          }
        },
        usageCriteria: [
          'Explicit translation request',
          'Language conversion mentioned',
          'Multi-language requirements',
          'Cross-cultural communication needs'
        ],
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
        systemPrompts: {
          en: {
            useCases: [
              'General conversation and casual questions',
              'Personal advice and recommendations',
              'Creative writing and brainstorming',
              'Language learning and practice',
              'Explanations without specific tool requirements',
              'Simple Q&A that doesn\'t need external data'
            ],
            guidelines: 'Default agent for general conversation without specific tool needs'
          },
          es: {
            useCases: [
              'Conversación general y preguntas casuales',
              'Consejos y recomendaciones personales',
              'Escritura creativa y lluvia de ideas',
              'Aprendizaje y práctica de idiomas',
              'Explicaciones sin requisitos específicos de herramientas',
              'Preguntas y respuestas simples que no necesitan datos externos'
            ],
            guidelines: 'Agente predeterminado para conversación general sin necesidades específicas de herramientas'
          },
          fr: {
            useCases: [
              'Conversation générale et questions informelles',
              'Conseils et recommandations personnels',
              'Écriture créative et brainstorming',
              'Apprentissage et pratique des langues',
              'Explications sans exigences d\'outils spécifiques',
              'Questions-réponses simples ne nécessitant pas de données externes'
            ],
            guidelines: 'Agent par défaut pour la conversation générale sans besoins d\'outils spécifiques'
          },
          de: {
            useCases: [
              'Allgemeine Konversation und beiläufige Fragen',
              'Persönliche Ratschläge und Empfehlungen',
              'Kreatives Schreiben und Brainstorming',
              'Sprachenlernen und -übung',
              'Erklärungen ohne spezifische Tool-Anforderungen',
              'Einfache Fragen und Antworten, die keine externen Daten benötigen'
            ],
            guidelines: 'Standard-Agent für allgemeine Konversation ohne spezifische Tool-Anforderungen'
          },
          it: {
            useCases: [
              'Conversazione generale e domande casuali',
              'Consigli e raccomandazioni personali',
              'Scrittura creativa e brainstorming',
              'Apprendimento e pratica delle lingue',
              'Spiegazioni senza requisiti specifici di strumenti',
              'Domande e risposte semplici che non necessitano di dati esterni'
            ],
            guidelines: 'Agente predefinito per conversazione generale senza esigenze specifiche di strumenti'
          },
          pt: {
            useCases: [
              'Conversação geral e perguntas casuais',
              'Conselhos e recomendações pessoais',
              'Escrita criativa e brainstorming',
              'Aprendizado e prática de idiomas',
              'Explicações sem requisitos específicos de ferramentas',
              'Perguntas e respostas simples que não precisam de dados externos'
            ],
            guidelines: 'Agente padrão para conversação geral sem necessidades específicas de ferramentas'
          },
          ja: {
            useCases: [
              '一般的な会話とカジュアルな質問',
              '個人的なアドバイスと推奨事項',
              'クリエイティブな文章作成とブレインストーミング',
              '言語学習と練習',
              '特定のツール要件のない説明',
              '外部データを必要としない簡単なQ&A'
            ],
            guidelines: '特定のツールニーズのない一般的な会話のためのデフォルトエージェント'
          },
          ko: {
            useCases: [
              '일반 대화 및 일상적인 질문',
              '개인 조언 및 추천',
              '창의적인 글쓰기 및 브레인스토밍',
              '언어 학습 및 연습',
              '특정 도구 요구 사항이 없는 설명',
              '외부 데이터가 필요 없는 간단한 Q&A'
            ],
            guidelines: '특정 도구 요구 사항이 없는 일반 대화를 위한 기본 에이전트'
          },
          zh: {
            useCases: [
              '一般对话和随意问题',
              '个人建议和推荐',
              '创意写作和头脑风暴',
              '语言学习和练习',
              '不需要特定工具要求的解释',
              '不需要外部数据的简单问答'
            ],
            guidelines: '没有特定工具需求的一般对话的默认代理'
          }
        },
        usageCriteria: [
          'General conversation topics',
          'No specific tool requirements',
          'Creative or personal discussions',
          'Default fallback for unclear intents'
        ],
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
        systemPrompts: {
          en: {
            useCases: [
              'Complex reasoning and analysis',
              'Multi-step problem solving',
              'Advanced AI capabilities',
              'Sophisticated dialogue and conversation',
              'Tasks requiring high-level cognition',
              'When other agents aren\'t sufficient'
            ],
            guidelines: 'Use for complex tasks requiring advanced reasoning or when other agents are insufficient'
          },
          es: {
            useCases: [
              'Razonamiento complejo y análisis',
              'Resolución de problemas de múltiples pasos',
              'Capacidades avanzadas de IA',
              'Diálogo y conversación sofisticados',
              'Tareas que requieren cognición de alto nivel',
              'Cuando otros agentes no son suficientes'
            ],
            guidelines: 'Usar para tareas complejas que requieren razonamiento avanzado o cuando otros agentes son insuficientes'
          },
          fr: {
            useCases: [
              'Raisonnement complexe et analyse',
              'Résolution de problèmes à plusieurs étapes',
              'Capacités avancées d\'IA',
              'Dialogue et conversation sophistiqués',
              'Tâches nécessitant une cognition de haut niveau',
              'Quand les autres agents ne sont pas suffisants'
            ],
            guidelines: 'Utiliser pour des tâches complexes nécessitant un raisonnement avancé ou lorsque les autres agents sont insuffisants'
          },
          de: {
            useCases: [
              'Komplexes Denken und Analyse',
              'Mehrstufige Problemlösung',
              'Fortgeschrittene KI-Fähigkeiten',
              'Anspruchsvoller Dialog und Konversation',
              'Aufgaben, die Kognition auf hohem Niveau erfordern',
              'Wenn andere Agenten nicht ausreichen'
            ],
            guidelines: 'Verwenden für komplexe Aufgaben, die fortgeschrittenes Denken erfordern oder wenn andere Agenten nicht ausreichen'
          },
          it: {
            useCases: [
              'Ragionamento complesso e analisi',
              'Risoluzione di problemi a più fasi',
              'Capacità avanzate di IA',
              'Dialogo e conversazione sofisticati',
              'Compiti che richiedono cognizione di alto livello',
              'Quando altri agenti non sono sufficienti'
            ],
            guidelines: 'Utilizzare per compiti complessi che richiedono ragionamento avanzato o quando altri agenti sono insufficienti'
          },
          pt: {
            useCases: [
              'Raciocínio complexo e análise',
              'Resolução de problemas em várias etapas',
              'Capacidades avançadas de IA',
              'Diálogo e conversação sofisticados',
              'Tarefas que requerem cognição de alto nível',
              'Quando outros agentes não são suficientes'
            ],
            guidelines: 'Usar para tarefas complexas que requerem raciocínio avançado ou quando outros agentes são insuficientes'
          },
          ja: {
            useCases: [
              '複雑な推論と分析',
              '多段階の問題解決',
              '高度なAI機能',
              '洗練された対話と会話',
              '高レベルの認知を必要とするタスク',
              '他のエージェントでは不十分な場合'
            ],
            guidelines: '高度な推論が必要な複雑なタスクや、他のエージェントでは不十分な場合に使用'
          },
          ko: {
            useCases: [
              '복잡한 추론 및 분석',
              '다단계 문제 해결',
              '고급 AI 기능',
              '정교한 대화 및 대화',
              '고수준 인지가 필요한 작업',
              '다른 에이전트가 충분하지 않을 때'
            ],
            guidelines: '고급 추론이 필요한 복잡한 작업이나 다른 에이전트가 충분하지 않을 때 사용'
          },
          zh: {
            useCases: [
              '复杂推理和分析',
              '多步骤问题解决',
              '高级AI功能',
              '复杂对话和交流',
              '需要高水平认知的任务',
              '当其他代理不足时'
            ],
            guidelines: '用于需要高级推理的复杂任务或其他代理不足时'
          }
        },
        usageCriteria: [
          'Complex multi-step reasoning required',
          'Advanced analytical tasks',
          'When standard agents are insufficient',
          'High-level cognitive challenges'
        ],
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
        systemPrompts: {
          en: {
            useCases: [
              'External API integrations',
              'Service-specific queries (Slack, GitHub, etc.)',
              'Authentication-required services',
              'Custom webhook calls',
              'Enterprise system integrations'
            ],
            guidelines: 'Use for third-party service integrations and external APIs'
          },
          es: {
            useCases: [
              'Integraciones de API externas',
              'Consultas específicas de servicios (Slack, GitHub, etc.)',
              'Servicios que requieren autenticación',
              'Llamadas webhook personalizadas',
              'Integraciones de sistemas empresariales'
            ],
            guidelines: 'Usar para integraciones de servicios de terceros y APIs externas'
          },
          fr: {
            useCases: [
              'Intégrations d\'API externes',
              'Requêtes spécifiques à des services (Slack, GitHub, etc.)',
              'Services nécessitant une authentification',
              'Appels webhook personnalisés',
              'Intégrations de systèmes d\'entreprise'
            ],
            guidelines: 'Utiliser pour les intégrations de services tiers et les API externes'
          },
          de: {
            useCases: [
              'Externe API-Integrationen',
              'Service-spezifische Anfragen (Slack, GitHub, etc.)',
              'Authentifizierungspflichtige Dienste',
              'Benutzerdefinierte Webhook-Aufrufe',
              'Unternehmens-System-Integrationen'
            ],
            guidelines: 'Verwenden für Drittanbieter-Service-Integrationen und externe APIs'
          },
          it: {
            useCases: [
              'Integrazioni API esterne',
              'Query specifiche per servizi (Slack, GitHub, ecc.)',
              'Servizi che richiedono autenticazione',
              'Chiamate webhook personalizzate',
              'Integrazioni di sistemi aziendali'
            ],
            guidelines: 'Utilizzare per integrazioni di servizi di terze parti e API esterne'
          },
          pt: {
            useCases: [
              'Integrações de API externas',
              'Consultas específicas de serviços (Slack, GitHub, etc.)',
              'Serviços que requerem autenticação',
              'Chamadas webhook personalizadas',
              'Integrações de sistemas empresariais'
            ],
            guidelines: 'Usar para integrações de serviços de terceiros e APIs externas'
          },
          ja: {
            useCases: [
              '外部APIの統合',
              'サービス固有のクエリ（Slack、GitHubなど）',
              '認証が必要なサービス',
              'カスタムウェブフックコール',
              'エンタープライズシステム統合'
            ],
            guidelines: 'サードパーティサービスの統合と外部APIに使用'
          },
          ko: {
            useCases: [
              '외부 API 통합',
              '서비스별 쿼리(Slack, GitHub 등)',
              '인증이 필요한 서비스',
              '사용자 정의 웹훅 호출',
              '기업 시스템 통합'
            ],
            guidelines: '타사 서비스 통합 및 외부 API에 사용'
          },
          zh: {
            useCases: [
              '外部API集成',
              '特定服务查询（Slack、GitHub等）',
              '需要认证的服务',
              '自定义webhook调用',
              '企业系统集成'
            ],
            guidelines: '用于第三方服务集成和外部API'
          }
        },
        usageCriteria: [
          'Third-party service mentioned explicitly',
          'External API integration required',
          'Custom webhook or integration needs',
          'Enterprise system connectivity'
        ],
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
