import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { AzureOpenAI } from 'openai';
import {
  DefaultAzureCredential,
  getBearerTokenProvider,
} from '@azure/identity';

import { generateOptimizedWebSearchQuery } from '@/utils/server/structuredResponses';

import { Message } from '@/types/chat';

interface OptimizeQueryRequest {
  messages: Message[];
  currentQuery: string;
  modelId: string;
}

// OpenAI instance for query optimization
let openaiInstance: AzureOpenAI | null = null;

/**
 * Get or initialize the OpenAI instance
 */
function getOpenAIInstance(): AzureOpenAI | null {
  if (!openaiInstance) {
    try {
      const azureADTokenProvider = getBearerTokenProvider(
        new DefaultAzureCredential(),
        'https://cognitiveservices.azure.com/.default',
      );

      openaiInstance = new AzureOpenAI({
        azureADTokenProvider,
        apiVersion: process.env.OPENAI_API_VERSION ?? '2024-08-01-preview',
      });
      
      console.log('[QueryOptimizationAPI] OpenAI instance initialized successfully');
    } catch (error) {
      console.warn('[QueryOptimizationAPI] Failed to initialize OpenAI instance:', error);
      openaiInstance = null;
    }
  }
  return openaiInstance;
}

export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession();
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { messages, currentQuery, modelId }: OptimizeQueryRequest = await req.json();

    // Validate request
    if (!messages || !currentQuery || !modelId) {
      return NextResponse.json(
        { error: 'Missing required fields: messages, currentQuery, modelId' },
        { status: 400 }
      );
    }

    // Get Azure OpenAI client
    const openai = getOpenAIInstance();
    if (!openai) {
      return NextResponse.json(
        { error: 'OpenAI client unavailable' },
        { status: 503 }
      );
    }
    
    // Generate optimized query using the same function as enhancedChatService
    const optimizedResult = await generateOptimizedWebSearchQuery(
      openai,
      messages,
      currentQuery,
      session.user,
      modelId
    );

    return NextResponse.json({
      success: true,
      optimizedQuery: optimizedResult.optimizedQuery,
      originalQuery: currentQuery
    });

  } catch (error) {
    console.error('Query optimization failed:', error);
    return NextResponse.json(
      { 
        error: 'Query optimization failed',
        details: error instanceof Error ? error.message : String(error)
      },
      { status: 500 }
    );
  }
}