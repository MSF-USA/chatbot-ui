import { NextRequest } from 'next/server';

import { AgentChatService } from '@/lib/services/chat';
import { AIFoundryAgentHandler } from '@/lib/services/chat/AIFoundryAgentHandler';
import { ChatLogger } from '@/lib/services/shared';

import { MessageType } from '@/types/chat';
import { OpenAIModelID, OpenAIModels } from '@/types/openai';

import {
  createMockRequest,
  createMockSession,
  parseJsonResponse,
} from './helpers';

import { POST } from '@/app/api/chat/agent/route';
import { auth } from '@/auth';
import { beforeEach, describe, expect, it, vi } from 'vitest';

// Hoist mocks before imports
const mockAuth = vi.hoisted(() => vi.fn());
const mockAgentChatService = vi.hoisted(() => vi.fn());
const mockAIFoundryAgentHandler = vi.hoisted(() => vi.fn());
const mockChatLogger = vi.hoisted(() => vi.fn());

// Mock dependencies
vi.mock('@/auth', () => ({
  auth: mockAuth,
}));

vi.mock('@/lib/services/chat', () => ({
  AgentChatService: mockAgentChatService,
}));

vi.mock('@/lib/services/chat/AIFoundryAgentHandler', () => ({
  AIFoundryAgentHandler: mockAIFoundryAgentHandler,
}));

vi.mock('@/lib/services/shared', () => ({
  ChatLogger: mockChatLogger,
}));

/**
 * Tests for POST /api/chat/agent
 * Azure AI Foundry Agent chat endpoint with Bing grounding
 */
