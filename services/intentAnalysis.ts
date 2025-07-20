import { Session } from 'next-auth';
import { AzureOpenAI } from 'openai';
import { ChatCompletionMessageParam } from 'openai/resources/chat/completions/completions';

import { AgentType } from '@/types/agent';
import {
  IntentAnalysisResult,
  IntentClassificationResponse,
  IntentAnalysisContext,
  IntentAnalysisConfig,
  HeuristicAnalysisResult,
  IntentAnalysisCacheEntry,
  IntentAnalysisMetrics,
  IntentValidationResult,
  IntentClassificationSchema,
  ConfidenceWeights,
  MultiLanguageConfig,
  ParameterExtractionConfig,
  AgentExclusionResult,
} from '@/types/intentAnalysis';
import { getStructuredResponse } from '@/utils/server/structuredResponses';
import { AzureMonitorLoggingService } from './loggingService';
import {
  SYSTEM_PROMPTS,
  ENHANCED_CLASSIFICATION_SCHEMA,
  buildContextualPrompt,
  getAgentGuidance,
  validateConfidenceScore,
  AGENT_SPECIFIC_GUIDANCE,
} from './intentClassificationPrompts';
import { getParameterExtractionEngine } from './parameterExtraction';
import { getConfidenceScoringSystem } from './confidenceScoring';

/**
 * Intent Analysis Service - AI-powered query classification and agent routing
 * Provides hybrid AI + heuristic approach for determining the best agent for user queries
 */
export class IntentAnalysisService {
  private static instance: IntentAnalysisService | null = null;
  private logger: AzureMonitorLoggingService;
  private config: IntentAnalysisConfig;
  private cache: Map<string, IntentAnalysisCacheEntry> = new Map();
  private metrics: IntentAnalysisMetrics;
  private confidenceWeights: ConfidenceWeights;
  private multiLanguageConfig: MultiLanguageConfig;
  private parameterExtractionConfig: Partial<ParameterExtractionConfig>;

  private constructor(config?: Partial<IntentAnalysisConfig>) {
    this.logger = new AzureMonitorLoggingService();
    this.config = {
      enableAIClassification: true,
      enableHeuristicFallback: true,
      aiConfidenceThreshold: 0.7,
      heuristicConfidenceThreshold: 0.6,
      defaultAgent: AgentType.STANDARD_CHAT,
      maxProcessingTime: 5000,
      enableCaching: true,
      cacheTTL: 60 * 60 * 1000, // 1 hour
      enableMultiLanguage: true,
      supportedLocales: ['en', 'es', 'fr', 'de', 'it', 'pt', 'ja', 'ko', 'zh'],
      parameterExtraction: {},
      ...config,
    };

    this.metrics = {
      totalAnalyses: 0,
      successfulAIClassifications: 0,
      heuristicFallbacks: 0,
      averageProcessingTime: 0,
      confidenceDistribution: {},
      agentTypeDistribution: {
        [AgentType.WEB_SEARCH]: 0,
        [AgentType.CODE_INTERPRETER]: 0,
        [AgentType.URL_PULL]: 0,
        [AgentType.LOCAL_KNOWLEDGE]: 0,
        [AgentType.STANDARD_CHAT]: 0,
        [AgentType.FOUNDRY]: 0,
        [AgentType.THIRD_PARTY]: 0,
      },
      cacheHitRate: 0,
      errorRate: 0,
      languageDistribution: {},
    };

    this.confidenceWeights = {
      aiClassification: 0.4,
      heuristicPatterns: 0.25,
      keywordRelevance: 0.15,
      historicalSuccess: 0.1,
      contextSimilarity: 0.05,
      userPreference: 0.05,
    };

    this.multiLanguageConfig = {
      defaultLanguage: 'en',
      languageDetectionThreshold: 0.8,
      fallbackLanguage: 'en',
      languageKeywords: this.initializeLanguageKeywords(),
      languagePrompts: this.initializeLanguagePrompts(),
    };

    this.parameterExtractionConfig = this.initializeParameterExtraction();

    this.startCacheCleanup();
  }

  /**
   * Singleton pattern - get or create service instance
   */
  public static getInstance(config?: Partial<IntentAnalysisConfig>): IntentAnalysisService {
    if (!IntentAnalysisService.instance) {
      IntentAnalysisService.instance = new IntentAnalysisService(config);
    }
    return IntentAnalysisService.instance;
  }

