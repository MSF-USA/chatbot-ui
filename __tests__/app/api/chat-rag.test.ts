import { NextRequest } from 'next/server';

import { RAGChatService } from '@/lib/services/chat';
import { RAGService } from '@/lib/services/ragService';
import { ChatLogger } from '@/lib/services/shared';

import { MessageType } from '@/types/chat';
import { OpenAIModelID, OpenAIModels } from '@/types/openai';

import {
  createMockRequest,
  createMockSession,
  parseJsonResponse,
} from './helpers';

import { POST } from '@/app/api/chat/rag/route';
import { auth } from '@/auth';
import {
  DefaultAzureCredential,
  getBearerTokenProvider,
} from '@azure/identity';
import { AzureOpenAI } from 'openai';
import { beforeEach, describe, expect, it, vi } from 'vitest';

// Hoist mocks before imports
const mockAuth = vi.hoisted(() => vi.fn());
const mockDefaultAzureCredential = vi.hoisted(() => vi.fn());
const mockGetBearerTokenProvider = vi.hoisted(() => vi.fn());
const mockAzureOpenAI = vi.hoisted(() => vi.fn());
const mockRAGChatService = vi.hoisted(() => vi.fn());
const mockRAGService = vi.hoisted(() => vi.fn());
const mockChatLogger = vi.hoisted(() => vi.fn());

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
}));

vi.mock('@/lib/services/chat', () => ({
  RAGChatService: mockRAGChatService,
}));

vi.mock('@/lib/services/ragService', () => ({
  RAGService: mockRAGService,
}));

vi.mock('@/lib/services/shared', () => ({
  ChatLogger: mockChatLogger,
}));

/**
 * Tests for POST /api/chat/rag
 * RAG chat endpoint for knowledge base queries
 */
