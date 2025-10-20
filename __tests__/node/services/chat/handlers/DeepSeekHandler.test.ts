import { Session } from 'next-auth';

import { DeepSeekHandler } from '@/lib/services/chat/handlers/DeepSeekHandler';

import { Message } from '@/types/chat';
import { OpenAIModel, OpenAIModelID, OpenAIModels } from '@/types/openai';

import OpenAI from 'openai';
import { beforeEach, describe, expect, it, vi } from 'vitest';

describe('DeepSeekHandler', () => {
  let handler: DeepSeekHandler;
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
      givenName: 'Test',
      surname: 'User',
      displayName: 'Test User',
      mail: 'test@example.com',
    };

    handler = new DeepSeekHandler(mockClient);
  });

  describe('getClient', () => {
    it('should return the OpenAI client', () => {
      const client = handler.getClient();
      expect(client).toBe(mockClient);
    });
  });

  describe('prepareMessages - system prompt merging', () => {
    it('should merge system prompt into first user message (string content)', () => {
      const messages: Message[] = [
        { role: 'user', content: 'What is 2+2?', messageType: undefined },
      ];
      const systemPrompt = 'You are a helpful math tutor';
      const modelConfig = OpenAIModels[OpenAIModelID.DEEPSEEK_R1];

      const prepared = handler.prepareMessages(
        messages,
        systemPrompt,
        modelConfig,
      );

      expect(prepared).toHaveLength(1);
      expect(prepared[0].role).toBe('user');
      expect(prepared[0].content).toBe(
        'You are a helpful math tutor\n\nWhat is 2+2?',
      );
    });

    it('should merge system prompt into first user message (array content)', () => {
      const messages: Message[] = [
        {
          role: 'user',
          content: [{ type: 'text', text: 'What is 2+2?' }],
          messageType: undefined,
        },
      ];
      const systemPrompt = 'You are a helpful math tutor';
      const modelConfig = OpenAIModels[OpenAIModelID.DEEPSEEK_R1];

      const prepared = handler.prepareMessages(
        messages,
        systemPrompt,
        modelConfig,
      );

      expect(prepared).toHaveLength(1);
      expect(prepared[0].role).toBe('user');
      const content = prepared[0].content as any[];
      expect(content[0].type).toBe('text');
      expect(content[0].text).toBe(
        'You are a helpful math tutor\n\nWhat is 2+2?',
      );
    });

    it('should not merge if no system prompt provided', () => {
      const messages: Message[] = [
        { role: 'user', content: 'Hello', messageType: undefined },
      ];
      const modelConfig = OpenAIModels[OpenAIModelID.DEEPSEEK_R1];

      const prepared = handler.prepareMessages(
        messages,
        undefined,
        modelConfig,
      );

      expect(prepared).toHaveLength(1);
      expect(prepared[0].content).toBe('Hello');
    });

    it('should handle multiple messages and only prepend to first user message', () => {
      const messages: Message[] = [
        { role: 'user', content: 'First question', messageType: undefined },
        { role: 'assistant', content: 'Answer', messageType: undefined },
        { role: 'user', content: 'Second question', messageType: undefined },
      ];
      const systemPrompt = 'You are helpful';
      const modelConfig = OpenAIModels[OpenAIModelID.DEEPSEEK_R1];

      const prepared = handler.prepareMessages(
        messages,
        systemPrompt,
        modelConfig,
      );

      expect(prepared).toHaveLength(3);
      expect(prepared[0].content).toBe('You are helpful\n\nFirst question');
      expect(prepared[1].content).toBe('Answer');
      expect(prepared[2].content).toBe('Second question');
    });

    it('should handle message with no user messages gracefully', () => {
      const messages: Message[] = [
        { role: 'assistant', content: 'Hello', messageType: undefined },
      ];
      const systemPrompt = 'You are helpful';
      const modelConfig = OpenAIModels[OpenAIModelID.DEEPSEEK_R1];

      const prepared = handler.prepareMessages(
        messages,
        systemPrompt,
        modelConfig,
      );

      // Should not crash, just return messages as-is
      expect(prepared).toHaveLength(1);
      expect(prepared[0].content).toBe('Hello');
    });

    it('should handle empty messages array', () => {
      const messages: Message[] = [];
      const systemPrompt = 'You are helpful';
      const modelConfig = OpenAIModels[OpenAIModelID.DEEPSEEK_R1];

      const prepared = handler.prepareMessages(
        messages,
        systemPrompt,
        modelConfig,
      );

      expect(prepared).toHaveLength(0);
    });

    it('should not mutate original messages array', () => {
      const messages: Message[] = [
        { role: 'user', content: 'Hello', messageType: undefined },
      ];
      const systemPrompt = 'You are helpful';
      const modelConfig = OpenAIModels[OpenAIModelID.DEEPSEEK_R1];

      const original = messages[0].content;
      handler.prepareMessages(messages, systemPrompt, modelConfig);

      // Original should remain unchanged
      expect(messages[0].content).toBe(original);
    });
  });

  describe('buildRequestParams', () => {
    it('should build params with temperature for DeepSeek models', () => {
      const messages = [{ role: 'user', content: 'Hello' }] as any;

      const modelConfig: OpenAIModel = {
        ...OpenAIModels[OpenAIModelID.DEEPSEEK_R1],
        supportsTemperature: true,
      };

      const params = handler.buildRequestParams(
        'DeepSeek-R1',
        messages,
        0.7,
        mockUser,
        true,
        modelConfig,
      );

      expect(params.model).toBe('DeepSeek-R1'); // Uses deployment name
      expect(params.messages).toBe(messages);
      expect(params.stream).toBe(true);
      expect(params.user).toBe(JSON.stringify(mockUser));
      expect(params.temperature).toBe(0.7);
    });

    it('should use deployment name from modelConfig', () => {
      const messages = [{ role: 'user', content: 'Hello' }] as any;

      const modelConfig: OpenAIModel = {
        ...OpenAIModels[OpenAIModelID.DEEPSEEK_R1],
        deploymentName: 'DeepSeek-R1-Custom',
      };

      const params = handler.buildRequestParams(
        'DeepSeek-R1',
        messages,
        0.7,
        mockUser,
        true,
        modelConfig,
      );

      expect(params.model).toBe('DeepSeek-R1-Custom');
    });

    it('should respect supportsTemperature flag', () => {
      const messages = [{ role: 'user', content: 'Hello' }] as any;

      const modelConfig: OpenAIModel = {
        ...OpenAIModels[OpenAIModelID.DEEPSEEK_R1],
        supportsTemperature: false,
      };

      const params = handler.buildRequestParams(
        'DeepSeek-R1',
        messages,
        0.7,
        mockUser,
        true,
        modelConfig,
      );

      expect(params).not.toHaveProperty('temperature');
    });

    it('should not include reasoning_effort (DeepSeek does not support it)', () => {
      const messages = [{ role: 'user', content: 'Hello' }] as any;
      const modelConfig = OpenAIModels[OpenAIModelID.DEEPSEEK_R1];

      const params = handler.buildRequestParams(
        'DeepSeek-R1',
        messages,
        0.7,
        mockUser,
        true,
        modelConfig,
        'high', // Provided but should be ignored
      );

      expect(params).not.toHaveProperty('reasoning_effort');
    });

    it('should not include verbosity (DeepSeek does not support it)', () => {
      const messages = [{ role: 'user', content: 'Hello' }] as any;
      const modelConfig = OpenAIModels[OpenAIModelID.DEEPSEEK_R1];

      const params = handler.buildRequestParams(
        'DeepSeek-R1',
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

    it('should handle streaming and non-streaming requests', () => {
      const messages = [{ role: 'user', content: 'Hello' }] as any;
      const modelConfig = OpenAIModels[OpenAIModelID.DEEPSEEK_R1];

      const streamingParams = handler.buildRequestParams(
        'DeepSeek-R1',
        messages,
        0.7,
        mockUser,
        true,
        modelConfig,
      );

      const nonStreamingParams = handler.buildRequestParams(
        'DeepSeek-R1',
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
        id: 'DeepSeek-R1',
        name: 'DeepSeek R1',
        maxLength: 128000,
        tokenLimit: 32768,
        deploymentName: 'DeepSeek-R1',
      };

      const modelId = handler.getModelIdForRequest('DeepSeek-R1', modelConfig);
      expect(modelId).toBe('DeepSeek-R1');
    });

    it('should return model ID if no deployment name', () => {
      const modelConfig: OpenAIModel = {
        id: 'DeepSeek-R1',
        name: 'DeepSeek R1',
        maxLength: 128000,
        tokenLimit: 32768,
      };

      const modelId = handler.getModelIdForRequest('DeepSeek-R1', modelConfig);
      expect(modelId).toBe('DeepSeek-R1');
    });
  });
});
