import {
  AgentConfig,
  AgentExecutionContext,
  AgentExecutionEnvironment,
  AgentResponse,
  AgentType,
  TranslationAgentConfig,
} from '@/types/agent';

import { TranslationService } from '@/services/translationService';

import {
  AgentCreationError,
  AgentExecutionError,
  BaseAgent,
} from './baseAgent';

/**
 * TranslationAgent - Implementation for text translation using Azure OpenAI
 * Supports automatic language detection and flexible language specification
 */
export class TranslationAgent extends BaseAgent {
  private translationService: TranslationService;
  private translationCache: Map<string, { response: string; timestamp: number }> = new Map();
  private readonly CACHE_TTL = 5 * 60 * 1000; // 5 minutes

  constructor(config: TranslationAgentConfig) {
    // Ensure this is a translation agent
    if (config.type !== AgentType.TRANSLATION) {
      throw new AgentCreationError(
        'TranslationAgent can only be used with TRANSLATION type',
        { providedType: config.type },
      );
    }

    // Set environment to FOUNDRY as translation uses Azure OpenAI
    config.environment = AgentExecutionEnvironment.FOUNDRY;

    super(config);

    // Initialize translation service
    this.translationService = TranslationService.getInstance();
  }

  protected async initializeAgent(): Promise<void> {
    try {
      // Validate configuration
      const translationConfig = this.config as TranslationAgentConfig;

      this.logInfo('TranslationAgent initialized successfully', {
        agentId: this.config.id,
        enableLanguageDetection: translationConfig.enableLanguageDetection ?? true,
        enableCaching: translationConfig.enableCaching ?? true,
        defaultSourceLanguage: translationConfig.defaultSourceLanguage,
        defaultTargetLanguage: translationConfig.defaultTargetLanguage,
      });
    } catch (error) {
      const errorMessage = `Failed to initialize TranslationAgent: ${
        error instanceof Error ? error.message : String(error)
      }`;
      this.logError(errorMessage, error as Error, {
        agentId: this.config.id,
      });
      throw new AgentCreationError(errorMessage, error);
    }
  }

  protected async executeInternalStreaming(
    context: AgentExecutionContext,
  ): Promise<ReadableStream<string>> {
    const self = this;

    try {
      return new ReadableStream({
        async start(controller) {
          try {
            // Show translation status
            controller.enqueue('🌐 Translating text...\n\n');

            // Parse the translation request from the query
            const translationParams = self.parseTranslationQuery(context.query, context.locale);

            // Check cache first if enabled
            const translationConfig = self.config as TranslationAgentConfig;
            if (translationConfig.enableCaching) {
              const cacheKey = self.generateCacheKey(translationParams);
              const cachedResult = self.getCachedTranslation(cacheKey);
              if (cachedResult) {
                controller.enqueue('📋 Found cached translation...\n\n');
                controller.enqueue(cachedResult);
                controller.close();
                return;
              }
            }

            // Perform translation
            controller.enqueue('✨ Processing translation...\n\n');
            const translationResponse = await self.translationService.translateText({
              sourceText: translationParams.text,
              sourceLanguage: translationParams.sourceLanguage,
              targetLanguage: translationParams.targetLanguage,
              modelId: context.model.id,
              user: context.user,
              userLocale: context.locale,
            });

            // Format and stream the response
            const formattedResponse = self.formatTranslationResponse(translationResponse, translationParams);

            // Cache the result if enabled
            if (translationConfig.enableCaching) {
              const cacheKey = self.generateCacheKey(translationParams);
              self.cacheTranslation(cacheKey, formattedResponse);
            }

            // Stream the response in chunks for better UX
            const chunks = formattedResponse.match(/.{1,100}/g) || [formattedResponse];
            for (const chunk of chunks) {
              controller.enqueue(chunk);
              await new Promise((resolve) => setTimeout(resolve, 30));
            }

            controller.close();
          } catch (error) {
            controller.enqueue(
              `❌ Translation error: ${
                error instanceof Error ? error.message : String(error)
              }`,
            );
            controller.close();
          }
        },
      });
    } catch (error) {
      return new ReadableStream({
        start(controller) {
          controller.enqueue(
            `❌ Translation failed: ${
              error instanceof Error ? error.message : String(error)
            }`,
          );
          controller.close();
        },
      });
    }
  }

