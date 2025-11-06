import { StreamingService } from '@/lib/services/shared/StreamingService';

import { DEFAULT_TEMPERATURE } from '@/lib/utils/app/const';

import { describe, expect, it } from 'vitest';

describe('StreamingService', () => {
  let service: StreamingService;

  beforeEach(() => {
    service = new StreamingService();
  });

  describe('shouldStream', () => {
    it('should return true for standard models when streaming is requested', () => {
      expect(service.shouldStream('gpt-4.1', true)).toBe(true);
      expect(service.shouldStream('gpt-5', true)).toBe(true);
      expect(service.shouldStream('gpt-5-chat', true)).toBe(true);
      expect(service.shouldStream('grok-3', true)).toBe(true);
    });

    it('should return false for standard models when streaming is not requested', () => {
      expect(service.shouldStream('gpt-4.1', false)).toBe(false);
      expect(service.shouldStream('gpt-5', false)).toBe(false);
    });

    it('should return false for reasoning models even when streaming is requested', () => {
      expect(service.shouldStream('o3', true)).toBe(false);
      expect(service.shouldStream('DeepSeek-R1', true)).toBe(false);
    });

    it('should return false for reasoning models when streaming is not requested', () => {
      expect(service.shouldStream('o3', false)).toBe(false);
      expect(service.shouldStream('DeepSeek-R1', false)).toBe(false);
    });
  });

  describe('getTemperature', () => {
    it('should return requested temperature for standard models', () => {
      expect(service.getTemperature('gpt-4.1', 0.7)).toBe(0.7);
      expect(service.getTemperature('gpt-5', 0.5)).toBe(0.5);
      expect(service.getTemperature('gpt-5-chat', 1.0)).toBe(1.0);
    });

    it('should return default temperature for standard models when not specified', () => {
      expect(service.getTemperature('gpt-4.1')).toBe(DEFAULT_TEMPERATURE);
      expect(service.getTemperature('gpt-5')).toBe(DEFAULT_TEMPERATURE);
    });

    it('should return 1 for reasoning models regardless of requested temperature', () => {
      expect(service.getTemperature('o3', 0.5)).toBe(1);
      expect(service.getTemperature('DeepSeek-R1', 0.7)).toBe(1);
    });

    it('should return 1 for reasoning models when no temperature specified', () => {
      expect(service.getTemperature('o3')).toBe(1);
      expect(service.getTemperature('DeepSeek-R1')).toBe(1);
    });

    it('should handle edge case temperatures for standard models', () => {
      expect(service.getTemperature('gpt-4.1', 0)).toBe(0);
      expect(service.getTemperature('gpt-5', 2)).toBe(2);
    });
  });

  describe('isReasoningModel', () => {
    it('should return true for reasoning models', () => {
      expect(service.isReasoningModel('o3')).toBe(true);
      expect(service.isReasoningModel('DeepSeek-R1')).toBe(true);
    });

    it('should return false for standard models', () => {
      expect(service.isReasoningModel('gpt-4.1')).toBe(false);
      expect(service.isReasoningModel('gpt-5')).toBe(false);
      expect(service.isReasoningModel('gpt-5-chat')).toBe(false);
      expect(service.isReasoningModel('grok-3')).toBe(false);
    });

    it('should return false for invalid model IDs', () => {
      expect(service.isReasoningModel('invalid-model')).toBe(false);
      expect(service.isReasoningModel('')).toBe(false);
    });
  });

  describe('getStreamConfig', () => {
    it('should return correct config for standard model with streaming', () => {
      const config = service.getStreamConfig('gpt-5', true, 0.7);

      expect(config.stream).toBe(true);
      expect(config.temperature).toBe(0.7);
    });

    it('should return correct config for standard model without streaming', () => {
      const config = service.getStreamConfig('gpt-4.1', false, 0.8);

      expect(config.stream).toBe(false);
      expect(config.temperature).toBe(0.8);
    });

    it('should return correct config for reasoning model with requested streaming', () => {
      const config = service.getStreamConfig('o3', true, 0.5);

      // Reasoning models: no streaming, fixed temp of 1
      expect(config.stream).toBe(false);
      expect(config.temperature).toBe(1);
    });

    it('should return correct config for reasoning model without requested streaming', () => {
      const config = service.getStreamConfig('DeepSeek-R1', false, 0.7);

      expect(config.stream).toBe(false);
      expect(config.temperature).toBe(1);
    });

    it('should use default temperature when not specified for standard models', () => {
      const config = service.getStreamConfig('gpt-5', true);

      expect(config.stream).toBe(true);
      expect(config.temperature).toBe(DEFAULT_TEMPERATURE);
    });

    it('should use temperature 1 for reasoning models even when not specified', () => {
      const config = service.getStreamConfig('o3', true);

      expect(config.stream).toBe(false);
      expect(config.temperature).toBe(1);
    });
  });

  describe('integration scenarios', () => {
    it('should handle GPT-5 chat with custom settings', () => {
      const config = service.getStreamConfig('gpt-5', true, 0.9);

      expect(config).toEqual({
        stream: true,
        temperature: 0.9,
      });
    });

    it('should handle o3 reasoning without streaming', () => {
      const config = service.getStreamConfig('o3', true, 0.5);

      expect(config).toEqual({
        stream: false,
        temperature: 1,
      });
    });

    it('should handle DeepSeek-R1 reasoning model', () => {
      const config = service.getStreamConfig('DeepSeek-R1', true, 0.6);

      expect(config).toEqual({
        stream: false,
        temperature: 1,
      });
    });
  });
});
