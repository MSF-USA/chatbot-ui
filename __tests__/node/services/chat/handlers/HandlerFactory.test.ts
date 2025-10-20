import { AzureOpenAIHandler } from '@/lib/services/chat/handlers/AzureOpenAIHandler';
import { DeepSeekHandler } from '@/lib/services/chat/handlers/DeepSeekHandler';
import { HandlerFactory } from '@/lib/services/chat/handlers/HandlerFactory';
import { StandardOpenAIHandler } from '@/lib/services/chat/handlers/StandardOpenAIHandler';

import { OpenAIModel, OpenAIModelID, OpenAIModels } from '@/types/openai';

import { AzureOpenAI } from 'openai';
import OpenAI from 'openai';
import { beforeEach, describe, expect, it, vi } from 'vitest';

describe('HandlerFactory', () => {
  let mockAzureClient: AzureOpenAI;
  let mockOpenAIClient: OpenAI;

  beforeEach(() => {
    // Create mock clients
    mockAzureClient = {} as AzureOpenAI;
    mockOpenAIClient = {} as OpenAI;
  });

  describe('getHandler', () => {
    it('should return AzureOpenAIHandler for Azure OpenAI models', () => {
      const gpt5Model: OpenAIModel = {
        ...OpenAIModels[OpenAIModelID.GPT_5],
        sdk: 'azure-openai',
      };

      const handler = HandlerFactory.getHandler(
        gpt5Model,
        mockAzureClient,
        mockOpenAIClient,
      );

      expect(handler).toBeInstanceOf(AzureOpenAIHandler);
    });

    it('should return AzureOpenAIHandler for o3 model', () => {
      const o3Model: OpenAIModel = {
        ...OpenAIModels[OpenAIModelID.GPT_o3],
        sdk: 'azure-openai',
      };

      const handler = HandlerFactory.getHandler(
        o3Model,
        mockAzureClient,
        mockOpenAIClient,
      );

      expect(handler).toBeInstanceOf(AzureOpenAIHandler);
    });

    it('should return DeepSeekHandler for DeepSeek models', () => {
      const deepseekModel: OpenAIModel = {
        ...OpenAIModels[OpenAIModelID.DEEPSEEK_R1],
        avoidSystemPrompt: true,
        sdk: 'openai',
      };

      const handler = HandlerFactory.getHandler(
        deepseekModel,
        mockAzureClient,
        mockOpenAIClient,
      );

      expect(handler).toBeInstanceOf(DeepSeekHandler);
    });

    it('should return StandardOpenAIHandler for Grok models', () => {
      const grokModel: OpenAIModel = {
        ...OpenAIModels[OpenAIModelID.GROK_3],
        sdk: 'openai',
      };

      const handler = HandlerFactory.getHandler(
        grokModel,
        mockAzureClient,
        mockOpenAIClient,
      );

      expect(handler).toBeInstanceOf(StandardOpenAIHandler);
    });

    it('should return StandardOpenAIHandler for Llama models', () => {
      const llamaModel: OpenAIModel = {
        ...OpenAIModels[OpenAIModelID.LLAMA_4_MAVERICK],
        sdk: 'openai',
      };

      const handler = HandlerFactory.getHandler(
        llamaModel,
        mockAzureClient,
        mockOpenAIClient,
      );

      expect(handler).toBeInstanceOf(StandardOpenAIHandler);
    });

    it('should throw error if model is null', () => {
      expect(() => {
        HandlerFactory.getHandler(null, mockAzureClient, mockOpenAIClient);
      }).toThrow('Model configuration is required');
    });

    it('should throw error if model is undefined', () => {
      expect(() => {
        HandlerFactory.getHandler(undefined, mockAzureClient, mockOpenAIClient);
      }).toThrow('Model configuration is required');
    });

    it('should prioritize avoidSystemPrompt over sdk setting', () => {
      // If a model has both azure-openai SDK and avoidSystemPrompt,
      // it should check avoidSystemPrompt after sdk check
      const customModel: OpenAIModel = {
        id: 'custom-model',
        name: 'Custom Model',
        maxLength: 128000,
        tokenLimit: 16000,
        sdk: 'openai',
        avoidSystemPrompt: true,
      };

      const handler = HandlerFactory.getHandler(
        customModel,
        mockAzureClient,
        mockOpenAIClient,
      );

      // Should be DeepSeekHandler because avoidSystemPrompt is true
      expect(handler).toBeInstanceOf(DeepSeekHandler);
    });
  });

  describe('getHandlerName', () => {
    it('should return "AzureOpenAIHandler" for Azure models', () => {
      const model: OpenAIModel = {
        id: 'test',
        name: 'Test',
        maxLength: 128000,
        tokenLimit: 16000,
        sdk: 'azure-openai',
      };

      const name = HandlerFactory.getHandlerName(model);
      expect(name).toBe('AzureOpenAIHandler');
    });

    it('should return "DeepSeekHandler" for models with avoidSystemPrompt', () => {
      const model: OpenAIModel = {
        id: 'test',
        name: 'Test',
        maxLength: 128000,
        tokenLimit: 16000,
        avoidSystemPrompt: true,
      };

      const name = HandlerFactory.getHandlerName(model);
      expect(name).toBe('DeepSeekHandler');
    });

    it('should return "StandardOpenAIHandler" for other models', () => {
      const model: OpenAIModel = {
        id: 'test',
        name: 'Test',
        maxLength: 128000,
        tokenLimit: 16000,
        sdk: 'openai',
      };

      const name = HandlerFactory.getHandlerName(model);
      expect(name).toBe('StandardOpenAIHandler');
    });

    it('should return "Unknown" for null model', () => {
      const name = HandlerFactory.getHandlerName(null);
      expect(name).toBe('Unknown');
    });

    it('should return "Unknown" for undefined model', () => {
      const name = HandlerFactory.getHandlerName(undefined);
      expect(name).toBe('Unknown');
    });
  });

  describe('Handler selection for all configured models', () => {
    it('should select correct handler for each model in OpenAIModels', () => {
      const expectedHandlers: Record<OpenAIModelID, string> = {
        [OpenAIModelID.GPT_4_1]: 'AzureOpenAIHandler',
        [OpenAIModelID.GPT_5]: 'AzureOpenAIHandler',
        [OpenAIModelID.GPT_5_PRO]: 'AzureOpenAIHandler',
        [OpenAIModelID.GPT_5_CHAT]: 'AzureOpenAIHandler',
        [OpenAIModelID.GPT_o3]: 'AzureOpenAIHandler',
        [OpenAIModelID.DEEPSEEK_R1]: 'DeepSeekHandler',
        [OpenAIModelID.DEEPSEEK_V3_1]: 'DeepSeekHandler',
        [OpenAIModelID.GROK_3]: 'StandardOpenAIHandler',
        [OpenAIModelID.GROK_4_FAST_REASONING]: 'StandardOpenAIHandler',
        [OpenAIModelID.LLAMA_4_MAVERICK]: 'StandardOpenAIHandler',
      };

      Object.entries(OpenAIModels).forEach(([modelId, modelConfig]) => {
        const handlerName = HandlerFactory.getHandlerName(modelConfig);
        expect(
          handlerName,
          `Model ${modelId} should use ${expectedHandlers[modelId as OpenAIModelID]}`,
        ).toBe(expectedHandlers[modelId as OpenAIModelID]);
      });
    });
  });
});