  protected async executeInternal(
    context: AgentExecutionContext,
  ): Promise<AgentResponse> {
    const startTime = Date.now();

    try {
      console.log('[TranslationAgent] executeInternal - Starting execution:', {
        agentId: this.config.id,
        query: context.query,
        locale: context.locale,
        modelId: context.model.id,
      });

      // Parse the translation request from the query
      const translationParams = this.parseTranslationQuery(context.query, context.locale);

      console.log('[TranslationAgent] executeInternal - Parsed parameters:', translationParams);

      // Check cache first if enabled
      const translationConfig = this.config as TranslationAgentConfig;
      if (translationConfig.enableCaching) {
        const cacheKey = this.generateCacheKey(translationParams);
        const cachedResult = this.getCachedTranslation(cacheKey);
        if (cachedResult) {
          console.log('[TranslationAgent] executeInternal - Using cached result');
          return this.createSuccessResponse(cachedResult, context, Date.now() - startTime);
        }
      }

      // Perform translation using the service
      const serviceRequest = {
        sourceText: translationParams.text,
        sourceLanguage: translationParams.sourceLanguage,
        targetLanguage: translationParams.targetLanguage,
        modelId: context.model.id,
        user: context.user,
        userLocale: context.locale,
      };

      console.log('[TranslationAgent] executeInternal - Service request:', serviceRequest);

      const translationResponse = await this.translationService.translateText(serviceRequest);

      console.log('[TranslationAgent] executeInternal - Service response:', translationResponse);

      // Format the response with error handling
      let formattedResponse: string;
      try {
        formattedResponse = this.formatTranslationResponse(translationResponse, translationParams);
      } catch (formattingError) {
        console.error('[TranslationAgent] executeInternal - Formatting error:', formattingError);

        // Create a fallback response with error information
        formattedResponse = `❌ **Translation Error**\n\n`;
        formattedResponse += `**Original Text:**\n> ${translationParams.text}\n\n`;
        formattedResponse += `**Error:** ${formattingError instanceof Error ? formattingError.message : String(formattingError)}\n\n`;
        formattedResponse += `**Debug Info:**\n`;
        formattedResponse += `- Source Language: ${translationParams.sourceLanguage || 'auto-detect'}\n`;
        formattedResponse += `- Target Language: ${translationParams.targetLanguage}\n`;
        formattedResponse += `- Service Response: ${JSON.stringify(translationResponse, null, 2)}`;

        // This will still be returned as a "successful" response, but with error content
        // The user will see the error details instead of empty content
      }

      console.log('[TranslationAgent] executeInternal - Formatted response:', {
        length: formattedResponse.length,
        preview: formattedResponse.substring(0, 200),
      });

      // Cache the result if enabled
      if (translationConfig.enableCaching) {
        const cacheKey = this.generateCacheKey(translationParams);
        this.cacheTranslation(cacheKey, formattedResponse);
      }

      const finalResponse = this.createSuccessResponse(formattedResponse, context, Date.now() - startTime);

      console.log('[TranslationAgent] executeInternal - Final response:', {
        content: finalResponse.content,
        contentLength: finalResponse.content?.length,
        success: finalResponse.success,
      });

      return finalResponse;
    } catch (error) {
      const executionTime = Date.now() - startTime;

      console.error('[TranslationAgent] executeInternal - Error:', {
        error: error instanceof Error ? error.message : String(error),
        stack: error instanceof Error ? error.stack : undefined,
        agentId: this.config.id,
        query: context.query,
        executionTime,
      });

      throw new AgentExecutionError(
        `Translation execution failed: ${
          error instanceof Error ? error.message : String(error)
        }`,
        {
          agentId: this.config.id,
          query: context.query,
          executionTime,
          error: error instanceof Error ? error.message : String(error),
        },
      );
    }
  }

  protected validateSpecificConfig(): string[] {
    const errors: string[] = [];
    const translationConfig = this.config as TranslationAgentConfig;

    // Validate maximum text length
    if (translationConfig.maxTextLength && translationConfig.maxTextLength <= 0) {
      errors.push('maxTextLength must be greater than 0');
    }

    // Validate cache TTL
    if (translationConfig.cacheTtl && translationConfig.cacheTtl <= 0) {
      errors.push('cacheTtl must be greater than 0');
    }

    return errors;
  }

