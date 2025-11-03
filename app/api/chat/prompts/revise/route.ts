import { NextRequest, NextResponse } from 'next/server';

import {
  API_TIMEOUTS,
  DEFAULT_ANALYSIS_MAX_TOKENS,
  DEFAULT_ANALYSIS_MODEL,
} from '@/lib/utils/app/const';
import {
  badRequestResponse,
  handleApiError,
  unauthorizedResponse,
} from '@/lib/utils/server/apiResponse';

import { auth } from '@/auth';
import {
  DefaultAzureCredential,
  getBearerTokenProvider,
} from '@azure/identity';
import { AzureOpenAI } from 'openai';

export const maxDuration = 60;

const PROMPT_GENERATION_SYSTEM_PROMPT = `You are an expert at crafting effective AI prompts. Your role is to help users create prompts from scratch based on their requirements.

When given a description or goal, create a comprehensive prompt that:
1. **Clarity**: Has clear and specific instructions
2. **Structure**: Is organized logically
3. **Context**: Includes relevant context for the AI
4. **Variables**: Uses {{variableName}} syntax for dynamic content where appropriate
5. **Examples**: Includes examples when helpful
6. **Constraints**: Specifies important constraints or requirements

Return your response as JSON with this structure:
{
  "revisedPrompt": "The generated prompt",
  "improvements": [
    {
      "category": "Clarity|Structure|Context|Variables|Examples|Constraints",
      "description": "What was included and why"
    }
  ],
  "suggestions": [
    "Tips for using this prompt effectively"
  ]
}

Focus on making prompts:
- Clear and specific
- Action-oriented
- Well-structured
- Appropriate for the intended use case
- Easy to maintain and reuse`;

const PROMPT_REVISION_SYSTEM_PROMPT = `You are an expert at crafting effective AI prompts. Your role is to help users improve their prompts for better results.

When given a prompt, analyze it and provide improvements in these areas:
1. **Clarity**: Make instructions clearer and more specific
2. **Structure**: Organize the prompt logically
3. **Context**: Add relevant context that helps the AI understand the task
4. **Variables**: Suggest useful variables using {{variableName}} syntax
5. **Examples**: When appropriate, suggest adding examples
6. **Constraints**: Add important constraints or requirements

Return your response as JSON with this structure:
{
  "revisedPrompt": "The improved version of the prompt",
  "improvements": [
    {
      "category": "Clarity|Structure|Context|Variables|Examples|Constraints",
      "description": "What was improved and why"
    }
  ],
  "suggestions": [
    "Additional tips for using this prompt effectively"
  ]
}

Focus on making prompts:
- Clear and specific
- Action-oriented
- Well-structured
- Appropriate for the intended use case
- Easy to maintain and reuse`;

interface RevisionRequest {
  promptName: string;
  promptDescription?: string;
  promptContent: string;
  revisionGoal?: string;
  generateNew?: boolean;
  additionalContext?: string;
}

interface RevisionResponse {
  revisedPrompt: string;
  improvements: Array<{
    category: string;
    description: string;
  }>;
  suggestions: string[];
}

export async function POST(req: NextRequest) {
  try {
    // Check authentication
    const session = await auth();
    if (!session?.user) {
      return unauthorizedResponse();
    }

    // Parse request body
    const body: RevisionRequest = await req.json();
    const {
      promptName,
      promptDescription,
      promptContent,
      revisionGoal,
      generateNew,
      additionalContext,
    } = body;

    // For generation, we need either a revision goal or description
    if (generateNew) {
      if (!revisionGoal && !promptDescription) {
        return badRequestResponse(
          'Description or goal is required for prompt generation',
        );
      }
    } else {
      // For revision, we need prompt content
      if (!promptContent || promptContent.trim().length === 0) {
        return badRequestResponse('Prompt content is required');
      }
    }

    // Initialize Azure OpenAI client
    const azureADTokenProvider = getBearerTokenProvider(
      new DefaultAzureCredential(),
      'https://cognitiveservices.azure.com/.default',
    );

    const client = new AzureOpenAI({
      azureADTokenProvider,
      apiVersion: '2024-08-01-preview',
    });

    // Build user message based on mode
    let userMessage = '';
    let systemPrompt = PROMPT_REVISION_SYSTEM_PROMPT;

    if (generateNew) {
      // Generation mode
      systemPrompt = PROMPT_GENERATION_SYSTEM_PROMPT;
      userMessage = `I need a new prompt created:\n\n`;
      userMessage += `**Name:** ${promptName}\n`;
      if (promptDescription) {
        userMessage += `**Description:** ${promptDescription}\n`;
      }
      userMessage += `\n**Requirements:** ${revisionGoal || promptDescription}\n`;
      if (additionalContext) {
        userMessage += `\n**Additional Context from Files:**\n${additionalContext}\n`;
      }
    } else {
      // Revision mode
      userMessage = `I need help improving this prompt:\n\n`;
      userMessage += `**Name:** ${promptName}\n`;
      if (promptDescription) {
        userMessage += `**Description:** ${promptDescription}\n`;
      }
      userMessage += `\n**Current Prompt:**\n${promptContent}\n`;
      if (revisionGoal) {
        userMessage += `\n**Specific Goal:** ${revisionGoal}`;
      }
      if (additionalContext) {
        userMessage += `\n\n**Additional Context from Files:**\n${additionalContext}`;
      }
    }

    // Call Azure OpenAI with structured output
    // Note: GPT-5 is a reasoning model and doesn't support custom temperature
    const response = await client.chat.completions.create({
      model: DEFAULT_ANALYSIS_MODEL,
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userMessage },
      ],
      max_tokens: DEFAULT_ANALYSIS_MAX_TOKENS,
      response_format: {
        type: 'json_schema',
        json_schema: {
          name: 'prompt_revision',
          strict: true,
          schema: {
            type: 'object',
            properties: {
              revisedPrompt: {
                type: 'string',
                description: 'The improved or generated prompt',
              },
              improvements: {
                type: 'array',
                items: {
                  type: 'object',
                  properties: {
                    category: {
                      type: 'string',
                      description:
                        'Category like Clarity, Structure, Context, Variables, Examples, or Constraints',
                    },
                    description: {
                      type: 'string',
                      description: 'What was improved and why',
                    },
                  },
                  required: ['category', 'description'],
                  additionalProperties: false,
                },
              },
              suggestions: {
                type: 'array',
                items: { type: 'string' },
                description:
                  'Additional tips for using this prompt effectively',
              },
            },
            required: ['revisedPrompt', 'improvements', 'suggestions'],
            additionalProperties: false,
          },
        },
      },
    });

    const content = response.choices[0]?.message?.content;
    if (!content) {
      throw new Error('No response from AI');
    }

    // Parse and validate response
    const revision: RevisionResponse = JSON.parse(content);

    if (!revision.revisedPrompt) {
      throw new Error('Invalid response format from AI');
    }

    return NextResponse.json({
      success: true,
      ...revision,
    });
  } catch (error) {
    console.error('[Prompt Revision API] Error:', error);
    return handleApiError(error, 'Failed to revise prompt');
  }
}
