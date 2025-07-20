import { AgentType } from '@/types/agent';

/**
 * Intent Classification Prompts and Schemas
 * Provides optimized prompts and schemas for AI-powered intent classification
 */

/**
 * Enhanced system prompts for different languages
 */
export const SYSTEM_PROMPTS = {
  en: `You are an expert AI agent classifier. Your job is to analyze user queries and determine the most appropriate agent to handle their request with high precision.

AVAILABLE AGENT TYPES AND THEIR USE CASES:

🔍 **web_search** - Use for:
- Current events, breaking news, recent information
- Real-time data (stock prices, weather, sports scores)
- Information requiring freshness (today, this week, latest, recent)
- Market research, product reviews, comparative analysis
- Fact-checking and verification
- General knowledge questions about recent topics

💻 **code_interpreter** - Use for:
- Code execution, debugging, and analysis
- Data analysis and visualization
- Mathematical calculations and modeling
- File processing (CSV, JSON, logs)
- Programming tutorials and explanations
- Algorithm implementation and testing
- Scientific computing and research

🌐 **url_pull** - Use for:
- Analyzing specific websites or web pages
- Extracting content from URLs
- Website comparison or evaluation
- Reading articles, documentation, or web content
- Scraping or parsing web data
- SEO analysis and website auditing

📚 **local_knowledge** - Use for:
- Questions about the MSF AI Assistant itself ("What is the MSF AI Assistant?", capabilities, features, how it assists MSF staff)
- FAQ about the AI chatbot (prompts, reusable prompts, slash commands, automation, examples)
- Data storage and privacy questions ("Where is my data stored?", conversation storage, local storage, browser storage)
- Privacy policy and terms of use (prohibited data, responsible use, prohibited uses, accuracy disclaimers)
- MSF-specific AI policies and guidelines (what not to put in the AI, security, data protection)
- Reliability and trust questions (fact-checking, verification, human judgment)
- Support and contact information (bug reports, feedback, ai@newyork.msf.org, ai.team@amsterdam.msf.org)
- Help with chatbot features (creating prompts, custom bots, interface navigation)
- Médecins Sans Frontières / Doctors Without Borders organizational AI usage

💬 **standard_chat** - Use for:
- General conversation and casual questions
- Personal advice and recommendations
- Creative writing and brainstorming
- Language learning and practice
- Explanations without specific tool requirements
- Simple Q&A that doesn't need external data

🤖 **foundry** - Use for:
- Complex reasoning and analysis
- Multi-step problem solving
- Advanced AI capabilities
- Sophisticated dialogue and conversation
- Tasks requiring high-level cognition
- When other agents aren't sufficient

🔗 **third_party** - Use for:
- External API integrations
- Service-specific queries (Slack, GitHub, etc.)
- Authentication-required services
- Custom webhook calls
- Enterprise system integrations

CLASSIFICATION GUIDELINES:

1. **Time Sensitivity**: If query mentions "today", "recent", "latest", "current", "now", "breaking" → likely **web_search**
2. **Code Presence**: If query contains code blocks, programming languages, or technical execution → **code_interpreter**
3. **URL Presence**: If query contains URLs or asks about specific websites → **url_pull**
4. **Company Context**: If query asks about internal/company information → **local_knowledge**
5. **Complexity**: For complex reasoning or multi-step analysis → **foundry**
6. **External Services**: For third-party integrations or APIs → **third_party**
7. **Default**: For general conversation without specific requirements → **standard_chat**

CONFIDENCE SCORING:
- 0.9-1.0: Very clear indicators (URLs, code blocks, time references)
- 0.7-0.8: Strong contextual clues
- 0.5-0.6: Moderate confidence based on keywords
- 0.3-0.4: Weak signals, borderline cases
- 0.1-0.2: Very uncertain, default fallback

Always provide reasoning for your classification and consider alternative interpretations.`,

  es: `Eres un clasificador experto de agentes de IA. Tu trabajo es analizar las consultas de los usuarios y determinar el agente más apropiado para manejar su solicitud con alta precisión.

TIPOS DE AGENTES DISPONIBLES Y SUS CASOS DE USO:

🔍 **web_search** - Usar para:
- Eventos actuales, noticias de última hora, información reciente
- Datos en tiempo real (precios de acciones, clima, resultados deportivos)
- Información que requiere frescura (hoy, esta semana, último, reciente)
- Investigación de mercado, reseñas de productos, análisis comparativo
- Verificación de hechos
- Preguntas de conocimiento general sobre temas recientes

💻 **code_interpreter** - Usar para:
- Ejecución, depuración y análisis de código
- Análisis y visualización de datos
- Cálculos matemáticos y modelado
- Procesamiento de archivos (CSV, JSON, logs)
- Tutoriales y explicaciones de programación
- Implementación y prueba de algoritmos
- Computación científica e investigación

[Additional language-specific prompts would continue...]`,

  fr: `Vous êtes un classificateur expert d'agents IA. Votre travail consiste à analyser les requêtes des utilisateurs et à déterminer l'agent le plus approprié pour traiter leur demande avec une haute précision.

TYPES D'AGENTS DISPONIBLES ET LEURS CAS D'USAGE:

🔍 **web_search** - Utiliser pour:
- Événements actuels, dernières nouvelles, informations récentes
- Données en temps réel (prix des actions, météo, scores sportifs)
- Informations nécessitant de la fraîcheur (aujourd'hui, cette semaine, dernier, récent)
- Recherche de marché, avis produits, analyse comparative
- Vérification des faits
- Questions de culture générale sur des sujets récents

[Additional language-specific prompts would continue...]`,

  de: `Sie sind ein Experte für KI-Agent-Klassifizierung. Ihre Aufgabe ist es, Benutzeranfragen zu analysieren und den am besten geeigneten Agenten zu bestimmen, um ihre Anfrage mit hoher Präzision zu bearbeiten.`,

  it: `Sei un esperto classificatore di agenti IA. Il tuo compito è analizzare le query degli utenti e determinare l'agente più appropriato per gestire la loro richiesta con alta precisione.`,

  pt: `Você é um classificador especialista em agentes de IA. Seu trabalho é analisar consultas de usuários e determinar o agente mais apropriado para lidar com sua solicitação com alta precisão.`,

  ja: `あなたはAIエージェント分類の専門家です。ユーザーのクエリを分析し、高い精度でリクエストを処理するのに最も適切なエージェントを決定することがあなたの仕事です。`,

  ko: `당신은 AI 에이전트 분류 전문가입니다. 사용자 쿼리를 분석하고 높은 정확도로 요청을 처리할 가장 적절한 에이전트를 결정하는 것이 당신의 임무입니다.`,

  zh: `您是AI代理分类专家。您的工作是分析用户查询并确定最适合处理其请求的代理，要求具有高精度。`,
};

