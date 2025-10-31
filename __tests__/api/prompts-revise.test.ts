import { NextRequest } from 'next/server';

import { parseJsonResponse } from './helpers';

import { POST } from '@/app/api/prompts/revise/route';
import { auth } from '@/auth';
import { beforeEach, describe, expect, it, vi } from 'vitest';

// Mock dependencies
vi.mock('@/auth', () => ({
  auth: vi.fn(),
}));

vi.mock('@azure/identity', () => ({
  DefaultAzureCredential: vi.fn(),
  getBearerTokenProvider: vi.fn(),
}));

// Create mock functions at module level
const mockCreate = vi.fn();

vi.mock('openai', () => {
  return {
    AzureOpenAI: vi.fn(function () {
      return {
        chat: {
          completions: {
            create: mockCreate,
          },
        },
      };
    }),
  };
});

describe('/api/prompts/revise', () => {
  const mockSession = {
    user: {
      id: 'test-user-id',
      email: 'test@example.com',
      name: 'Test User',
    },
    expires: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
  };

  const mockAIResponse = {
    revisedPrompt: 'Improved prompt content',
    improvements: [
      {
        category: 'Clarity',
        description: 'Made instructions more specific',
      },
    ],
    suggestions: ['Use this prompt with context'],
  };

  beforeEach(() => {
    vi.clearAllMocks();

    // Setup default mocks
    vi.mocked(auth).mockResolvedValue(mockSession as any);

    // Setup Azure OpenAI mock response
    mockCreate.mockResolvedValue({
      choices: [
        {
          message: {
            content: JSON.stringify(mockAIResponse),
          },
        },
      ],
    });
  });

  const createRequest = (body: any): NextRequest => {
    return new NextRequest('http://localhost:3000/api/prompts/revise', {
      method: 'POST',
      body: JSON.stringify(body),
      headers: {
        'Content-Type': 'application/json',
      },
    });
  };

  describe('Authentication', () => {
    it('returns 401 when not authenticated', async () => {
      vi.mocked(auth).mockResolvedValue(null);

      const request = createRequest({
        promptName: 'Test Prompt',
        promptContent: 'Original content',
      });

      const response = await POST(request);
      const data = await parseJsonResponse(response);

      expect(response.status).toBe(401);
      expect(data.error).toBe('Unauthorized');
    });

    it('returns 401 when user is missing from session', async () => {
      vi.mocked(auth).mockResolvedValue({ expires: '' } as any);

      const request = createRequest({
        promptName: 'Test Prompt',
        promptContent: 'Original content',
      });

      const response = await POST(request);

      expect(response.status).toBe(401);
    });
  });

  describe('Request Validation - Revision Mode', () => {
    it('requires promptContent for revision', async () => {
      const request = createRequest({
        promptName: 'Test Prompt',
        generateNew: false,
      });

      const response = await POST(request);
      const data = await parseJsonResponse(response);

      expect(response.status).toBe(400);
      expect(data.error).toBe('Prompt content is required');
    });

    it('requires non-empty promptContent', async () => {
      const request = createRequest({
        promptName: 'Test Prompt',
        promptContent: '   ',
        generateNew: false,
      });

      const response = await POST(request);
      const data = await parseJsonResponse(response);

      expect(response.status).toBe(400);
      expect(data.error).toBe('Prompt content is required');
    });

    it('accepts valid revision request', async () => {
      const request = createRequest({
        promptName: 'Test Prompt',
        promptContent: 'Original content',
      });

      const response = await POST(request);

      expect(response.status).toBe(200);
    });
  });

  describe('Request Validation - Generation Mode', () => {
    it('requires description or goal for generation', async () => {
      const request = createRequest({
        promptName: 'Test Prompt',
        generateNew: true,
      });

      const response = await POST(request);
      const data = await parseJsonResponse(response);

      expect(response.status).toBe(400);
      expect(data.error).toBe(
        'Description or goal is required for prompt generation',
      );
    });

    it('accepts generation request with description', async () => {
      const request = createRequest({
        promptName: 'Test Prompt',
        promptDescription: 'A helpful prompt',
        generateNew: true,
      });

      const response = await POST(request);

      expect(response.status).toBe(200);
    });

    it('accepts generation request with revision goal', async () => {
      const request = createRequest({
        promptName: 'Test Prompt',
        revisionGoal: 'Make it more concise',
        generateNew: true,
      });

      const response = await POST(request);

      expect(response.status).toBe(200);
    });
  });

  describe('AI Integration - Revision Mode', () => {
    it('calls Azure OpenAI with correct parameters for revision', async () => {
      const request = createRequest({
        promptName: 'Email Template',
        promptDescription: 'Professional email',
        promptContent: 'Write an email',
        revisionGoal: 'Make it more formal',
      });

      await POST(request);

      expect(mockCreate).toHaveBeenCalled();
      const callArgs = mockCreate.mock.calls[0][0];

      expect(callArgs.model).toBeDefined();
      expect(callArgs.messages).toHaveLength(2);
      expect(callArgs.messages[0].role).toBe('system');
      expect(callArgs.messages[1].role).toBe('user');

      // Check user message contains all the info
      const userMessage = callArgs.messages[1].content;
      expect(userMessage).toContain('Email Template');
      expect(userMessage).toContain('Professional email');
      expect(userMessage).toContain('Write an email');
      expect(userMessage).toContain('Make it more formal');
    });

    it('uses revision system prompt for revision mode', async () => {
      const request = createRequest({
        promptName: 'Test',
        promptContent: 'Content',
      });

      await POST(request);

      const systemMessage = mockCreate.mock.calls[0][0].messages[0].content;
      expect(systemMessage).toContain('improve their prompts');
      expect(systemMessage).toContain('revisedPrompt');
    });

    it('includes additional context when provided', async () => {
      const request = createRequest({
        promptName: 'Test',
        promptContent: 'Content',
        additionalContext: 'File context here',
      });

      await POST(request);

      const userMessage = mockCreate.mock.calls[0][0].messages[1].content;
      expect(userMessage).toContain('File context here');
    });
  });

  describe('AI Integration - Generation Mode', () => {
    it('calls Azure OpenAI with correct parameters for generation', async () => {
      const request = createRequest({
        promptName: 'New Prompt',
        promptDescription: 'A fresh prompt',
        revisionGoal: 'Create from scratch',
        generateNew: true,
      });

      await POST(request);

      const callArgs = mockCreate.mock.calls[0][0];
      const userMessage = callArgs.messages[1].content;

      expect(userMessage).toContain('New Prompt');
      expect(userMessage).toContain('A fresh prompt');
      expect(userMessage).toContain('Create from scratch');
    });

    it('uses generation system prompt for generation mode', async () => {
      const request = createRequest({
        promptName: 'Test',
        promptDescription: 'Test description',
        generateNew: true,
      });

      await POST(request);

      const systemMessage = mockCreate.mock.calls[0][0].messages[0].content;
      expect(systemMessage).toContain('crafting effective AI prompts');
      expect(systemMessage).toContain('create prompts from scratch');
    });
  });

  describe('Response Handling', () => {
    it('returns AI response with all fields', async () => {
      const request = createRequest({
        promptName: 'Test',
        promptContent: 'Content',
      });

      const response = await POST(request);
      const data = await parseJsonResponse(response);

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.revisedPrompt).toBe('Improved prompt content');
      expect(data.improvements).toHaveLength(1);
      expect(data.improvements[0].category).toBe('Clarity');
      expect(data.suggestions).toHaveLength(1);
    });

    it('handles empty AI response', async () => {
      mockCreate.mockResolvedValue({
        choices: [
          {
            message: {
              content: null,
            },
          },
        ],
      });

      const request = createRequest({
        promptName: 'Test',
        promptContent: 'Content',
      });

      const response = await POST(request);
      const data = await parseJsonResponse(response);

      expect(response.status).toBe(500);
      expect(data.error).toBe('No response from AI');
    });

    it('handles invalid JSON response', async () => {
      mockCreate.mockResolvedValue({
        choices: [
          {
            message: {
              content: 'not valid json',
            },
          },
        ],
      });

      const request = createRequest({
        promptName: 'Test',
        promptContent: 'Content',
      });

      const response = await POST(request);

      expect(response.status).toBe(500);
    });

    it('handles missing revisedPrompt in response', async () => {
      mockCreate.mockResolvedValue({
        choices: [
          {
            message: {
              content: JSON.stringify({
                improvements: [],
                suggestions: [],
              }),
            },
          },
        ],
      });

      const request = createRequest({
        promptName: 'Test',
        promptContent: 'Content',
      });

      const response = await POST(request);
      const data = await parseJsonResponse(response);

      expect(response.status).toBe(500);
      expect(data.error).toBe('Invalid response format from AI');
    });
  });

  describe('Error Handling', () => {
    it('handles Azure OpenAI API errors', async () => {
      mockCreate.mockRejectedValue(new Error('API rate limit exceeded'));

      const request = createRequest({
        promptName: 'Test',
        promptContent: 'Content',
      });

      const response = await POST(request);
      const data = await parseJsonResponse(response);

      expect(response.status).toBe(500);
      // handleApiError may return either the error message or a generic message
      expect(data.error).toBeDefined();
    });

    it('logs errors to console', async () => {
      const consoleErrorSpy = vi
        .spyOn(console, 'error')
        .mockImplementation(() => {});
      mockCreate.mockRejectedValue(new Error('Test error'));

      const request = createRequest({
        promptName: 'Test',
        promptContent: 'Content',
      });

      await POST(request);

      expect(consoleErrorSpy).toHaveBeenCalledWith(
        '[Prompt Revision API] Error:',
        expect.any(Error),
      );

      consoleErrorSpy.mockRestore();
    });
  });

  describe('Structured Output Schema', () => {
    it('uses JSON schema for structured output', async () => {
      const request = createRequest({
        promptName: 'Test',
        promptContent: 'Content',
      });

      await POST(request);

      const callArgs = mockCreate.mock.calls[0][0];
      expect(callArgs.response_format).toBeDefined();
      expect(callArgs.response_format.type).toBe('json_schema');
      expect(callArgs.response_format.json_schema.name).toBe('prompt_revision');
      expect(callArgs.response_format.json_schema.strict).toBe(true);
    });

    it('defines schema with required fields', async () => {
      const request = createRequest({
        promptName: 'Test',
        promptContent: 'Content',
      });

      await POST(request);

      const schema =
        mockCreate.mock.calls[0][0].response_format.json_schema.schema;
      expect(schema.required).toContain('revisedPrompt');
      expect(schema.required).toContain('improvements');
      expect(schema.required).toContain('suggestions');
    });
  });

  describe('Optional Fields', () => {
    it('handles minimal revision request', async () => {
      const request = createRequest({
        promptName: 'Test',
        promptContent: 'Content',
      });

      const response = await POST(request);

      expect(response.status).toBe(200);
    });

    it('handles all optional fields in revision', async () => {
      const request = createRequest({
        promptName: 'Test',
        promptDescription: 'Description',
        promptContent: 'Content',
        revisionGoal: 'Goal',
        additionalContext: 'Context',
      });

      const response = await POST(request);

      expect(response.status).toBe(200);
    });

    it('handles minimal generation request', async () => {
      const request = createRequest({
        promptName: 'Test',
        promptDescription: 'Description',
        generateNew: true,
      });

      const response = await POST(request);

      expect(response.status).toBe(200);
    });
  });
});
