import { AgentType } from '@/types/agent';
import {
  ConfidenceWeights,
  HeuristicAnalysisResult,
  IntentAnalysisContext,
  IntentAnalysisMetrics,
  IntentAnalysisResult,
  IntentClassificationResponse,
} from '@/types/intentAnalysis';

import { AzureMonitorLoggingService } from './loggingService';

/**
 * Confidence factor components for scoring calculation
 */
interface ConfidenceFactors {
  aiClassification: number;
  heuristicPatterns: number;
  keywordRelevance: number;
  historicalSuccess: number;
  contextSimilarity: number;
  userPreference: number;
  signalStrength: number;
  temporalRelevance: number;
  parameterQuality: number;
  queryComplexity: number;
}

/**
 * Historical performance data for confidence adjustment
 */
interface HistoricalPerformance {
  agentType: AgentType;
  successRate: number;
  averageConfidence: number;
  totalExecutions: number;
  recentPerformance: number; // Performance in last 24 hours
  userSatisfaction: number;
  averageResponseTime: number;
}

/**
 * Context similarity scoring data
 */
interface ContextSimilarity {
  queryPattern: string;
  previousQueries: string[];
  sessionContext: Record<string, any>;
  userBehavior: Record<string, any>;
}

/**
 * Advanced Confidence Scoring System
 * Provides sophisticated confidence calculation using multiple factors and machine learning approaches
 */
export class ConfidenceScoringSystem {
  private static instance: ConfidenceScoringSystem | null = null;
  private logger: AzureMonitorLoggingService;
  private weights: ConfidenceWeights;
  private historicalData: Map<AgentType, HistoricalPerformance> = new Map();
  private contextHistory: ContextSimilarity[] = [];
  private learningEnabled: boolean = true;

  private constructor(weights?: Partial<ConfidenceWeights>) {
    const loggingService = AzureMonitorLoggingService.getInstance();
    if (!loggingService) {
      throw new Error('Failed to initialize Azure Monitor Logging Service');
    }
    this.logger = loggingService;
    this.weights = {
      aiClassification: 0.35,
      heuristicPatterns: 0.2,
      keywordRelevance: 0.15,
      historicalSuccess: 0.1,
      contextSimilarity: 0.08,
      userPreference: 0.07,
      ...weights,
    };

    this.initializeHistoricalData();
  }

  /**
   * Singleton pattern - get or create scoring system instance
   */
  public static getInstance(
    weights?: Partial<ConfidenceWeights>,
  ): ConfidenceScoringSystem {
    if (!ConfidenceScoringSystem.instance) {
      ConfidenceScoringSystem.instance = new ConfidenceScoringSystem(weights);
    }
    return ConfidenceScoringSystem.instance;
  }

  /**
   * Calculate comprehensive confidence score for intent analysis result
   */
  public calculateConfidenceScore(
    result: IntentAnalysisResult,
    context: IntentAnalysisContext,
    aiResult?: IntentClassificationResponse,
    heuristicResult?: HeuristicAnalysisResult,
  ): number {
    try {
      const factors = this.extractConfidenceFactors(
        result,
        context,
        aiResult,
        heuristicResult,
      );
      const weightedScore = this.calculateWeightedScore(factors);
      const adjustedScore = this.applyConfidenceAdjustments(
        weightedScore,
        result,
        context,
      );
      const finalScore = this.normalizeConfidence(adjustedScore);

      console.log('[INFO] Confidence score calculated', {
        agentType: result.recommendedAgent,
        baseScore: weightedScore,
        adjustedScore,
        finalScore,
        analysisMethod: result.analysisMethod,
        factors: JSON.stringify(factors),
      });

      return finalScore;
    } catch (error) {
      console.error('[ERROR] Confidence scoring failed', error, {
        agentType: result.recommendedAgent,
        query: context.query.substring(0, 100),
      });
      return 0.5; // Default moderate confidence
    }
  }

