import { Session } from 'next-auth';

import { StandardOpenAIHandler } from '@/lib/services/chat/handlers/StandardOpenAIHandler';

import { Message } from '@/types/chat';
import { OpenAIModel, OpenAIModelID, OpenAIModels } from '@/types/openai';

import OpenAI from 'openai';
import { beforeEach, describe, expect, it, vi } from 'vitest';

describe('StandardOpenAIHandler', () => {
  let handler: StandardOpenAIHandler;
  let mockClient: OpenAI;
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
      name: 'Test User',
      email: 'test@example.com',
    } as Session['user'];

    handler = new StandardOpenAIHandler(mockClient);
  });

  describe('getClient', () => {
    it('should return the OpenAI client', () => {
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
      const modelConfig = OpenAIModels[OpenAIModelID.GROK_3];

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
      const modelConfig = OpenAIModels[OpenAIModelID.GROK_3];

      const prepared = handler.prepareMessages(
        messages,
        undefined,
        modelConfig,
      );

      expect(prepared[0].role).toBe('system');
      expect(prepared[0].content).toBeDefined();
      expect(typeof prepared[0].content).toBe('string');
    });

    it('should preserve all messages in order', () => {
      const messages: Message[] = [
        { role: 'user', content: 'First', messageType: undefined },
        { role: 'assistant', content: 'Response', messageType: undefined },
        { role: 'user', content: 'Second', messageType: undefined },
      ];
      const systemPrompt = 'You are helpful';
      const modelConfig = OpenAIModels[OpenAIModelID.GROK_3];

      const prepared = handler.prepareMessages(
        messages,
        systemPrompt,
        modelConfig,
      );

      expect(prepared).toHaveLength(4);
      expect(prepared[0].role).toBe('system');
      expect(prepared[1].content).toBe('First');
      expect(prepared[2].content).toBe('Response');
      expect(prepared[3].content).toBe('Second');
    });
  });

  describe('buildRequestParams', () => {
    it('should build params for Grok models with temperature', () => {
      const messages = [
        { role: 'system', content: 'System' },
        { role: 'user', content: 'Hello' },
      ] as any;

      const modelConfig: OpenAIModel = {
        ...OpenAIModels[OpenAIModelID.GROK_3],
        supportsTemperature: true,
      };

      const params = handler.buildRequestParams(
        'grok-3',
        messages,
        0.7,
        mockUser,
        true,
        modelConfig,
      );

      expect(params.model).toBe('grok-3');
      expect(params.messages).toBe(messages);
      expect(params.stream).toBe(true);
      expect(params.user).toBe(JSON.stringify(mockUser));
      expect(params.temperature).toBe(0.7);
    });

    it('should use deployment name if specified', () => {
      const messages = [{ role: 'user', content: 'Hello' }] as any;

      const modelConfig: OpenAIModel = {
        ...OpenAIModels[OpenAIModelID.GROK_3],
        deploymentName: 'grok-3-custom',
      };

      const params = handler.buildRequestParams(
        'grok-3',
        messages,
        0.7,
        mockUser,
        true,
        modelConfig,
      );

      expect(params.model).toBe('grok-3-custom');
    });

    it('should respect supportsTemperature flag', () => {
      const messages = [{ role: 'user', content: 'Hello' }] as any;

      const modelConfig: OpenAIModel = {
        ...OpenAIModels[OpenAIModelID.GROK_3],
        supportsTemperature: false,
      };

      const params = handler.buildRequestParams(
        'grok-3',
        messages,
        0.7,
        mockUser,
        true,
        modelConfig,
      );

      expect(params).not.toHaveProperty('temperature');
    });

    it('should not include reasoning_effort (standard models do not support it)', () => {
      const messages = [{ role: 'user', content: 'Hello' }] as any;
      const modelConfig = OpenAIModels[OpenAIModelID.GROK_3];

      const params = handler.buildRequestParams(
        'grok-3',
        messages,
        0.7,
        mockUser,
        true,
        modelConfig,
        'high', // Provided but should be ignored
      );

      expect(params).not.toHaveProperty('reasoning_effort');
    });

    it('should not include verbosity (standard models do not support it)', () => {
      const messages = [{ role: 'user', content: 'Hello' }] as any;
      const modelConfig = OpenAIModels[OpenAIModelID.GROK_3];

      const params = handler.buildRequestParams(
        'grok-3',
        messages,
        0.7,
        mockUser,
        true,
        modelConfig,
        undefined,
        'high', // Provided but should be ignored
      );

      expect(params).not.toHaveProperty('verbosity');
    });

    it('should handle Llama models', () => {
      const messages = [{ role: 'user', content: 'Hello' }] as any;
      const modelConfig = OpenAIModels[OpenAIModelID.LLAMA_4_MAVERICK];

      const params = handler.buildRequestParams(
        'Llama-4-Maverick-17B-128E-Instruct-FP8',
        messages,
        0.7,
        mockUser,
        true,
        modelConfig,
      );

      expect(params.model).toBe('Llama-4-Maverick-17B-128E-Instruct-FP8');
      expect(params.temperature).toBe(0.7);
    });

    it('should handle streaming and non-streaming requests', () => {
      const messages = [{ role: 'user', content: 'Hello' }] as any;
      const modelConfig = OpenAIModels[OpenAIModelID.GROK_3];

      const streamingParams = handler.buildRequestParams(
        'grok-3',
        messages,
        0.7,
        mockUser,
        true,
        modelConfig,
      );

      const nonStreamingParams = handler.buildRequestParams(
        'grok-3',
        messages,
        0.7,
        mockUser,
        false,
        modelConfig,
      );

      expect(streamingParams.stream).toBe(true);
      expect(nonStreamingParams.stream).toBe(false);
    });

    it('should default to including temperature when supportsTemperature is undefined', () => {
      const messages = [{ role: 'user', content: 'Hello' }] as any;

      const modelConfig: OpenAIModel = {
        id: 'custom-model',
        name: 'Custom',
        maxLength: 128000,
        tokenLimit: 16000,
        // supportsTemperature not set
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
  });

  describe('getModelIdForRequest', () => {
    it('should return deployment name if specified', () => {
      const modelConfig: OpenAIModel = {
        id: 'grok-3',
        name: 'Grok 3',
        maxLength: 128000,
        tokenLimit: 16000,
        deploymentName: 'grok-3-deployment',
      };

      const modelId = handler.getModelIdForRequest('grok-3', modelConfig);
      expect(modelId).toBe('grok-3-deployment');
    });

    it('should return model ID if no deployment name', () => {
      const modelConfig: OpenAIModel = {
        id: 'grok-3',
        name: 'Grok 3',
        maxLength: 128000,
        tokenLimit: 16000,
      };

      const modelId = handler.getModelIdForRequest('grok-3', modelConfig);
      expect(modelId).toBe('grok-3');
    });
  });
});