describe('/api/chat/rag', () => {
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

    // Setup service mocks as proper constructors
    mockChatLogger.mockImplementation(function (this: any) {
      return {};
    });

    mockRAGService.mockImplementation(function (this: any) {
      return {};
    });

    // Mock RAGChatService with handleChat method
    mockRAGChatService.mockImplementation(function (this: any) {
      return {
        handleChat: mockHandleChat,
      };
    });

    // Default successful response
    mockHandleChat.mockResolvedValue(
      new Response('Test RAG response', {
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
            content: 'What is in the knowledge base?',
            messageType: MessageType.TEXT,
          },
        ],
        botId: 'test-bot-123',
      },
      url = 'http://localhost:3000/api/chat/rag',
    } = options;

    return createMockRequest({
      method: 'POST',
      url,
      body,
    });
  };

  describe('Authentication', () => {
    it('returns 500 when session is not found', async () => {
      mockAuth.mockResolvedValue(null);

      const request = createChatRequest({});
      const response = await POST(request);
      const data = await parseJsonResponse(response);

      expect(response.status).toBe(500);
      expect(data.error).toBe('Internal Server Error');
      expect(data.message).toContain('Could not pull session');
    });

    it('allows authenticated requests with botId', async () => {
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

  describe('Request Validation', () => {
    it('returns 400 when botId is missing', async () => {
      const request = createChatRequest({
        body: {
          model: OpenAIModels[OpenAIModelID.GPT_5],
          messages: [
            {
              role: 'user',
              content: 'Query',
              messageType: MessageType.TEXT,
            },
          ],
          // botId is missing
        },
      });

      const response = await POST(request);
      const data = await parseJsonResponse(response);

      expect(response.status).toBe(400);
      expect(data.error).toBe('Bad Request');
      expect(data.message).toBe('botId is required for RAG chat');
    });

    it('returns 400 when botId is null', async () => {
      const request = createChatRequest({
        body: {
          model: OpenAIModels[OpenAIModelID.GPT_5],
          messages: [
            {
              role: 'user',
              content: 'Query',
              messageType: MessageType.TEXT,
            },
          ],
          botId: null,
        },
      });

      const response = await POST(request);
      const data = await parseJsonResponse(response);

      expect(response.status).toBe(400);
      expect(data.error).toBe('Bad Request');
      expect(data.message).toBe('botId is required for RAG chat');
    });

    it('returns 400 when botId is empty string', async () => {
      const request = createChatRequest({
        body: {
          model: OpenAIModels[OpenAIModelID.GPT_5],
          messages: [
            {
              role: 'user',
              content: 'Query',
              messageType: MessageType.TEXT,
            },
          ],
          botId: '',
        },
      });

      const response = await POST(request);
      const data = await parseJsonResponse(response);

      expect(response.status).toBe(400);
      expect(data.error).toBe('Bad Request');
      expect(data.message).toBe('botId is required for RAG chat');
    });

    it('accepts valid botId', async () => {
      const request = createChatRequest({
        body: {
          model: OpenAIModels[OpenAIModelID.GPT_5],
          messages: [
            {
              role: 'user',
              content: 'Query',
              messageType: MessageType.TEXT,
            },
          ],
          botId: 'knowledge-bot-456',
        },
      });

      const response = await POST(request);

      expect(response.status).toBe(200);
      expect(mockHandleChat).toHaveBeenCalledWith(
        expect.objectContaining({
          botId: 'knowledge-bot-456',
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
          content: 'Tell me about X',
          messageType: MessageType.TEXT,
        },
      ];

      const request = createChatRequest({
        body: { model, messages, botId: 'test-bot' },
      });

      await POST(request);

      expect(mockHandleChat).toHaveBeenCalledWith(
        expect.objectContaining({
          model,
          messages,
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
              content: 'Query',
              messageType: MessageType.TEXT,
            },
          ],
          botId: 'test-bot',
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
              content: 'Query',
              messageType: MessageType.TEXT,
            },
          ],
          botId: 'test-bot',
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

    it('passes bots configuration to service', async () => {
      const request = createChatRequest({});
      await POST(request);

      expect(mockHandleChat).toHaveBeenCalledWith(
        expect.objectContaining({
          bots: expect.any(Array),
        }),
      );
    });
  });

  describe('Service Initialization', () => {
    it('creates AzureOpenAI client with token provider', async () => {
      const request = createChatRequest({});
      await POST(request);

      expect(DefaultAzureCredential).toHaveBeenCalled();
      expect(getBearerTokenProvider).toHaveBeenCalledWith(
        expect.any(Object),
        'https://cognitiveservices.azure.com/.default',
      );
      expect(AzureOpenAI).toHaveBeenCalled();
    });

    it('creates ChatLogger', async () => {
      const request = createChatRequest({});
      await POST(request);

      expect(ChatLogger).toHaveBeenCalled();
    });

    it('creates RAGService', async () => {
      const request = createChatRequest({});
      await POST(request);

      expect(RAGService).toHaveBeenCalled();
    });

    it('creates RAGChatService', async () => {
      const request = createChatRequest({});
      await POST(request);

      expect(RAGChatService).toHaveBeenCalled();
    });
  });

  describe('Response Handling', () => {
    it('returns streaming response from service', async () => {
      const mockStream = new ReadableStream({
        start(controller) {
          controller.enqueue(new TextEncoder().encode('RAG results...'));
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
        new Response(JSON.stringify({ text: 'Knowledge base answer' }), {
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
              content: 'Query',
              messageType: MessageType.TEXT,
            },
          ],
          botId: 'test-bot',
          stream: false,
        },
      });

      const response = await POST(request);
      const data = await parseJsonResponse(response);

      expect(response.status).toBe(200);
      expect(data.text).toBe('Knowledge base answer');
    });
  });

  describe('Error Handling', () => {
    it('returns 500 on service error', async () => {
      mockHandleChat.mockRejectedValue(new Error('RAG service failed'));

      const request = createChatRequest({});
      const response = await POST(request);
      const data = await parseJsonResponse(response);

      expect(response.status).toBe(500);
      expect(data.error).toBe('Internal Server Error');
      expect(data.message).toBe('RAG service failed');
    });

    it('handles authentication errors', async () => {
      mockAuth.mockRejectedValue(new Error('Auth failed'));

      const request = createChatRequest({});
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
        '[POST /api/chat/rag] Error:',
        expect.stringContaining('Test error'),
      );

      consoleErrorSpy.mockRestore();
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
              content: 'Query knowledge base',
              messageType: MessageType.TEXT,
            },
          ],
          botId: 'kb-bot-789',
        },
      });

      await POST(request);

      expect(consoleLogSpy).toHaveBeenCalledWith(
        '[POST /api/chat/rag] Request:',
        expect.objectContaining({
          modelId: OpenAIModels[OpenAIModelID.GPT_5].id,
          messageCount: 1,
          botId: 'kb-bot-789',
          stream: true,
        }),
      );

      consoleLogSpy.mockRestore();
    });
  });

  describe('Integration Scenarios', () => {
    it('handles complete RAG flow', async () => {
      const request = createChatRequest({
        body: {
          model: OpenAIModels[OpenAIModelID.GPT_5],
          messages: [
            {
              role: 'user',
              content: 'What information do we have about topic X?',
              messageType: MessageType.TEXT,
            },
          ],
          botId: 'comprehensive-kb',
          stream: true,
        },
      });

      const response = await POST(request);

      expect(response.status).toBe(200);
      expect(mockHandleChat).toHaveBeenCalledWith({
        messages: expect.any(Array),
        model: OpenAIModels[OpenAIModelID.GPT_5],
        user: mockSession.user,
        botId: 'comprehensive-kb',
        bots: expect.any(Array),
        stream: true,
      });
    });

    it('handles multi-turn conversation with knowledge base', async () => {
      const messages = [
        {
          role: 'user' as const,
          content: 'Tell me about our company policies',
          messageType: MessageType.TEXT,
        },
        {
          role: 'assistant' as const,
          content: 'Here are the main policies...',
          messageType: MessageType.TEXT,
        },
        {
          role: 'user' as const,
          content: 'What about remote work specifically?',
          messageType: MessageType.TEXT,
        },
      ];

      const request = createChatRequest({
        body: {
          model: OpenAIModels[OpenAIModelID.GPT_5],
          messages,
          botId: 'hr-policies-kb',
        },
      });

      const response = await POST(request);

      expect(response.status).toBe(200);
      expect(mockHandleChat).toHaveBeenCalledWith(
        expect.objectContaining({
          messages: expect.arrayContaining(messages),
          botId: 'hr-policies-kb',
        }),
      );
    });

    it('handles different bot IDs', async () => {
      const botIds = ['product-docs', 'customer-support-kb', 'technical-faq'];

      for (const botId of botIds) {
        mockHandleChat.mockClear();

        const request = createChatRequest({
          body: {
            model: OpenAIModels[OpenAIModelID.GPT_5],
            messages: [
              {
                role: 'user',
                content: 'Query',
                messageType: MessageType.TEXT,
              },
            ],
            botId,
          },
        });

        await POST(request);

        expect(mockHandleChat).toHaveBeenCalledWith(
          expect.objectContaining({
            botId,
          }),
        );
      }
    });
  });
});