  protected getCapabilities(): string[] {
    return [
      'text-translation',
      'language-detection',
      'multi-language-support',
      'automatic-language-inference',
      'translation-caching',
      'context-preservation',
      'quality-analysis',
    ];
  }

  /**
   * Parse translation query to extract parameters
   * Supports three formats:
   * 1. "/translate source_lang target_lang text"
   * 2. "/translate target_lang text"
   * 3. "/translate text"
   */
  private parseTranslationQuery(query: string, defaultLocale: string): {
    sourceLanguage?: string;
    targetLanguage: string;
    text: string;
  } {
    console.log('[TranslationAgent] parseTranslationQuery - Input:', {
      query,
      defaultLocale,
    });

    // Remove the /translate command prefix if present
    const cleanQuery = query.replace(/^\/translate\s*/, '').trim();

    console.log('[TranslationAgent] parseTranslationQuery - After prefix removal:', {
      cleanQuery,
      originalQuery: query,
    });

    if (!cleanQuery) {
      console.error('[TranslationAgent] parseTranslationQuery - No text provided');
      throw new Error('No text provided for translation');
    }

    const parts = cleanQuery.split(/\s+/);

    console.log('[TranslationAgent] parseTranslationQuery - Parts:', {
      parts,
      partsLength: parts.length,
    });

    // Pattern 1: source_lang target_lang text
    if (parts.length >= 3) {
      const firstIsLangCode = this.looksLikeLanguageCode(parts[0]);
      const secondIsLangCode = this.looksLikeLanguageCode(parts[1]);

      console.log('[TranslationAgent] parseTranslationQuery - Pattern 1 check:', {
        firstPart: parts[0],
        firstIsLangCode,
        secondPart: parts[1],
        secondIsLangCode,
        pattern1Match: firstIsLangCode && secondIsLangCode,
      });

      if (firstIsLangCode && secondIsLangCode) {
        const result = {
          sourceLanguage: parts[0],
          targetLanguage: parts[1],
          text: parts.slice(2).join(' '),
        };

        console.log('[TranslationAgent] parseTranslationQuery - Pattern 1 result:', result);
        return result;
      }
    }

    // Pattern 2: target_lang text
    if (parts.length >= 2) {
      const firstIsLangCode = this.looksLikeLanguageCode(parts[0]);

      console.log('[TranslationAgent] parseTranslationQuery - Pattern 2 check:', {
        firstPart: parts[0],
        firstIsLangCode,
        pattern2Match: firstIsLangCode,
      });

      if (firstIsLangCode) {
        const result = {
          targetLanguage: parts[0],
          text: parts.slice(1).join(' '),
        };

        console.log('[TranslationAgent] parseTranslationQuery - Pattern 2 result:', result);
        return result;
      }
    }

    // Pattern 3: text (infer everything)
    const result = {
      targetLanguage: defaultLocale || 'en',
      text: cleanQuery,
    };

    console.log('[TranslationAgent] parseTranslationQuery - Pattern 3 result:', result);
    return result;
  }

  /**
   * Simple heuristic to detect if a string looks like a language code
   * This is intentionally lenient to allow arbitrary language specifications
   */
  private looksLikeLanguageCode(str: string): boolean {
    // Allow 2-5 character codes, letters only, with optional dashes/underscores
    const result = /^[a-zA-Z]{2,5}([_-][a-zA-Z]{2,5})?$/.test(str);

    console.log('[TranslationAgent] looksLikeLanguageCode:', {
      input: str,
      result,
      regex: '^[a-zA-Z]{2,5}([_-][a-zA-Z]{2,5})?$',
    });

    return result;
  }