  /**
   * Update confidence weights based on performance feedback
   */
  public updateWeights(
    actualPerformance: Record<string, number>,
    learningRate: number = 0.01,
  ): void {
    if (!this.learningEnabled) return;

    try {
      // Simple gradient-based weight adjustment
      for (const [factor, performance] of Object.entries(actualPerformance)) {
        if (factor in this.weights) {
          const currentWeight = this.weights[factor as keyof ConfidenceWeights];
          const adjustment = (performance - 0.5) * learningRate; // Assuming 0.5 is baseline
          this.weights[factor as keyof ConfidenceWeights] = Math.max(
            0.01,
            Math.min(0.99, currentWeight + adjustment),
          );
        }
      }

      // Normalize weights to ensure they sum to 1
      this.normalizeWeights();

      console.log('[INFO] Confidence weights updated', {
        newWeights: JSON.stringify(this.weights),
        performance: JSON.stringify(actualPerformance),
      });
    } catch (error) {
      console.error('[ERROR] Weight update failed', error, {
        actualPerformance: JSON.stringify(actualPerformance),
      });
    }
  }

  /**
   * Record performance feedback for learning
   */
  public recordPerformanceFeedback(
    agentType: AgentType,
    success: boolean,
    responseTime: number,
    userSatisfaction?: number,
  ): void {
    try {
      const historical = this.historicalData.get(agentType) || {
        agentType,
        successRate: 0.5,
        averageConfidence: 0.5,
        totalExecutions: 0,
        recentPerformance: 0.5,
        userSatisfaction: 0.5,
        averageResponseTime: 5000,
      };

      // Update metrics with exponential moving average
      const alpha = 0.1; // Learning rate
      historical.successRate =
        alpha * (success ? 1 : 0) + (1 - alpha) * historical.successRate;
      historical.totalExecutions++;
      historical.averageResponseTime =
        alpha * responseTime + (1 - alpha) * historical.averageResponseTime;

      if (userSatisfaction !== undefined) {
        historical.userSatisfaction =
          alpha * userSatisfaction + (1 - alpha) * historical.userSatisfaction;
      }

      this.historicalData.set(agentType, historical);

      console.log('[INFO] Performance feedback recorded', {
        agentType,
        success,
        responseTime,
        userSatisfaction,
        updatedMetrics: JSON.stringify(historical),
      });
    } catch (error) {
      console.error('[ERROR] Performance feedback recording failed', error, {
        agentType,
        success,
        responseTime,
      });
    }
  }

  /**
   * Get confidence level description
   */
  public getConfidenceLevel(confidence: number): string {
    if (confidence >= 0.9) return 'very_high';
    if (confidence >= 0.75) return 'high';
    if (confidence >= 0.5) return 'medium';
    if (confidence >= 0.3) return 'low';
    return 'very_low';
  }

  /**
   * Get confidence explanation
   */
  public explainConfidence(
    result: IntentAnalysisResult,
    context: IntentAnalysisContext,
  ): string {
    const level = this.getConfidenceLevel(result.confidence);
    const factors: string[] = [];

    // Analyze primary confidence factors
    if (result.analysisMethod === 'ai' && result.confidence > 0.7) {
      factors.push('strong AI classification signals');
    }
    if (result.analysisMethod === 'heuristic' && result.confidence > 0.7) {
      factors.push('clear pattern matches');
    }
    if (Object.keys(result.parameters).length > 2) {
      factors.push('rich parameter extraction');
    }
    if (context.conversationHistory && context.conversationHistory.length > 0) {
      factors.push('contextual continuity');
    }

    const explanation =
      `Confidence level: ${level} (${(result.confidence * 100).toFixed(
        1,
      )}%). ` +
      `Based on: ${factors.join(', ')}. ` +
      `Analysis method: ${result.analysisMethod}.`;

    return explanation;
  }

