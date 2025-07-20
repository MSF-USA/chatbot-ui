/**
 * Intent Analysis Service
 * 
 * Analyzes user messages to determine the best agent type for routing
 * and provides intent classification for enhanced chat experiences.
 */

export interface IntentAnalysisResult {
  intent: string;
  confidence: number;
  suggestedAgentType: 'web-search' | 'code-interpreter' | 'local-knowledge' | 'standard-chat';
  reasoning: string;
  keywords: string[];
}

export class IntentAnalysisService {
  private initialized = false;

  /**
   * Initialize the intent analysis service
   */
  async initialize(): Promise<void> {
    console.log('[INFO] Initializing Intent Analysis Service');
    this.initialized = true;
  }

  /**
   * Analyze user message intent and suggest agent type
   */
  async analyzeIntent(message: string): Promise<IntentAnalysisResult> {
    console.log('[IntentAnalysis] Starting intent analysis for message:', message);
    
    if (!this.initialized) {
      throw new Error('Intent Analysis Service not initialized');
    }

    // Simple intent analysis based on keywords and patterns
    const lowerMessage = message.toLowerCase();
    const keywords: string[] = [];
    
    console.log('[IntentAnalysis] Normalized message:', lowerMessage);
    
    // Web search indicators
    const webSearchKeywords = [
      'latest', 'news', 'current', 'recent', 'today', 'now', 'search', 'find',
      'what is', 'who is', 'when did', 'where is', 'how much', 'weather',
      'stock price', 'trending', 'happening'
    ];

    // Code interpreter indicators
    const codeKeywords = [
      'code', 'programming', 'script', 'function', 'debug', 'error', 'syntax',
      'python', 'javascript', 'typescript', 'react', 'node', 'css', 'html',
      'algorithm', 'data structure', 'api', 'database', 'sql'
    ];

    // Local knowledge indicators (FAQ and privacy related)
    const knowledgeKeywords = [
      'explain', 'how to', 'why does', 'what does', 'define', 'meaning',
      'difference between', 'compare', 'tutorial', 'guide', 'best practices',
      'recommend', 'suggest', 'advice'
    ];

    // FAQ-specific indicators (based on actual FAQ content)
    const faqKeywords = [
      // Core MSF AI Assistant terms
      'msf ai assistant', 'msf ai', 'ai assistant', 'chatbot', 'assistant', 'ai tool', 'chat tool',
      'médecins sans frontières', 'doctors without borders', 'msf', 'humanitarian',
      // Question patterns from FAQ
      'what is', 'what can', 'how can', 'how do', 'where', 'can you', 'what are', 'should',
      // Capabilities and features
      'capabilities', 'features', 'assist', 'help', 'tasks', 'employees', 'staff',
      'technical questions', 'reports', 'documentation', 'translation', 'brainstorming',
      // Prompts and automation
      'prompt', 'reusable prompt', 'create prompt', 'automate', 'slash command', 'prompts tab',
      'new prompt', 'save prompt', 'instructions', 'interface',
      // Storage and reliability
      'conversation', 'custom bot', 'stored', 'local storage', 'browser', 'device',
      'trust', 'reliable', 'accurate', 'fact-check', 'verify', 'confirm', '100% trusted',
      // Examples and support
      'example', 'examples', 'sample', 'what to ask', 'summarize', 'translate',
      'bug report', 'feedback', 'support', 'contact', 'ai@newyork.msf.org'
    ];

    // Privacy and security indicators (based on actual privacy policy content)
    const privacyKeywords = [
      // Core privacy terms
      'privacy', 'data protection', 'privacy policy', 'terms of use', 'privacy guarantees',
      // Data storage and processing
      'data', 'storage', 'stored', 'where stored', 'data storage', 'local', 'computer',
      'msf systems', 'microsoft azure', 'within msf', 'processed by msf',
      // Security and safety
      'secure', 'safety', 'safer', 'external tools', 'internal', 'control',
      // Prohibited content and uses
      'prohibited', 'personal data', 'sensitive data', 'what not to put', 'should not',
      'names', 'phone numbers', 'cvs', 'testimonies', 'identify individual',
      'prohibited uses', 'health care', 'surveillance', 'monitoring', 'employment decisions',
      'automated decision-making', 'media content', 'illegal activities', 'harmful activities',
      // Responsible use
      'responsible use', 'guidelines', 'msf policies', 'ict policies', 'ai policies',
      'check outputs', 'accuracy', 'bias', 'intellectual property', 'transparency', 'ai-generated',
      // Support and incidents
      'privacy concerns', 'incidents', 'ai.team@amsterdam.msf.org', 'dpo', 'data protection officer',
      'terms', 'policy', 'breach', 'incident', 'protection', 'confidential', 'security'
    ];

    let intent = 'general';
    let confidence = 0.5;
    let suggestedAgentType: IntentAnalysisResult['suggestedAgentType'] = 'standard-chat';
    let reasoning = 'Default classification for general conversation';

    // Check for web search intent
    const webSearchScore = this.calculateKeywordScore(lowerMessage, webSearchKeywords);
    const foundWebKeywords = webSearchKeywords.filter(kw => lowerMessage.includes(kw));
    console.log('[IntentAnalysis] Web search analysis:', {
      score: webSearchScore,
      threshold: 0.3,
      passed: webSearchScore > 0.3,
      foundKeywords: foundWebKeywords
    });
    
    if (webSearchScore > 0.3) {
      intent = 'web-search';
      confidence = Math.min(0.9, 0.6 + webSearchScore);
      suggestedAgentType = 'web-search';
      reasoning = 'Message contains indicators for web search or real-time information';
      keywords.push(...foundWebKeywords);
    }

    // Check for code intent
    const codeScore = this.calculateKeywordScore(lowerMessage, codeKeywords);
    const foundCodeKeywords = codeKeywords.filter(kw => lowerMessage.includes(kw));
    console.log('[IntentAnalysis] Code interpreter analysis:', {
      score: codeScore,
      threshold: 0.2,
      higherThanWebSearch: codeScore > webSearchScore,
      passed: codeScore > webSearchScore && codeScore > 0.2,
      foundKeywords: foundCodeKeywords
    });
    
    if (codeScore > webSearchScore && codeScore > 0.2) {
      intent = 'code-assistance';
      confidence = Math.min(0.9, 0.6 + codeScore);
      suggestedAgentType = 'code-interpreter';
      reasoning = 'Message contains programming or technical development indicators';
      keywords.push(...foundCodeKeywords);
    }

    // Check for FAQ-specific intent
    const faqScore = this.calculateKeywordScore(lowerMessage, faqKeywords);
    const foundFaqKeywords = faqKeywords.filter(kw => lowerMessage.includes(kw));
    console.log('[IntentAnalysis] FAQ analysis:', {
      score: faqScore,
      threshold: 0.1,
      foundKeywords: foundFaqKeywords
    });

    // Check for privacy/policy intent
    const privacyScore = this.calculateKeywordScore(lowerMessage, privacyKeywords);
    const foundPrivacyKeywords = privacyKeywords.filter(kw => lowerMessage.includes(kw));
    console.log('[IntentAnalysis] Privacy/policy analysis:', {
      score: privacyScore,
      threshold: 0.1,
      foundKeywords: foundPrivacyKeywords
    });

    // Check for general knowledge/explanation intent
    const knowledgeScore = this.calculateKeywordScore(lowerMessage, knowledgeKeywords);
    const foundKnowledgeKeywords = knowledgeKeywords.filter(kw => lowerMessage.includes(kw));
    console.log('[IntentAnalysis] General knowledge analysis:', {
      score: knowledgeScore,
      threshold: 0.2,
      foundKeywords: foundKnowledgeKeywords
    });

    // Calculate combined local knowledge score (FAQ + Privacy + General)
    const combinedKnowledgeScore = Math.max(faqScore, privacyScore, knowledgeScore);
    const isLocalKnowledgeQuery = combinedKnowledgeScore > Math.max(webSearchScore, codeScore) && 
                                  (faqScore > 0.1 || privacyScore > 0.1 || knowledgeScore > 0.15);

    console.log('[IntentAnalysis] Combined local knowledge analysis:', {
      combinedScore: combinedKnowledgeScore,
      higherThanOthers: combinedKnowledgeScore > Math.max(webSearchScore, codeScore),
      meetsThreshold: faqScore > 0.1 || privacyScore > 0.1 || knowledgeScore > 0.15,
      finalDecision: isLocalKnowledgeQuery
    });
    
    if (isLocalKnowledgeQuery) {
      // Determine specific type of local knowledge query
      if (faqScore > privacyScore && faqScore > knowledgeScore) {
        intent = 'faq-query';
        confidence = Math.min(0.9, 0.6 + faqScore);
        reasoning = 'Message appears to be asking about MSF AI Assistant features or capabilities';
        keywords.push(...foundFaqKeywords);
      } else if (privacyScore > faqScore && privacyScore > knowledgeScore) {
        intent = 'privacy-query';
        confidence = Math.min(0.9, 0.6 + privacyScore);
        reasoning = 'Message appears to be asking about privacy, data protection, or terms of use';
        keywords.push(...foundPrivacyKeywords);
      } else {
        intent = 'knowledge-query';
        confidence = Math.min(0.8, 0.5 + knowledgeScore);
        reasoning = 'Message requests explanation or educational content';
        keywords.push(...foundKnowledgeKeywords);
      }
      
      suggestedAgentType = 'local-knowledge';
    }

    // Special patterns
    const hasQuestion = this.hasQuestionPattern(lowerMessage);
    const hasUrgency = this.hasUrgencyPattern(lowerMessage);
    
    console.log('[IntentAnalysis] Pattern detection:', {
      hasQuestion,
      hasUrgency,
      confidenceBeforePatterns: confidence
    });
    
    if (hasQuestion) {
      confidence = Math.min(0.9, confidence + 0.1);
    }

    if (hasUrgency) {
      confidence = Math.min(0.9, confidence + 0.1);
      if (intent === 'web-search') {
        reasoning += ' (urgent/time-sensitive request detected)';
      }
    }

    const result = {
      intent,
      confidence,
      suggestedAgentType,
      reasoning,
      keywords: [...new Set(keywords)], // Remove duplicates
    };
    
    console.log('[IntentAnalysis] Final classification result:', {
      intent: result.intent,
      confidence: result.confidence,
      suggestedAgentType: result.suggestedAgentType,
      reasoning: result.reasoning,
      keywordCount: result.keywords.length,
      keywords: result.keywords
    });
    
    return result;
  }

