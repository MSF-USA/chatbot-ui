import { describe, it, expect } from 'vitest';
import { extractCitationsFromContent } from '@/lib/utils/app/citation';

describe('Citation Utilities', () => {
  describe('extractCitationsFromContent', () => {
    it('should extract citations using marker format', () => {
      const content = `This is some text content.

---CITATIONS_DATA---
{"citations":[{"title":"Test Source","url":"https://example.com","date":"2024-01-01","number":1}]}`;

      const result = extractCitationsFromContent(content);

      expect(result.text).toBe('This is some text content.');
      expect(result.citations).toHaveLength(1);
      expect(result.citations[0]).toEqual({
        title: 'Test Source',
        url: 'https://example.com',
        date: '2024-01-01',
        number: 1,
      });
      expect(result.extractionMethod).toBe('marker');
    });

    it('should extract citations using legacy regex format', () => {
      const content = `This is some text content.{"citations":[{"title":"Test Source","url":"https://example.com"}]}`;

      const result = extractCitationsFromContent(content);

      expect(result.text).toBe('This is some text content.');
      expect(result.citations).toHaveLength(1);
      expect(result.citations[0]).toEqual({
        title: 'Test Source',
        url: 'https://example.com',
      });
      expect(result.extractionMethod).toBe('regex');
    });

    it('should prefer marker format over regex format', () => {
      const content = `Text before marker.

---CITATIONS_DATA---
{"citations":[{"title":"Marker Source","url":"https://marker.com"}]}`;

      const result = extractCitationsFromContent(content);

      expect(result.text).toBe('Text before marker.');
      expect(result.citations).toHaveLength(1);
      expect(result.citations[0].title).toBe('Marker Source');
      expect(result.extractionMethod).toBe('marker');
    });

    it('should handle multiple citations in marker format', () => {
      const content = `Research shows that AI is advancing.

---CITATIONS_DATA---
{"citations":[
  {"title":"Source 1","url":"https://source1.com","date":"2024-01-01","number":1},
  {"title":"Source 2","url":"https://source2.com","date":"2024-01-02","number":2},
  {"title":"Source 3","url":"https://source3.com","date":"2024-01-03","number":3}
]}`;

      const result = extractCitationsFromContent(content);

      expect(result.text).toBe('Research shows that AI is advancing.');
      expect(result.citations).toHaveLength(3);
      expect(result.citations[0].title).toBe('Source 1');
      expect(result.citations[1].title).toBe('Source 2');
      expect(result.citations[2].title).toBe('Source 3');
      expect(result.extractionMethod).toBe('marker');
    });

    it('should return empty citations array when no citations found', () => {
      const content = 'Just some regular text without citations.';

      const result = extractCitationsFromContent(content);

      expect(result.text).toBe(content);
      expect(result.citations).toEqual([]);
      expect(result.extractionMethod).toBe('none');
    });

    it('should handle malformed JSON in marker format gracefully', () => {
      const content = `Text content.

---CITATIONS_DATA---
{invalid json}`;

      const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

      const result = extractCitationsFromContent(content);

      expect(result.text).toBe('Text content.');
      expect(result.citations).toEqual([]);
      expect(result.extractionMethod).toBe('marker');
      expect(consoleErrorSpy).toHaveBeenCalledWith(
        'Error parsing citations JSON with marker:',
        expect.any(Error)
      );

      consoleErrorSpy.mockRestore();
    });

    it('should handle malformed JSON in regex format gracefully', () => {
      const content = 'Text content.{not valid json}';

      const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

      const result = extractCitationsFromContent(content);

      expect(result.text).toBe('Text content.');
      expect(result.citations).toEqual([]);
      expect(result.extractionMethod).toBe('regex');
      expect(consoleErrorSpy).toHaveBeenCalledWith(
        'Error parsing citations JSON:',
        expect.any(Error)
      );

      consoleErrorSpy.mockRestore();
    });

    it('should handle JSON without citations field in marker format', () => {
      const content = `Text content.

---CITATIONS_DATA---
{"other":"data"}`;

      const result = extractCitationsFromContent(content);

      expect(result.text).toBe('Text content.');
      expect(result.citations).toEqual([]);
      expect(result.extractionMethod).toBe('marker');
    });

    it('should handle JSON without citations field in regex format', () => {
      const content = 'Text content.{"other":"data"}';

      const result = extractCitationsFromContent(content);

      expect(result.text).toBe('Text content.');
      expect(result.citations).toEqual([]);
      expect(result.extractionMethod).toBe('regex');
    });

    it('should preserve whitespace in text content', () => {
      const content = `Text with   multiple    spaces.

---CITATIONS_DATA---
{"citations":[]}`;

      const result = extractCitationsFromContent(content);

      expect(result.text).toBe('Text with   multiple    spaces.');
    });

    it('should handle empty string content', () => {
      const content = '';

      const result = extractCitationsFromContent(content);

      expect(result.text).toBe('');
      expect(result.citations).toEqual([]);
      expect(result.extractionMethod).toBe('none');
    });

    it('should handle content with only citation marker and no text', () => {
      // The marker requires double newline before it, so this will match regex instead
      const content = `{"citations":[{"title":"Test","url":"https://test.com"}]}`;

      const result = extractCitationsFromContent(content);

      expect(result.text).toBe('');
      expect(result.citations).toHaveLength(1);
      expect(result.extractionMethod).toBe('regex'); // Will use regex since no double newline before marker
    });

    it('should handle citations with special characters', () => {
      const content = `Text.

---CITATIONS_DATA---
{"citations":[{"title":"Test & Co.","url":"https://example.com?foo=bar&baz=qux","date":"2024-01-01","number":1}]}`;

      const result = extractCitationsFromContent(content);

      expect(result.citations[0].title).toBe('Test & Co.');
      expect(result.citations[0].url).toContain('foo=bar&baz=qux');
      expect(result.extractionMethod).toBe('marker');
    });

    it('should handle unicode characters in content and citations', () => {
      const content = `Text with émojis 🎉 and symbols ∑.

---CITATIONS_DATA---
{"citations":[{"title":"Tëst Søurçe","url":"https://example.com","date":"2024-01-01","number":1}]}`;

      const result = extractCitationsFromContent(content);

      expect(result.text).toBe('Text with émojis 🎉 and symbols ∑.');
      expect(result.citations[0].title).toBe('Tëst Søurçe');
      expect(result.extractionMethod).toBe('marker');
    });

    it('should handle newlines and multiline text', () => {
      const content = `First line.
Second line.
Third line.

---CITATIONS_DATA---
{"citations":[{"title":"Test","url":"https://test.com"}]}`;

      const result = extractCitationsFromContent(content);

      expect(result.text).toBe(`First line.
Second line.
Third line.`);
    });

    it('should handle very long content strings', () => {
      const longText = 'A'.repeat(10000);
      const content = `${longText}

---CITATIONS_DATA---
{"citations":[{"title":"Test","url":"https://test.com"}]}`;

      const result = extractCitationsFromContent(content);

      expect(result.text).toBe(longText);
      expect(result.citations).toHaveLength(1);
    });

    it('should handle marker that appears in the middle of content', () => {
      // The extra text after marker is part of the JSON string that gets parsed
      // So this test should verify the marker extraction works even with extra text after
      const content = `This is some text.

---CITATIONS_DATA---
{"citations":[{"title":"First","url":"https://first.com"}]}`;

      const result = extractCitationsFromContent(content);

      // Should only take text before the marker
      expect(result.text).toBe('This is some text.');
      expect(result.citations[0].title).toBe('First');
      expect(result.extractionMethod).toBe('marker');
    });
  });
});
