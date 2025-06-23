/**
 * Centralized Intent Classification Service
 * 
 * Replaces hardcoded intentClassificationPrompts.ts with dynamic configuration
 * from the centralized agent registry. This eliminates 1700+ lines of hardcoded
 * prompts and keywords in favor of centralized configuration.
 */

import { AgentType } from '@/types/agent';
import { getConfigProcessor } from '@/config/agents/processor';

/**
 * Intent classification service using centralized agent configuration
 */
export class CentralizedIntentService {
  private configBundle: any;
  private confidenceGuidelines: any;
  private exclusionPatterns: any;
  private classificationSchema: any;
  
  constructor() {
    this.initializeConfiguration();
  }

  /**
   * Initialize service with centralized configuration
   */
  private initializeConfiguration(): void {
    const processor = getConfigProcessor();
    this.configBundle = processor.generateConfigBundle();
    this.confidenceGuidelines = this.configBundle.confidenceGuidelines;
    this.exclusionPatterns = this.configBundle.exclusionPatterns;
    this.classificationSchema = this.configBundle.classificationSchema;
  }

  /**
   * Get system prompts dynamically generated from agent configurations
   */
  getSystemPrompt(locale: string = 'en'): string {
    // Get the multilingual base prompt
    const basePrompt = this.getMultilingualBasePrompt(locale);
    const enabledAgents = Object.keys(this.configBundle.intentClassification);
    
    let agentDescriptions = '';

    // Generate agent descriptions dynamically from centralized config
    for (const agentType of enabledAgents) {
      const uiConfig = this.configBundle.ui[agentType];
      const intentConfig = this.configBundle.intentClassification[agentType];
      
      if (uiConfig && intentConfig) {
        const icon = this.getAgentIcon(agentType);
        agentDescriptions += `${icon} **${agentType}** - Use for:\n`;
        
        // Check if rich system prompts are available
        const systemPrompts = intentConfig.systemPrompts;
        if (systemPrompts && systemPrompts[locale]) {
          // Use rich system prompts from registry
          const promptData = systemPrompts[locale];
          if (promptData.useCases && promptData.useCases.length > 0) {
            promptData.useCases.forEach((useCase: string) => {
              agentDescriptions += `- ${useCase}\n`;
            });
          }
          if (promptData.guidelines) {
            agentDescriptions += `*${promptData.guidelines}*\n`;
          }
        } else {
          // Fallback to original localized description
          const localizedDesc = this.getLocalizedAgentDescription(agentType, locale);
          agentDescriptions += localizedDesc + '\n';
        }
        
        agentDescriptions += '\n';
      }
    }

    // Combine base prompt with dynamic agent descriptions
    return basePrompt.replace('{agentDescriptions}', agentDescriptions);
  }