  /**
   * Analyze user intent and recommend the best agent
   */
  public async analyzeIntent(
    context: IntentAnalysisContext,
    openai?: AzureOpenAI,
    modelId?: string,
    user?: Session['user']
  ): Promise<IntentAnalysisResult> {
    console.log('[IntentAnalysis] Starting intent analysis for query:', context.query.substring(0, 100));
    const startTime = Date.now();
    
    // Detect language early - needed in both try and catch blocks
    const detectedLanguage = this.detectLanguage(context.query);
    const analysisLocale = detectedLanguage || context.locale || 'en';
    console.log('[IntentAnalysis] Detected language:', detectedLanguage, 'Using locale:', analysisLocale);

    try {
      // Validate input
      console.log('[IntentAnalysis] Validating input...');
      const validation = this.validateInput(context);
      if (!validation.valid) {
        console.log('[IntentAnalysis] Input validation failed:', validation.errors);
        throw new Error(`Input validation failed: ${validation.errors.join(', ')}`);
      }
      console.log('[IntentAnalysis] Input validation successful');

      // Check cache first
      if (this.config.enableCaching) {
        console.log('[IntentAnalysis] Checking cache...');
        const cached = this.getCachedResult(context);
        if (cached) {
          console.log('[IntentAnalysis] Cache hit! Returning cached result');
          this.updateMetrics('cache_hit', Date.now() - startTime);
          return cached;
        }
        console.log('[IntentAnalysis] Cache miss, proceeding with analysis');
      } else {
        console.log('[IntentAnalysis] Caching disabled, proceeding with analysis');
      }

      let result: IntentAnalysisResult;

      // Try AI classification first
      if (this.config.enableAIClassification && openai && modelId && user) {
        console.log('[IntentAnalysis] AI classification enabled and dependencies available');
        console.log('[IntentAnalysis] Attempting AI classification...');
        try {
          const aiResult = await this.performAIClassification(
            context,
            analysisLocale,
            openai,
            modelId,
            user
          );
          console.log('[IntentAnalysis] AI classification completed successfully', {
            recommendedAgent: aiResult.agent_type,
            confidence: aiResult.confidence,
            threshold: this.config.aiConfidenceThreshold
          });

          if (aiResult.confidence >= this.config.aiConfidenceThreshold) {
            console.log('[IntentAnalysis] AI confidence meets threshold, using AI classification result');
            result = this.buildResult(aiResult, 'ai', analysisLocale, startTime, context);
            // Recalculate confidence using advanced scoring
            result.confidence = this.calculateAdvancedConfidence(result, context, aiResult);
            console.log('[IntentAnalysis] Recalculated confidence score:', result.confidence);
            this.updateMetrics('ai_success', Date.now() - startTime);
          } else {
            console.log('[IntentAnalysis] AI confidence too low, falling back to heuristic analysis', {
              aiConfidence: aiResult.confidence,
              threshold: this.config.aiConfidenceThreshold
            });
            // AI confidence too low, try heuristic fallback
            result = await this.performHeuristicFallback(context, analysisLocale, startTime);
          }
        } catch (error) {
          console.warn('[WARNING] AI classification failed, falling back to heuristics', {
            error: (error as Error).message,
            query: context.query.substring(0, 100),
          });
          console.log('[IntentAnalysis] Error details:', error);
          result = await this.performHeuristicFallback(context, analysisLocale, startTime);
        }
      } else {
        console.log('[IntentAnalysis] AI classification skipped', {
          enableAIClassification: this.config.enableAIClassification,
          openaiAvailable: !!openai,
          modelIdAvailable: !!modelId,
          userAvailable: !!user
        });
        // Use heuristic analysis only
        result = await this.performHeuristicFallback(context, analysisLocale, startTime);
      }

      // Cache the result
      if (this.config.enableCaching) {
        console.log('[IntentAnalysis] Caching analysis result');
        this.cacheResult(context, result);
      }

      // Update metrics
      console.log('[IntentAnalysis] Updating metrics');
      this.updateGeneralMetrics(result, Date.now() - startTime);

      console.log('[INFO] Intent analysis completed', {
        query: context.query.substring(0, 100),
        recommendedAgent: result.recommendedAgent,
        confidence: result.confidence,
        analysisMethod: result.analysisMethod,
        processingTime: result.processingTime,
      });

      return result;
    } catch (error) {
      const processingTime = Date.now() - startTime;
      console.error('[ERROR] Intent analysis failed', error, {
        query: context.query.substring(0, 100),
        processingTime,
      });
      console.log('[IntentAnalysis] Updating error metrics');
      this.updateMetrics('error', processingTime);

      console.log('[IntentAnalysis] Creating fallback result due to error');
      // Return default fallback result
      return this.createFallbackResult(context, analysisLocale || 'en', processingTime);
    }
  }

  /**
   * Get analysis metrics
   */
  public getMetrics(): IntentAnalysisMetrics {
    return { ...this.metrics };
  }

  /**
   * Update configuration
   */
  public updateConfig(newConfig: Partial<IntentAnalysisConfig>): void {
    this.config = { ...this.config, ...newConfig };
    console.log('[INFO] Intent analysis configuration updated', {
      updatedFields: Object.keys(newConfig),
    });
  }

  /**
   * Clear cache
   */
  public clearCache(): void {
    this.cache.clear();
    console.log('[INFO] Intent analysis cache cleared');
  }

  /**
   * Private helper methods
   */

  private async performAIClassification(
    context: IntentAnalysisContext,
    locale: string,
    openai: AzureOpenAI,
    modelId: string,
    user: Session['user']
  ): Promise<IntentClassificationResponse> {
    console.log('[IntentAnalysis] Building classification prompt for AI');
    const prompt = this.buildClassificationPrompt(context, locale);
    console.log('[IntentAnalysis] Getting classification schema');
    const schema = this.getClassificationSchema();
    console.log('[IntentAnalysis] Classification schema retrieved');

    console.log('[IntentAnalysis] Preparing messages for AI classification');
    const messages: ChatCompletionMessageParam[] = [
      {
        role: 'system',
        content: this.getSystemPrompt(locale),
      },
      {
        role: 'user',
        content: prompt,
      },
    ];
    console.log('[IntentAnalysis] Messages prepared, system prompt length:', this.getSystemPrompt(locale).length);

    console.log('[IntentAnalysis] Sending request to AI model for classification', {
      modelId,
      temperature: 0.3,
      maxTokens: 800
    });
    try {
      const response = await getStructuredResponse<IntentClassificationResponse>(
        openai,
        messages,
        modelId,
        user,
        schema as unknown as Record<string, unknown>,
        0.3, // Low temperature for consistent classification
        800  // Adequate tokens for detailed analysis
      );
      
      console.log('[IntentAnalysis] AI classification response received', {
        agent_type: response.agent_type,
        confidence: response.confidence,
        alternativesCount: response.alternatives?.length || 0
      });
      
      return response;
    } catch (error) {
      console.error('[IntentAnalysis] AI classification request failed', {
        error: (error as Error).message,
        modelId
      });
      throw error; // Re-throw to be handled by the caller
    }
  }