describe('/api/chat/agent', () => {
  const mockSession = createMockSession();

  const mockHandleChat = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();

    // Setup auth mock
    mockAuth.mockResolvedValue(mockSession as any);

    // Setup service mocks as proper constructors
    mockChatLogger.mockImplementation(function (this: any) {
      return {};
    });

    mockAIFoundryAgentHandler.mockImplementation(function (this: any) {
      return {};
    });

    // Mock AgentChatService with handleChat method
    mockAgentChatService.mockImplementation(function (this: any) {
      return {
        handleChat: mockHandleChat,
      };
    });

    // Default successful response
    mockHandleChat.mockResolvedValue(
      new Response('Agent response with citations', {
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
        model: OpenAIModels[OpenAIModelID.GPT_4_1], // GPT-4.1 has agent capability
        messages: [
          {
            role: 'user',
            content: 'Search for latest AI news using Bing',
            messageType: MessageType.TEXT,
          },
        ],
      },
      url = 'http://localhost:3000/api/chat/agent',
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

  describe('Model Validation', () => {
    it('returns 400 when model does not have agentId', async () => {
      const modelWithoutAgent = {
        ...OpenAIModels[OpenAIModelID.GPT_5],
        // Remove agentId if it exists
        agentId: undefined,
      };

      const request = createChatRequest({
        body: {
          model: modelWithoutAgent,
          messages: [
            {
              role: 'user',
              content: 'Query',
              messageType: MessageType.TEXT,
            },
          ],
        },
      });

      const response = await POST(request);
      const data = await parseJsonResponse(response);

      expect(response.status).toBe(400);
      expect(data.error).toBe('Bad Request');
      expect(data.message).toContain('does not have an agentId configured');
    });

    it('accepts model with valid agentId', async () => {
      const request = createChatRequest({
        body: {
          model: OpenAIModels[OpenAIModelID.GPT_4_1],
          messages: [
            {
              role: 'user',
              content: 'Query',
              messageType: MessageType.TEXT,
            },
          ],
        },
      });

      const response = await POST(request);

      expect(response.status).toBe(200);
    });
  });

  describe('Request Parsing', () => {
    it('parses model and messages from request body', async () => {
      const model = OpenAIModels[OpenAIModelID.GPT_4_1];
      const messages = [
        {
          role: 'user' as const,
          content: 'What is the current stock price of MSFT?',
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

    it('parses optional temperature parameter', async () => {
      const request = createChatRequest({
        body: {
          model: OpenAIModels[OpenAIModelID.GPT_4_1],
          messages: [
            {
              role: 'user',
              content: 'Query',
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

    it('parses optional threadId for conversation continuity', async () => {
      const request = createChatRequest({
        body: {
          model: OpenAIModels[OpenAIModelID.GPT_4_1],
          messages: [
            {
              role: 'user',
              content: 'Continue the conversation',
              messageType: MessageType.TEXT,
            },
          ],
          threadId: 'thread-abc-123',
        },
      });

      await POST(request);

      expect(mockHandleChat).toHaveBeenCalledWith(
        expect.objectContaining({
          threadId: 'thread-abc-123',
        }),
      );
    });

    it('parses optional forcedAgentType parameter', async () => {
      const request = createChatRequest({
        body: {
          model: OpenAIModels[OpenAIModelID.GPT_4_1],
          messages: [
            {
              role: 'user',
              content: 'Query',
              messageType: MessageType.TEXT,
            },
          ],
          forcedAgentType: 'bing-grounded',
        },
      });

      await POST(request);

      expect(mockHandleChat).toHaveBeenCalledWith(
        expect.objectContaining({
          forcedAgentType: 'bing-grounded',
        }),
      );
    });

    it('parses optional botId for logging', async () => {
      const request = createChatRequest({
        body: {
          model: OpenAIModels[OpenAIModelID.GPT_4_1],
          messages: [
            {
              role: 'user',
              content: 'Query',
              messageType: MessageType.TEXT,
            },
          ],
          botId: 'agent-bot-456',
        },
      });

      await POST(request);

      expect(mockHandleChat).toHaveBeenCalledWith(
        expect.objectContaining({
          botId: 'agent-bot-456',
        }),
      );
    });
  });

  describe('Service Initialization', () => {
    it('creates ChatLogger', async () => {
      const request = createChatRequest({});
      await POST(request);

      expect(ChatLogger).toHaveBeenCalled();
    });

    it('creates AIFoundryAgentHandler with logger', async () => {
      const request = createChatRequest({});
      await POST(request);

      expect(AIFoundryAgentHandler).toHaveBeenCalled();
    });

    it('creates AgentChatService', async () => {
      const request = createChatRequest({});
      await POST(request);

      expect(AgentChatService).toHaveBeenCalled();
    });
  });

  describe('Response Handling', () => {
    it('returns streaming response with citations', async () => {
      const mockStream = new ReadableStream({
        start(controller) {
          controller.enqueue(
            new TextEncoder().encode('Agent response with [citation][1]'),
          );
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

    it('returns response with thread metadata', async () => {
      const mockStream = new ReadableStream({
        start(controller) {
          controller.enqueue(new TextEncoder().encode('Response text'));
          controller.enqueue(
            new TextEncoder().encode(
              '\n\n<<<METADATA_START>>>{"threadId":"thread-xyz"}<<<METADATA_END>>>',
            ),
          );
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
    });
  });

  describe('Error Handling', () => {
    it('returns 500 on service error', async () => {
      mockHandleChat.mockRejectedValue(new Error('Agent service failed'));

      const request = createChatRequest({});
      const response = await POST(request);
      const data = await parseJsonResponse(response);

      expect(response.status).toBe(500);
      expect(data.error).toBe('Internal Server Error');
      expect(data.message).toBe('Agent service failed');
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
        '[POST /api/chat/agent] Error:',
        expect.any(Error),
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
          model: OpenAIModels[OpenAIModelID.GPT_4_1],
          messages: [
            {
              role: 'user',
              content: 'Search query',
              messageType: MessageType.TEXT,
            },
          ],
          threadId: 'thread-123',
          forcedAgentType: 'bing',
          botId: 'agent-bot',
        },
      });

      await POST(request);

      expect(consoleLogSpy).toHaveBeenCalledWith(
        '[POST /api/chat/agent] Request:',
        expect.objectContaining({
          modelId: OpenAIModels[OpenAIModelID.GPT_4_1].id,
          messageCount: 1,
          threadId: 'thread-123',
          forcedAgentType: 'bing',
          botId: 'agent-bot',
        }),
      );

      consoleLogSpy.mockRestore();
    });
  });

  describe('Integration Scenarios', () => {
    it('handles new conversation without threadId', async () => {
      const request = createChatRequest({
        body: {
          model: OpenAIModels[OpenAIModelID.GPT_4_1],
          messages: [
            {
              role: 'user',
              content: 'What is happening in the world today?',
              messageType: MessageType.TEXT,
            },
          ],
        },
      });

      const response = await POST(request);

      expect(response.status).toBe(200);
      expect(mockHandleChat).toHaveBeenCalledWith(
        expect.objectContaining({
          threadId: undefined,
        }),
      );
    });

    it('handles conversation continuation with threadId', async () => {
      const request = createChatRequest({
        body: {
          model: OpenAIModels[OpenAIModelID.GPT_4_1],
          messages: [
            {
              role: 'user',
              content: 'First message',
              messageType: MessageType.TEXT,
            },
            {
              role: 'assistant',
              content: 'First response',
              messageType: MessageType.TEXT,
            },
            {
              role: 'user',
              content: 'Follow-up question',
              messageType: MessageType.TEXT,
            },
          ],
          threadId: 'existing-thread-456',
        },
      });

      const response = await POST(request);

      expect(response.status).toBe(200);
      expect(mockHandleChat).toHaveBeenCalledWith(
        expect.objectContaining({
          threadId: 'existing-thread-456',
          messages: expect.arrayContaining([
            expect.objectContaining({ content: 'First message' }),
            expect.objectContaining({ content: 'Follow-up question' }),
          ]),
        }),
      );
    });

    it('handles complete agent flow with all optional parameters', async () => {
      const request = createChatRequest({
        body: {
          model: OpenAIModels[OpenAIModelID.GPT_4_1],
          messages: [
            {
              role: 'user',
              content: 'Search with all options',
              messageType: MessageType.TEXT,
            },
          ],
          temperature: 0.7,
          threadId: 'thread-full-789',
          forcedAgentType: 'custom-agent',
          botId: 'full-featured-bot',
        },
      });

      const response = await POST(request);

      expect(response.status).toBe(200);
      expect(mockHandleChat).toHaveBeenCalledWith({
        messages: expect.any(Array),
        model: OpenAIModels[OpenAIModelID.GPT_4_1],
        user: mockSession.user,
        temperature: 0.7,
        threadId: 'thread-full-789',
        forcedAgentType: 'custom-agent',
        botId: 'full-featured-bot',
      });
    });

    it('handles minimal request with only required parameters', async () => {
      const request = createChatRequest({
        body: {
          model: OpenAIModels[OpenAIModelID.GPT_4_1],
          messages: [
            {
              role: 'user',
              content: 'Simple query',
              messageType: MessageType.TEXT,
            },
          ],
        },
      });

      const response = await POST(request);

      expect(response.status).toBe(200);
      expect(mockHandleChat).toHaveBeenCalledWith({
        messages: expect.any(Array),
        model: OpenAIModels[OpenAIModelID.GPT_4_1],
        user: mockSession.user,
        temperature: undefined,
        threadId: undefined,
        forcedAgentType: undefined,
        botId: undefined,
      });
    });
  });
});