  /**
   * Get multilingual base system prompt
   */
  private getMultilingualBasePrompt(locale: string): string {
    const prompts = {
      en: `You are an expert AI agent classifier. Your job is to analyze user queries and determine the most appropriate agent to handle their request with high precision.

AVAILABLE AGENT TYPES AND THEIR USE CASES:

{agentDescriptions}

CLASSIFICATION GUIDELINES:

1. **Time Sensitivity**: If query mentions "today", "recent", "latest", "current", "now", "breaking" → likely **web_search**
2. **Code Presence**: If query contains code blocks, programming languages, or technical execution → **code_interpreter**
3. **URL Presence**: If query contains URLs or asks about specific websites → **url_pull**
4. **Company Context**: If query asks about internal/company information → **local_knowledge**
5. **Translation**: If query asks for translation → **translation**
6. **Complexity**: For complex reasoning or multi-step analysis → **foundry**
7. **External Services**: For third-party integrations or APIs → **third_party**
8. **Default**: For general conversation without specific requirements → **standard_chat**

CONFIDENCE SCORING:
- 0.9-1.0: Very clear indicators (URLs, code blocks, time references)
- 0.7-0.8: Strong contextual clues
- 0.5-0.6: Moderate confidence based on keywords
- 0.3-0.4: Weak signals, borderline cases
- 0.1-0.2: Very uncertain, default fallback

Always provide reasoning for your classification and consider alternative interpretations.`,

      es: `Eres un clasificador experto de agentes de IA. Tu trabajo es analizar las consultas de los usuarios y determinar el agente más apropiado para manejar su solicitud con alta precisión.

TIPOS DE AGENTES DISPONIBLES Y SUS CASOS DE USO:

{agentDescriptions}

DIRECTRICES DE CLASIFICACIÓN:

1. **Sensibilidad temporal**: Si la consulta menciona "hoy", "reciente", "último", "actual", "ahora", "última hora" → probablemente **web_search**
2. **Presencia de código**: Si la consulta contiene bloques de código, lenguajes de programación o ejecución técnica → **code_interpreter**
3. **Presencia de URL**: Si la consulta contiene URLs o pregunta sobre sitios web específicos → **url_pull**
4. **Contexto de la empresa**: Si la consulta pregunta sobre información interna/de la empresa → **local_knowledge**
5. **Traducción**: Si la consulta pide traducción → **translation**
6. **Complejidad**: Para razonamiento complejo o análisis de múltiples pasos → **foundry**
7. **Servicios externos**: Para integraciones o APIs de terceros → **third_party**
8. **Predeterminado**: Para conversación general sin requisitos específicos → **standard_chat**

PUNTUACIÓN DE CONFIANZA:
- 0.9-1.0: Indicadores muy claros (URLs, bloques de código, referencias temporales)
- 0.7-0.8: Fuertes pistas contextuales
- 0.5-0.6: Confianza moderada basada en palabras clave
- 0.3-0.4: Señales débiles, casos límite
- 0.1-0.2: Muy incierto, respaldo predeterminado

Siempre proporciona razonamiento para tu clasificación y considera interpretaciones alternativas.`,

      fr: `Vous êtes un classificateur expert d'agents IA. Votre travail consiste à analyser les requêtes des utilisateurs et à déterminer l'agent le plus approprié pour traiter leur demande avec une haute précision.

TYPES D'AGENTS DISPONIBLES ET LEURS CAS D'USAGE:

{agentDescriptions}

DIRECTIVES DE CLASSIFICATION:

1. **Sensibilité temporelle**: Si la requête mentionne "aujourd'hui", "récent", "dernier", "actuel", "maintenant", "dernière heure" → probablement **web_search**
2. **Présence de code**: Si la requête contient des blocs de code, des langages de programmation ou une exécution technique → **code_interpreter**
3. **Présence d'URL**: Si la requête contient des URLs ou pose des questions sur des sites web spécifiques → **url_pull**
4. **Contexte de l'entreprise**: Si la requête pose des questions sur des informations internes/d'entreprise → **local_knowledge**  
5. **Traduction**: Si la requête demande une traduction → **translation**
6. **Complexité**: Pour un raisonnement complexe ou une analyse à plusieurs étapes → **foundry**
7. **Services externes**: Pour les intégrations ou APIs tierces → **third_party**
8. **Par défaut**: Pour une conversation générale sans exigences spécifiques → **standard_chat**

SCORE DE CONFIANCE:
- 0.9-1.0: Indicateurs très clairs (URLs, blocs de code, références temporelles)
- 0.7-0.8: Indices contextuels forts
- 0.5-0.6: Confiance modérée basée sur des mots-clés
- 0.3-0.4: Signaux faibles, cas limites
- 0.1-0.2: Très incertain, solution de repli par défaut

Fournissez toujours un raisonnement pour votre classification et considérez des interprétations alternatives.`,

      de: `Sie sind ein Experten-KI-Agent-Klassifizierer. Ihre Aufgabe ist es, Benutzeranfragen zu analysieren und den am besten geeigneten Agent für die Bearbeitung ihrer Anfrage mit hoher Präzision zu bestimmen.

VERFÜGBARE AGENT-TYPEN UND IHRE ANWENDUNGSFÄLLE:

{agentDescriptions}

KLASSIFIZIERUNGSRICHTLINIEN:

1. **Zeitempfindlichkeit**: Wenn die Anfrage "heute", "aktuell", "neueste", "jetzt", "gerade", "breaking" erwähnt → wahrscheinlich **web_search**
2. **Code-Präsenz**: Wenn die Anfrage Code-Blöcke, Programmiersprachen oder technische Ausführung enthält → **code_interpreter**
3. **URL-Präsenz**: Wenn die Anfrage URLs enthält oder nach spezifischen Websites fragt → **url_pull**
4. **Unternehmenskontext**: Wenn die Anfrage nach internen/Unternehmensinformationen fragt → **local_knowledge**
5. **Übersetzung**: Wenn die Anfrage eine Übersetzung verlangt → **translation**
6. **Komplexität**: Für komplexe Argumentation oder mehrstufige Analyse → **foundry**
7. **Externe Dienste**: Für Drittanbieter-Integrationen oder APIs → **third_party**
8. **Standard**: Für allgemeine Unterhaltung ohne spezifische Anforderungen → **standard_chat**

VERTRAUENSBEWERTUNG:
- 0.9-1.0: Sehr klare Indikatoren (URLs, Code-Blöcke, Zeitreferenzen)
- 0.7-0.8: Starke kontextuelle Hinweise
- 0.5-0.6: Mäßiges Vertrauen basierend auf Schlüsselwörtern
- 0.3-0.4: Schwache Signale, Grenzfälle
- 0.1-0.2: Sehr unsicher, Standard-Fallback

Geben Sie immer eine Begründung für Ihre Klassifizierung und berücksichtigen Sie alternative Interpretationen.`,

      it: `Sei un classificatore esperto di agenti IA. Il tuo compito è analizzare le query degli utenti e determinare l'agente più appropriato per gestire la loro richiesta con alta precisione.

TIPI DI AGENTI DISPONIBILI E I LORO CASI D'USO:

{agentDescriptions}

LINEE GUIDA PER LA CLASSIFICAZIONE:

1. **Sensibilità temporale**: Se la query menziona "oggi", "recente", "ultimo", "attuale", "ora", "breaking" → probabilmente **web_search**
2. **Presenza di codice**: Se la query contiene blocchi di codice, linguaggi di programmazione o esecuzione tecnica → **code_interpreter**
3. **Presenza di URL**: Se la query contiene URL o chiede di siti web specifici → **url_pull**
4. **Contesto aziendale**: Se la query chiede informazioni interne/aziendali → **local_knowledge**
5. **Traduzione**: Se la query richiede una traduzione → **translation**
6. **Complessità**: Per ragionamento complesso o analisi multi-step → **foundry**
7. **Servizi esterni**: Per integrazioni o API di terze parti → **third_party**
8. **Predefinito**: Per conversazione generale senza requisiti specifici → **standard_chat**

PUNTEGGIO DI FIDUCIA:
- 0.9-1.0: Indicatori molto chiari (URL, blocchi di codice, riferimenti temporali)
- 0.7-0.8: Forti indizi contestuali
- 0.5-0.6: Fiducia moderata basata su parole chiave
- 0.3-0.4: Segnali deboli, casi limite
- 0.1-0.2: Molto incerto, fallback predefinito

Fornisci sempre il ragionamento per la tua classificazione e considera interpretazioni alternative.`,

      pt: `Você é um classificador especialista em agentes de IA. Seu trabalho é analisar consultas de usuários e determinar o agente mais apropriado para lidar com sua solicitação com alta precisão.

TIPOS DE AGENTES DISPONÍVEIS E SEUS CASOS DE USO:

{agentDescriptions}

DIRETRIZES DE CLASSIFICAÇÃO:

1. **Sensibilidade temporal**: Se a consulta menciona "hoje", "recente", "último", "atual", "agora", "breaking" → provavelmente **web_search**
2. **Presença de código**: Se a consulta contém blocos de código, linguagens de programação ou execução técnica → **code_interpreter**
3. **Presença de URL**: Se a consulta contém URLs ou pergunta sobre sites específicos → **url_pull**
4. **Contexto da empresa**: Se a consulta pergunta sobre informações internas/da empresa → **local_knowledge**
5. **Tradução**: Se a consulta pede uma tradução → **translation**
6. **Complexidade**: Para raciocínio complexo ou análise de múltiplas etapas → **foundry**
7. **Serviços externos**: Para integrações ou APIs de terceiros → **third_party**
8. **Padrão**: Para conversa geral sem requisitos específicos → **standard_chat**

PONTUAÇÃO DE CONFIANÇA:
- 0.9-1.0: Indicadores muito claros (URLs, blocos de código, referências temporais)
- 0.7-0.8: Pistas contextuais fortes
- 0.5-0.6: Confiança moderada baseada em palavras-chave
- 0.3-0.4: Sinais fracos, casos limítrofes
- 0.1-0.2: Muito incerto, fallback padrão

Sempre forneça raciocínio para sua classificação e considere interpretações alternativas.`,

      ja: `あなたはAIエージェント分類の専門家です。ユーザーのクエリを分析し、高精度でリクエストを処理するのに最適なエージェントを決定することが仕事です。

利用可能なエージェントタイプとその使用例：

{agentDescriptions}

分類ガイドライン：

1. **時間的感度**: クエリが「今日」「最近」「最新」「現在」「今」「速報」を含む場合 → おそらく **web_search**
2. **コードの存在**: クエリにコードブロック、プログラミング言語、技術的実行が含まれる場合 → **code_interpreter**
3. **URLの存在**: クエリにURLが含まれるか、特定のウェブサイトについて質問する場合 → **url_pull**
4. **企業コンテキスト**: クエリが内部/企業情報について質問する場合 → **local_knowledge**
5. **翻訳**: クエリが翻訳を求める場合 → **translation**
6. **複雑性**: 複雑な推論や多段階分析の場合 → **foundry**
7. **外部サービス**: サードパーティ統合やAPIの場合 → **third_party**
8. **デフォルト**: 特定の要件のない一般的な会話の場合 → **standard_chat**

信頼度スコア：
- 0.9-1.0: 非常に明確な指標（URL、コードブロック、時間参照）
- 0.7-0.8: 強いコンテキスト手がかり
- 0.5-0.6: キーワードに基づく中程度の信頼度
- 0.3-0.4: 弱いシグナル、境界ケース
- 0.1-0.2: 非常に不確実、デフォルトフォールバック

常に分類の理由を提供し、代替解釈を考慮してください。`,

      ko: `당신은 AI 에이전트 분류 전문가입니다. 사용자 쿼리를 분석하고 높은 정확도로 요청을 처리할 가장 적절한 에이전트를 결정하는 것이 당신의 일입니다.

사용 가능한 에이전트 유형 및 사용 사례:

{agentDescriptions}

분류 가이드라인:

1. **시간 민감성**: 쿼리가 "오늘", "최근", "최신", "현재", "지금", "속보"를 언급하는 경우 → 아마도 **web_search**
2. **코드 존재**: 쿼리에 코드 블록, 프로그래밍 언어 또는 기술적 실행이 포함된 경우 → **code_interpreter**
3. **URL 존재**: 쿼리에 URL이 포함되거나 특정 웹사이트에 대해 묻는 경우 → **url_pull**
4. **회사 컨텍스트**: 쿼리가 내부/회사 정보에 대해 묻는 경우 → **local_knowledge**
5. **번역**: 쿼리가 번역을 요청하는 경우 → **translation**
6. **복잡성**: 복잡한 추론이나 다단계 분석의 경우 → **foundry**
7. **외부 서비스**: 제3자 통합 또는 API의 경우 → **third_party**
8. **기본**: 특정 요구사항이 없는 일반적인 대화의 경우 → **standard_chat**

신뢰도 점수:
- 0.9-1.0: 매우 명확한 지표 (URL, 코드 블록, 시간 참조)
- 0.7-0.8: 강한 문맥적 단서
- 0.5-0.6: 키워드 기반 중간 신뢰도
- 0.3-0.4: 약한 신호, 경계 사례
- 0.1-0.2: 매우 불확실, 기본 폴백

항상 분류에 대한 이유를 제공하고 대안적 해석을 고려하세요.`,

      zh: `您是AI代理分类专家。您的工作是分析用户查询并高精度地确定处理其请求的最合适代理。

可用的代理类型及其用例：

{agentDescriptions}

分类指南：

1. **时间敏感性**：如果查询提到"今天"、"最近"、"最新"、"当前"、"现在"、"突发" → 可能是 **web_search**
2. **代码存在**：如果查询包含代码块、编程语言或技术执行 → **code_interpreter**
3. **URL存在**：如果查询包含URL或询问特定网站 → **url_pull**
4. **公司上下文**：如果查询询问内部/公司信息 → **local_knowledge**
5. **翻译**：如果查询请求翻译 → **translation**
6. **复杂性**：对于复杂推理或多步分析 → **foundry**
7. **外部服务**：对于第三方集成或API → **third_party**
8. **默认**：对于没有特定要求的一般对话 → **standard_chat**

置信度评分：
- 0.9-1.0：非常明确的指标（URL、代码块、时间参考）
- 0.7-0.8：强的上下文线索
- 0.5-0.6：基于关键词的中等置信度
- 0.3-0.4：弱信号、边缘情况
- 0.1-0.2：非常不确定、默认回退

始终为您的分类提供推理并考虑替代解释。`
    };

    return prompts[locale as keyof typeof prompts] || prompts.en;
  }

