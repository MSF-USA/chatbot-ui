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

    // Local knowledge indicators
    const knowledgeKeywords = [
      'explain', 'how to', 'why does', 'what does', 'define', 'meaning',
      'difference between', 'compare', 'tutorial', 'guide', 'best practices',
      'recommend', 'suggest', 'advice'
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

    // Check for knowledge/explanation intent
    const knowledgeScore = this.calculateKeywordScore(lowerMessage, knowledgeKeywords);
    const foundKnowledgeKeywords = knowledgeKeywords.filter(kw => lowerMessage.includes(kw));
    console.log('[IntentAnalysis] Knowledge/explanation analysis:', {
      score: knowledgeScore,
      threshold: 0.2,
      higherThanOthers: knowledgeScore > Math.max(webSearchScore, codeScore),
      passed: knowledgeScore > Math.max(webSearchScore, codeScore) && knowledgeScore > 0.2,
      foundKeywords: foundKnowledgeKeywords
    });
    
    if (knowledgeScore > Math.max(webSearchScore, codeScore) && knowledgeScore > 0.2) {
      intent = 'knowledge-query';
      confidence = Math.min(0.8, 0.5 + knowledgeScore);
      suggestedAgentType = 'local-knowledge';
      reasoning = 'Message requests explanation or educational content';
      keywords.push(...foundKnowledgeKeywords);
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