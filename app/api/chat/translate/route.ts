import { NextRequest, NextResponse } from 'next/server';

import {
  DEFAULT_ANALYSIS_MAX_TOKENS,
  DEFAULT_ANALYSIS_MODEL,
} from '@/lib/utils/app/const';
import { getAutonym } from '@/lib/utils/app/locales';
import {
  badRequestResponse,
  handleApiError,
  unauthorizedResponse,
} from '@/lib/utils/server/api/apiResponse';
import { createApiLoggingContext } from '@/lib/utils/server/observability';

import {
  TranslationRequest,
  TranslationResponseData,
} from '@/types/translation';

import { auth } from '@/auth';
import {
  DefaultAzureCredential,
  getBearerTokenProvider,
} from '@azure/identity';
import { AzureOpenAI } from 'openai';

export const maxDuration = 60;

const TRANSLATION_SYSTEM_PROMPT = `You are an expert multilingual translator. Your task is to translate text accurately while preserving:

1. **Markdown Formatting**: Preserve all headers, lists, bold, italic, links, and other markdown syntax exactly
2. **Code Blocks**: Keep all code blocks unchanged - only translate comments within code if they exist
3. **Technical Terms**: Maintain technical terminology unless a standard translation exists in the target language
4. **Tone and Style**: Match the original tone (formal, casual, technical, etc.)
5. **Structure**: Preserve paragraph breaks, line breaks, and document structure

Return your response as JSON with this structure:
{
  "translatedText": "The translated text with all formatting preserved",
  "notes": "Optional: Any important notes about idioms, cultural adaptations, or terms that couldn't be directly translated (omit if none)"
}

Guidelines:
- URLs, email addresses, and code should remain unchanged
- Numbers and dates should use the target language's conventions when appropriate
- Preserve any special characters or symbols
- If text is already in the target language, return it unchanged`;

/**
 * POST /api/chat/translate
 * Translates text to a target language using Azure OpenAI
 */
export async function POST(req: NextRequest) {
  const ctx = createApiLoggingContext();

  try {
    // Check authentication
    ctx.session = await auth();
    if (!ctx.user) {
      return unauthorizedResponse();
    }

    // Parse and validate request body
    const body: TranslationRequest = await req.json();
    const { sourceText, targetLocale } = body;

    if (!sourceText || sourceText.trim().length === 0) {
      return badRequestResponse('Source text is required');
    }

    if (!targetLocale || targetLocale.trim().length === 0) {
      return badRequestResponse('Target locale is required');
    }

    // Get the target language name for the prompt
    const targetLanguageName = getAutonym(targetLocale);

    // Initialize Azure OpenAI client
    const azureADTokenProvider = getBearerTokenProvider(
      new DefaultAzureCredential(),
      'https://cognitiveservices.azure.com/.default',
    );

    const client = new AzureOpenAI({
      azureADTokenProvider,
      apiVersion: '2024-08-01-preview',
    });

    // Build the user prompt
    const userMessage = `Translate the following text into ${targetLanguageName} (ISO code: ${targetLocale}).

Source text:
"""
${sourceText}
"""`;

    // Call Azure OpenAI with structured output
    const response = await client.chat.completions.create({
      model: DEFAULT_ANALYSIS_MODEL,
      messages: [
        { role: 'system', content: TRANSLATION_SYSTEM_PROMPT },
        { role: 'user', content: userMessage },
      ],
      max_completion_tokens: DEFAULT_ANALYSIS_MAX_TOKENS,
      response_format: {
        type: 'json_schema',
        json_schema: {
          name: 'translation_response',
          strict: true,
          schema: {
            type: 'object',
            properties: {
              translatedText: {
                type: 'string',
                description: 'The translated text with preserved formatting',
              },
              notes: {
                type: 'string',
                description:
                  'Optional notes about idioms, cultural adaptations, or translation difficulties',
              },
            },
            required: ['translatedText', 'notes'],
            additionalProperties: false,
          },
        },
      },
    });

    // Validate response
    if (!response.choices || response.choices.length === 0) {
      console.error('[Translation] No choices in response');
      throw new Error('No choices returned from AI');
    }

    const choice = response.choices[0];

    // Check for refusal
    if (choice.message?.refusal) {
      console.error('[Translation] AI refused:', choice.message.refusal);
      throw new Error(`Translation refused: ${choice.message.refusal}`);
    }

    const content = choice.message?.content;
    if (!content) {
      console.error(
        '[Translation] Empty content. Finish reason:',
        choice.finish_reason,
      );
      throw new Error('No content in AI response');
    }

    // Parse and validate the response
    const translationResult: TranslationResponseData = JSON.parse(content);

    if (!translationResult.translatedText) {
      throw new Error('Invalid response: missing translatedText');
    }

    // Log success
    void ctx.logger.logTranslationSuccess({
      user: ctx.user,
      targetLanguage: targetLocale,
      contentLength: sourceText.length,
      isDocumentTranslation: false,
      duration: ctx.timer.elapsed(),
    });

    return NextResponse.json({
      success: true,
      data: {
        translatedText: translationResult.translatedText,
        notes: translationResult.notes || undefined,
      },
    });
  } catch (error) {
    console.error('[Translation API] Error:', error);

    // Log error using hoisted session (no redundant auth() call)
    if (ctx.user) {
      void ctx.logger.logTranslationError({
        user: ctx.user,
        isDocumentTranslation: false,
        errorCode: 'TRANSLATION_ERROR',
        errorMessage: ctx.getErrorMessage(error),
      });
    }

    return handleApiError(error, 'Failed to translate text');
  }
}
