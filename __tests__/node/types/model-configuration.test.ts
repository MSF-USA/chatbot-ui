import { describe, expect, it } from 'vitest';
import { OpenAIModels, OpenAIModelID } from '@/types/openai';

describe('Model Configuration', () => {
  describe('SDK Configuration', () => {
    it('GPT-5 models should use azure-openai SDK', () => {
      expect(OpenAIModels[OpenAIModelID.GPT_5].sdk).toBe('azure-openai');
      expect(OpenAIModels[OpenAIModelID.GPT_5_PRO].sdk).toBe('azure-openai');
      expect(OpenAIModels[OpenAIModelID.GPT_5_CHAT].sdk).toBe('azure-openai');
    });

    it('o3 should use azure-openai SDK', () => {
      expect(OpenAIModels[OpenAIModelID.GPT_o3].sdk).toBe('azure-openai');
    });

    it('DeepSeek should use openai SDK', () => {
      expect(OpenAIModels[OpenAIModelID.DEEPSEEK_V3_1].sdk).toBe('openai');
    });

    it('Grok models should use openai SDK', () => {
      expect(OpenAIModels[OpenAIModelID.GROK_3].sdk).toBe('openai');
      expect(OpenAIModels[OpenAIModelID.GROK_4_FAST_REASONING].sdk).toBe('openai');
    });
  });

  describe('Temperature Support', () => {
    it('GPT-5 models should not support temperature', () => {
      expect(OpenAIModels[OpenAIModelID.GPT_5].supportsTemperature).toBe(false);
      expect(OpenAIModels[OpenAIModelID.GPT_5_PRO].supportsTemperature).toBe(false);
      expect(OpenAIModels[OpenAIModelID.GPT_5_CHAT].supportsTemperature).toBe(false);
    });

    it('o3 should not support temperature', () => {
      expect(OpenAIModels[OpenAIModelID.GPT_o3].supportsTemperature).toBe(false);
    });

    it('DeepSeek should support temperature', () => {
      expect(OpenAIModels[OpenAIModelID.DEEPSEEK_V3_1].supportsTemperature).toBe(true);
    });

    it('Grok models should support temperature', () => {
      expect(OpenAIModels[OpenAIModelID.GROK_3].supportsTemperature).toBe(true);
      expect(OpenAIModels[OpenAIModelID.GROK_4_FAST_REASONING].supportsTemperature).toBe(true);
    });
  });

  describe('Agent Configuration', () => {
    it('GPT-5 should have correct agent ID', () => {
      expect(OpenAIModels[OpenAIModelID.GPT_5].agentId).toBe('asst_DHpJVkpNlBiaGgglkvvFALMI');
    });

    it('GPT-5 Chat should have correct agent ID', () => {
      expect(OpenAIModels[OpenAIModelID.GPT_5_CHAT].agentId).toBe('asst_qyXsZc1wjTvLYHyyFYrXV3Ev');
      expect(OpenAIModels[OpenAIModelID.GPT_5_CHAT].isAgent).toBe(true);
    });

    it('GPT-5 Pro should not have agent capabilities', () => {
      expect(OpenAIModels[OpenAIModelID.GPT_5_PRO].agentId).toBeUndefined();
      expect(OpenAIModels[OpenAIModelID.GPT_5_PRO].isAgent).toBeUndefined();
    });

    it('non-OpenAI models should not have agent capabilities', () => {
      expect(OpenAIModels[OpenAIModelID.DEEPSEEK_V3_1].agentId).toBeUndefined();
      expect(OpenAIModels[OpenAIModelID.GROK_3].agentId).toBeUndefined();
      expect(OpenAIModels[OpenAIModelID.GROK_4_FAST_REASONING].agentId).toBeUndefined();
    });
  });

  describe('Provider Configuration', () => {
    it('GPT models should have openai provider', () => {
      expect(OpenAIModels[OpenAIModelID.GPT_5].provider).toBe('openai');
      expect(OpenAIModels[OpenAIModelID.GPT_5_PRO].provider).toBe('openai');
      expect(OpenAIModels[OpenAIModelID.GPT_5_CHAT].provider).toBe('openai');
      expect(OpenAIModels[OpenAIModelID.GPT_o3].provider).toBe('openai');
    });

    it('DeepSeek should have deepseek provider', () => {
      expect(OpenAIModels[OpenAIModelID.DEEPSEEK_V3_1].provider).toBe('deepseek');
    });

    it('Grok models should have xai provider', () => {
      expect(OpenAIModels[OpenAIModelID.GROK_3].provider).toBe('xai');
      expect(OpenAIModels[OpenAIModelID.GROK_4_FAST_REASONING].provider).toBe('xai');
    });
  });

  describe('Model Types', () => {
    it('GPT-5 and GPT-5 Pro should be omni models', () => {
      expect(OpenAIModels[OpenAIModelID.GPT_5].modelType).toBe('omni');
      expect(OpenAIModels[OpenAIModelID.GPT_5_PRO].modelType).toBe('omni');
    });

    it('GPT-5 Chat should be agent model', () => {
      expect(OpenAIModels[OpenAIModelID.GPT_5_CHAT].modelType).toBe('agent');
    });

    it('o3 and Grok 4 Fast Reasoning should be reasoning models', () => {
      expect(OpenAIModels[OpenAIModelID.GPT_o3].modelType).toBe('reasoning');
      expect(OpenAIModels[OpenAIModelID.GROK_4_FAST_REASONING].modelType).toBe('reasoning');
    });

    it('Grok 3 should be omni model', () => {
      expect(OpenAIModels[OpenAIModelID.GROK_3].modelType).toBe('omni');
    });

    it('DeepSeek should be foundational model', () => {
      expect(OpenAIModels[OpenAIModelID.DEEPSEEK_V3_1].modelType).toBe('foundational');
    });
  });

  describe('Knowledge Cutoffs', () => {
    it('all models should have knowledge cutoff dates', () => {
      Object.values(OpenAIModels).forEach((model) => {
        expect(model.knowledgeCutoff).toBeDefined();
        expect(model.knowledgeCutoff).not.toBe('');
      });
    });

    it('knowledge cutoffs should be properly formatted', () => {
      Object.values(OpenAIModels).forEach((model) => {
        // Should match format like "Aug 6, 2025 8:00 PM" or "May 13, 2025 12:16 AM"
        expect(model.knowledgeCutoff).toMatch(/^[A-Z][a-z]{2} \d{1,2}, \d{4} \d{1,2}:\d{2} (AM|PM)$/);
      });
    });
  });

  describe('Legacy Models', () => {
    it('no models should be marked as legacy', () => {
      Object.values(OpenAIModels).forEach((model) => {
        expect(model.isLegacy).not.toBe(true);
      });
    });
  });

  describe('Model Completeness', () => {
    it('all models should have required fields', () => {
      Object.values(OpenAIModels).forEach((model) => {
        expect(model.id).toBeDefined();
        expect(model.name).toBeDefined();
        expect(model.maxLength).toBeGreaterThan(0);
        expect(model.tokenLimit).toBeGreaterThan(0);
        expect(model.description).toBeDefined();
        expect(model.provider).toBeDefined();
        expect(model.knowledgeCutoff).toBeDefined();
        expect(model.sdk).toBeDefined();
        expect(model.supportsTemperature).toBeDefined();
      });
    });

    it('agent models should have agent-specific fields', () => {
      const agentModels = Object.values(OpenAIModels).filter(m => m.isAgent || m.agentId);

      agentModels.forEach((model) => {
        expect(model.agentId).toBeDefined();
        expect(model.agentId).toMatch(/^asst_[A-Za-z0-9]+$/);
      });
    });
  });

  describe('SDK and Temperature Consistency', () => {
    it('azure-openai SDK models should not support temperature (OpenAI constraint)', () => {
      const azureOpenAIModels = Object.values(OpenAIModels).filter(m => m.sdk === 'azure-openai');

      azureOpenAIModels.forEach((model) => {
        expect(model.supportsTemperature).toBe(false);
      });
    });

    it('openai SDK models should support temperature', () => {
      const openAISDKModels = Object.values(OpenAIModels).filter(m => m.sdk === 'openai');

      openAISDKModels.forEach((model) => {
        expect(model.supportsTemperature).toBe(true);
      });
    });
  });

  describe('Reasoning Models', () => {
    it('reasoning models should have correct configuration', () => {
      const reasoningModels = Object.values(OpenAIModels).filter(
        m => m.modelType === 'reasoning'
      );

      reasoningModels.forEach((model) => {
        // Reasoning models use fixed temperature internally
        expect(model.temperature).toBe(1);
        // Should not allow streaming in some cases
        if (model.id === OpenAIModelID.GPT_o3 || model.id === OpenAIModelID.GROK_4_FAST_REASONING) {
          expect(model.stream).toBe(false);
        }
      });
    });
  });
});
