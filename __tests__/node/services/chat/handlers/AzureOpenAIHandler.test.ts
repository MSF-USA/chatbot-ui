import { Session } from 'next-auth';

import { AzureOpenAIHandler } from '@/lib/services/chat/handlers/AzureOpenAIHandler';

import { Message } from '@/types/chat';
import { OpenAIModel, OpenAIModelID, OpenAIModels } from '@/types/openai';

import { AzureOpenAI } from 'openai';
import { beforeEach, describe, expect, it, vi } from 'vitest';

describe('AzureOpenAIHandler', () => {
  let handler: AzureOpenAIHandler;
  let mockClient: AzureOpenAI;
  let mockUser: Session['user'];

  beforeEach(() => {
    mockClient = {
      chat: {
        completions: {
          create: vi.fn(),
        },
      },
    } as any;

    mockUser = {
      id: 'user-123',
      givenName: 'Test',
      surname: 'User',
      displayName: 'Test User',
      mail: 'test@example.com',
    };

    handler = new AzureOpenAIHandler(mockClient);
  });

  describe('getClient', () => {
    it('should return the Azure OpenAI client', () => {
      const client = handler.getClient();
      expect(client).toBe(mockClient);
    });
  });

  describe('prepareMessages', () => {
    it('should add system message at the beginning', () => {
      const messages: Message[] = [
        { role: 'user', content: 'Hello', messageType: undefined },
      ];
      const systemPrompt = 'You are a helpful assistant';
      const modelConfig = OpenAIModels[OpenAIModelID.GPT_5];

      const prepared = handler.prepareMessages(
        messages,
        systemPrompt,
        modelConfig,
      );

      expect(prepared).toHaveLength(2);
      expect(prepared[0]).toEqual({
        role: 'system',
        content: 'You are a helpful assistant',
      });
      expect(prepared[1]).toEqual({
        role: 'user',
        content: 'Hello',
      });
    });

    it('should use default system prompt if none provided', () => {
      const messages: Message[] = [
        { role: 'user', content: 'Hello', messageType: undefined },
      ];
      const modelConfig = OpenAIModels[OpenAIModelID.GPT_5];

      const prepared = handler.prepareMessages(
        messages,
        undefined,
        modelConfig,
      );

      expect(prepared[0].role).toBe('system');
      expect(prepared[0].content).toBeDefined();
      expect(typeof prepared[0].content).toBe('string');
    });

    it('should preserve all user messages', () => {
      const messages: Message[] = [
        { role: 'user', content: 'First message', messageType: undefined },
        { role: 'assistant', content: 'Response', messageType: undefined },
        { role: 'user', content: 'Second message', messageType: undefined },
      ];
      const systemPrompt = 'You are helpful';
      const modelConfig = OpenAIModels[OpenAIModelID.GPT_5];

      const prepared = handler.prepareMessages(
        messages,
        systemPrompt,
        modelConfig,
      );

      expect(prepared).toHaveLength(4); // system + 3 messages
      expect(prepared[1].content).toBe('First message');
      expect(prepared[2].content).toBe('Response');
      expect(prepared[3].content).toBe('Second message');
    });
  });

  describe('buildRequestParams', () => {
    it('should build params for GPT-5 with reasoning_effort', () => {
      const messages = [
        { role: 'system', content: 'System' },
        { role: 'user', content: 'Hello' },
      ] as any;

      const modelConfig: OpenAIModel = {
        ...OpenAIModels[OpenAIModelID.GPT_5],
        supportsReasoningEffort: true,
        supportsTemperature: false,
      };

      const params = handler.buildRequestParams(
        'gpt-5',
        messages,
        0.7,
        mockUser,
        true,
        modelConfig,
        'medium',
        undefined,
      );

      expect(params.model).toBe('gpt-5');
      expect(params.messages).toBe(messages);
      expect(params.stream).toBe(true);
      expect(params.user).toBe(JSON.stringify(mockUser));
      expect((params as any).reasoning_effort).toBe('medium');
      expect(params).not.toHaveProperty('temperature');
      expect(params).not.toHaveProperty('verbosity');
    });

    it('should build params for GPT-5 with verbosity', () => {
      const messages = [
        { role: 'system', content: 'System' },
        { role: 'user', content: 'Hello' },
      ] as any;

      const modelConfig: OpenAIModel = {
        ...OpenAIModels[OpenAIModelID.GPT_5],
        supportsVerbosity: true,
        supportsTemperature: false,
      };

      const params = handler.buildRequestParams(
        'gpt-5',
        messages,
        0.7,
        mockUser,
        true,
        modelConfig,
        undefined,
        'high',
      );

      expect((params as any).verbosity).toBe('high');
      expect(params).not.toHaveProperty('temperature');
    });

    it('should build params with both reasoning_effort and verbosity', () => {
      const messages = [
        { role: 'system', content: 'System' },
        { role: 'user', content: 'Hello' },
      ] as any;

      const modelConfig: OpenAIModel = {
        ...OpenAIModels[OpenAIModelID.GPT_5],
        supportsReasoningEffort: true,
        supportsVerbosity: true,
        supportsTemperature: false,
      };

      const params = handler.buildRequestParams(
        'gpt-5',
        messages,
        0.7,
        mockUser,
        true,
        modelConfig,
        'high',
        'low',
      );

      expect((params as any).reasoning_effort).toBe('high');
      expect((params as any).verbosity).toBe('low');
    });

    it('should not include reasoning_effort if model does not support it', () => {
      const messages = [
        { role: 'system', content: 'System' },
        { role: 'user', content: 'Hello' },
      ] as any;

      const modelConfig: OpenAIModel = {
        ...OpenAIModels[OpenAIModelID.GPT_5_CHAT],
        supportsReasoningEffort: false,
      };

      const params = handler.buildRequestParams(
        'gpt-5-chat',
        messages,
        0.7,
        mockUser,
        true,
        modelConfig,
        'high',
        undefined,
      );

      expect(params).not.toHaveProperty('reasoning_effort');
    });

    it('should not include verbosity if model does not support it', () => {
      const messages = [
        { role: 'system', content: 'System' },
        { role: 'user', content: 'Hello' },
      ] as any;

      const modelConfig: OpenAIModel = {
        ...OpenAIModels[OpenAIModelID.GPT_o3],
        supportsVerbosity: false,
      };

      const params = handler.buildRequestParams(
        'o3',
        messages,
        0.7,
        mockUser,
        true,
        modelConfig,
        undefined,
        'high',
      );

      expect(params).not.toHaveProperty('verbosity');
    });

    it('should not include temperature for models that do not support it', () => {
      const messages = [{ role: 'user', content: 'Hello' }] as any;

      const modelConfig: OpenAIModel = {
        ...OpenAIModels[OpenAIModelID.GPT_5],
        supportsTemperature: false,
      };

      const params = handler.buildRequestParams(
        'gpt-5',
        messages,
        0.7,
        mockUser,
        true,
        modelConfig,
      );

      expect(params).not.toHaveProperty('temperature');
    });

    it('should include temperature for models that support it', () => {
      const messages = [{ role: 'user', content: 'Hello' }] as any;

      const modelConfig: OpenAIModel = {
        id: 'custom-model',
        name: 'Custom',
        maxLength: 128000,
        tokenLimit: 16000,
        supportsTemperature: true,
      };

      const params = handler.buildRequestParams(
        'custom-model',
        messages,
        0.7,
        mockUser,
        true,
        modelConfig,
      );

      expect(params.temperature).toBe(0.7);
    });

    it('should set stream based on streamResponse parameter', () => {
      const messages = [{ role: 'user', content: 'Hello' }] as any;
      const modelConfig = OpenAIModels[OpenAIModelID.GPT_5];

      const streamingParams = handler.buildRequestParams(
        'gpt-5',
        messages,
        0.7,
        mockUser,
        true,
        modelConfig,
      );

      const nonStreamingParams = handler.buildRequestParams(
        'gpt-5',
        messages,
        0.7,
        mockUser,
        false,
        modelConfig,
      );

      expect(streamingParams.stream).toBe(true);
      expect(nonStreamingParams.stream).toBe(false);
    });
  });

  describe('getModelIdForRequest', () => {
    it('should return deployment name if specified', () => {
      const modelConfig: OpenAIModel = {
        id: 'test-model',
        name: 'Test',
        maxLength: 128000,
        tokenLimit: 16000,
        deploymentName: 'custom-deployment',
      };

      const modelId = handler.getModelIdForRequest('test-model', modelConfig);
      expect(modelId).toBe('custom-deployment');
    });

    it('should return model ID if no deployment name', () => {
      const modelConfig: OpenAIModel = {
        id: 'test-model',
        name: 'Test',
        maxLength: 128000,
        tokenLimit: 16000,
      };

      const modelId = handler.getModelIdForRequest('test-model', modelConfig);
      expect(modelId).toBe('test-model');
    });
  });
});