  /**
   * Calibrate confidence based on historical accuracy
   */
  public calibrateConfidence(
    rawConfidence: number,
    agentType: AgentType,
    metrics?: IntentAnalysisMetrics,
  ): number {
    try {
      const historical = this.historicalData.get(agentType);
      if (!historical || historical.totalExecutions < 10) {
        return rawConfidence; // Not enough data for calibration
      }

      // Apply Platt scaling-like calibration
      const actualSuccessRate = historical.successRate;
      const expectedSuccessRate = rawConfidence;

      // Calibration factor based on historical vs expected performance
      const calibrationFactor =
        actualSuccessRate / Math.max(0.1, expectedSuccessRate);
      const calibratedConfidence = rawConfidence * calibrationFactor;

      // Apply smoothing to prevent extreme adjustments
      const smoothingFactor = Math.min(1, historical.totalExecutions / 100);
      const finalConfidence =
        rawConfidence * (1 - smoothingFactor) +
        calibratedConfidence * smoothingFactor;

      return this.normalizeConfidence(finalConfidence);
    } catch (error) {
      console.error('[ERROR] Confidence calibration failed', error, {
        rawConfidence,
        agentType,
      });
      return rawConfidence;
    }
  }

  /**
   * Private helper methods
   */

  private extractConfidenceFactors(
    result: IntentAnalysisResult,
    context: IntentAnalysisContext,
    aiResult?: IntentClassificationResponse,
    heuristicResult?: HeuristicAnalysisResult,
  ): ConfidenceFactors {
    return {
      aiClassification: this.calculateAIConfidenceFactor(aiResult),
      heuristicPatterns: this.calculateHeuristicFactor(heuristicResult),
      keywordRelevance: this.calculateKeywordRelevance(
        context.query,
        result.recommendedAgent,
      ),
      historicalSuccess: this.calculateHistoricalFactor(
        result.recommendedAgent,
      ),
      contextSimilarity: this.calculateContextSimilarity(context),
      userPreference: this.calculateUserPreference(
        context,
        result.recommendedAgent,
      ),
      signalStrength: this.calculateSignalStrength(result, context),
      temporalRelevance: this.calculateTemporalRelevance(context.query),
      parameterQuality: this.calculateParameterQuality(result.parameters),
      queryComplexity: this.calculateQueryComplexity(context.query),
    };
  }

  private calculateWeightedScore(factors: ConfidenceFactors): number {
    return (
      factors.aiClassification * this.weights.aiClassification +
      factors.heuristicPatterns * this.weights.heuristicPatterns +
      factors.keywordRelevance * this.weights.keywordRelevance +
      factors.historicalSuccess * this.weights.historicalSuccess +
      factors.contextSimilarity * this.weights.contextSimilarity +
      factors.userPreference * this.weights.userPreference +
      factors.signalStrength * 0.05 + // Additional factors with smaller weights
      factors.temporalRelevance * 0.03 +
      factors.parameterQuality * 0.04 +
      factors.queryComplexity * 0.02
    );
  }

  private calculateAIConfidenceFactor(
    aiResult?: IntentClassificationResponse,
  ): number {
    if (!aiResult) return 0.5;

    // Consider not just the primary confidence but also alternatives
    let factor = aiResult.confidence;

    if (aiResult.alternatives && aiResult.alternatives.length > 0) {
      const topAlternative = aiResult.alternatives[0];
      const confidenceGap = aiResult.confidence - topAlternative.confidence;

      // Higher confidence when there's a clear gap between primary and alternatives
      factor += Math.min(0.2, confidenceGap);
    }

    return Math.min(1, factor);
  }