  private async performHeuristicFallback(
    context: IntentAnalysisContext,
    locale: string,
    startTime: number
  ): Promise<IntentAnalysisResult> {
    console.log('[IntentAnalysis] Entering heuristic fallback process');
    
    if (!this.config.enableHeuristicFallback) {
      console.log('[IntentAnalysis] Heuristic fallback disabled, returning default fallback result');
      return this.createFallbackResult(context, locale, Date.now() - startTime);
    }
    
    console.log('[IntentAnalysis] Performing heuristic analysis on query:', context.query.substring(0, 100));
    const heuristicResult = this.performHeuristicAnalysis(context.query, locale);
    console.log('[IntentAnalysis] Heuristic analysis completed', {
      recommendedAgent: heuristicResult.agentType,
      confidence: heuristicResult.confidence,
      matchedPatterns: heuristicResult.matchedPatterns.length,
      method: heuristicResult.method
    });
    
    this.updateMetrics('heuristic_fallback', Date.now() - startTime);
    console.log('[IntentAnalysis] Building final result from heuristic analysis');
    
    return this.buildResultFromHeuristic(heuristicResult, locale, startTime, context);
  }

  private performHeuristicAnalysis(query: string, locale: string): HeuristicAnalysisResult {
    console.log('[IntentAnalysis] Starting heuristic analysis for query:', query.substring(0, 100));
    const queryLower = query.toLowerCase();
    let bestMatch: HeuristicAnalysisResult = {
      agentType: this.config.defaultAgent,
      confidence: 0.3,
      matchedPatterns: [],
      method: 'default',
      parameters: {},
    };
    console.log('[IntentAnalysis] Initial default match:', bestMatch.agentType, 'with confidence:', bestMatch.confidence);

    // Check each agent type using enhanced guidance
    console.log('[IntentAnalysis] Checking each agent type against query');
    for (const [agentType, guidance] of Object.entries(AGENT_SPECIFIC_GUIDANCE)) {
      console.log('[IntentAnalysis] Analyzing match for agent type:', agentType);
      const result = this.analyzeAgentMatch(query, queryLower, agentType as AgentType, guidance);
      console.log('[IntentAnalysis] Agent', agentType, 'analysis result:', {
        confidence: result.confidence,
        matchedPatterns: result.matchedPatterns.length > 0 ? result.matchedPatterns.slice(0, 3) : 'none',
        method: result.method
      });
      
      if (result.confidence > bestMatch.confidence) {
        console.log('[IntentAnalysis] Found better match:', agentType, 'with confidence:', result.confidence, '(previous best:', bestMatch.agentType, 'with confidence:', bestMatch.confidence, ')');
        bestMatch = result;
      }
    }

    console.log('[IntentAnalysis] Heuristic analysis complete. Best match:', bestMatch.agentType, 'with confidence:', bestMatch.confidence);
    return bestMatch;
  }

  private analyzeAgentMatch(
    query: string,
    queryLower: string,
    agentType: AgentType,
    guidance: any
  ): HeuristicAnalysisResult {
    console.log(`[IntentAnalysis] Analyzing match for ${agentType} agent type`);
    let confidence = 0;
    const matchedPatterns: string[] = [];
    let parameters: Record<string, any> = {};

    // Pattern matching
    console.log(`[IntentAnalysis] Performing pattern matching for ${agentType}`);
    for (const pattern of guidance.patterns) {
      const matches = query.match(pattern);
      if (matches) {
        const patternConfidence = Math.min(0.4, matches.length * 0.1);
        console.log(`[IntentAnalysis] Pattern match found for ${agentType}:`, {
          pattern: pattern.toString().substring(0, 50),
          matches: matches.length,
          confidenceBoost: patternConfidence
        });
        confidence += patternConfidence;
        matchedPatterns.push(...matches);
      }
    }
    console.log(`[IntentAnalysis] Pattern matching complete for ${agentType}, confidence: ${confidence}`);

    // Keyword matching
    console.log(`[IntentAnalysis] Performing keyword matching for ${agentType}`);
    const keywordMatches = guidance.keywords.filter((keyword: string) => 
      queryLower.includes(keyword.toLowerCase())
    );
    if (keywordMatches.length > 0) {
      const keywordConfidence = Math.min(0.3, keywordMatches.length * 0.05);
      console.log(`[IntentAnalysis] Keyword matches found for ${agentType}:`, {
        keywords: keywordMatches.slice(0, 5),
        count: keywordMatches.length,
        confidenceBoost: keywordConfidence
      });
      confidence += keywordConfidence;
      matchedPatterns.push(...keywordMatches);
    } else {
      console.log(`[IntentAnalysis] No keyword matches for ${agentType}`);
    }

    // Agent-specific parameter extraction
    console.log(`[IntentAnalysis] Extracting parameters for ${agentType}`);
    parameters = this.extractHeuristicParameters(query, agentType, matchedPatterns);
    console.log(`[IntentAnalysis] Parameter extraction complete for ${agentType}`, {
      parameterCount: Object.keys(parameters).length
    });

    // Apply agent-specific confidence boosts
    console.log(`[IntentAnalysis] Applying agent-specific boosts for ${agentType}, base confidence: ${confidence}`);
    const boostedConfidence = this.applyAgentSpecificBoosts(query, agentType, confidence);
    if (boostedConfidence > confidence) {
      console.log(`[IntentAnalysis] Applied confidence boost for ${agentType}:`, {
        before: confidence,
        after: boostedConfidence,
        boost: boostedConfidence - confidence
      });
    }
    confidence = boostedConfidence;

    // Apply user exclusions (most important - can significantly reduce confidence)
    console.log(`[IntentAnalysis] Checking for user exclusions for ${agentType}`);
    const excludedConfidence = this.applyUserExclusions(query, agentType, confidence);
    if (excludedConfidence < confidence) {
      console.log(`[IntentAnalysis] Applied user exclusion penalty for ${agentType}:`, {
        before: confidence,
        after: excludedConfidence,
        penalty: confidence - excludedConfidence
      });
    }
    confidence = excludedConfidence;

    const finalConfidence = Math.min(0.95, confidence);
    console.log(`[IntentAnalysis] Final confidence for ${agentType}: ${finalConfidence}`);
    
    const method = this.getMatchMethod(agentType, matchedPatterns);
    console.log(`[IntentAnalysis] Match method for ${agentType}: ${method}`);

    return {
      agentType,
      confidence: finalConfidence,
      matchedPatterns,
      method,
      parameters,
    };
  }

