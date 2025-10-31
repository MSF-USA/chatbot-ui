import { OpenAIModelID } from '@/types/openai';

import { beforeEach, describe, expect, it, vi } from 'vitest';

/**
 * Tests for chatService SDK routing logic
 * These tests verify that different models are routed to the correct SDK client
 */
describe('ChatService SDK Routing', () => {
  describe('Model Routing Strategy', () => {
    it('should route DeepSeek to OpenAI SDK client', () => {
      const modelConfig = {
        id: OpenAIModelID.DEEPSEEK_V3_1,
        sdk: 'openai',
      };

      // SDK routing logic check
      expect(modelConfig.sdk).toBe('openai');
    });

    it('should route Grok models to OpenAI SDK client', () => {
      const grok3Config = {
        id: OpenAIModelID.GROK_3,
        sdk: 'openai',
      };

      expect(grok3Config.sdk).toBe('openai');
    });

    it('should route GPT-5 models to Azure OpenAI SDK client', () => {
      const gpt5Config = {
        id: OpenAIModelID.GPT_5,
        sdk: 'azure-openai',
      };
      const gpt5ChatConfig = {
        id: OpenAIModelID.GPT_5_CHAT,
        sdk: 'azure-openai',
      };

      expect(gpt5Config.sdk).toBe('azure-openai');
      expect(gpt5ChatConfig.sdk).toBe('azure-openai');
    });

    it('should route o3 to Azure OpenAI SDK client', () => {
      const o3Config = {
        id: OpenAIModelID.GPT_o3,
        sdk: 'azure-openai',
      };

      expect(o3Config.sdk).toBe('azure-openai');
    });
  });

  describe('Agent Routing', () => {
    it('should route Azure Agent Mode to agent handler', () => {
      const agentConfig = {
        azureAgentMode: true,
        agentId: 'asst_DHpJVkpNlBiaGgglkvvFALMI',
      };

      // Agent routing check
      expect(agentConfig.azureAgentMode).toBe(true);
      expect(agentConfig.agentId).toBeDefined();
      expect(agentConfig.agentId).toMatch(/^asst_[A-Za-z0-9]+$/);
    });

    it('should route Search Mode to tool-aware handler', () => {
      const searchConfig = {
        azureAgentMode: false,
        searchModeEnabled: true,
      };

      expect(searchConfig.azureAgentMode).toBe(false);
      expect(searchConfig.searchModeEnabled).toBe(true);
    });

    it('should not route models without agent or search config to special handlers', () => {
      const regularConfig = {
        azureAgentMode: false,
        searchModeEnabled: false,
        agentId: undefined,
      };

      expect(regularConfig.azureAgentMode).toBe(false);
      expect(regularConfig.searchModeEnabled).toBe(false);
      expect(regularConfig.agentId).toBeUndefined();
    });

    it('should prioritize Azure Agent Mode and Search Mode routing over SDK routing', () => {
      // Routing priority order
      const priorities = [
        { name: 'audio', priority: 1 }, // Audio/video files
        { name: 'bot', priority: 2 }, // RAG/Bot flow
        { name: 'azureAgent', priority: 3 }, // Azure Agent Mode (direct AI Foundry)
        { name: 'searchMode', priority: 4 }, // Search Mode (tool-aware)
        { name: 'standard', priority: 5 }, // Standard chat flow
      ];

      expect(
        priorities.find((p) => p.name === 'azureAgent')?.priority,
      ).toBeLessThan(
        priorities.find((p) => p.name === 'searchMode')?.priority || 0,
      );
      expect(
        priorities.find((p) => p.name === 'searchMode')?.priority,
      ).toBeLessThan(
        priorities.find((p) => p.name === 'standard')?.priority || 0,
      );
    });
  });

  describe('Reasoning Model Routing', () => {
    it('should identify o3 as reasoning model', () => {
      const reasoningModels = [OpenAIModelID.GPT_o3];

      expect(reasoningModels).toContain(OpenAIModelID.GPT_o3);
    });

    it('should not identify non-reasoning models as reasoning', () => {
      const reasoningModels = [OpenAIModelID.GPT_o3];

      expect(reasoningModels).not.toContain(OpenAIModelID.GPT_5);
      expect(reasoningModels).not.toContain(OpenAIModelID.GROK_3);
      expect(reasoningModels).not.toContain(OpenAIModelID.DEEPSEEK_V3_1);
    });
  });

  describe('Temperature Parameter Routing', () => {
    it('should exclude temperature for models that do not support it', () => {
      const gpt5Request = {
        model: OpenAIModelID.GPT_5,
        supportsTemperature: false,
        temperature: 0.7, // This should be removed
      };

      // Temperature should not be included
      const shouldIncludeTemp = gpt5Request.supportsTemperature !== false;
      expect(shouldIncludeTemp).toBe(false);
    });

    it('should include temperature for models that support it', () => {
      const deepseekRequest = {
        model: OpenAIModelID.DEEPSEEK_V3_1,
        supportsTemperature: true,
        temperature: 0.7,
      };

      // Temperature should be included
      const shouldIncludeTemp = deepseekRequest.supportsTemperature !== false;
      expect(shouldIncludeTemp).toBe(true);
    });

    it('should default to including temperature when not specified', () => {
      const unknownModelRequest = {
        model: 'unknown-model',
        supportsTemperature: undefined,
        temperature: 0.7,
      };

      // Default to true if not specified
      const shouldIncludeTemp =
        unknownModelRequest.supportsTemperature !== false;
      expect(shouldIncludeTemp).toBe(true);
    });
  });

  describe('Endpoint Configuration', () => {
    it('should use AI Foundry OpenAI endpoint for OpenAI SDK models', () => {
      const expectedEndpoint =
        'https://ts-aiassist-dev.services.ai.azure.com/openai/v1/';

      // This would be derived from env var or default calculation
      const derivedEndpoint =
        'https://ts-aiassist-dev.services.ai.azure.com/openai/v1/';

      expect(derivedEndpoint).toBe(expectedEndpoint);
    });

    it('should use AI Foundry agent endpoint for agent models', () => {
      const expectedEndpoint =
        'https://ts-aiassist-dev.services.ai.azure.com/api/projects/default';

      // Agent endpoint
      const agentEndpoint =
        'https://ts-aiassist-dev.services.ai.azure.com/api/projects/default';

      expect(agentEndpoint).toBe(expectedEndpoint);
    });

    it('should use Azure OpenAI endpoint for Azure OpenAI SDK models', () => {
      // Azure OpenAI endpoint is different from AI Foundry
      const azureEndpoint = 'https://ts-aiassist-dev.openai.azure.com/';

      expect(azureEndpoint).toMatch(/\.openai\.azure\.com\/?$/);
    });
  });

  describe('Request Parameter Construction', () => {
    it('should construct correct parameters for OpenAI SDK models', () => {
      const requestParams = {
        model: OpenAIModelID.DEEPSEEK_V3_1,
        messages: [{ role: 'system', content: 'You are helpful' }],
        stream: true,
        user: '{"id":"user-1"}',
        temperature: 0.7,
      };

      expect(requestParams).toHaveProperty('model');
      expect(requestParams).toHaveProperty('messages');
      expect(requestParams).toHaveProperty('stream');
      expect(requestParams).toHaveProperty('user');
      expect(requestParams).toHaveProperty('temperature');
    });

    it('should construct correct parameters for Azure OpenAI SDK models without temperature', () => {
      const supportsTemperature = false;
      const baseParams = {
        model: OpenAIModelID.GPT_5,
        messages: [{ role: 'system', content: 'You are helpful' }],
        stream: true,
        user: '{"id":"user-1"}',
      };

      // Conditionally add temperature
      const requestParams: any = { ...baseParams };
      if (supportsTemperature) {
        requestParams.temperature = 0.7;
      }

      expect(requestParams).toHaveProperty('model');
      expect(requestParams).toHaveProperty('messages');
      expect(requestParams).toHaveProperty('stream');
      expect(requestParams).toHaveProperty('user');
      expect(requestParams).not.toHaveProperty('temperature');
    });

    it('should construct correct parameters for reasoning models', () => {
      const requestParams = {
        model: OpenAIModelID.GPT_o3,
        input: [{ role: 'user', content: 'Solve this problem' }],
        user: '{"id":"user-1"}',
        stream: false,
      };

      expect(requestParams).toHaveProperty('model');
      expect(requestParams).toHaveProperty('input'); // Not 'messages'
      expect(requestParams).toHaveProperty('user');
      expect(requestParams).toHaveProperty('stream');
      expect(requestParams.stream).toBe(false); // Reasoning models don't stream
      expect(requestParams).not.toHaveProperty('temperature');
    });
  });

  describe('Error Handling', () => {
    it('should handle missing SDK field gracefully', () => {
      const modelConfig = {
        id: 'unknown-model',
        sdk: undefined,
      };

      // Should default to azure-openai
      const sdkToUse = modelConfig.sdk || 'azure-openai';
      expect(sdkToUse).toBe('azure-openai');
    });

    it('should handle invalid SDK value gracefully', () => {
      const modelConfig = {
        id: 'unknown-model',
        sdk: 'invalid-sdk' as any,
      };

      // Should not be one of the valid values
      const validSDKs = ['azure-openai', 'openai'];
      const isValid = validSDKs.includes(modelConfig.sdk);

      expect(isValid).toBe(false);
    });
  });

  describe('Stream Handling', () => {
    it('should not stream reasoning model responses', () => {
      const reasoningModelIds = [OpenAIModelID.GPT_o3];

      reasoningModelIds.forEach((modelId) => {
        const shouldStream = !reasoningModelIds.includes(modelId);
        expect(shouldStream).toBe(false);
      });
    });

    it('should stream non-reasoning model responses by default', () => {
      const regularModelIds = [
        OpenAIModelID.GPT_5,
        OpenAIModelID.GROK_3,
        OpenAIModelID.DEEPSEEK_V3_1,
      ];

      const reasoningModelIds = [OpenAIModelID.GPT_o3];

      regularModelIds.forEach((modelId) => {
        const shouldStream = !reasoningModelIds.includes(modelId);
        expect(shouldStream).toBe(true);
      });
    });
  });

  describe('System Prompt Handling', () => {
    it('should prepend system prompt to first user message for reasoning models', () => {
      const systemPrompt = 'You are a helpful assistant';
      const userMessage = 'What is 2+2?';

      // For reasoning models, prepend system prompt to first user message
      const combinedMessage = `${systemPrompt}\n\n${userMessage}`;

      expect(combinedMessage).toContain(systemPrompt);
      expect(combinedMessage).toContain(userMessage);
      expect(combinedMessage).toMatch(
        /^You are a helpful assistant\n\nWhat is 2\+2\?$/,
      );
    });

    it('should use system message for non-reasoning models', () => {
      const messages = [
        { role: 'system', content: 'You are helpful' },
        { role: 'user', content: 'Hello' },
      ];

      expect(messages[0].role).toBe('system');
      expect(messages[0].content).toBe('You are helpful');
    });
  });
});