  /**
   * Get localized agent description
   */
  private getLocalizedAgentDescription(agentType: string, locale: string): string {
    const intentConfig = this.configBundle.intentClassification[agentType];
    const examples = intentConfig?.examples?.slice(0, 3) || [];
    
    // First try to use system prompts if available
    const systemPrompts = intentConfig?.systemPrompts;
    if (systemPrompts) {
      const promptData = systemPrompts[locale] || systemPrompts['en'];
      if (promptData && promptData.useCases && promptData.useCases.length > 0) {
        // Use first few use cases as description
        const useCases = promptData.useCases.slice(0, 3).map((uc: string) => `- ${uc}`).join('\n');
        return useCases;
      }
    }
    
    // Get examples as bullet points
    const exampleText = examples.length > 0 
      ? examples.map((ex: string) => `- ${ex}`).join('\n')
      : '- General queries for this agent type';

    // Use the agent's localized prompt if available, otherwise use description
    const prompt = intentConfig?.prompts?.[locale] || intentConfig?.prompts?.en;
    if (prompt) {
      return `${prompt.replace('{query}', 'user queries')}\n${exampleText}`;
    }

    // Fallback to UI description
    const uiConfig = this.configBundle.ui[agentType];
    return `${uiConfig?.description || 'Agent for specific tasks'}\n${exampleText}`;
  }