/**
 * Enhanced user prompts with examples for better classification
 */
export const USER_PROMPT_TEMPLATES = {
  en: `Analyze the following user query and classify it to determine the most appropriate agent type.

**User Query:** "{query}"

{conversationHistory}

{additionalContext}

**Context Information:**
- Current date/time: {currentDateTime}
- User locale: {locale}
- Session context: {sessionContext}

**Classification Requirements:**
1. Identify the primary intent and required capabilities
2. Consider time sensitivity and data freshness needs
3. Evaluate technical complexity and tool requirements
4. Assess whether external data or services are needed
5. Provide confidence score based on signal strength

**Examples for reference:**

🔍 **web_search** examples:
- "What's the latest news about Tesla stock?"
- "Find recent reviews for iPhone 15"
- "What happened in the market today?"
- "Current weather in New York"

💻 **code_interpreter** examples:
- "Debug this Python function: def calc..."
- "Analyze this CSV data and create a chart"
- "Calculate the mean of these numbers: [1,2,3,4,5]"
- "Write a function to sort an array"

🌐 **url_pull** examples:
- "Analyze this website: https://example.com"
- "What does this article say? [URL]"
- "Compare these two websites"
- "Extract data from this webpage"

📚 **local_knowledge** examples:
- "What is the MSF AI Assistant?"
- "How can the MSF AI Assistant assist MSF employees?"
- "How do I create a reusable prompt?"
- "How can I automate and reuse prompts?"
- "Where is my conversation data stored?"
- "Where are my conversations and custom bots?"
- "What data should I NOT put into the MSF AI Assistant?"
- "Should the MSF AI Assistant's responses be 100% trusted?"
- "What are the prohibited uses of the MSF AI Assistant?"
- "Who should I contact for privacy concerns?"
- "Where should I go with bug reports or feedback?"
- "What are some example questions I can ask?"
- "What is a prompt and how do I use it?"
- "How does the MSF AI Assistant protect privacy?"

💬 **standard_chat** examples:
- "Tell me a joke"
- "How are you today?"
- "What's your opinion on coffee?"
- "Help me brainstorm ideas for a project"

🤖 **foundry** examples:
- "Analyze the philosophical implications of AI consciousness"
- "Create a complex business strategy for market expansion"
- "Solve this multi-step logical reasoning problem"
- "Provide deep analysis of historical patterns"

🔗 **third_party** examples:
- "Create a GitHub issue in my repository"
- "Send a message to the #dev channel in Slack"
- "Update my calendar with this meeting"
- "Query the sales database for Q4 results"

**IMPORTANT - User Exclusions:**
Always check if the user explicitly requests to AVOID certain agent types. Pay special attention to phrases like:
- "don't search the web" / "without searching" → AVOID web_search agent
- "don't run code" / "no code execution" → AVOID code_interpreter agent  
- "don't access urls" / "no external links" → AVOID url_pull agent
- "don't use internal" / "external sources only" → AVOID local_knowledge agent
- "offline only" / "local only" → AVOID web_search and url_pull agents

If a user explicitly requests to avoid an agent type, give that agent type a very low confidence score (0.05-0.1) regardless of other indicators.

Provide your classification with detailed reasoning.`,

  es: `Analiza la siguiente consulta del usuario y clasifícala para determinar el tipo de agente más apropiado.

**Consulta del Usuario:** "{query}"

{conversationHistory}

{additionalContext}

**Información de Contexto:**
- Fecha/hora actual: {currentDateTime}
- Locale del usuario: {locale}
- Contexto de sesión: {sessionContext}

[Spanish template continues...]`,

  fr: `Analysez la requête utilisateur suivante et classifiez-la pour déterminer le type d'agent le plus approprié.

**Requête Utilisateur:** "{query}"

{conversationHistory}

{additionalContext}

**Informations de Contexte:**
- Date/heure actuelle: {currentDateTime}
- Locale utilisateur: {locale}
- Contexte de session: {sessionContext}

[French template continues...]`,
};

