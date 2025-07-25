/**
 * Intent Analysis Service
 *
 * Analyzes user messages to determine the best agent type for routing
 * and provides intent classification for enhanced chat experiences.
 * 
 * Now uses centralized agent configuration for keywords and intent classification.
 */

import { getConfigProcessor } from '@/config/agents/processor';
import { AgentType } from '@/types/agent';

export interface IntentAnalysisResult {
  intent: string;
  confidence: number;
  suggestedAgentType: AgentType;
  reasoning: string;
  keywords: string[];
}

export class IntentAnalysisService {
  private initialized = false;
  private keywordsByCategory: Record<string, string[]> = {};
  private agentScoringConfigs: Record<AgentType, any> = {} as Record<AgentType, any>;
  private intentClassificationConfigs: Record<string, any> = {};

  /**
   * Initialize the intent analysis service
   */
  async initialize(): Promise<void> {
    console.log('[INFO] Initializing Intent Analysis Service with centralized configuration');
    
    // Load centralized intent classification configurations
    const processor = getConfigProcessor();
    const configBundle = processor.generateConfigBundle();
    
    this.keywordsByCategory = configBundle.keywordsByCategory;
    this.agentScoringConfigs = configBundle.agentScoring;
    this.intentClassificationConfigs = configBundle.intentClassification;
    
    console.log('[INFO] Loaded intent classification configurations:', {
      categories: Object.keys(this.keywordsByCategory),
      agentTypes: Object.keys(this.agentScoringConfigs),
      totalKeywords: Object.values(this.keywordsByCategory).reduce((sum, arr) => sum + arr.length, 0),
    });
    
    this.initialized = true;
  }

  /**
   * Analyze user message intent and suggest agent type
   */
  async analyzeIntent(message: string): Promise<IntentAnalysisResult> {
    console.log(
      '[IntentAnalysis] Starting intent analysis for message:',
      message,
    );

    if (!this.initialized) {
      throw new Error('Intent Analysis Service not initialized');
    }

    // Use centralized agent configuration for intent analysis
    const lowerMessage = message.toLowerCase();
    const keywords: string[] = [];

    console.log('[IntentAnalysis] Normalized message:', lowerMessage);
    console.log('[IntentAnalysis] Using centralized configuration with categories:', 
      Object.keys(this.keywordsByCategory));

    // Analyze intent using centralized agent configurations
    let bestAgent: AgentType = AgentType.STANDARD_CHAT;
    let bestScore = 0;
    let bestIntent = 'general';
    let bestReasoning = 'Default classification for general conversation';
    const allMatchedKeywords: string[] = [];

    // Score each agent based on their configured keywords and thresholds
    for (const [agentType, scoringConfig] of Object.entries(this.agentScoringConfigs)) {
      const score = this.calculateKeywordScore(lowerMessage, scoringConfig.keywords);
      const foundKeywords = scoringConfig.keywords.filter((kw: string) => lowerMessage.includes(kw));
      
      console.log(`[IntentAnalysis] ${agentType} analysis:`, {
        score,
        threshold: scoringConfig.threshold,
        passed: score > scoringConfig.threshold,
        foundKeywords: foundKeywords.slice(0, 5), // Show first 5 for brevity
      });

      if (score > scoringConfig.threshold && score > bestScore) {
        bestScore = score;
        bestAgent = agentType as AgentType;
        bestIntent = scoringConfig.category;
        bestReasoning = `Message contains indicators for ${scoringConfig.category}`;
        allMatchedKeywords.push(...foundKeywords);
      }
    }

    let intent = bestIntent;
    let confidence = Math.min(0.9, 0.5 + bestScore);
    let suggestedAgentType = bestAgent;
    let reasoning = bestReasoning;
    keywords.push(...[...new Set(allMatchedKeywords)]);

    // Special patterns
    const hasQuestion = this.hasQuestionPattern(lowerMessage);
    const hasUrgency = this.hasUrgencyPattern(lowerMessage);

    console.log('[IntentAnalysis] Pattern detection:', {
      hasQuestion,
      hasUrgency,
      confidenceBeforePatterns: confidence,
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

    console.log('[IntentAnalysis] Final classification result (centralized):', {
      intent: result.intent,
      confidence: result.confidence,
      suggestedAgentType: result.suggestedAgentType,
      reasoning: result.reasoning,
      keywordCount: result.keywords.length,
      keywords: result.keywords,
      bestScore,
      availableAgents: Object.keys(this.agentScoringConfigs),
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
    const normalizedScore =
      (score / message.length) * (matchCount / keywords.length);
    const finalScore = Math.min(1.0, normalizedScore * 10); // Scale up and cap at 1.0

    console.log('[IntentAnalysis] Keyword score calculation:', {
      totalKeywords: keywords.length,
      matchedCount: matchCount,
      matchedKeywords: matchedKeywords.slice(0, 5), // Show first 5 for brevity
      rawScore: score,
      normalizedScore,
      finalScore,
    });

    return finalScore;
  }

  /**
   * Check if message has question patterns
   */
  private hasQuestionPattern(message: string): boolean {
    const questionIndicators = [
      '?',
      'how',
      'what',
      'when',
      'where',
      'why',
      'who',
      'which',
      'can you',
      'could you',
      'would you',
      'do you',
      'is it',
      'are there',
    ];

    return questionIndicators.some((indicator) => message.includes(indicator));
  }

  /**
   * Check if message has urgency patterns
   */
  private hasUrgencyPattern(message: string): boolean {
    const urgencyIndicators = [
      'urgent',
      'asap',
      'quickly',
      'fast',
      'immediate',
      'now',
      'right now',
      'emergency',
      'critical',
      'deadline',
      'soon',
    ];

    return urgencyIndicators.some((indicator) => message.includes(indicator));
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
        'confidence-scoring',
      ],
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