  private extractHeuristicParameters(
    query: string,
    agentType: AgentType,
    matchedPatterns: string[]
  ): Record<string, any> {
    const parameterEngine = getParameterExtractionEngine();
    return parameterEngine.extractParameters(agentType, query);
  }

  private applyAgentSpecificBoosts(query: string, agentType: AgentType, baseConfidence: number): number {
    console.log(`[IntentAnalysis] Applying agent-specific boosts for ${agentType}, starting confidence: ${baseConfidence}`);
    let confidence = baseConfidence;

    switch (agentType) {
      case AgentType.URL_PULL:
        console.log(`[IntentAnalysis] Checking URL patterns for ${agentType}`);
        // Very high confidence for URLs
        if (query.match(/https?:\/\/[^\s]+/)) {
          const oldConfidence = confidence;
          confidence = Math.max(confidence, 0.9);
          console.log(`[IntentAnalysis] URL detected, boosting confidence from ${oldConfidence} to ${confidence}`);
        }
        break;

      case AgentType.CODE_INTERPRETER:
        console.log(`[IntentAnalysis] Checking code block patterns for ${agentType}`);
        // High confidence for code blocks
        if (query.match(/```[\s\S]*?```/)) {
          const oldConfidence = confidence;
          confidence = Math.max(confidence, 0.85);
          console.log(`[IntentAnalysis] Code block detected, boosting confidence from ${oldConfidence} to ${confidence}`);
        }
        break;

      case AgentType.WEB_SEARCH:
        console.log(`[IntentAnalysis] Checking web search specific patterns for ${agentType}`);
        
        // High boost for time-sensitive queries
        if (query.match(/\b(breaking|urgent|immediate|now|today|latest|current|recent)\b/i)) {
          const boost = 0.2;
          console.log(`[IntentAnalysis] Time-sensitive query detected, adding boost of ${boost}`);
          confidence += boost;
        }
        
        // Boost for comparison and review queries
        if (query.match(/\b(compare|vs|versus|reviews?|ratings?|better than|difference between)\b/i)) {
          const boost = 0.15;
          console.log(`[IntentAnalysis] Comparison/review query detected, adding boost of ${boost}`);
          confidence += boost;
        }
        
        // Boost for trending and popular content queries
        if (query.match(/\b(trending|viral|popular|top \d+|best \d+)\b/i)) {
          const boost = 0.15;
          console.log(`[IntentAnalysis] Trending/popular content query detected, adding boost of ${boost}`);
          confidence += boost;
        }
        
        // Boost for real-time data queries
        if (query.match(/\b(price|stock|weather|score|market|election|poll|results)\b/i)) {
          const boost = 0.15;
          console.log(`[IntentAnalysis] Real-time data query detected, adding boost of ${boost}`);
          confidence += boost;
        }
        
        // Boost for temporal references indicating fresh content needed
        if (query.match(/\b(this (week|month|year)|in \d{4}|since \d{4}|yesterday|recently)\b/i)) {
          const boost = 0.1;
          console.log(`[IntentAnalysis] Temporal reference detected, adding boost of ${boost}`);
          confidence += boost;
        }
        break;

      case AgentType.LOCAL_KNOWLEDGE:
        console.log(`[IntentAnalysis] Checking local knowledge specific patterns for ${agentType}`);
        
        // Boost for company-specific language
        if (query.match(/\b(our|company|internal|organization|corporate|enterprise)\b/i)) {
          const boost = 0.2;
          console.log(`[IntentAnalysis] Company-specific language detected, adding boost of ${boost}`);
          confidence += boost;
        }
        
        // Boost for documentation and knowledge-specific queries
        if (query.match(/\b(documentation|docs|manual|handbook|policy|procedure|guideline|process|workflow)\b/i)) {
          const boost = 0.25;
          console.log(`[IntentAnalysis] Documentation/knowledge query detected, adding boost of ${boost}`);
          confidence += boost;
        }
        
        // Boost for FAQ and support queries
        if (query.match(/\b(faq|frequently asked|help|support|how do i|what is our|where can i find)\b/i)) {
          const boost = 0.2;
          console.log(`[IntentAnalysis] FAQ/support query detected, adding boost of ${boost}`);
          confidence += boost;
        }
        
        // Boost for department and role-specific queries
        if (query.match(/\b(hr|human resources|it|finance|accounting|legal|compliance|marketing|sales)\b/i)) {
          const boost = 0.15;
          console.log(`[IntentAnalysis] Department/role query detected, adding boost of ${boost}`);
          confidence += boost;
        }
        
        // Boost for knowledge base specific terms
        if (query.match(/\b(knowledge base|wiki|internal docs|company info|organizational|protocols)\b/i)) {
          const boost = 0.3;
          console.log(`[IntentAnalysis] Knowledge base specific terms detected, adding boost of ${boost}`);
          confidence += boost;
        }
        
        // Boost for employee-specific queries
        if (query.match(/\b(employee|staff|team|department|office|internal team|colleagues)\b/i)) {
          const boost = 0.15;
          console.log(`[IntentAnalysis] Employee-specific query detected, adding boost of ${boost}`);
          confidence += boost;
        }
        break;
    }

    console.log(`[IntentAnalysis] Final confidence after agent-specific boosts for ${agentType}: ${confidence}`);
    return confidence;
  }