/**
 * Simplified JSON schema compatible with OpenAI strict mode
 */
export const ENHANCED_CLASSIFICATION_SCHEMA = {
  type: 'object' as const,
  properties: {
    agent_type: {
      type: 'string' as const,
      enum: Object.values(AgentType),
      description: 'The primary recommended agent type for handling this query',
    },
    confidence: {
      type: 'number' as const,
      minimum: 0,
      maximum: 1,
      description: 'Confidence score for the primary recommendation (0.00-1.00)',
    },
    reasoning: {
      type: 'string' as const,
      description: 'Detailed explanation for why this agent was recommended',
    },
    query: {
      type: 'string' as const,
      description: 'Optimized search query if applicable',
    },
    complexity: {
      type: 'string' as const,
      enum: ['simple', 'moderate', 'complex'],
      description: 'Assessment of query complexity',
    },
    time_sensitive: {
      type: 'boolean' as const,
      description: 'Whether the query is time-sensitive',
    },
  },
  required: [
    'agent_type',
    'confidence', 
    'reasoning',
    'query',
    'complexity',
    'time_sensitive',
  ],
  additionalProperties: false,
};

/**
 * Agent-specific prompt guidance for better parameter extraction
 */
export const AGENT_SPECIFIC_GUIDANCE = {
  [AgentType.WEB_SEARCH]: {
    keywords: [
      'latest', 'recent', 'current', 'today', 'now', 'breaking', 'news',
      'search', 'find', 'look up', 'google', 'what is happening',
      'price', 'stock', 'weather', 'score', 'update', 'live',
      'trending', 'market', 'real-time', 'immediate', 'fresh',
      'this week', 'this month', 'this year', 'compare', 'reviews',
      'who won', 'results', 'election', 'poll', 'statistics'
    ],
    patterns: [
      /\b(latest|recent|current|today|now|breaking|trending|immediate)\b/i,
      /\b(what'?s happening|breaking news|live updates?|real-?time)\b/i,
      /\b(price of|stock price|weather in|score of|market data)\b/i,
      /\b(who won|results of|outcome of|winner of)\b/i,
      /\b(compare|vs|versus|difference between|better than)\b/i,
      /\b(reviews?|ratings?|opinions? on|feedback about)\b/i,
      /\b(this (week|month|year)|in \d{4}|since \d{4})\b/i,
      /\b(trending|viral|popular|top \d+|best \d+)\b/i,
    ],
    examples: [
      'latest news about climate change',
      'current stock price of Apple',
      'what happened today in politics',
      'compare iPhone 15 vs Samsung Galaxy S24',
      'reviews of the new Tesla Model 3',
      'trending topics on social media',
      'who won the election yesterday',
      'real-time weather in New York'
    ]
  },

  [AgentType.CODE_INTERPRETER]: {
    keywords: [
      'code', 'program', 'script', 'function', 'debug', 'error', 'execute', 'run',
      'python', 'javascript', 'sql', 'bash', 'typescript', 'r',
      'data', 'analysis', 'calculate', 'compute', 'process',
      'algorithm', 'parse', 'csv', 'json', 'file', 'dataset',
      'visualization', 'chart', 'graph', 'plot', 'matplotlib',
      'pandas', 'numpy', 'dataframe', 'statistics', 'math',
      'database', 'query', 'select', 'insert', 'update',
      'machine learning', 'ml', 'model', 'predict', 'train'
    ],
    patterns: [
      /```[\w]*\n[\s\S]*?\n```/g,
      /`[^`\n]+`/g,
      /\b(def|function|class|import|from|console\.log|print\(|SELECT|INSERT|UPDATE)\b/i,
      /\b(execute|run|debug|analyze|calculate|compute)\s+.*?(code|script|function|program)\b/i,
      /\b(python|javascript|sql|bash|typescript)\s+.*?(code|script|program)\b/i,
      /\b(data\s+analysis|data\s+processing|machine\s+learning|ml\s+model)\b/i,
      /\b(plot|chart|graph|visualization|matplotlib|pandas|numpy)\b/i,
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
    ]
  },

  [AgentType.URL_PULL]: {
    keywords: [
      'website', 'url', 'link', 'page', 'site', 'analyze', 'webpage',
      'extract', 'scrape', 'content', 'article', 'read', 'parse',
      'fetch', 'pull', 'crawl', 'download', 'metadata', 'html',
      'compare websites', 'website comparison', 'seo analysis',
      'multiple urls', 'several links', 'batch process', 'parallel'
    ],
    patterns: [
      /https?:\/\/[^\s<>"{}|\\^`[\]]+/g,
      /www\.[^\s<>"{}|\\^`[\]]+/g,
      /\b[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}(?:\/[^\s<>"{}|\\^`[\]]*)?/g,
      /\b(analyze|extract|scrape|fetch|pull|crawl)\s+.*?(url|link|website|page|site)\b/i,
      /\b(multiple|several|batch|parallel)\s+.*?(url|link|website|page)\b/i,
      /\b(compare|comparison)\s+.*?(website|url|link|page)\b/i,
    ],
    examples: [
      'analyze this website: https://example.com',
      'what does this article say? https://news.example.com/article',
      'extract data from this webpage',
      'compare these websites: https://site1.com and https://site2.com',
      'process these URLs: https://example1.com, https://example2.com',
      // 'fetch content from multiple links',
      'analyze SEO for this site: https://business.com',
      // 'scrape data from these pages'
    ]
  },

  [AgentType.LOCAL_KNOWLEDGE]: {
    keywords: [
      // MSF AI Assistant specific (from actual FAQ content)
      'msf ai assistant', 'msf ai', 'ai assistant', 'chatbot', 'ai tool', 'chat tool', 'assistant',
      'médecins sans frontières', 'doctors without borders', 'msf', 'humanitarian',
      'what is', 'what can', 'how can', 'how do', 'capabilities', 'features', 'assist', 'help',
      'prompt', 'reusable prompt', 'create prompt', 'automate', 'slash command', 'prompts tab',
      'conversation', 'custom bot', 'stored', 'local storage', 'browser', 'device',
      'trust', 'reliable', 'accurate', 'fact-check', '100% trusted', 'verify', 'confirm',
      // Privacy and data protection (from actual privacy policy)
      'privacy', 'data protection', 'data storage', 'where stored', 'privacy policy', 'terms of use',
      'prohibited data', 'personal data', 'sensitive data', 'what not to put', 'responsible use',
      'prohibited uses', 'accuracy', 'bias', 'check outputs', 'privacy concerns', 'incidents',
      'faq', 'feedback', 'support', 'bug report', 'ai@newyork.msf.org', 'ai.team@amsterdam.msf.org',
      // Company/organizational
      // 'company', 'internal', 'org chart', 'organization', 'corporate', 'enterprise',
      // 'contact', 'documentation', 'docs', 'guide', 'handbook', 'manual', 'knowledge base', 'wiki',
      // 'what is our', 'where can i find', 'how do i',
      // 'hr', 'human resources', 'it', 'finance', 'accounting', 'legal', 'compliance', 'marketing', 'sales',
      // 'employee', 'staff', 'team', 'department', 'office', 'internal team', 'colleagues',
      // 'workflow', 'process', 'guideline', 'protocol', 'standard', 'best practice'
    ],
    patterns: [
      // MSF AI Assistant patterns
      /\b(msf ai assistant|msf ai|ai assistant|chatbot|what is|what can|how can|how do)\b/i,
      /\b(prompt|reusable prompt|conversation|custom bot|help|feature|capability)\b/i,
      /\b(privacy|data|storage|stored|secure|policy|terms|personal|sensitive)\b/i,
      /\b(faq|frequently asked|support|trust|reliable|accurate|feedback)\b/i,
      // Company/organizational patterns
      /\b(company|our|internal|organization|org|corporate|enterprise)\b/i,
      // /\b(policy|procedure|handbook|guide|documentation|docs|manual|wiki)\b/i,
      /\b(how do i|what is our|where can i find)\b/i,
      // /\b(hr|human resources|it|finance|accounting|legal|compliance|marketing|sales)\b/i,
      /\b(knowledge base|internal docs|company info|organizational|protocols)\b/i,
      /\b(employee|staff|team|department|office|internal team|colleagues)\b/i,
      /\b(workflow|process|guideline|protocol|standard|best practice)\b/i,
    ],
    examples: [
      // MSF AI Assistant examples
      'what is the msf ai assistant',
      'who are you',
      'what can the ai assistant do?',
      'how do i create a reusable prompt?',
      'where is my data stored?',
      'what data do you store about me?',
      'how can i use prompts?',
      'privacy policy questions',
      'what are the features of this chatbot?',
      'how should i trust the ai responses?',
      'where are my conversations stored?',
      'what can you help me to do?',
      'how do i automate prompts?',
      // Company/organizational examples
      'what is our vacation policy?',
      // 'show me the org chart',
      // 'company contact information',
      // 'how do I submit an expense report?',
      'what are the HR policies for remote work?',
      'where can I find the IT support documentation?',
      'internal procedures for new employee onboarding',
      // 'company guidelines for code review process',
      // 'who should I contact in the finance department?',
      // 'frequently asked questions about benefits',
      // 'our company\'s security protocols',
      // 'internal wiki about product specifications'
    ]
  },

  [AgentType.THIRD_PARTY]: {
    keywords: [
      'github', 'slack', 'jira', 'salesforce', 'calendar', 'email',
      'api', 'webhook', 'integration', 'create issue', 'send message'
    ],
    patterns: [
      /\b(github|slack|jira|salesforce|calendar|email)\b/i,
      /\b(create .* in|send .* to|update .* with)\b/i,
    ],
    examples: [
      'create a GitHub issue',
      'send a Slack message',
      'update my calendar'
    ]
  },

  [AgentType.STANDARD_CHAT]: {
    keywords: [
      'tell', 'explain', 'what', 'how', 'why', 'chat', 'talk', 'discuss',
      'opinion', 'think', 'help', 'advice', 'suggestion', 'recommend',
      'general', 'conversation', 'casual', 'personal', 'brainstorm'
    ],
    patterns: [
      /\b(tell me|explain|what do you think|how do you|opinion|advice|help me)\b/i,
      /\b(chat|talk|discuss|conversation|brainstorm|general question)\b/i,
      /\b(recommend|suggest|what would you|personal)\b/i,
    ],
    examples: [
      'tell me a joke',
      'what do you think about this?',
      'help me brainstorm ideas',
      'explain this concept',
      'give me your opinion on...',
      'what is the sphere handbook',
    ]
  },

  [AgentType.FOUNDRY]: {
    keywords: [
      'complex', 'advanced', 'sophisticated', 'deep', 'thorough', 'comprehensive',
      'analysis', 'reasoning', 'logic', 'philosophy', 'research', 'academic',
      'multi-step', 'strategy', 'detailed', 'in-depth'
    ],
    patterns: [
      /\b(complex|advanced|sophisticated|deep|thorough|comprehensive)\b/i,
      /\b(analysis|reasoning|logic|philosophy|research|academic)\b/i,
      /\b(multi-step|strategy|detailed|in-depth)\b/i,
    ],
    examples: [
      'analyze the philosophical implications of...',
      'create a complex business strategy',
      'provide in-depth analysis of...',
      'solve this multi-step problem'
    ]
  },
};

/**
 * Confidence scoring guidelines
 */
export const CONFIDENCE_GUIDELINES = {
  very_high: {
    range: [0.9, 1.0],
    description: 'Very clear indicators present',
    examples: ['URLs in query', 'Code blocks present', 'Explicit service mentions']
  },
  high: {
    range: [0.75, 0.89],
    description: 'Strong contextual clues',
    examples: ['Multiple relevant keywords', 'Clear intent patterns', 'Time-sensitive language']
  },
  medium: {
    range: [0.5, 0.74],
    description: 'Moderate confidence based on context',
    examples: ['Some relevant keywords', 'Partial pattern matches', 'Contextual inference']
  },
  low: {
    range: [0.3, 0.49],
    description: 'Weak signals, uncertain classification',
    examples: ['Ambiguous intent', 'Minimal context', 'Generic language']
  },
  very_low: {
    range: [0.1, 0.29],
    description: 'Very uncertain, fallback scenario',
    examples: ['No clear indicators', 'Contradictory signals', 'Insufficient information']
  }
};

/**
 * Helper function to build contextual prompts
 */
export function buildContextualPrompt(
  query: string,
  locale: string,
  conversationHistory?: string[],
  additionalContext?: Record<string, any>
): string {
  const template = USER_PROMPT_TEMPLATES[locale as keyof typeof USER_PROMPT_TEMPLATES] || USER_PROMPT_TEMPLATES.en;
  
  const currentDateTime = new Date().toISOString();
  const historySection = conversationHistory?.length 
    ? `**Recent Conversation:**\n${conversationHistory.slice(-3).map((msg, i) => `${i + 1}. ${msg}`).join('\n')}\n`
    : '';
  
  const contextSection = additionalContext 
    ? `**Additional Context:**\n${JSON.stringify(additionalContext, null, 2)}\n`
    : '';
  
  const sessionContext = additionalContext?.sessionInfo 
    ? `Session ID: ${additionalContext.sessionInfo.sessionId}, User: ${additionalContext.sessionInfo.userId}`
    : 'No session context';

  return template
    .replace('{query}', query)
    .replace('{conversationHistory}', historySection)
    .replace('{additionalContext}', contextSection)
    .replace('{currentDateTime}', currentDateTime)
    .replace('{locale}', locale)
    .replace('{sessionContext}', sessionContext);
}

/**
 * Helper function to get agent-specific guidance
 */
export function getAgentGuidance(agentType: AgentType) {
  return AGENT_SPECIFIC_GUIDANCE[agentType] || {
    keywords: [],
    patterns: [],
    examples: []
  };
}

/**
 * Helper function to validate confidence score
 */
export function validateConfidenceScore(confidence: number): boolean {
  return confidence >= 0 && confidence <= 1 && !isNaN(confidence);
}

/**
 * Agent exclusion patterns for detecting when users want to avoid specific agents
 */
export const AGENT_EXCLUSION_PATTERNS = {
  [AgentType.WEB_SEARCH]: {
    avoidancePatterns: [
      'don\'t search the web',
      'without searching',
      'no web search',
      'avoid search',
      'don\'t look online',
      'offline only',
      'without internet',
      'no online search',
      'don\'t browse',
      'without browsing',
      'no external search',
      'local only',
      'don\'t fetch online',
      'avoid web lookup'
    ],
    negativePatterns: [
      /don't\s+(search|look|browse|fetch|find)\s+(the\s+)?(web|online|internet)/i,
      /without\s+(searching|browsing|looking)\s+(the\s+)?(web|online|internet)/i,
      /no\s+(web\s+)?(search|browsing|online\s+search)/i,
      /avoid\s+(web\s+)?(search|browsing)/i,
      /not?\s+(search|look|browse)\s+(online|web)/i
    ],
    exclusionKeywords: [
      'offline', 'local only', 'no internet', 'internal only', 'cached only'
    ]
  },
  [AgentType.CODE_INTERPRETER]: {
    avoidancePatterns: [
      'don\'t run code',
      'no code execution',
      'without running',
      'avoid execution',
      'don\'t execute',
      'no script',
      'text only',
      'explanation only',
      'theory only',
      'conceptual only',
      'without coding',
      'no programming',
      'don\'t compile',
      'static only'
    ],
    negativePatterns: [
      /don't\s+(run|execute|compile)\s+(code|script|program)/i,
      /no\s+(code\s+)?(execution|running|compilation)/i,
      /without\s+(running|executing|coding)/i,
      /avoid\s+(code\s+)?(execution|running)/i,
      /(explanation|theory|concept)\s+only/i,
      /text\s+only/i
    ],
    exclusionKeywords: [
      'theory only', 'explanation only', 'conceptual', 'static analysis', 'no execution'
    ]
  },
  [AgentType.URL_PULL]: {
    avoidancePatterns: [
      'don\'t access urls',
      'no url fetching',
      'without pulling',
      'avoid external links',
      'don\'t fetch',
      'no website access',
      'offline content',
      'local content only',
      'don\'t visit',
      'no external access',
      'without accessing',
      'don\'t pull from'
    ],
    negativePatterns: [
      /don't\s+(access|fetch|pull|visit)\s+(url|link|website|site)/i,
      /no\s+(url|link|website)\s+(access|fetching|pulling)/i,
      /without\s+(accessing|pulling|fetching)\s+(url|link|website)/i,
      /avoid\s+(external\s+)?(link|url|website)/i,
      /local\s+(content\s+)?only/i
    ],
    exclusionKeywords: [
      'local only', 'offline content', 'no external', 'internal only'
    ]
  },
  [AgentType.LOCAL_KNOWLEDGE]: {
    avoidancePatterns: [
      'don\'t use internal',
      'no local knowledge',
      'external only',
      'fresh information',
      'current data only',
      'no cached',
      'live data only',
      'real-time only'
    ],
    negativePatterns: [
      /don't\s+use\s+(internal|local|cached)/i,
      /no\s+(local|internal|cached)\s+(knowledge|data|info)/i,
      /(fresh|current|live|real-time)\s+(data|info|information)\s+only/i,
      /external\s+(sources\s+)?only/i
    ],
    exclusionKeywords: [
      'external only', 'fresh only', 'current only', 'live data', 'real-time'
    ]
  },
  [AgentType.STANDARD_CHAT]: {
    avoidancePatterns: [
      'use special tools',
      'enhanced features',
      'agent assistance',
      'advanced capabilities'
    ],
    negativePatterns: [
      /use\s+(special\s+)?(tools|agents|features)/i,
      /enhanced\s+(features|capabilities)/i,
      /advanced\s+(help|assistance)/i
    ],
    exclusionKeywords: [
      'enhanced', 'advanced tools', 'special features'
    ]
  }
} as const;