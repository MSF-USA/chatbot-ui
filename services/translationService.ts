import { Session } from 'next-auth';

import { getAutonym } from '@/utils/app/locales';
import { getStructuredResponse } from '@/utils/server/structuredResponses';

import {
  DefaultAzureCredential,
  getBearerTokenProvider,
} from '@azure/identity';
import { AzureOpenAI } from 'openai';
import {
  ChatCompletionMessageParam,
  ChatCompletionSystemMessageParam,
} from 'openai/resources/chat/completions';

/**
 * Translation request parameters
 */
export interface TranslationRequest {
  sourceText: string;
  targetLanguage?: string;
  sourceLanguage?: string;
  modelId: string;
  user: Session['user'];
  userLocale?: string;
}

/**
 * Translation response structure
 */
export interface TranslationResponse {
  translatedText: string;
  notes: string;
  detectedSourceLanguage?: string;
  targetLanguage: string;
}

/**
 * Translation service for handling language translation using Azure OpenAI
 */
export class TranslationService {
  private static instance: TranslationService;
  private readonly apiVersion = '2025-03-01-preview';

  private constructor() {}

  public static getInstance(): TranslationService {
    if (!TranslationService.instance) {
      TranslationService.instance = new TranslationService();
    }
    return TranslationService.instance;
  }

  /**
   * Translate text with flexible language parameters
   */
  public async translateText(request: TranslationRequest): Promise<TranslationResponse> {
    console.log('[TranslationService] translateText - Request received:', {
      sourceText: request.sourceText?.substring(0, 100) + '...',
      sourceTextLength: request.sourceText?.length,
      targetLanguage: request.targetLanguage,
      sourceLanguage: request.sourceLanguage,
      modelId: request.modelId,
      userLocale: request.userLocale,
    });

    const {
      sourceText,
      targetLanguage,
      sourceLanguage,
      modelId,
      user,
      userLocale,
    } = request;

    if (!sourceText?.trim()) {
      console.error('[TranslationService] translateText - Source text is empty or missing');
      throw new Error('Source text is required');
    }

    // Determine target language
    const finalTargetLanguage = targetLanguage || userLocale || 'en';
    const targetLanguageName = getAutonym(finalTargetLanguage);

    console.log('[TranslationService] translateText - Language processing:', {
      originalTargetLanguage: targetLanguage,
      finalTargetLanguage,
      targetLanguageName,
      sourceLanguage,
    });

    // Initialize OpenAI client
    const openai = await this.initializeOpenAIClient(modelId);

    // Build prompt based on available parameters
    const prompt = this.buildTranslationPrompt(
      sourceText,
      finalTargetLanguage,
      targetLanguageName,
      sourceLanguage,
    );

    console.log('[TranslationService] translateText - Generated prompt:', {
      promptLength: prompt.length,
      promptPreview: prompt.substring(0, 200) + '...',
    });

    const systemMessage: ChatCompletionSystemMessageParam = {
      role: 'system',
      content: this.getSystemPrompt(),
    };

    const userMessage: ChatCompletionMessageParam = {
      role: 'user',
      content: prompt,
    };

    // Define JSON schema for structured response
    // Pass true for needsLanguageDetection when sourceLanguage is not provided
    const needsLanguageDetection = !sourceLanguage;
    const jsonSchema = this.getResponseSchema(needsLanguageDetection);

    console.log('[TranslationService] translateText - Calling OpenAI service...', {
      needsLanguageDetection,
      sourceLanguageProvided: !!sourceLanguage,
      schemaRequiredFields: jsonSchema.required,
    });

    try {
      // Generate translation
      const translationResponse = await getStructuredResponse<TranslationResponse>(
        openai,
        [systemMessage, userMessage],
        modelId,
        user,
        jsonSchema,
        0.3, // Lower temperature for more accurate translations
        2000, // Increased max tokens for longer texts
      );

      console.log('[TranslationService] translateText - OpenAI response:', {
        translatedText: translationResponse.translatedText?.substring(0, 100) + '...',
        translatedTextLength: translationResponse.translatedText?.length,
        notes: translationResponse.notes,
        detectedSourceLanguage: translationResponse.detectedSourceLanguage,
      });

      // Defensive validation of the structured response
      if (!translationResponse) {
        console.error('[TranslationService] translateText - OpenAI returned null response');
        throw new Error('Translation service returned null response');
      }

      if (!translationResponse.translatedText || typeof translationResponse.translatedText !== 'string') {
        console.error('[TranslationService] translateText - Invalid translatedText in response:', {
          translatedText: translationResponse.translatedText,
          typeOfTranslatedText: typeof translationResponse.translatedText,
          fullResponse: translationResponse,
        });
        throw new Error('Translation service returned invalid or missing translatedText');
      }

      if (translationResponse.translatedText.trim() === '') {
        console.error('[TranslationService] translateText - Empty translatedText in response');
        throw new Error('Translation service returned empty translation');
      }

      const finalResponse = {
        ...translationResponse,
        targetLanguage: finalTargetLanguage,
      };

      console.log('[TranslationService] translateText - Final response:', {
        translatedText: finalResponse.translatedText?.substring(0, 100) + '...',
        translatedTextLength: finalResponse.translatedText?.length,
        targetLanguage: finalResponse.targetLanguage,
        notes: finalResponse.notes,
        detectedSourceLanguage: finalResponse.detectedSourceLanguage,
      });

      return finalResponse;
    } catch (error) {
      console.error('[TranslationService] translateText - OpenAI service error:', {
        error: error instanceof Error ? error.message : String(error),
        stack: error instanceof Error ? error.stack : undefined,
      });
      throw error;
    }
  }