  private getMatchMethod(agentType: AgentType, matchedPatterns: string[]): "default" | "url_detection" | "code_detection" | "time_detection" | "keyword_detection" {
    if (matchedPatterns.some(p => p.match(/https?:\/\//))) {
      return 'url_detection';
    }
    if (matchedPatterns.some(p => p.match(/```|function|def|class/))) {
      return 'code_detection';
    }
    if (matchedPatterns.some(p => ['today', 'recent', 'latest', 'breaking'].includes(p.toLowerCase()))) {
      return 'time_detection';
    }
    return 'keyword_detection';
  }


  private buildResult(
    aiResult: IntentClassificationResponse,
    method: 'ai' | 'heuristic' | 'hybrid',
    locale: string,
    startTime: number,
    context?: IntentAnalysisContext
  ): IntentAnalysisResult {
    console.log('[IntentAnalysis] Building result from AI classification');
    const agentType = this.mapStringToAgentType(aiResult.agent_type);
    console.log('[IntentAnalysis] Mapped agent type string to enum:', aiResult.agent_type, '->', agentType);
    
    console.log('[IntentAnalysis] Extracting parameters from AI result');
    const parameters = this.extractParametersFromAI(aiResult.parameters, agentType, context);
    console.log('[IntentAnalysis] Parameters extracted:', Object.keys(parameters).length);
    
    const processingTime = Date.now() - startTime;
    console.log('[IntentAnalysis] Processing time:', processingTime, 'ms');
    
    const result = {
      recommendedAgent: agentType,
      confidence: aiResult.confidence,
      alternatives: aiResult.alternatives?.map(alt => ({
        agent: this.mapStringToAgentType(alt.agent_type),
        confidence: alt.confidence,
        reasoning: alt.reasoning,
      })) || [],
      parameters,
      reasoning: aiResult.reasoning,
      analysisMethod: method,
      processingTime,
      locale,
    };
    
    console.log('[IntentAnalysis] AI result built successfully', {
      recommendedAgent: result.recommendedAgent,
      confidence: result.confidence,
      alternativesCount: result.alternatives.length,
      method: result.analysisMethod
    });
    
    return result;
  }

  private buildResultFromHeuristic(
    heuristicResult: HeuristicAnalysisResult,
    locale: string,
    startTime: number,
    context?: IntentAnalysisContext
  ): IntentAnalysisResult {
    console.log('[IntentAnalysis] Building result from heuristic analysis');
    
    const processingTime = Date.now() - startTime;
    console.log('[IntentAnalysis] Processing time:', processingTime, 'ms');
    
    const reasoning = `Heuristic analysis detected ${heuristicResult.method} patterns: ${heuristicResult.matchedPatterns.join(', ')}`;
    console.log('[IntentAnalysis] Heuristic reasoning:', reasoning.substring(0, 100) + (reasoning.length > 100 ? '...' : ''));
    
    const result: IntentAnalysisResult = {
      recommendedAgent: heuristicResult.agentType,
      confidence: heuristicResult.confidence,
      alternatives: [],
      parameters: heuristicResult.parameters,
      reasoning,
      analysisMethod: 'heuristic',
      processingTime,
      locale,
    };

    // Apply advanced confidence scoring
    if (context) {
      console.log('[IntentAnalysis] Applying advanced confidence scoring to heuristic result');
      const originalConfidence = result.confidence;
      result.confidence = this.calculateAdvancedConfidence(result, context, undefined, heuristicResult);
      console.log('[IntentAnalysis] Advanced confidence scoring applied', {
        before: originalConfidence,
        after: result.confidence,
        change: result.confidence - originalConfidence
      });
    }

    console.log('[IntentAnalysis] Heuristic result built successfully', {
      recommendedAgent: result.recommendedAgent,
      confidence: result.confidence,
      method: result.analysisMethod
    });
    
    return result;
  }

  private createFallbackResult(
    context: IntentAnalysisContext,
    locale: string,
    processingTime: number
  ): IntentAnalysisResult {
    console.log('[IntentAnalysis] Creating fallback result due to analysis failure or low confidence');
    console.log('[IntentAnalysis] Using default agent:', this.config.defaultAgent);
    console.log('[IntentAnalysis] Fallback confidence set to 0.3');
    console.log('[IntentAnalysis] Processing time:', processingTime, 'ms');
    
    const result = {
      recommendedAgent: this.config.defaultAgent,
      confidence: 0.3,
      alternatives: [],
      parameters: {},
      reasoning: 'Fallback to default agent due to analysis failure or low confidence',
      analysisMethod: 'heuristic' as 'heuristic', // typescript is an amazing language
      processingTime,
      locale,
    };
    
    console.log('[IntentAnalysis] Fallback result created successfully', {
      recommendedAgent: result.recommendedAgent,
      confidence: result.confidence,
      method: result.analysisMethod
    });
    
    return result;
  }

  /**
   * Calculate advanced confidence score using the confidence scoring system
   */
  private calculateAdvancedConfidence(
    result: IntentAnalysisResult,
    context: IntentAnalysisContext,
    aiResult?: IntentClassificationResponse,
    heuristicResult?: HeuristicAnalysisResult
  ): number {
    console.log('[IntentAnalysis] Calculating advanced confidence score');
    console.log('[IntentAnalysis] Input confidence:', result.confidence);
    console.log('[IntentAnalysis] Using confidence weights:', {
      aiClassification: this.confidenceWeights.aiClassification,
      heuristicPatterns: this.confidenceWeights.heuristicPatterns,
      keywordRelevance: this.confidenceWeights.keywordRelevance,
      historicalSuccess: this.confidenceWeights.historicalSuccess,
      contextSimilarity: this.confidenceWeights.contextSimilarity,
      userPreference: this.confidenceWeights.userPreference
    });
    
    console.log('[IntentAnalysis] Getting confidence scoring system');
    const scoringSystem = getConfidenceScoringSystem(this.confidenceWeights);
    
    console.log('[IntentAnalysis] Calculating confidence score with scoring system');
    const score = scoringSystem.calculateConfidenceScore(result, context, aiResult, heuristicResult);
    
    console.log('[IntentAnalysis] Advanced confidence calculation complete', {
      inputConfidence: result.confidence,
      calculatedScore: score,
      change: score - result.confidence
    });
    
    return score;
  }

  /**
   * Record agent performance feedback for confidence system learning
   */
  public recordAgentPerformance(
    agentType: AgentType,
    success: boolean,
    responseTime: number,
    userSatisfaction?: number
  ): void {
    const scoringSystem = getConfidenceScoringSystem();
    scoringSystem.recordPerformanceFeedback(agentType, success, responseTime, userSatisfaction);
    
    console.log('[INFO] Agent performance feedback recorded', {
      agentType,
      success,
      responseTime,
      userSatisfaction,
    });
  }

  private validateInput(context: IntentAnalysisContext): IntentValidationResult {
    const errors: string[] = [];
    const warnings: string[] = [];

    if (!context.query || context.query.trim().length === 0) {
      errors.push('Query is required and cannot be empty');
    }

    if (context.query && context.query.length > 10000) {
      warnings.push('Query is very long and may affect processing performance');
    }

    return {
      valid: errors.length === 0,
      errors,
      warnings,
      sanitizedQuery: context.query?.trim(),
      sanitizedContext: context,
    };
  }

  private detectLanguage(query: string): string | null {
    // Simple language detection based on character patterns
    // In production, you might want to use a more sophisticated library
    
    const patterns = {
      'es': /[ñáéíóúü]/i,
      'fr': /[àâäçéèêëïîôùûüÿ]/i,
      'de': /[äöüß]/i,
      'it': /[àèéìíîòóù]/i,
      'pt': /[ãõáâàéêíóôúç]/i,
      'ja': /[\u3040-\u309F\u30A0-\u30FF\u4E00-\u9FAF]/,
      'ko': /[\uAC00-\uD7AF]/,
      'zh': /[\u4E00-\u9FFF]/,
    };

    for (const [lang, pattern] of Object.entries(patterns)) {
      if (pattern.test(query)) {
        return lang;
      }
    }

    return null;
  }

  private buildClassificationPrompt(context: IntentAnalysisContext, locale: string): string {
    return buildContextualPrompt(
      context.query,
      locale,
      context.conversationHistory,
      context.additionalContext
    );
  }

  private getSystemPrompt(locale: string): string {
    return SYSTEM_PROMPTS[locale as keyof typeof SYSTEM_PROMPTS] || SYSTEM_PROMPTS['en'];
  }

  private getClassificationSchema(): IntentClassificationSchema {
    // TODO: Fix this risky casting
    return ENHANCED_CLASSIFICATION_SCHEMA as unknown as IntentClassificationSchema;
  }

  private mapStringToAgentType(agentTypeString: string): AgentType {
    const mapping: Record<string, AgentType> = {
      'web_search': AgentType.WEB_SEARCH,
      'code_interpreter': AgentType.CODE_INTERPRETER,
      'url_pull': AgentType.URL_PULL,
      'local_knowledge': AgentType.LOCAL_KNOWLEDGE,
      'standard_chat': AgentType.STANDARD_CHAT,
      'foundry': AgentType.FOUNDRY,
      'third_party': AgentType.THIRD_PARTY,
    };

    return mapping[agentTypeString] || AgentType.STANDARD_CHAT;
  }

  private extractParametersFromAI(aiParameters: any, agentType: AgentType, context?: IntentAnalysisContext): Record<string, any> {
    const parameterEngine = getParameterExtractionEngine();
    return parameterEngine.extractParameters(
      agentType,
      context?.query || '',
      context,
      aiParameters
    );
  }

  private detectCodeLanguage(query: string): string {
    const patterns = {
      'python': /\b(def|import|from|print\(|if __name__|\.py\b)/i,
      'javascript': /\b(function|const|let|var|console\.log|\.js\b)/i,
      'typescript': /\b(interface|type|\.ts\b)/i,
      'bash': /\b(echo|cd|ls|grep|\.sh\b)/i,
    };

    for (const [lang, pattern] of Object.entries(patterns)) {
      if (pattern.test(query)) {
        return lang;
      }
    }

    return 'python'; // Default
  }

  private getCachedResult(context: IntentAnalysisContext): IntentAnalysisResult | null {
    const cacheKey = this.generateCacheKey(context);
    const cached = this.cache.get(cacheKey);

    if (cached && Date.now() - cached.timestamp.getTime() < this.config.cacheTTL) {
      cached.hitCount++;
      return cached.result;
    }

    if (cached) {
      this.cache.delete(cacheKey);
    }

    return null;
  }

  private cacheResult(context: IntentAnalysisContext, result: IntentAnalysisResult): void {
    const cacheKey = this.generateCacheKey(context);
    const entry: IntentAnalysisCacheEntry = {
      result,
      timestamp: new Date(),
      queryHash: cacheKey,
      contextHash: this.hashObject(context),
      hitCount: 0,
    };

    this.cache.set(cacheKey, entry);

    // Limit cache size
    if (this.cache.size > 1000) {
      const oldestKey = Array.from(this.cache.keys())[0];
      this.cache.delete(oldestKey);
    }
  }

  private generateCacheKey(context: IntentAnalysisContext): string {
    const keyData = {
      query: context.query.toLowerCase().trim(),
      locale: context.locale,
      preferences: context.userPreferences,
    };
    return this.hashObject(keyData);
  }

  private hashObject(obj: any): string {
    const str = JSON.stringify(obj, Object.keys(obj).sort());
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
      const char = str.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash; // Convert to 32-bit integer
    }
    return Math.abs(hash).toString(36);
  }

  private updateMetrics(type: string, processingTime: number): void {
    this.metrics.totalAnalyses++;
    
    switch (type) {
      case 'ai_success':
        this.metrics.successfulAIClassifications++;
        break;
      case 'heuristic_fallback':
        this.metrics.heuristicFallbacks++;
        break;
      case 'cache_hit':
        this.metrics.cacheHitRate = (this.metrics.cacheHitRate * (this.metrics.totalAnalyses - 1) + 1) / this.metrics.totalAnalyses;
        break;
      case 'error':
        this.metrics.errorRate = (this.metrics.errorRate * (this.metrics.totalAnalyses - 1) + 1) / this.metrics.totalAnalyses;
        break;
    }

    // Update average processing time
    this.metrics.averageProcessingTime = 
      (this.metrics.averageProcessingTime * (this.metrics.totalAnalyses - 1) + processingTime) / 
      this.metrics.totalAnalyses;
  }

  private updateGeneralMetrics(result: IntentAnalysisResult, processingTime: number): void {
    // Update confidence distribution
    const confidenceBucket = Math.floor(result.confidence * 10) / 10;
    this.metrics.confidenceDistribution[confidenceBucket] = 
      (this.metrics.confidenceDistribution[confidenceBucket] || 0) + 1;

    // Update agent type distribution
    this.metrics.agentTypeDistribution[result.recommendedAgent] = 
      (this.metrics.agentTypeDistribution[result.recommendedAgent] || 0) + 1;

    // Update language distribution
    this.metrics.languageDistribution[result.locale] = 
      (this.metrics.languageDistribution[result.locale] || 0) + 1;
  }

  private startCacheCleanup(): void {
    setInterval(() => {
      const now = Date.now();
      for (const [key, entry] of this.cache.entries()) {
        if (now - entry.timestamp.getTime() > this.config.cacheTTL) {
          this.cache.delete(key);
        }
      }
    }, 5 * 60 * 1000); // Clean every 5 minutes
  }

  private initializeLanguageKeywords(): Record<string, Record<string, string[]>> {
    return {
      'en': {
        'search': ['find', 'search', 'look up', 'google', 'research'],
        'code': ['code', 'program', 'script', 'function', 'algorithm'],
        'time': ['now', 'today', 'recent', 'latest', 'current'],
        'knowledge': ['documentation', 'docs', 'manual', 'handbook', 'policy', 'procedure', 'faq', 'knowledge base', 'wiki', 'internal', 'company', 'organization'],
      },
      'es': {
        'search': ['buscar', 'encontrar', 'investigar', 'google'],
        'code': ['código', 'programa', 'script', 'función', 'algoritmo'],
        'time': ['ahora', 'hoy', 'reciente', 'último', 'actual'],
        'knowledge': ['documentación', 'docs', 'manual', 'guía', 'política', 'procedimiento', 'preguntas frecuentes', 'base de conocimiento', 'wiki', 'interno', 'empresa', 'organización'],
      },
      'fr': {
        'search': ['chercher', 'trouver', 'rechercher', 'google'],
        'code': ['code', 'programme', 'script', 'fonction', 'algorithme'],
        'time': ['maintenant', 'aujourd\'hui', 'récent', 'dernier', 'actuel'],
        'knowledge': ['documentation', 'docs', 'manuel', 'guide', 'politique', 'procédure', 'faq', 'base de connaissances', 'wiki', 'interne', 'entreprise', 'organisation'],
      },
    };
  }

  private initializeLanguagePrompts(): Record<string, string> {
    return {
      'en': 'Analyze the following user query and determine the most appropriate agent type to handle their request.',
      'es': 'Analiza la siguiente consulta del usuario y determina el tipo de agente más apropiado para manejar su solicitud.',
      'fr': 'Analysez la requête utilisateur suivante et déterminez le type d\'agent le plus approprié pour traiter leur demande.',
    };
  }

  private initializeParameterExtraction(): Partial<ParameterExtractionConfig> {
    return {
      [AgentType.WEB_SEARCH]: {
        queryKeywords: ['search', 'find', 'look up', 'google', 'research'],
        freshnessIndicators: {
          'today': 'day',
          'recent': 'week',
          'latest': 'week',
          'current': 'day',
          'now': 'day',
        },
        countIndicators: ['top 5', 'first 10', 'best 3'],
        marketIndicators: {
          'us': 'en-US',
          'uk': 'en-GB',
          'canada': 'en-CA',
        },
      },
      [AgentType.CODE_INTERPRETER]: {
        languageIndicators: {
          'python': 'python',
          'javascript': 'javascript',
          'typescript': 'typescript',
          'bash': 'bash',
        },
        libraryIndicators: {
          'pandas': ['pandas', 'numpy'],
          'react': ['react', 'jsx'],
          'node': ['nodejs', 'express'],
        },
        fileUploadIndicators: ['upload', 'file', 'csv', 'json', 'data'],
      },
      [AgentType.LOCAL_KNOWLEDGE]: {
        companyKeywords: ['company', 'org', 'organization', 'corporate', 'internal', 'our', 'enterprise'],
        internalTopics: ['policy', 'procedure', 'hr', 'finance', 'it', 'handbook', 'manual', 'documentation', 'docs', 'faq', 'employee', 'staff'],
        knowledgeBaseIndicators: ['knowledge base', 'wiki', 'documentation', 'docs', 'manual', 'handbook', 'faq', 'frequently asked', 'help', 'support'],
      },
    };
  }

  /**
   * Detect which agents the user explicitly wants to avoid
   */
  public detectAgentExclusions(query: string): AgentExclusionResult {
    console.log('[IntentAnalysis] Detecting agent exclusions for query:', query.substring(0, 100));
    
    const queryLower = query.toLowerCase();
    const excludedAgents: AgentType[] = [];
    const matchedPatterns: string[] = [];
    let maxPenalty = 0;
    const reasoningParts: string[] = [];

    // Import exclusion patterns
    const { AGENT_EXCLUSION_PATTERNS } = require('./intentClassificationPrompts');

    // Check each agent type for exclusion patterns
    for (const [agentType, patterns] of Object.entries(AGENT_EXCLUSION_PATTERNS)) {
      const agentEnum = agentType as AgentType;
      let agentExcluded = false;
      let agentPatterns: string[] = [];
      const typedPatterns = patterns as any; // Type assertion for patterns

      // Check avoidance patterns (exact string matches)
      for (const pattern of typedPatterns.avoidancePatterns) {
        if (queryLower.includes(pattern.toLowerCase())) {
          agentExcluded = true;
          agentPatterns.push(pattern);
          console.log(`[IntentAnalysis] Found avoidance pattern for ${agentType}:`, pattern);
        }
      }

      // Check negative patterns (regex matches)
      for (const pattern of typedPatterns.negativePatterns) {
        if (pattern.test(query)) {
          agentExcluded = true;
          agentPatterns.push(pattern.toString());
          console.log(`[IntentAnalysis] Found negative pattern for ${agentType}:`, pattern.toString());
        }
      }

      // Check exclusion keywords
      for (const keyword of typedPatterns.exclusionKeywords) {
        if (queryLower.includes(keyword.toLowerCase())) {
          agentExcluded = true;
          agentPatterns.push(keyword);
          console.log(`[IntentAnalysis] Found exclusion keyword for ${agentType}:`, keyword);
        }
      }

      if (agentExcluded) {
        excludedAgents.push(agentEnum);
        matchedPatterns.push(...agentPatterns);
        maxPenalty = Math.max(maxPenalty, 0.9); // Heavy penalty for explicit exclusions
        reasoningParts.push(`User explicitly requested to avoid ${agentType}`);
        console.log(`[IntentAnalysis] Agent ${agentType} marked for exclusion`);
      }
    }

    const result = {
      excludedAgents,
      confidencePenalty: maxPenalty,
      matchedPatterns: [...new Set(matchedPatterns)], // Remove duplicates
      reasoning: reasoningParts.length > 0 
        ? reasoningParts.join('; ')
        : 'No explicit agent exclusions detected'
    };

    console.log('[IntentAnalysis] Agent exclusion detection result:', {
      excludedAgents: result.excludedAgents,
      penalty: result.confidencePenalty,
      patternsCount: result.matchedPatterns.length
    });

    return result;
  }

  /**
   * Apply agent exclusions to confidence scores
   */
  private applyUserExclusions(
    query: string,
    agentType: AgentType,
    currentConfidence: number
  ): number {
    const exclusions = this.detectAgentExclusions(query);
    
    if (exclusions.excludedAgents.includes(agentType)) {
      const penalizedConfidence = Math.max(0.05, currentConfidence - exclusions.confidencePenalty);
      console.log(`[IntentAnalysis] Applied exclusion penalty to ${agentType}:`, {
        originalConfidence: currentConfidence,
        penalty: exclusions.confidencePenalty,
        finalConfidence: penalizedConfidence
      });
      return penalizedConfidence;
    }

    return currentConfidence;
  }
}

/**
 * Convenience function to get the singleton service instance
 */
export function getIntentAnalysisService(config?: Partial<IntentAnalysisConfig>): IntentAnalysisService {
  return IntentAnalysisService.getInstance(config);
}

/**
 * Convenience function to analyze intent
 */
export async function analyzeUserIntent(
  context: IntentAnalysisContext,
  openai?: AzureOpenAI,
  modelId?: string,
  user?: Session['user']
): Promise<IntentAnalysisResult> {
  const service = getIntentAnalysisService();
  return await service.analyzeIntent(context, openai, modelId, user);
}

/**
 * Convenience function to record agent performance feedback
 */
export function recordIntentAnalysisPerformance(
  agentType: AgentType,
  success: boolean,
  responseTime: number,
  userSatisfaction?: number
): void {
  const service = getIntentAnalysisService();
  service.recordAgentPerformance(agentType, success, responseTime, userSatisfaction);
}