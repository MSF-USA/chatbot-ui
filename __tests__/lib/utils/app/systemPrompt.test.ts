import {
  BASE_SYSTEM_PROMPT,
  DEFAULT_USER_PROMPT,
  buildSystemPrompt,
  extractUserPrompt,
} from '@/lib/utils/app/systemPrompt';

import { describe, expect, it } from 'vitest';

describe('systemPrompt', () => {
  describe('constants', () => {
    it('should export BASE_SYSTEM_PROMPT', () => {
      expect(BASE_SYSTEM_PROMPT).toBeDefined();
      expect(typeof BASE_SYSTEM_PROMPT).toBe('string');
      expect(BASE_SYSTEM_PROMPT.length).toBeGreaterThan(0);
    });

    it('should export DEFAULT_USER_PROMPT', () => {
      expect(DEFAULT_USER_PROMPT).toBeDefined();
      expect(typeof DEFAULT_USER_PROMPT).toBe('string');
      expect(DEFAULT_USER_PROMPT.length).toBeGreaterThan(0);
    });

    it('BASE_SYSTEM_PROMPT should contain core behavior sections', () => {
      expect(BASE_SYSTEM_PROMPT).toContain('# Core Behavior');
      expect(BASE_SYSTEM_PROMPT).toContain('## Communication');
      expect(BASE_SYSTEM_PROMPT).toContain('## Response Formatting');
      expect(BASE_SYSTEM_PROMPT).toContain('## Safety');
    });

    it('BASE_SYSTEM_PROMPT should contain markdown guidance', () => {
      expect(BASE_SYSTEM_PROMPT).toContain('Markdown');
      expect(BASE_SYSTEM_PROMPT).toContain('code blocks');
    });

    it('BASE_SYSTEM_PROMPT should contain Mermaid diagram guidance', () => {
      expect(BASE_SYSTEM_PROMPT).toContain('Mermaid');
      expect(BASE_SYSTEM_PROMPT).toContain('flowchart');
      expect(BASE_SYSTEM_PROMPT).toContain('sequenceDiagram');
    });
  });

  describe('buildSystemPrompt', () => {
    it('should combine base and user prompts', () => {
      const userPrompt = 'Always respond in French';
      const result = buildSystemPrompt(userPrompt);

      expect(result).toContain(BASE_SYSTEM_PROMPT);
      expect(result).toContain('# User Instructions');
      expect(result).toContain(userPrompt);
    });

    it('should use DEFAULT_USER_PROMPT when no user prompt provided', () => {
      const result = buildSystemPrompt();

      expect(result).toContain(BASE_SYSTEM_PROMPT);
      expect(result).toContain('# User Instructions');
      expect(result).toContain(DEFAULT_USER_PROMPT);
    });

    it('should use DEFAULT_USER_PROMPT when user prompt is undefined', () => {
      const result = buildSystemPrompt(undefined);

      expect(result).toContain(DEFAULT_USER_PROMPT);
    });

    it('should use DEFAULT_USER_PROMPT when user prompt is empty string', () => {
      const result = buildSystemPrompt('');

      expect(result).toContain(DEFAULT_USER_PROMPT);
    });

    it('should use DEFAULT_USER_PROMPT when user prompt is whitespace only', () => {
      const result = buildSystemPrompt('   \n\t  ');

      expect(result).toContain(DEFAULT_USER_PROMPT);
    });

    it('should trim user prompt whitespace', () => {
      const userPrompt = '  Be concise  ';
      const result = buildSystemPrompt(userPrompt);

      expect(result).toContain('Be concise');
      expect(result).not.toContain('  Be concise  ');
    });

    it('should maintain proper structure with newlines', () => {
      const userPrompt = 'Custom instruction';
      const result = buildSystemPrompt(userPrompt);

      // Check proper separator between base and user sections
      expect(result).toContain('\n\n# User Instructions\n\n');
    });

    it('should handle multi-line user prompts', () => {
      const userPrompt = 'Line 1\nLine 2\nLine 3';
      const result = buildSystemPrompt(userPrompt);

      expect(result).toContain(userPrompt);
    });

    it('should handle user prompts with special characters', () => {
      const userPrompt = 'Use {{variables}} and <tags> properly';
      const result = buildSystemPrompt(userPrompt);

      expect(result).toContain(userPrompt);
    });

    it('should handle very long user prompts', () => {
      const userPrompt = 'a'.repeat(1000);
      const result = buildSystemPrompt(userPrompt);

      expect(result).toContain(userPrompt);
      expect(result.length).toBeGreaterThan(BASE_SYSTEM_PROMPT.length + 1000);
    });
  });

  describe('extractUserPrompt', () => {
    it('should extract user prompt from combined prompt', () => {
      const userPrompt = 'Custom instruction';
      const combined = buildSystemPrompt(userPrompt);
      const extracted = extractUserPrompt(combined);

      expect(extracted).toBe(userPrompt);
    });

    it('should return DEFAULT_USER_PROMPT if marker not found', () => {
      const legacyPrompt = 'Some legacy prompt without the marker';
      const extracted = extractUserPrompt(legacyPrompt);

      expect(extracted).toBe(legacyPrompt);
    });

    it('should return DEFAULT_USER_PROMPT for empty string', () => {
      const extracted = extractUserPrompt('');

      expect(extracted).toBe(DEFAULT_USER_PROMPT);
    });

    it('should handle multi-line user instructions', () => {
      const userPrompt = 'Line 1\nLine 2\nLine 3';
      const combined = buildSystemPrompt(userPrompt);
      const extracted = extractUserPrompt(combined);

      expect(extracted).toBe(userPrompt);
    });

    it('should handle user prompt with special characters', () => {
      const userPrompt = 'Test with {{var}} and <xml> tags';
      const combined = buildSystemPrompt(userPrompt);
      const extracted = extractUserPrompt(combined);

      expect(extracted).toBe(userPrompt);
    });

    it('should return DEFAULT_USER_PROMPT if only marker present with no content', () => {
      const promptWithEmptyUserSection =
        BASE_SYSTEM_PROMPT + '\n\n# User Instructions\n\n';
      const extracted = extractUserPrompt(promptWithEmptyUserSection);

      expect(extracted).toBe(DEFAULT_USER_PROMPT);
    });
  });

  describe('integration', () => {
    it('should round-trip user prompt correctly', () => {
      const originalUserPrompt = 'Always be helpful and concise';
      const combined = buildSystemPrompt(originalUserPrompt);
      const extracted = extractUserPrompt(combined);

      expect(extracted).toBe(originalUserPrompt);
    });

    it('should handle default user prompt round-trip', () => {
      const combined = buildSystemPrompt();
      const extracted = extractUserPrompt(combined);

      expect(extracted).toBe(DEFAULT_USER_PROMPT);
    });

    it('should produce deterministic output', () => {
      const userPrompt = 'Test prompt';
      const result1 = buildSystemPrompt(userPrompt);
      const result2 = buildSystemPrompt(userPrompt);

      expect(result1).toBe(result2);
    });
  });
});