  /**
   * Format the translation response for display
   */
  private formatTranslationResponse(
    response: any,
    params: { sourceLanguage?: string; targetLanguage: string; text: string },
  ): string {
    console.log('[TranslationAgent] formatTranslationResponse - Input:', {
      response,
      params,
      responseKeys: response ? Object.keys(response) : 'null',
      translatedText: response?.translatedText,
      translatedTextLength: response?.translatedText?.length,
    });

    // Defensive check: Handle null/undefined response
    if (!response) {
      console.error('[TranslationAgent] formatTranslationResponse - Response is null/undefined');
      throw new Error('Translation service returned null response');
    }

    // Defensive check: Handle empty translatedText
    if (!response.translatedText || response.translatedText.trim() === '') {
      console.error('[TranslationAgent] formatTranslationResponse - translatedText is empty or missing:', {
        translatedText: response.translatedText,
        responseKeys: Object.keys(response),
        fullResponse: response,
      });
      throw new Error('Translation service returned empty translation result');
    }

    // let result = `**Translation Result:**\n\n`;
    //
    // // Show source language if detected
    // if (response.detectedSourceLanguage && !params.sourceLanguage) {
    //   result += `📝 **Detected Language:** ${response.detectedSourceLanguage}\n`;
    // } else if (params.sourceLanguage) {
    //   result += `📝 **Source Language:** ${params.sourceLanguage}\n`;
    // }
    //
    // result += `🎯 **Target Language:** ${params.targetLanguage}\n\n`;
    // result += `**Original Text:**\n> ${params.text}\n\n`;
    // result += `**Translation:**\n${response.translatedText}`;
    let result = response.translatedText;

    // Add notes if available
    if (response.notes && response.notes.trim()) {
      result += `\n\n**Translation Notes:**\n*${response.notes}*`;
    }

    console.log('[TranslationAgent] formatTranslationResponse - Result:', {
      resultLength: result.length,
      resultPreview: result.substring(0, 200) + '...',
      hasTranslatedText: !!response.translatedText,
      translatedTextLength: response.translatedText?.length,
    });

    return result;
  }

  /**
   * Create a successful agent response
   */
  private createSuccessResponse(
    content: string,
    context: AgentExecutionContext,
    executionTime: number,
  ): AgentResponse {
    console.log('[TranslationAgent] createSuccessResponse - Input:', {
      contentLength: content?.length,
      contentPreview: content?.substring(0, 100) + '...',
      agentId: this.config.id,
      executionTime,
      modelId: context.model.id,
      locale: context.locale,
    });

    // Calculate confidence based on content length and execution time
    let confidence = 0.8; // Default confidence for successful translation

    if (content && content.length > 0) {
      // Higher confidence for longer content (assuming more substantial translation)
      if (content.length > 200) confidence = 0.9;
      else if (content.length > 100) confidence = 0.85;
      else confidence = 0.8;

      // Adjust based on execution time (very fast might indicate cached/simple, very slow might indicate issues)
      if (executionTime < 500) confidence += 0.05; // Fast response bonus
      else if (executionTime > 5000) confidence -= 0.1; // Slow response penalty

      // Ensure confidence is within valid range
      confidence = Math.max(0.1, Math.min(1.0, confidence));
    } else {
      confidence = 0; // No content = no confidence
    }

    const response = {
      content,
      agentId: this.config.id,
      agentType: AgentType.TRANSLATION,
      success: true,
      metadata: {
        processingTime: executionTime,
        confidence,
        agentMetadata: {
          modelUsed: context.model.id,
          userLocale: context.locale,
        },
      },
    };

    console.log('[TranslationAgent] createSuccessResponse - Output:', {
      contentLength: response.content?.length,
      success: response.success,
      agentType: response.agentType,
      agentId: response.agentId,
      processingTime: response.metadata?.processingTime,
      confidence: response.metadata?.confidence,
    });

    return response;
  }

  /**
   * Generate cache key for translation request
   */
  private generateCacheKey(params: {
    sourceLanguage?: string;
    targetLanguage: string;
    text: string;
  }): string {
    return `${params.sourceLanguage || 'auto'}|${params.targetLanguage}|${params.text}`;
  }

  /**
   * Get cached translation if available and not expired
   */
  private getCachedTranslation(cacheKey: string): string | null {
    const cached = this.translationCache.get(cacheKey);
    if (cached && Date.now() - cached.timestamp < this.CACHE_TTL) {
      return cached.response;
    }

    if (cached) {
      this.translationCache.delete(cacheKey);
    }

    return null;
  }

  /**
   * Cache translation response
   */
  private cacheTranslation(cacheKey: string, response: string): void {
    // Implement cache size limit
    if (this.translationCache.size >= 100) {
      const oldestKey = this.translationCache.keys().next().value;
      this.translationCache.delete(oldestKey);
    }

    this.translationCache.set(cacheKey, {
      response,
      timestamp: Date.now(),
    });
  }
}
