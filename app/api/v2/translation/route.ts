import { Session } from 'next-auth';
import { NextRequest, NextResponse } from 'next/server';

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

type TranslationResponse = {
  translatedText: string;
  notes: string;
};

export async function POST(req: NextRequest): Promise<NextResponse> {
  const apiVersion = '2025-03-01-preview';

  try {
    const body = await req.json();
    const { sourceText, targetLocale, user, modelId } = body as {
      sourceText: string;
      targetLocale: string;
      user: Session['user'];
      modelId: string;
    };

    if (!sourceText) {
      return NextResponse.json(
        { error: 'No source text provided' },
        { status: 400 },
      );
    }

    if (!targetLocale) {
      return NextResponse.json(
        { error: 'No target locale provided' },
        { status: 400 },
      );
    }

    const scope = 'https://cognitiveservices.azure.com/.default';
    const azureADTokenProvider = getBearerTokenProvider(
      new DefaultAzureCredential(),
      scope,
    );

    // Initialize OpenAI API client
    const openai = new AzureOpenAI({
      azureADTokenProvider,
      deployment: modelId,
      apiVersion,
    });

    // Get the autonym for the target locale
    const targetLanguageName = getAutonym(targetLocale);

    // Prepare the prompt for translation
    const prompt = `Translate the following text into ${targetLanguageName} (ISO code: ${targetLocale}).
Retain the semantic intent, tone, vocabulary, and structure of the original text as much as possible.
The translation should sound natural to native speakers of the target language.

Source text:
"""
${sourceText}
"""

Provide only the translated text in your response.`;

    const systemMessage: ChatCompletionSystemMessageParam = {
      role: 'system',
      content:
        'You are a professional translator with expertise in multiple languages. Your task is to provide accurate and natural-sounding translations while preserving the original meaning and tone.',
    };

    const userMessage: ChatCompletionMessageParam = {
      role: 'user',
      content: prompt,
    };

    // Define JSON schema for the structured response
    const jsonSchema = {
      type: 'object',
      properties: {
        translatedText: {
          type: 'string',
          description: 'The translated text in the target language',
        },
        notes: {
          type: 'string',
          description:
            'Any optional translation notes capturing difficulties or lost subtleties.',
        },
      },
      required: ['translatedText', 'notes'],
      additionalProperties: false,
    };

    // Generate translation using structured response
    const translationResponse =
      await getStructuredResponse<TranslationResponse>(
        openai,
        [systemMessage, userMessage],
        modelId,
        user,
        jsonSchema,
        0.3, // Lower temperature for more accurate translations
        2000, // Increased max tokens to accommodate longer texts
      );

    return NextResponse.json(
      { translatedText: translationResponse.translatedText },
      { status: 200 },
    );
  } catch (error) {
    console.error(error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 },
    );
  }
}
