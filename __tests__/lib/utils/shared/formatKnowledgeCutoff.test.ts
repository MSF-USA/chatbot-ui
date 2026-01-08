import { formatKnowledgeCutoff } from '@/lib/utils/shared/formatKnowledgeCutoff';

import { describe, expect, it } from 'vitest';

describe('formatKnowledgeCutoff', () => {
  describe('returns null for empty/undefined input', () => {
    it('returns null for undefined', () => {
      expect(formatKnowledgeCutoff(undefined, 'en')).toBeNull();
    });

    it('returns null for empty string', () => {
      expect(formatKnowledgeCutoff('', 'en')).toBeNull();
    });
  });

  describe('month-only format (YYYY-MM)', () => {
    it('formats month-only date in English', () => {
      const result = formatKnowledgeCutoff('2025-12', 'en');
      expect(result).toContain('2025');
      expect(result).toContain('Dec');
    });

    it('formats month-only date in French', () => {
      const result = formatKnowledgeCutoff('2025-01', 'fr');
      expect(result).toContain('2025');
      // French uses lowercase month abbreviations
      expect(result?.toLowerCase()).toContain('janv');
    });
  });

  describe('date-only format (YYYY-MM-DD)', () => {
    it('formats date in English', () => {
      const result = formatKnowledgeCutoff('2025-01-20', 'en');
      expect(result).toContain('2025');
      expect(result).toContain('Jan');
      expect(result).toContain('20');
    });

    it('formats date in German', () => {
      const result = formatKnowledgeCutoff('2025-04-16', 'de');
      expect(result).toContain('2025');
      // German month abbreviation for April
      expect(result).toContain('Apr');
      expect(result).toContain('16');
    });
  });

  describe('date-time format (YYYY-MM-DDTHH:MM)', () => {
    it('formats date-time in English', () => {
      const result = formatKnowledgeCutoff('2025-08-06T20:00', 'en-US');
      expect(result).toContain('2025');
      expect(result).toContain('Aug');
      expect(result).toContain('6');
      // Should include time - exact format varies by locale
      expect(result).toMatch(/\d{1,2}:\d{2}/);
    });

    it('formats date-time in Japanese', () => {
      const result = formatKnowledgeCutoff('2025-05-07T07:11', 'ja');
      expect(result).toContain('2025');
      // Japanese uses numeric format
      expect(result).toMatch(/\d{1,2}:\d{2}/);
    });
  });

  describe('locale variations', () => {
    const testDate = '2025-12';

    it('formats correctly for different locales', () => {
      // Just verify it returns a non-empty string for various locales
      const locales = ['en', 'fr', 'de', 'es', 'ja', 'zh', 'ar', 'ru'];

      locales.forEach((locale) => {
        const result = formatKnowledgeCutoff(testDate, locale);
        expect(result).toBeTruthy();
        expect(typeof result).toBe('string');
        expect(result!.length).toBeGreaterThan(0);
      });
    });
  });

  describe('edge cases', () => {
    it('handles single-digit months correctly', () => {
      const result = formatKnowledgeCutoff('2025-01', 'en');
      expect(result).toContain('Jan');
    });

    it('handles December correctly', () => {
      const result = formatKnowledgeCutoff('2025-12', 'en');
      expect(result).toContain('Dec');
    });

    it('handles leap year date', () => {
      const result = formatKnowledgeCutoff('2024-02-29', 'en');
      expect(result).toContain('Feb');
      expect(result).toContain('29');
    });
  });
});
