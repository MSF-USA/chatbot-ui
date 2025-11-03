import { NextRequest } from 'next/server';

import { StandardChatService } from '@/lib/services/chat';
import {
  ChatLogger,
  ModelSelector,
  StreamingService,
  ToneService,
} from '@/lib/services/shared';

import { DEFAULT_SYSTEM_PROMPT } from '@/lib/utils/app/const';

import { MessageType } from '@/types/chat';
import { OpenAIModelID, OpenAIModels } from '@/types/openai';

import {
  createMockRequest,
  createMockSession,
  parseJsonResponse,
} from './helpers';

import { POST } from '@/app/api/chat/standard/route';
import { auth } from '@/auth';
import {
  DefaultAzureCredential,
  getBearerTokenProvider,
} from '@azure/identity';
import { AzureOpenAI } from 'openai';
import OpenAI from 'openai';
import { beforeEach, describe, expect, it, vi } from 'vitest';

// Hoist mocks before imports
const mockAuth = vi.hoisted(() => vi.fn());
const mockDefaultAzureCredential = vi.hoisted(() => vi.fn());
const mockGetBearerTokenProvider = vi.hoisted(() => vi.fn());
const mockAzureOpenAI = vi.hoisted(() => vi.fn());
const mockOpenAI = vi.hoisted(() => vi.fn());
const mockStandardChatService = vi.hoisted(() => vi.fn());
const mockChatLogger = vi.hoisted(() => vi.fn());
const mockModelSelector = vi.hoisted(() => vi.fn());
const mockStreamingService = vi.hoisted(() => vi.fn());
const mockToneService = vi.hoisted(() => vi.fn());

// Mock dependencies
vi.mock('@/auth', () => ({
  auth: mockAuth,
}));

vi.mock('@azure/identity', () => ({
  DefaultAzureCredential: mockDefaultAzureCredential,
  getBearerTokenProvider: mockGetBearerTokenProvider,
}));

vi.mock('openai', () => ({
  AzureOpenAI: mockAzureOpenAI,
  default: mockOpenAI,
}));

vi.mock('@/lib/services/chat', () => ({
  StandardChatService: mockStandardChatService,
}));

vi.mock('@/lib/services/shared', () => ({
  ChatLogger: mockChatLogger,
  ModelSelector: mockModelSelector,
  StreamingService: mockStreamingService,
  ToneService: mockToneService,
}));

/**
 * Tests for POST /api/chat/standard
 * Main chat endpoint for standard (non-RAG, non-agent, non-audio) completions
 */
