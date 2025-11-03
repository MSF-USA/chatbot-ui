import { NextRequest } from 'next/server';

import { AgentChatService, StandardChatService } from '@/lib/services/chat';
import { AIFoundryAgentHandler } from '@/lib/services/chat/AIFoundryAgentHandler';
import { ChatOrchestrator } from '@/lib/services/chat/ChatOrchestrator';
import { ToolRouterService } from '@/lib/services/chat/ToolRouterService';
import { ToolRegistry, WebSearchTool } from '@/lib/services/chat/tools';
import { AzureMonitorLoggingService } from '@/lib/services/loggingService';
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

import { POST } from '@/app/api/chat/tool-aware/route';
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
const mockAgentChatService = vi.hoisted(() => vi.fn());
const mockToolRouterService = vi.hoisted(() => vi.fn());
const mockChatOrchestrator = vi.hoisted(() => vi.fn());
const mockAIFoundryAgentHandler = vi.hoisted(() => vi.fn());
const mockToolRegistry = vi.hoisted(() => vi.fn());
const mockWebSearchTool = vi.hoisted(() => vi.fn());
const mockChatLogger = vi.hoisted(() => vi.fn());
const mockAzureMonitorLoggingService = vi.hoisted(() => vi.fn());
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
  AgentChatService: mockAgentChatService,
}));

vi.mock('@/lib/services/chat/ToolRouterService', () => ({
  ToolRouterService: mockToolRouterService,
}));

vi.mock('@/lib/services/chat/ChatOrchestrator', () => ({
  ChatOrchestrator: mockChatOrchestrator,
}));

vi.mock('@/lib/services/chat/AIFoundryAgentHandler', () => ({
  AIFoundryAgentHandler: mockAIFoundryAgentHandler,
}));

vi.mock('@/lib/services/chat/tools', () => ({
  ToolRegistry: mockToolRegistry,
  WebSearchTool: mockWebSearchTool,
}));

vi.mock('@/lib/services/loggingService', () => ({
  AzureMonitorLoggingService: mockAzureMonitorLoggingService,
}));

vi.mock('@/lib/services/shared', () => ({
  ChatLogger: mockChatLogger,
  ModelSelector: mockModelSelector,
  StreamingService: mockStreamingService,
  ToneService: mockToneService,
}));

/**
 * Tests for POST /api/chat/tool-aware
 * Tool-aware chat endpoint with privacy-focused web search
 */
