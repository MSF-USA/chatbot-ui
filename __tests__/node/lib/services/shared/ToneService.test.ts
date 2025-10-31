import { ToneService } from '@/lib/services/shared/ToneService';

import { Message } from '@/types/chat';

import fs from 'fs';
import path from 'path';
import { beforeEach, describe, expect, it, vi } from 'vitest';

// Mock fs module
vi.mock('fs');

describe('ToneService', () => {
  let service: ToneService;
  const testUserId = 'test-user-123';
  const mockCwd = '/fake-cwd';

  beforeEach(() => {
    vi.clearAllMocks();
    vi.spyOn(process, 'cwd').mockReturnValue(mockCwd);
    service = new ToneService();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('applyTone', () => {
    it('should return original prompt when no tone is specified', () => {
      const messages: Message[] = [
        {
          role: 'user',
          content: 'Hello',
        },
      ];
      const systemPrompt = 'You are a helpful assistant.';

      const result = service.applyTone(messages, systemPrompt, testUserId);

      expect(result).toBe(systemPrompt);
    });

    it('should apply tone when toneId is specified in latest user message', () => {
      const settingsData = {
        tones: [
          {
            id: 'professional',
            name: 'Professional',
            voiceRules: 'Use formal language and proper grammar.',
          },
        ],
      };

      vi.mocked(fs.existsSync).mockReturnValue(true);
      vi.mocked(fs.readFileSync).mockReturnValue(JSON.stringify(settingsData));

      const messages: Message[] = [
        {
          role: 'user',
          content: 'Hello',
          toneId: 'professional',
        },
      ];
      const systemPrompt = 'You are a helpful assistant.';

      const result = service.applyTone(messages, systemPrompt, testUserId);

      expect(result).toContain(systemPrompt);
      expect(result).toContain('# Writing Style');
      expect(result).toContain('Use formal language and proper grammar.');
      expect(fs.existsSync).toHaveBeenCalledWith(
        path.join(mockCwd, 'data', 'users', testUserId, 'settings.json'),
      );
    });

    it('should only apply tone from latest user message', () => {
      const settingsData = {
        tones: [
          {
            id: 'casual',
            name: 'Casual',
            voiceRules: 'Use casual language.',
          },
          {
            id: 'professional',
            name: 'Professional',
            voiceRules: 'Use formal language.',
          },
        ],
      };

      vi.mocked(fs.existsSync).mockReturnValue(true);
      vi.mocked(fs.readFileSync).mockReturnValue(JSON.stringify(settingsData));

      const messages: Message[] = [
        {
          role: 'user',
          content: 'First message',
          toneId: 'casual',
        },
        {
          role: 'assistant',
          content: 'Response',
        },
        {
          role: 'user',
          content: 'Latest message',
          toneId: 'professional',
        },
      ];
      const systemPrompt = 'You are a helpful assistant.';

      const result = service.applyTone(messages, systemPrompt, testUserId);

      expect(result).toContain('Use formal language.');
      expect(result).not.toContain('Use casual language.');
    });

    it('should return original prompt when tone has no voiceRules', () => {
      const settingsData = {
        tones: [
          {
            id: 'empty-tone',
            name: 'Empty Tone',
            // No voiceRules
          },
        ],
      };

      vi.mocked(fs.existsSync).mockReturnValue(true);
      vi.mocked(fs.readFileSync).mockReturnValue(JSON.stringify(settingsData));

      const messages: Message[] = [
        {
          role: 'user',
          content: 'Hello',
          toneId: 'empty-tone',
        },
      ];
      const systemPrompt = 'You are a helpful assistant.';

      const result = service.applyTone(messages, systemPrompt, testUserId);

      expect(result).toBe(systemPrompt);
    });

    it('should return original prompt when settings file does not exist', () => {
      vi.mocked(fs.existsSync).mockReturnValue(false);

      const messages: Message[] = [
        {
          role: 'user',
          content: 'Hello',
          toneId: 'nonexistent',
        },
      ];
      const systemPrompt = 'You are a helpful assistant.';

      const result = service.applyTone(messages, systemPrompt, testUserId);

      expect(result).toBe(systemPrompt);
    });

    it('should return original prompt when tone ID not found', () => {
      const settingsData = {
        tones: [
          {
            id: 'professional',
            name: 'Professional',
            voiceRules: 'Use formal language.',
          },
        ],
      };

      vi.mocked(fs.existsSync).mockReturnValue(true);
      vi.mocked(fs.readFileSync).mockReturnValue(JSON.stringify(settingsData));

      const messages: Message[] = [
        {
          role: 'user',
          content: 'Hello',
          toneId: 'nonexistent-tone',
        },
      ];
      const systemPrompt = 'You are a helpful assistant.';

      const result = service.applyTone(messages, systemPrompt, testUserId);

      expect(result).toBe(systemPrompt);
    });

    it('should handle corrupted settings file gracefully', () => {
      vi.mocked(fs.existsSync).mockReturnValue(true);
      vi.mocked(fs.readFileSync).mockReturnValue('invalid json {{{');

      const messages: Message[] = [
        {
          role: 'user',
          content: 'Hello',
          toneId: 'some-tone',
        },
      ];
      const systemPrompt = 'You are a helpful assistant.';

      const result = service.applyTone(messages, systemPrompt, testUserId);

      expect(result).toBe(systemPrompt);
    });

    it('should ignore assistant messages when finding latest user message', () => {
      const settingsData = {
        tones: [
          {
            id: 'professional',
            name: 'Professional',
            voiceRules: 'Use formal language.',
          },
        ],
      };

      vi.mocked(fs.existsSync).mockReturnValue(true);
      vi.mocked(fs.readFileSync).mockReturnValue(JSON.stringify(settingsData));

      const messages: Message[] = [
        {
          role: 'user',
          content: 'First',
          toneId: 'professional',
        },
        {
          role: 'assistant',
          content: 'Response',
          toneId: 'should-be-ignored' as any,
        },
      ];
      const systemPrompt = 'You are a helpful assistant.';

      const result = service.applyTone(messages, systemPrompt, testUserId);

      expect(result).toContain('Use formal language.');
    });
  });

  describe('getUserTones', () => {
    it('should return tones from settings file', () => {
      const settingsData = {
        tones: [
          {
            id: 'professional',
            name: 'Professional',
            voiceRules: 'Use formal language.',
          },
          {
            id: 'casual',
            name: 'Casual',
            voiceRules: 'Use casual language.',
          },
        ],
      };

      vi.mocked(fs.existsSync).mockReturnValue(true);
      vi.mocked(fs.readFileSync).mockReturnValue(JSON.stringify(settingsData));

      const result = service.getUserTones(testUserId);

      expect(result).toHaveLength(2);
      expect(result[0].id).toBe('professional');
      expect(result[1].id).toBe('casual');
    });

    it('should return empty array when settings file does not exist', () => {
      vi.mocked(fs.existsSync).mockReturnValue(false);

      const result = service.getUserTones(testUserId);

      expect(result).toEqual([]);
    });

    it('should return empty array when tones property is missing', () => {
      const settingsData = {
        otherSettings: 'value',
      };

      vi.mocked(fs.existsSync).mockReturnValue(true);
      vi.mocked(fs.readFileSync).mockReturnValue(JSON.stringify(settingsData));

      const result = service.getUserTones(testUserId);

      expect(result).toEqual([]);
    });

    it('should return empty array when settings file is corrupted', () => {
      vi.mocked(fs.existsSync).mockReturnValue(true);
      vi.mocked(fs.readFileSync).mockReturnValue('invalid json');

      const result = service.getUserTones(testUserId);

      expect(result).toEqual([]);
    });

    it('should return empty tones array when tones is null', () => {
      const settingsData = {
        tones: null,
      };

      vi.mocked(fs.existsSync).mockReturnValue(true);
      vi.mocked(fs.readFileSync).mockReturnValue(JSON.stringify(settingsData));

      const result = service.getUserTones(testUserId);

      expect(result).toEqual([]);
    });
  });

  describe('integration scenarios', () => {
    it('should handle complete tone application workflow', () => {
      const settingsData = {
        tones: [
          {
            id: 'professional',
            name: 'Professional',
            voiceRules: 'Use formal language. Avoid contractions. Be precise.',
          },
          {
            id: 'friendly',
            name: 'Friendly',
            voiceRules: 'Be warm and approachable. Use casual language.',
          },
        ],
      };

      vi.mocked(fs.existsSync).mockReturnValue(true);
      vi.mocked(fs.readFileSync).mockReturnValue(JSON.stringify(settingsData));

      // Get available tones
      const availableTones = service.getUserTones(testUserId);
      expect(availableTones).toHaveLength(2);

      // Apply professional tone
      const messages: Message[] = [
        {
          role: 'user',
          content: 'Write an email to my manager',
          toneId: 'professional',
        },
      ];
      const systemPrompt =
        'You are an AI assistant that helps with writing tasks.';

      const enhancedPrompt = service.applyTone(
        messages,
        systemPrompt,
        testUserId,
      );

      expect(enhancedPrompt).toContain(systemPrompt);
      expect(enhancedPrompt).toContain('# Writing Style');
      expect(enhancedPrompt).toContain('Use formal language');
      expect(enhancedPrompt).toContain('Avoid contractions');
    });

    it('should handle conversation with changing tones', () => {
      const settingsData = {
        tones: [
          {
            id: 'professional',
            name: 'Professional',
            voiceRules: 'Use formal language.',
          },
          {
            id: 'casual',
            name: 'Casual',
            voiceRules: 'Be casual and friendly.',
          },
        ],
      };

      vi.mocked(fs.existsSync).mockReturnValue(true);
      vi.mocked(fs.readFileSync).mockReturnValue(JSON.stringify(settingsData));

      const systemPrompt = 'You are a helpful assistant.';

      // First message with professional tone
      let messages: Message[] = [
        {
          role: 'user',
          content: 'Draft a business proposal',
          toneId: 'professional',
        },
      ];

      let result = service.applyTone(messages, systemPrompt, testUserId);
      expect(result).toContain('Use formal language.');

      // Add messages and switch to casual tone
      messages = [
        ...messages,
        {
          role: 'assistant',
          content: 'Here is your proposal...',
        },
        {
          role: 'user',
          content: 'Now write a casual email to a friend',
          toneId: 'casual',
        },
      ];

      result = service.applyTone(messages, systemPrompt, testUserId);
      expect(result).toContain('Be casual and friendly.');
      expect(result).not.toContain('Use formal language.');
    });
  });
});