describe('/api/chat/standard', () => {
  const mockSession = createMockSession();

  const mockHandleChat = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();

    // Setup auth mock
    mockAuth.mockResolvedValue(mockSession as any);

    // Setup Azure Identity mocks as proper constructors
    mockDefaultAzureCredential.mockImplementation(function (this: any) {
      return {};
    });
    mockGetBearerTokenProvider.mockReturnValue(vi.fn());

    // Setup OpenAI client mocks as proper constructors
    mockAzureOpenAI.mockImplementation(function (this: any) {
      return {};
    });
    mockOpenAI.mockImplementation(function (this: any) {
      return {};
    });

    // Setup service mocks as proper constructors
    mockChatLogger.mockImplementation(function (this: any) {
      return {};
    });
    mockModelSelector.mockImplementation(function (this: any) {
      return {};
    });
    mockStreamingService.mockImplementation(function (this: any) {
      return {};
    });
    mockToneService.mockImplementation(function (this: any) {
      return {};
    });

    // Mock StandardChatService with handleChat method
    mockStandardChatService.mockImplementation(function (this: any) {
      return {
        handleChat: mockHandleChat,
      };
    });

    // Default successful response
    mockHandleChat.mockResolvedValue(
      new Response('Test response', {
        status: 200,
        headers: { 'Content-Type': 'text/plain' },
      }),
    );
  });

  const createChatRequest = (options: {
    body?: any;
    url?: string;
  }): NextRequest => {
    const {
      body = {
        model: OpenAIModels[OpenAIModelID.GPT_5],
        messages: [
          {
            role: 'user',
            content: 'Hello',
            messageType: MessageType.TEXT,
          },
        ],
      },
      url = 'http://localhost:3000/api/chat/standard',
    } = options;

    return createMockRequest({
      method: 'POST',
      url,
      body,
    });
  };

  describe('Authentication', () => {
    it('returns 500 when session is not found', async () => {
      (vi.mocked(auth) as any).mockResolvedValue(null);

      const request = createChatRequest({});
      const response = await POST(request);
      const data = await parseJsonResponse(response);

      expect(response.status).toBe(500);
      expect(data.error).toBe('Internal Server Error');
      expect(data.message).toContain('Could not pull session');
    });

    it('allows authenticated requests', async () => {
      const request = createChatRequest({});
      const response = await POST(request);

      expect(response.status).toBe(200);
      expect(mockHandleChat).toHaveBeenCalled();
    });

    it('uses session user in chat service', async () => {
      const request = createChatRequest({});
      await POST(request);

      expect(mockHandleChat).toHaveBeenCalledWith(
        expect.objectContaining({
          user: mockSession.user,
        }),
      );
    });
  });

  describe('Request Parsing', () => {
    it('parses model and messages from request body', async () => {
      const model = OpenAIModels[OpenAIModelID.GPT_5];
      const messages = [
        {
          role: 'user' as const,
          content: 'Test message',
          messageType: MessageType.TEXT,
        },
      ];

      const request = createChatRequest({
        body: { model, messages },
      });

      await POST(request);

      expect(mockHandleChat).toHaveBeenCalledWith(
        expect.objectContaining({
          model,
          messages,
        }),
      );
    });

    it('uses custom prompt when provided', async () => {
      const customPrompt = 'You are a helpful assistant.';

      const request = createChatRequest({
        body: {
          model: OpenAIModels[OpenAIModelID.GPT_5],
          messages: [
            {
              role: 'user',
              content: 'Hello',
              messageType: MessageType.TEXT,
            },
          ],
          prompt: customPrompt,
        },
      });

      await POST(request);

      expect(mockHandleChat).toHaveBeenCalledWith(
        expect.objectContaining({
          systemPrompt: customPrompt,
        }),
      );
    });

    it('uses DEFAULT_SYSTEM_PROMPT when no prompt provided', async () => {
      const request = createChatRequest({
        body: {
          model: OpenAIModels[OpenAIModelID.GPT_5],
          messages: [
            {
              role: 'user',
              content: 'Hello',
              messageType: MessageType.TEXT,
            },
          ],
        },
      });

      await POST(request);

      expect(mockHandleChat).toHaveBeenCalledWith(
        expect.objectContaining({
          systemPrompt: DEFAULT_SYSTEM_PROMPT,
        }),
      );
    });

    it('parses temperature from request', async () => {
      const request = createChatRequest({
        body: {
          model: OpenAIModels[OpenAIModelID.GPT_5],
          messages: [
            {
              role: 'user',
              content: 'Hello',
              messageType: MessageType.TEXT,
            },
          ],
          temperature: 0.8,
        },
      });

      await POST(request);

      expect(mockHandleChat).toHaveBeenCalledWith(
        expect.objectContaining({
          temperature: 0.8,
        }),
      );
    });

    it('defaults stream to true when not provided', async () => {
      const request = createChatRequest({
        body: {
          model: OpenAIModels[OpenAIModelID.GPT_5],
          messages: [
            {
              role: 'user',
              content: 'Hello',
              messageType: MessageType.TEXT,
            },
          ],
        },
      });

      await POST(request);

      expect(mockHandleChat).toHaveBeenCalledWith(
        expect.objectContaining({
          stream: true,
        }),
      );
    });

    it('respects stream: false when provided', async () => {
      const request = createChatRequest({
        body: {
          model: OpenAIModels[OpenAIModelID.GPT_5],
          messages: [
            {
              role: 'user',
              content: 'Hello',
              messageType: MessageType.TEXT,
            },
          ],
          stream: false,
        },
      });

      await POST(request);

      expect(mockHandleChat).toHaveBeenCalledWith(
        expect.objectContaining({
          stream: false,
        }),
      );
    });

    it('parses reasoningEffort for reasoning models', async () => {
      const request = createChatRequest({
        body: {
          model: OpenAIModels[OpenAIModelID.GPT_5],
          messages: [
            {
              role: 'user',
              content: 'Hello',
              messageType: MessageType.TEXT,
            },
          ],
          reasoningEffort: 'high',
        },
      });

      await POST(request);

      expect(mockHandleChat).toHaveBeenCalledWith(
        expect.objectContaining({
          reasoningEffort: 'high',
        }),
      );
    });

    it('parses verbosity parameter', async () => {
      const request = createChatRequest({
        body: {
          model: OpenAIModels[OpenAIModelID.GPT_5],
          messages: [
            {
              role: 'user',
              content: 'Hello',
              messageType: MessageType.TEXT,
            },
          ],
          verbosity: 'low',
        },
      });

      await POST(request);

      expect(mockHandleChat).toHaveBeenCalledWith(
        expect.objectContaining({
          verbosity: 'low',
        }),
      );
    });

    it('parses botId for logging purposes', async () => {
      const request = createChatRequest({
        body: {
          model: OpenAIModels[OpenAIModelID.GPT_5],
          messages: [
            {
              role: 'user',
              content: 'Hello',
              messageType: MessageType.TEXT,
            },
          ],
          botId: 'test-bot-123',
        },
      });

      await POST(request);

      expect(mockHandleChat).toHaveBeenCalledWith(
        expect.objectContaining({
          botId: 'test-bot-123',
        }),
      );
    });
  });

  describe('Dependency Injection', () => {
    it('creates AzureOpenAI client with token provider', async () => {
      const request = createChatRequest({});
      await POST(request);

      expect(DefaultAzureCredential).toHaveBeenCalled();
      expect(getBearerTokenProvider).toHaveBeenCalledWith(
        expect.any(Object),
        'https://cognitiveservices.azure.com/.default',
      );
      expect(AzureOpenAI).toHaveBeenCalledWith(
        expect.objectContaining({
          azureADTokenProvider: expect.any(Function),
        }),
      );
    });

    it('creates OpenAI client', async () => {
      const request = createChatRequest({});
      await POST(request);

      expect(OpenAI).toHaveBeenCalled();
    });

    it('creates ChatLogger', async () => {
      const request = createChatRequest({});
      await POST(request);

      expect(ChatLogger).toHaveBeenCalled();
    });

    it('instantiates all required services', async () => {
      const request = createChatRequest({});
      await POST(request);

      expect(ModelSelector).toHaveBeenCalled();
      expect(ToneService).toHaveBeenCalled();
      expect(StreamingService).toHaveBeenCalled();
    });

    it('passes all dependencies to StandardChatService', async () => {
      const request = createChatRequest({});
      await POST(request);

      expect(StandardChatService).toHaveBeenCalledWith(
        expect.any(Object), // azureOpenAIClient
        expect.any(Object), // openAIClient
        expect.any(Object), // logger
        expect.any(Object), // modelSelector
        expect.any(Object), // toneService
        expect.any(Object), // streamingService
      );
    });
  });

  describe('Response Handling', () => {
    it('returns streaming response from service', async () => {
      const mockStream = new ReadableStream({
        start(controller) {
          controller.enqueue(new TextEncoder().encode('Streaming content'));
          controller.close();
        },
      });

      mockHandleChat.mockResolvedValue(
        new Response(mockStream, {
          status: 200,
          headers: { 'Content-Type': 'text/plain' },
        }),
      );

      const request = createChatRequest({});
      const response = await POST(request);

      expect(response.status).toBe(200);
      expect(response.headers.get('Content-Type')).toBe('text/plain');
    });

    it('returns non-streaming JSON response from service', async () => {
      mockHandleChat.mockResolvedValue(
        new Response(JSON.stringify({ text: 'Non-streaming response' }), {
          status: 200,
          headers: { 'Content-Type': 'application/json' },
        }),
      );

      const request = createChatRequest({
        body: {
          model: OpenAIModels[OpenAIModelID.GPT_5],
          messages: [
            {
              role: 'user',
              content: 'Hello',
              messageType: MessageType.TEXT,
            },
          ],
          stream: false,
        },
      });

      const response = await POST(request);
      const data = await parseJsonResponse(response);

      expect(response.status).toBe(200);
      expect(data.text).toBe('Non-streaming response');
    });

    it('passes through response from service', async () => {
      const customResponse = new Response('Custom content', {
        status: 200,
        headers: {
          'Content-Type': 'text/plain',
          'X-Custom-Header': 'test-value',
        },
      });

      mockHandleChat.mockResolvedValue(customResponse);

      const request = createChatRequest({});
      const response = await POST(request);

      expect(response.status).toBe(200);
      expect(response.headers.get('X-Custom-Header')).toBe('test-value');
    });
  });

  describe('Error Handling', () => {
    it('returns 500 on service error', async () => {
      mockHandleChat.mockRejectedValue(new Error('Service error'));

      const request = createChatRequest({});
      const response = await POST(request);
      const data = await parseJsonResponse(response);

      expect(response.status).toBe(500);
      expect(data.error).toBe('Internal Server Error');
      expect(data.message).toBe('Service error');
    });

    it('handles authentication errors', async () => {
      (vi.mocked(auth) as any).mockRejectedValue(new Error('Auth failed'));

      const request = createChatRequest({});
      const response = await POST(request);
      const data = await parseJsonResponse(response);

      expect(response.status).toBe(500);
      expect(data.error).toBe('Internal Server Error');
    });

    it('handles request parsing errors', async () => {
      const request = createMockRequest({
        method: 'POST',
        url: 'http://localhost:3000/api/chat/standard',
        body: 'invalid json',
        headers: { 'Content-Type': 'text/plain' },
      });

      const response = await POST(request);
      const data = await parseJsonResponse(response);

      expect(response.status).toBe(500);
      expect(data.error).toBe('Internal Server Error');
    });

    it('handles unknown errors gracefully', async () => {
      mockHandleChat.mockRejectedValue('String error');

      const request = createChatRequest({});
      const response = await POST(request);
      const data = await parseJsonResponse(response);

      expect(response.status).toBe(500);
      expect(data.error).toBe('Internal Server Error');
      expect(data.message).toBe('Unknown error');
    });

    it('logs errors to console', async () => {
      const consoleErrorSpy = vi
        .spyOn(console, 'error')
        .mockImplementation(() => {});
      mockHandleChat.mockRejectedValue(new Error('Test error'));

      const request = createChatRequest({});
      await POST(request);

      expect(consoleErrorSpy).toHaveBeenCalledWith(
        '[POST /api/chat/standard] Error:',
        expect.any(Error),
      );

      consoleErrorSpy.mockRestore();
    });
  });

  describe('Model Variations', () => {
    it('handles GPT-5 model', async () => {
      const request = createChatRequest({
        body: {
          model: OpenAIModels[OpenAIModelID.GPT_5],
          messages: [
            {
              role: 'user',
              content: 'Hello',
              messageType: MessageType.TEXT,
            },
          ],
        },
      });

      await POST(request);

      expect(mockHandleChat).toHaveBeenCalledWith(
        expect.objectContaining({
          model: OpenAIModels[OpenAIModelID.GPT_5],
        }),
      );
    });

    it('handles GPT-4.1 model', async () => {
      const request = createChatRequest({
        body: {
          model: OpenAIModels[OpenAIModelID.GPT_4_1],
          messages: [
            {
              role: 'user',
              content: 'Hello',
              messageType: MessageType.TEXT,
            },
          ],
        },
      });

      await POST(request);

      expect(mockHandleChat).toHaveBeenCalledWith(
        expect.objectContaining({
          model: OpenAIModels[OpenAIModelID.GPT_4_1],
        }),
      );
    });

    it('handles GPT-o3 reasoning model with reasoningEffort', async () => {
      const request = createChatRequest({
        body: {
          model: OpenAIModels[OpenAIModelID.GPT_o3],
          messages: [
            {
              role: 'user',
              content: 'Solve this complex problem',
              messageType: MessageType.TEXT,
            },
          ],
          reasoningEffort: 'high',
        },
      });

      await POST(request);

      expect(mockHandleChat).toHaveBeenCalledWith(
        expect.objectContaining({
          model: OpenAIModels[OpenAIModelID.GPT_o3],
          reasoningEffort: 'high',
        }),
      );
    });
  });

  describe('Message Type Variations', () => {
    it('handles text messages', async () => {
      const request = createChatRequest({
        body: {
          model: OpenAIModels[OpenAIModelID.GPT_5],
          messages: [
            {
              role: 'user',
              content: 'Text message',
              messageType: MessageType.TEXT,
            },
          ],
        },
      });

      await POST(request);

      expect(mockHandleChat).toHaveBeenCalledWith(
        expect.objectContaining({
          messages: expect.arrayContaining([
            expect.objectContaining({
              messageType: MessageType.TEXT,
            }),
          ]),
        }),
      );
    });

    it('handles image messages', async () => {
      const request = createChatRequest({
        body: {
          model: OpenAIModels[OpenAIModelID.GPT_5],
          messages: [
            {
              role: 'user',
              content: 'Describe this image',
              messageType: MessageType.IMAGE,
            },
          ],
        },
      });

      await POST(request);

      expect(mockHandleChat).toHaveBeenCalledWith(
        expect.objectContaining({
          messages: expect.arrayContaining([
            expect.objectContaining({
              messageType: MessageType.IMAGE,
            }),
          ]),
        }),
      );
    });

    it('handles multi-turn conversations', async () => {
      const messages = [
        {
          role: 'user' as const,
          content: 'First question',
          messageType: MessageType.TEXT,
        },
        {
          role: 'assistant' as const,
          content: 'First answer',
          messageType: MessageType.TEXT,
        },
        {
          role: 'user' as const,
          content: 'Follow-up question',
          messageType: MessageType.TEXT,
        },
      ];

      const request = createChatRequest({
        body: {
          model: OpenAIModels[OpenAIModelID.GPT_5],
          messages,
        },
      });

      await POST(request);

      expect(mockHandleChat).toHaveBeenCalledWith(
        expect.objectContaining({
          messages: expect.arrayContaining(messages),
        }),
      );
    });
  });

  describe('Logging', () => {
    it('logs request details to console', async () => {
      const consoleLogSpy = vi
        .spyOn(console, 'log')
        .mockImplementation(() => {});

      const request = createChatRequest({
        body: {
          model: OpenAIModels[OpenAIModelID.GPT_5],
          messages: [
            {
              role: 'user',
              content: 'Hello',
              messageType: MessageType.TEXT,
            },
          ],
          botId: 'test-bot',
        },
      });

      await POST(request);

      expect(consoleLogSpy).toHaveBeenCalledWith(
        '[POST /api/chat/standard] Request:',
        expect.objectContaining({
          modelId: OpenAIModels[OpenAIModelID.GPT_5].id,
          messageCount: 1,
          stream: true,
          botId: 'test-bot',
        }),
      );

      consoleLogSpy.mockRestore();
    });
  });

  describe('Integration Scenarios', () => {
    it('handles complete chat flow with all parameters', async () => {
      const request = createChatRequest({
        body: {
          model: OpenAIModels[OpenAIModelID.GPT_5],
          messages: [
            {
              role: 'user',
              content: 'Complex question',
              messageType: MessageType.TEXT,
            },
          ],
          prompt: 'Custom system prompt',
          temperature: 0.7,
          stream: true,
          reasoningEffort: 'medium',
          verbosity: 'high',
          botId: 'test-bot-456',
        },
      });

      const response = await POST(request);

      expect(response.status).toBe(200);
      expect(mockHandleChat).toHaveBeenCalledWith({
        messages: expect.any(Array),
        model: OpenAIModels[OpenAIModelID.GPT_5],
        user: mockSession.user,
        systemPrompt: 'Custom system prompt',
        temperature: 0.7,
        stream: true,
        reasoningEffort: 'medium',
        verbosity: 'high',
        botId: 'test-bot-456',
      });
    });

    it('handles minimal request with defaults', async () => {
      const request = createChatRequest({
        body: {
          model: OpenAIModels[OpenAIModelID.GPT_5],
          messages: [
            {
              role: 'user',
              content: 'Simple question',
              messageType: MessageType.TEXT,
            },
          ],
        },
      });

      const response = await POST(request);

      expect(response.status).toBe(200);
      expect(mockHandleChat).toHaveBeenCalledWith({
        messages: expect.any(Array),
        model: OpenAIModels[OpenAIModelID.GPT_5],
        user: mockSession.user,
        systemPrompt: DEFAULT_SYSTEM_PROMPT,
        temperature: undefined,
        stream: true,
        reasoningEffort: undefined,
        verbosity: undefined,
        botId: undefined,
      });
    });
  });
});