  /**
   * Detect the language of given text
   */
  public async detectLanguage(
    text: string,
    modelId: string,
    user: Session['user'],
  ): Promise<string> {
    if (!text?.trim()) {
      throw new Error('Text is required for language detection');
    }

    const openai = await this.initializeOpenAIClient(modelId);

    const systemMessage: ChatCompletionSystemMessageParam = {
      role: 'system',
      content: 'You are a language detection expert. Detect the language of the provided text and return only the ISO 639-1 language code (e.g., "en", "es", "fr").',
    };

    const userMessage: ChatCompletionMessageParam = {
      role: 'user',
      content: `Detect the language of this text and return only the ISO 639-1 code:\n\n"${text}"`,
    };

    const jsonSchema = {
      type: 'object',
      properties: {
        languageCode: {
          type: 'string',
          description: 'The ISO 639-1 language code of the detected language',
        },
      },
      required: ['languageCode'],
      additionalProperties: false,
    };

    const response = await getStructuredResponse<{ languageCode: string }>(
      openai,
      [systemMessage, userMessage],
      modelId,
      user,
      jsonSchema,
      0.1, // Very low temperature for consistent detection
      100, // Short response expected
    );

    return response.languageCode;
  }

  /**
   * Initialize Azure OpenAI client
   */
  private async initializeOpenAIClient(modelId: string): Promise<AzureOpenAI> {
    const scope = 'https://cognitiveservices.azure.com/.default';
    const azureADTokenProvider = getBearerTokenProvider(
      new DefaultAzureCredential(),
      scope,
    );

    return new AzureOpenAI({
      azureADTokenProvider,
      deployment: modelId,
      apiVersion: this.apiVersion,
    });
  }

  /**
   * Build translation prompt based on available parameters
   */
  private buildTranslationPrompt(
    sourceText: string,
    targetLanguage: string,
    targetLanguageName: string,
    sourceLanguage?: string,
  ): string {
    let prompt = '';

    if (sourceLanguage) {
      // Explicit source language provided
      const sourceLanguageName = getAutonym(sourceLanguage);
      prompt = `Translate the following text from ${sourceLanguageName} (${sourceLanguage}) to ${targetLanguageName} (${targetLanguage}).`;
    } else {
      // Source language needs to be detected
      prompt = `Detect the language of the following text and translate it to ${targetLanguageName} (${targetLanguage}).`;
    }

    prompt += `\nRetain the semantic intent, tone, vocabulary, and structure of the original text as much as possible.
The translation should sound natural to native speakers of the target language.

Source text:
"""
${sourceText}
"""

${!sourceLanguage ? 'First detect the source language, then provide the translation.' : 'Provide the translation.'}`;

    return prompt;
  }

  /**
   * Get system prompt for translation
   */
  private getSystemPrompt(): string {
    return 'You are a professional translator with expertise in multiple languages. Your task is to provide accurate and natural-sounding translations while preserving the original meaning and tone. When source language is not specified, first detect the language and then translate.';
  }

  /**
   * Get JSON schema for translation response
   * @param needsLanguageDetection - Whether the response should include detected source language
   */
  private getResponseSchema(needsLanguageDetection: boolean = false): any {
    if (needsLanguageDetection) {
      // Schema when language detection is needed
      return {
        type: 'object',
        properties: {
          translatedText: {
            type: 'string',
            description: 'The translated text in the target language',
          },
          notes: {
            type: 'string',
            description: 'Any optional translation notes capturing difficulties or lost subtleties. Assume the user is only interested in unique aspects of the translation, not stating obvious facts about how the text was translated.',
          },
          detectedSourceLanguage: {
            type: 'string',
            description: 'The detected source language ISO code',
          },
        },
        required: ['translatedText', 'notes', 'detectedSourceLanguage'],
        additionalProperties: false,
      };
    } else {
      // Schema when source language is already known
      return {
        type: 'object',
        properties: {
          translatedText: {
            type: 'string',
            description: 'The translated text in the target language',
          },
          notes: {
            type: 'string',
            description: 'Any optional translation notes capturing difficulties or lost subtleties.',
          },
        },
        required: ['translatedText', 'notes'],
        additionalProperties: false,
      };
    }
  }
}

export default TranslationService;