  /**
   * Calculate keyword score based on presence and frequency
   */
  private calculateKeywordScore(message: string, keywords: string[]): number {
    let score = 0;
    let matchCount = 0;
    const matchedKeywords: string[] = [];

    for (const keyword of keywords) {
      if (message.includes(keyword)) {
        matchCount++;
        matchedKeywords.push(keyword);
        // Higher score for longer, more specific keywords
        score += keyword.length / 10;
      }
    }

    // Normalize by message length and keyword count
    const normalizedScore = (score / message.length) * (matchCount / keywords.length);
    const finalScore = Math.min(1.0, normalizedScore * 10); // Scale up and cap at 1.0
    
    console.log('[IntentAnalysis] Keyword score calculation:', {
      totalKeywords: keywords.length,
      matchedCount: matchCount,
      matchedKeywords: matchedKeywords.slice(0, 5), // Show first 5 for brevity
      rawScore: score,
      normalizedScore,
      finalScore
    });
    
    return finalScore;
  }

  /**
   * Check if message has question patterns
   */
  private hasQuestionPattern(message: string): boolean {
    const questionIndicators = [
      '?', 'how', 'what', 'when', 'where', 'why', 'who', 'which',
      'can you', 'could you', 'would you', 'do you', 'is it', 'are there'
    ];

    return questionIndicators.some(indicator => message.includes(indicator));
  }

  /**
   * Check if message has urgency patterns
   */
  private hasUrgencyPattern(message: string): boolean {
    const urgencyIndicators = [
      'urgent', 'asap', 'quickly', 'fast', 'immediate', 'now', 'right now',
      'emergency', 'critical', 'deadline', 'soon'
    ];

    return urgencyIndicators.some(indicator => message.includes(indicator));
  }

  /**
   * Get service health status
   */
  getHealthStatus() {
    return {
      initialized: this.initialized,
      status: this.initialized ? 'healthy' : 'not-initialized',
      capabilities: [
        'intent-classification',
        'agent-routing-suggestions',
        'keyword-analysis',
        'confidence-scoring'
      ]
    };
  }

  /**
   * Shutdown the service
   */
  async shutdown(): Promise<void> {
    console.log('[INFO] Shutting down Intent Analysis Service');
    this.initialized = false;
  }
}