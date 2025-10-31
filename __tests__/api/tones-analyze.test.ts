import { NextRequest } from 'next/server';

import { createBlobStorageClient } from '@/lib/services/blobStorageFactory';

import { getUserIdFromSession } from '@/lib/utils/app/user/session';

import { parseJsonResponse } from './helpers';

import { POST } from '@/app/api/tones/analyze/route';
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

vi.mock('@/lib/services/blobStorageFactory', () => ({
  createBlobStorageClient: vi.fn(),
}));

vi.mock('@/lib/utils/app/user/session', () => ({
  getUserIdFromSession: vi.fn(),
}));

// Create mock at module level
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

describe('/api/tones/analyze', () => {
  const mockSession = {
    user: {
      id: 'test-user-id',
      email: 'test@example.com',
      name: 'Test User',
    },
    expires: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
  };

  const mockAnalysisResponse = {
    voiceRules: 'Voice guidelines here',
    examples: 'Example 1\nExample 2',
    suggestedTags: ['professional', 'concise'],
    characteristics: [
      {
        category: 'Formality',
        description: 'Uses formal tone',
      },
    ],
  };

  beforeEach(() => {
    vi.clearAllMocks();

    vi.mocked(auth).mockResolvedValue(mockSession as any);
    vi.mocked(getUserIdFromSession).mockReturnValue('test-user-id');
    vi.mocked(createBlobStorageClient).mockReturnValue({} as any);

    mockCreate.mockResolvedValue({
      choices: [
        {
          message: {
            content: JSON.stringify(mockAnalysisResponse),
          },
        },
      ],
    });
  });

  const createRequest = (body: any): NextRequest => {
    return new NextRequest('http://localhost:3000/api/tones/analyze', {
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
        toneName: 'Test Tone',
        sampleContent: 'Sample text',
      });

      const response = await POST(request);

      expect(response.status).toBe(401);
    });
  });

  describe('Request Validation', () => {
    it('requires sample content', async () => {
      const request = createRequest({
        toneName: 'Test Tone',
        sampleContent: '',
      });

      const response = await POST(request);
      const data = await parseJsonResponse(response);

      expect(response.status).toBe(400);
      expect(data.error).toContain('Sample content is required');
    });

    it('accepts valid request with sample content', async () => {
      const request = createRequest({
        toneName: 'Professional',
        sampleContent: 'This is a professional tone sample.',
      });

      const response = await POST(request);

      expect(response.status).toBe(200);
    });

    it('handles optional fields', async () => {
      const request = createRequest({
        toneName: 'Professional',
        toneDescription: 'Formal business tone',
        sampleContent: 'Sample text',
        analysisGoal: 'Extract voice patterns',
      });

      const response = await POST(request);

      expect(response.status).toBe(200);
    });
  });

  describe('AI Integration', () => {
    it('calls Azure OpenAI with correct parameters', async () => {
      const request = createRequest({
        toneName: 'Professional',
        toneDescription: 'Business tone',
        sampleContent: 'Sample business content',
        analysisGoal: 'Extract patterns',
      });

      await POST(request);

      expect(mockCreate).toHaveBeenCalled();
      const callArgs = mockCreate.mock.calls[0][0];

      expect(callArgs.messages).toHaveLength(2);
      expect(callArgs.messages[0].role).toBe('system');
      expect(callArgs.messages[1].role).toBe('user');

      const userMessage = callArgs.messages[1].content;
      expect(userMessage).toContain('Professional');
      expect(userMessage).toContain('Business tone');
      expect(userMessage).toContain('Sample business content');
      expect(userMessage).toContain('Extract patterns');
    });

    it('uses structured output schema', async () => {
      const request = createRequest({
        toneName: 'Test',
        sampleContent: 'Content',
      });

      await POST(request);

      const callArgs = mockCreate.mock.calls[0][0];
      expect(callArgs.response_format).toBeDefined();
      expect(callArgs.response_format.type).toBe('json_schema');
      expect(callArgs.response_format.json_schema.name).toBe('tone_analysis');
    });
  });

  describe('Response Handling', () => {
    it('returns analysis with all fields', async () => {
      const request = createRequest({
        toneName: 'Test',
        sampleContent: 'Content',
      });

      const response = await POST(request);
      const data = await parseJsonResponse(response);

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.voiceRules).toBe('Voice guidelines here');
      expect(data.examples).toBe('Example 1\nExample 2');
      expect(data.suggestedTags).toEqual(['professional', 'concise']);
      expect(data.characteristics).toHaveLength(1);
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
        toneName: 'Test',
        sampleContent: 'Content',
      });

      const response = await POST(request);

      expect(response.status).toBe(500);
    });

    it('handles missing voiceRules in response', async () => {
      mockCreate.mockResolvedValue({
        choices: [
          {
            message: {
              content: JSON.stringify({
                examples: '',
                suggestedTags: [],
                characteristics: [],
              }),
            },
          },
        ],
      });

      const request = createRequest({
        toneName: 'Test',
        sampleContent: 'Content',
      });

      const response = await POST(request);

      expect(response.status).toBe(500);
    });
  });

  describe('Error Handling', () => {
    it('handles AI API errors', async () => {
      mockCreate.mockRejectedValue(new Error('API error'));

      const request = createRequest({
        toneName: 'Test',
        sampleContent: 'Content',
      });

      const response = await POST(request);

      expect(response.status).toBe(500);
    });

    it('logs errors', async () => {
      const consoleErrorSpy = vi
        .spyOn(console, 'error')
        .mockImplementation(() => {});
      mockCreate.mockRejectedValue(new Error('Test error'));

      const request = createRequest({
        toneName: 'Test',
        sampleContent: 'Content',
      });

      await POST(request);

      expect(consoleErrorSpy).toHaveBeenCalledWith(
        '[Tone Analysis API] Error:',
        expect.any(Error),
      );

      consoleErrorSpy.mockRestore();
    });
  });
});