describe('/api/chat/tool-aware', () => {
  const mockSession = createMockSession();

  const mockHandleChat = vi.fn();
  const mockRegister = vi.fn();

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
    mockAzureMonitorLoggingService.mockImplementation(function (this: any) {
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

    // Setup chat service mocks
    mockStandardChatService.mockImplementation(function (this: any) {
      return {};
    });

    mockAgentChatService.mockImplementation(function (this: any) {
      return {};
    });

    mockAIFoundryAgentHandler.mockImplementation(function (this: any) {
      return {};
    });

    mockToolRouterService.mockImplementation(function (this: any) {
      return {};
    });

    // Setup tool mocks
    mockToolRegistry.mockImplementation(function (this: any) {
      return {
        register: mockRegister,
      };
    });

    mockWebSearchTool.mockImplementation(function (this: any) {
      return {};
    });

    // Mock ChatOrchestrator with handleChat method
    mockChatOrchestrator.mockImplementation(function (this: any) {
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
            content: 'Search for latest AI news',
            messageType: MessageType.TEXT,
          },
        ],
      },
      url = 'http://localhost:3000/api/chat/tool-aware',
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

    it('uses session user in orchestrator', async () => {
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
          content: 'What is the weather?',
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

    it('defaults minimizeAIFoundryUse to false when not provided', async () => {
      const request = createChatRequest({
        body: {
          model: OpenAIModels[OpenAIModelID.GPT_5],
          messages: [
            {
              role: 'user',
              content: 'Search for something',
              messageType: MessageType.TEXT,
            },
          ],
        },
      });

      await POST(request);

      expect(mockHandleChat).toHaveBeenCalledWith(
        expect.objectContaining({
          minimizeAIFoundryUse: false,
        }),
      );
    });

    it('respects minimizeAIFoundryUse: true (privacy mode)', async () => {
      const request = createChatRequest({
        body: {
          model: OpenAIModels[OpenAIModelID.GPT_5],
          messages: [
            {
              role: 'user',
              content: 'Search for something',
              messageType: MessageType.TEXT,
            },
          ],
          minimizeAIFoundryUse: true,
        },
      });

      await POST(request);

      expect(mockHandleChat).toHaveBeenCalledWith(
        expect.objectContaining({
          minimizeAIFoundryUse: true,
        }),
      );
    });

    it('uses custom prompt when provided', async () => {
      const customPrompt = 'You are a helpful search assistant.';

      const request = createChatRequest({
        body: {
          model: OpenAIModels[OpenAIModelID.GPT_5],
          messages: [
            {
              role: 'user',
              content: 'Search',
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
              content: 'Search',
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

    it('defaults stream to true when not provided', async () => {
      const request = createChatRequest({
        body: {
          model: OpenAIModels[OpenAIModelID.GPT_5],
          messages: [
            {
              role: 'user',
              content: 'Search',
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
  });

  describe('Service Initialization', () => {
    it('creates all required clients and services', async () => {
      const request = createChatRequest({});
      await POST(request);

      expect(DefaultAzureCredential).toHaveBeenCalled();
      expect(AzureOpenAI).toHaveBeenCalled();
      expect(OpenAI).toHaveBeenCalled();
      expect(ChatLogger).toHaveBeenCalled();
      expect(AzureMonitorLoggingService).toHaveBeenCalled();
      expect(ModelSelector).toHaveBeenCalled();
      expect(ToneService).toHaveBeenCalled();
      expect(StreamingService).toHaveBeenCalled();
    });

    it('creates ToolRouterService with GPT-5-mini model', async () => {
      const request = createChatRequest({});
      await POST(request);

      expect(ToolRouterService).toHaveBeenCalledWith(
        expect.any(Object), // azureOpenAIClient
        OpenAIModels[OpenAIModelID.GPT_5_MINI], // routerModel
      );
    });

    it('creates and configures ToolRegistry', async () => {
      const request = createChatRequest({});
      await POST(request);

      expect(ToolRegistry).toHaveBeenCalled();
      expect(WebSearchTool).toHaveBeenCalled();
      expect(mockRegister).toHaveBeenCalledWith(expect.any(Object));
    });

    it('creates ChatOrchestrator with all services', async () => {
      const request = createChatRequest({});
      await POST(request);

      expect(ChatOrchestrator).toHaveBeenCalledWith(
        expect.any(Object), // standardChatService
        expect.any(Object), // agentChatService
        expect.any(Object), // toolRouterService
        expect.any(Object), // toolRegistry
      );
    });
  });

  describe('Agent Model Configuration', () => {
    it('passes GPT-4.1 as agent model for web search', async () => {
      const request = createChatRequest({});
      await POST(request);

      expect(mockHandleChat).toHaveBeenCalledWith(
        expect.objectContaining({
          agentModel: OpenAIModels[OpenAIModelID.GPT_4_1],
        }),
      );
    });
  });

  describe('Response Handling', () => {
    it('returns streaming response from orchestrator', async () => {
      const mockStream = new ReadableStream({
        start(controller) {
          controller.enqueue(new TextEncoder().encode('Search results...'));
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

    it('returns non-streaming JSON response from orchestrator', async () => {
      mockHandleChat.mockResolvedValue(
        new Response(JSON.stringify({ text: 'Search complete' }), {
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
              content: 'Search',
              messageType: MessageType.TEXT,
            },
          ],
          stream: false,
        },
      });

      const response = await POST(request);
      const data = await parseJsonResponse(response);

      expect(response.status).toBe(200);
      expect(data.text).toBe('Search complete');
    });
  });

  describe('Error Handling', () => {
    it('returns 500 on orchestrator error', async () => {
      mockHandleChat.mockRejectedValue(new Error('Orchestrator failed'));

      const request = createChatRequest({});
      const response = await POST(request);
      const data = await parseJsonResponse(response);

      expect(response.status).toBe(500);
      expect(data.error).toBe('Internal Server Error');
      expect(data.message).toBe('Orchestrator failed');
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
        '[POST /api/chat/tool-aware] Error:',
        expect.stringContaining('Test error'),
      );

      consoleErrorSpy.mockRestore();
    });
  });

  describe('Privacy Modes', () => {
    it('handles privacy mode enabled (minimizeAIFoundryUse: true)', async () => {
      const request = createChatRequest({
        body: {
          model: OpenAIModels[OpenAIModelID.GPT_5_CHAT],
          messages: [
            {
              role: 'user',
              content: 'Search privately',
              messageType: MessageType.TEXT,
            },
          ],
          minimizeAIFoundryUse: true,
        },
      });

      const response = await POST(request);

      expect(response.status).toBe(200);
      expect(mockHandleChat).toHaveBeenCalledWith(
        expect.objectContaining({
          minimizeAIFoundryUse: true,
        }),
      );
    });

    it('handles privacy mode disabled (minimizeAIFoundryUse: false)', async () => {
      const request = createChatRequest({
        body: {
          model: OpenAIModels[OpenAIModelID.GPT_5_CHAT],
          messages: [
            {
              role: 'user',
              content: 'Search normally',
              messageType: MessageType.TEXT,
            },
          ],
          minimizeAIFoundryUse: false,
        },
      });

      const response = await POST(request);

      expect(response.status).toBe(200);
      expect(mockHandleChat).toHaveBeenCalledWith(
        expect.objectContaining({
          minimizeAIFoundryUse: false,
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
              content: 'Search',
              messageType: MessageType.TEXT,
            },
          ],
          minimizeAIFoundryUse: true,
        },
      });

      await POST(request);

      expect(consoleLogSpy).toHaveBeenCalledWith(
        '[POST /api/chat/tool-aware] Request:',
        expect.objectContaining({
          modelId: OpenAIModels[OpenAIModelID.GPT_5].id,
          messageCount: 1,
          minimizeAIFoundryUse: true,
          stream: true,
        }),
      );

      consoleLogSpy.mockRestore();
    });
  });

  describe('Integration Scenarios', () => {
    it('handles complete tool-aware flow with all parameters', async () => {
      const request = createChatRequest({
        body: {
          model: OpenAIModels[OpenAIModelID.GPT_5_CHAT],
          messages: [
            {
              role: 'user',
              content: 'What are the latest developments in quantum computing?',
              messageType: MessageType.TEXT,
            },
          ],
          prompt: 'You are a research assistant',
          temperature: 0.7,
          stream: true,
          minimizeAIFoundryUse: true,
          reasoningEffort: 'medium',
          verbosity: 'high',
          botId: 'search-bot-123',
        },
      });

      const response = await POST(request);

      expect(response.status).toBe(200);
      expect(mockHandleChat).toHaveBeenCalledWith({
        messages: expect.any(Array),
        model: OpenAIModels[OpenAIModelID.GPT_5_CHAT],
        user: mockSession.user,
        systemPrompt: 'You are a research assistant',
        temperature: 0.7,
        stream: true,
        minimizeAIFoundryUse: true,
        agentModel: OpenAIModels[OpenAIModelID.GPT_4_1],
        reasoningEffort: 'medium',
        verbosity: 'high',
        botId: 'search-bot-123',
      });
    });

    it('handles minimal request with defaults', async () => {
      const request = createChatRequest({
        body: {
          model: OpenAIModels[OpenAIModelID.GPT_5],
          messages: [
            {
              role: 'user',
              content: 'Simple search',
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
        minimizeAIFoundryUse: false,
        agentModel: OpenAIModels[OpenAIModelID.GPT_4_1],
        reasoningEffort: undefined,
        verbosity: undefined,
        botId: undefined,
      });
    });

    it('handles multi-turn conversation with web search', async () => {
      const messages = [
        {
          role: 'user' as const,
          content: 'What is the population of Tokyo?',
          messageType: MessageType.TEXT,
        },
        {
          role: 'assistant' as const,
          content: 'Tokyo has approximately 14 million people.',
          messageType: MessageType.TEXT,
        },
        {
          role: 'user' as const,
          content: 'How does that compare to New York?',
          messageType: MessageType.TEXT,
        },
      ];

      const request = createChatRequest({
        body: {
          model: OpenAIModels[OpenAIModelID.GPT_5_CHAT],
          messages,
          minimizeAIFoundryUse: true,
        },
      });

      const response = await POST(request);

      expect(response.status).toBe(200);
      expect(mockHandleChat).toHaveBeenCalledWith(
        expect.objectContaining({
          messages: expect.arrayContaining(messages),
          minimizeAIFoundryUse: true,
        }),
      );
    });
  });
});