  /**
   * Get agent-specific guidance from centralized configuration
   */
  getAgentGuidance(agentType: AgentType): any {
    const intentConfig = this.configBundle.intentClassification[agentType];
    
    if (!intentConfig) {
      return {
        keywords: [],
        patterns: [],
        examples: [],
        threshold: 0.5,
      };
    }

    return {
      keywords: intentConfig.keywords || [],
      patterns: intentConfig.patterns || [],
      examples: this.generateExamplesFromKeywords(intentConfig.keywords?.slice(0, 5) || []),
      threshold: intentConfig.threshold || 0.5,
      category: intentConfig.intentCategory,
      prompts: intentConfig.prompts || {},
    };
  }

  /**
   * Build contextual prompt using centralized configuration
   */
  buildContextualPrompt(
    query: string,
    locale: string = 'en',
    conversationHistory?: string[],
    additionalContext?: Record<string, any>,
  ): string {
    const template = this.getUserPromptTemplate(locale);
    const currentDateTime = new Date().toISOString();
    
    const historySection = conversationHistory?.length
      ? `**Recent Conversation:**\n${conversationHistory
          .slice(-3)
          .map((msg, i) => `${i + 1}. ${msg}`)
          .join('\n')}\n`
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
   * Get keyword maps for all agents
   */
  getKeywordMaps(): Record<string, AgentType[]> {
    return this.configBundle.keywordMaps;
  }

  /**
   * Get keywords by category
   */
  getKeywordsByCategory(): Record<string, string[]> {
    return this.configBundle.keywordsByCategory;
  }

  /**
   * Get agent scoring configurations
   */
  getAgentScoringConfigs(): Record<AgentType, any> {
    return this.configBundle.agentScoring;
  }

  /**
   * Validate confidence score
   */
  validateConfidenceScore(confidence: number): boolean {
    return confidence >= 0 && confidence <= 1;
  }

  /**
   * Get enhanced classification schema
   */
  getClassificationSchema(): any {
    return this.classificationSchema;
  }

  /**
   * Get confidence guidelines for an agent
   */
  getConfidenceGuidelines(agentType?: AgentType): any {
    if (agentType) {
      return this.confidenceGuidelines[agentType] || {};
    }
    return this.confidenceGuidelines;
  }

  /**
   * Get exclusion patterns for detecting user avoidance
   */
  getExclusionPatterns(agentType?: AgentType): any {
    if (agentType) {
      return this.exclusionPatterns[agentType] || {};
    }
    return this.exclusionPatterns;
  }

  /**
   * Check if user wants to avoid a specific agent
   */
  checkAgentExclusion(query: string, agentType: AgentType): boolean {
    const exclusionConfig = this.exclusionPatterns[agentType];
    if (!exclusionConfig) return false;

    const lowerQuery = query.toLowerCase();

    // Check avoidance patterns
    for (const pattern of exclusionConfig.avoidancePatterns || []) {
      if (lowerQuery.includes(pattern.toLowerCase())) {
        return true;
      }
    }

    // Check negative regex patterns
    for (const pattern of exclusionConfig.negativePatterns || []) {
      if (pattern.test(query)) {
        return true;
      }
    }

    // Check exclusion keywords
    for (const keyword of exclusionConfig.exclusionKeywords || []) {
      if (lowerQuery.includes(keyword.toLowerCase())) {
        return true;
      }
    }

    return false;
  }

  /**
   * Get confidence score for a classification result
   */
  getConfidenceScore(agentType: AgentType, matchScore: number): number {
    const guidelines = this.confidenceGuidelines[agentType];
    if (!guidelines?.ranges) {
      // Default confidence calculation
      return Math.min(0.9, 0.5 + matchScore);
    }

    // Use agent-specific confidence guidelines 
    for (const [level, config] of Object.entries(guidelines.ranges)) {
      const rangeConfig = config as { range: [number, number]; description: string; examples: string[] };
      const [min, max] = rangeConfig.range;
      if (matchScore >= min && matchScore <= max) {
        return Math.min(max, Math.max(min, matchScore));
      }
    }

    return matchScore;
  }

  /**
   * Get user prompt template for locale
   */
  private getUserPromptTemplate(locale: string): string {
    // Simplified template - in production, this could be expanded with locale-specific versions
    const templates = {
      en: `Analyze this user query and classify it to the most appropriate agent:

**Query:** {query}

{conversationHistory}
{additionalContext}

**Current Time:** {currentDateTime}
**Locale:** {locale}
**Session:** {sessionContext}

Provide your classification with high confidence and detailed reasoning.`,
      
      es: `Analiza esta consulta del usuario y clasifícala al agente más apropiado:

**Consulta:** {query}

{conversationHistory}
{additionalContext}

**Hora Actual:** {currentDateTime}
**Idioma:** {locale}
**Sesión:** {sessionContext}

Proporciona tu clasificación con alta confianza y razonamiento detallado.`,
      
      fr: `Analysez cette requête utilisateur et classifiez-la vers l'agent le plus approprié:

**Requête:** {query}

{conversationHistory}
{additionalContext}

**Heure Actuelle:** {currentDateTime}
**Langue:** {locale}
**Session:** {sessionContext}

Fournissez votre classification avec une grande confiance et un raisonnement détaillé.`,
      
      de: `Analysieren Sie diese Benutzeranfrage und klassifizieren Sie sie zum am besten geeigneten Agent:

**Anfrage:** {query}

{conversationHistory}
{additionalContext}

**Aktuelle Zeit:** {currentDateTime}
**Sprache:** {locale}
**Sitzung:** {sessionContext}

Geben Sie Ihre Klassifizierung mit hohem Vertrauen und detaillierter Begründung an.`,
      
      it: `Analizza questa query utente e classificala verso l'agente più appropriato:

**Query:** {query}

{conversationHistory}
{additionalContext}

**Orario Attuale:** {currentDateTime}
**Lingua:** {locale}
**Sessione:** {sessionContext}

Fornisci la tua classificazione con alta fiducia e ragionamento dettagliato.`,
      
      pt: `Analise esta consulta do usuário e classifique-a para o agente mais apropriado:

**Consulta:** {query}

{conversationHistory}
{additionalContext}

**Horário Atual:** {currentDateTime}
**Idioma:** {locale}
**Sessão:** {sessionContext}

Forneça sua classificação com alta confiança e raciocínio detalhado.`,
      
      ja: `このユーザークエリを分析し、最も適切なエージェントに分類してください：

**クエリ:** {query}

{conversationHistory}
{additionalContext}

**現在時刻:** {currentDateTime}
**言語:** {locale}
**セッション:** {sessionContext}

高い信頼度と詳細な推論で分類を提供してください。`,
      
      ko: `이 사용자 쿼리를 분석하고 가장 적절한 에이전트로 분류하세요:

**쿼리:** {query}

{conversationHistory}
{additionalContext}

**현재 시간:** {currentDateTime}
**언어:** {locale}
**세션:** {sessionContext}

높은 신뢰도와 상세한 추론으로 분류를 제공하세요.`,
      
      zh: `分析此用户查询并将其分类到最合适的代理：

**查询:** {query}

{conversationHistory}
{additionalContext}

**当前时间:** {currentDateTime}
**语言:** {locale}
**会话:** {sessionContext}

请以高置信度和详细推理提供您的分类。`
    };

    return templates[locale as keyof typeof templates] || templates.en;
  }

  /**
   * Generate example queries from keywords
   */
  private generateExamplesFromKeywords(keywords: string[]): string[] {
    const examples: string[] = [];
    
    for (const keyword of keywords.slice(0, 3)) {
      examples.push(`Example query with "${keyword}"`);
    }
    
    return examples;
  }

  /**
   * Get agent icon for display
   */
  private getAgentIcon(agentType: string): string {
    const iconMap: Record<string, string> = {
      'web-search': '🔍',
      'code-interpreter': '💻',
      'url-pull': '🌐',
      'local-knowledge': '📚',
      'translation': '🔤',
      'standard-chat': '💬',
      'foundry': '🤖',
      'third-party': '🔗',
    };

    return iconMap[agentType] || '🤖';
  }
}

/**
 * Singleton instance
 */
let centralizedIntentService: CentralizedIntentService | null = null;

/**
 * Get singleton instance of centralized intent service
 */
export function getCentralizedIntentService(): CentralizedIntentService {
  if (!centralizedIntentService) {
    centralizedIntentService = new CentralizedIntentService();
  }
  return centralizedIntentService;
}

/**
 * Export functions that match the original intentClassificationPrompts.ts interface
 * for backwards compatibility while migration is in progress
 */

export function buildContextualPrompt(
  query: string,
  locale: string,
  conversationHistory?: string[],
  additionalContext?: Record<string, any>,
): string {
  const service = getCentralizedIntentService();
  return service.buildContextualPrompt(query, locale, conversationHistory, additionalContext);
}

export function getAgentGuidance(agentType: AgentType): any {
  const service = getCentralizedIntentService();
  return service.getAgentGuidance(agentType);
}

export function validateConfidenceScore(confidence: number): boolean {
  const service = getCentralizedIntentService();
  return service.validateConfidenceScore(confidence);
}

// Export centralized configuration-based constants
export const SYSTEM_PROMPTS = {
  get en() {
    return getCentralizedIntentService().getSystemPrompt('en');
  },
  get es() {
    return getCentralizedIntentService().getSystemPrompt('es');
  },
  get fr() {
    return getCentralizedIntentService().getSystemPrompt('fr');
  },
  get de() {
    return getCentralizedIntentService().getSystemPrompt('de');
  },
  get it() {
    return getCentralizedIntentService().getSystemPrompt('it');
  },
  get pt() {
    return getCentralizedIntentService().getSystemPrompt('pt');
  },
  get ja() {
    return getCentralizedIntentService().getSystemPrompt('ja');
  },
  get ko() {
    return getCentralizedIntentService().getSystemPrompt('ko');
  },
  get zh() {
    return getCentralizedIntentService().getSystemPrompt('zh');
  },
};

export const ENHANCED_CLASSIFICATION_SCHEMA = {
  get schema() {
    return getCentralizedIntentService().getClassificationSchema();
  },
};

export const AGENT_SPECIFIC_GUIDANCE = new Proxy({}, {
  get(target, prop) {
    if (typeof prop === 'string') {
      return getCentralizedIntentService().getAgentGuidance(prop as AgentType);
    }
    return undefined;
  }
});