  private calculateHeuristicFactor(
    heuristicResult?: HeuristicAnalysisResult,
  ): number {
    if (!heuristicResult) return 0.5;

    let factor = heuristicResult.confidence;

    // Boost confidence based on number and quality of matched patterns
    const patternBonus = Math.min(
      0.2,
      heuristicResult.matchedPatterns.length * 0.05,
    );

    // Different pattern types have different weights
    const hasUrl = heuristicResult.matchedPatterns.some((p) =>
      p.match(/https?:\/\//),
    );
    const hasCode = heuristicResult.matchedPatterns.some((p) =>
      p.match(/```|function|def/),
    );
    const hasTime = heuristicResult.matchedPatterns.some((p) =>
      ['today', 'recent', 'latest'].includes(p.toLowerCase()),
    );

    if (hasUrl) factor += 0.15;
    if (hasCode) factor += 0.12;
    if (hasTime) factor += 0.08;

    return Math.min(1, factor + patternBonus);
  }

  private calculateKeywordRelevance(
    query: string,
    agentType: AgentType,
  ): number {
    const queryLower = query.toLowerCase();
    const agentKeywords = this.getAgentKeywords(agentType);

    const matchCount = agentKeywords.filter((keyword) =>
      queryLower.includes(keyword),
    ).length;
    const relevanceScore = Math.min(
      1,
      matchCount / Math.max(1, agentKeywords.length * 0.3),
    );

    return relevanceScore;
  }

  private calculateHistoricalFactor(agentType: AgentType): number {
    const historical = this.historicalData.get(agentType);
    if (!historical || historical.totalExecutions < 5) {
      return 0.5; // Neutral when insufficient data
    }

    // Weighted combination of success rate and user satisfaction
    return historical.successRate * 0.7 + historical.userSatisfaction * 0.3;
  }

  private calculateContextSimilarity(context: IntentAnalysisContext): number {
    if (
      !context.conversationHistory ||
      context.conversationHistory.length === 0
    ) {
      return 0.5;
    }

    // Simple similarity based on common words in recent conversation
    const currentWords = new Set(context.query.toLowerCase().split(/\s+/));
    const historyWords = new Set(
      context.conversationHistory
        .slice(-3)
        .join(' ')
        .toLowerCase()
        .split(/\s+/),
    );

    const intersection = new Set(
      [...currentWords].filter((word) => historyWords.has(word)),
    );
    const similarity = intersection.size / Math.max(1, currentWords.size);

    return Math.min(1, similarity * 2); // Scale up similarity score
  }

  private calculateUserPreference(
    context: IntentAnalysisContext,
    agentType: AgentType,
  ): number {
    const preferences = context.userPreferences;
    if (!preferences) return 0.5;

    if (preferences.preferredAgents?.includes(agentType)) {
      return 0.8;
    }
    if (preferences.disabledAgents?.includes(agentType)) {
      return 0.2;
    }

    return 0.5;
  }

  private calculateSignalStrength(
    result: IntentAnalysisResult,
    context: IntentAnalysisContext,
  ): number {
    let strength = 0;

    // Multiple signals indicate higher confidence
    if (result.alternatives && result.alternatives.length > 0) strength += 0.2;
    if (Object.keys(result.parameters).length > 0) strength += 0.3;
    if (result.reasoning && result.reasoning.length > 50) strength += 0.2;
    if (context.additionalContext) strength += 0.15;
    if (result.processingTime < 3000) strength += 0.15; // Fast processing indicates clear signals

    return Math.min(1, strength);
  }

  private calculateTemporalRelevance(query: string): number {
    const timeWords = [
      'now',
      'today',
      'current',
      'latest',
      'recent',
      'breaking',
      'live',
    ];
    const hasTimeContext = timeWords.some((word) =>
      query.toLowerCase().includes(word),
    );

    return hasTimeContext ? 0.8 : 0.5;
  }

  private calculateParameterQuality(parameters: Record<string, any>): number {
    if (!parameters || Object.keys(parameters).length === 0) {
      return 0.3;
    }

    let quality = 0.5;

    // More parameters generally indicate better extraction
    quality += Math.min(0.3, Object.keys(parameters).length * 0.05);

    // Check for specific high-quality parameters
    if (
      parameters.urls &&
      Array.isArray(parameters.urls) &&
      parameters.urls.length > 0
    ) {
      quality += 0.2;
    }
    if (
      parameters.query &&
      typeof parameters.query === 'string' &&
      parameters.query.length > 5
    ) {
      quality += 0.1;
    }
    if (parameters.language && typeof parameters.language === 'string') {
      quality += 0.1;
    }

    return Math.min(1, quality);
  }

  private calculateQueryComplexity(query: string): number {
    // More complex queries might have lower confidence due to ambiguity
    const words = query.split(/\s+/).length;
    const sentences = query.split(/[.!?]+/).length;
    const hasSpecialChars = /[{}[\]()"]/.test(query);

    let complexity = 0.5;

    if (words > 20) complexity += 0.2; // Long queries are complex
    if (sentences > 2) complexity += 0.1; // Multiple sentences
    if (hasSpecialChars) complexity += 0.1; // Special characters (code, etc.)

    // Complexity can reduce confidence for ambiguous cases
    return Math.min(1, complexity);
  }

  private applyConfidenceAdjustments(
    baseScore: number,
    result: IntentAnalysisResult,
    context: IntentAnalysisContext,
  ): number {
    let adjusted = baseScore;

    // Boost confidence for very clear indicators
    if (
      context.query.match(/https?:\/\//) &&
      result.recommendedAgent === AgentType.URL_PULL
    ) {
      adjusted += 0.15;
    }
    if (
      context.query.match(/```/) &&
      result.recommendedAgent === AgentType.CODE_INTERPRETER
    ) {
      adjusted += 0.12;
    }

    // Reduce confidence for ambiguous cases
    if (result.alternatives && result.alternatives.length > 0) {
      const topAlternative = result.alternatives[0];
      if (Math.abs(result.confidence - topAlternative.confidence) < 0.1) {
        adjusted -= 0.05; // Very close alternatives indicate ambiguity
      }
    }

    // Time-based adjustments
    if (result.processingTime > 5000) {
      adjusted -= 0.05; // Slow processing might indicate uncertainty
    }

    return adjusted;
  }

  private normalizeConfidence(confidence: number): number {
    return Math.max(0.05, Math.min(0.98, confidence));
  }

  private normalizeWeights(): void {
    const sum = Object.values(this.weights).reduce((a, b) => a + b, 0);
    if (sum > 0) {
      for (const key in this.weights) {
        this.weights[key as keyof ConfidenceWeights] /= sum;
      }
    }
  }

  private getAgentKeywords(agentType: AgentType): string[] {
    const keywords: Record<AgentType, string[]> = {
      [AgentType.WEB_SEARCH]: [
        'search',
        'find',
        'latest',
        'recent',
        'current',
        'news',
        'information',
      ],
      [AgentType.CODE_INTERPRETER]: [
        'code',
        'program',
        'function',
        'debug',
        'python',
        'javascript',
        'calculate',
      ],
      [AgentType.URL_PULL]: [
        'website',
        'url',
        'analyze',
        'page',
        'site',
        'link',
      ],
      [AgentType.LOCAL_KNOWLEDGE]: [
        'company',
        'internal',
        'policy',
        'procedure',
        'documentation',
      ],
      [AgentType.THIRD_PARTY]: [
        'github',
        'slack',
        'api',
        'integration',
        'service',
      ],
      [AgentType.STANDARD_CHAT]: ['hello', 'how', 'what', 'tell', 'explain'],
      [AgentType.FOUNDRY]: ['complex', 'analyze', 'reasoning', 'sophisticated'],
    };

    return keywords[agentType] || [];
  }

  private initializeHistoricalData(): void {
    // Initialize with baseline data for all agent types
    for (const agentType of Object.values(AgentType)) {
      this.historicalData.set(agentType, {
        agentType,
        successRate: 0.7, // Optimistic baseline
        averageConfidence: 0.6,
        totalExecutions: 0,
        recentPerformance: 0.7,
        userSatisfaction: 0.7,
        averageResponseTime: 3000,
      });
    }
  }
}

/**
 * Convenience function to get the singleton scoring system instance
 */
export function getConfidenceScoringSystem(
  weights?: Partial<ConfidenceWeights>,
): ConfidenceScoringSystem {
  return ConfidenceScoringSystem.getInstance(weights);
}

/**
 * Convenience function to calculate confidence score
 */
export function calculateIntentConfidence(
  result: IntentAnalysisResult,
  context: IntentAnalysisContext,
  aiResult?: IntentClassificationResponse,
  heuristicResult?: HeuristicAnalysisResult,
): number {
  const scoring = getConfidenceScoringSystem();
  return scoring.calculateConfidenceScore(
    result,
    context,
    aiResult,
    heuristicResult,
  );
}
