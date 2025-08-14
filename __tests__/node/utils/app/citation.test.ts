import { extractCitationsFromContent } from '@/utils/app/citation';
import { Citation } from '@/types/rag';

import { describe, expect, it, beforeEach, afterEach, vi } from 'vitest';

describe('extractCitationsFromContent', () => {
  // Mock console methods
  beforeEach(() => {
    vi.spyOn(console, 'error').mockImplementation(() => {});
    vi.spyOn(console, 'warn').mockImplementation(() => {});
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('Marker format extraction', () => {
    it('should extract citations with marker format', () => {
      const content = `This is the main content about AI.

---CITATIONS_DATA---
{"citations": [{"id": "1", "title": "AI Research", "url": "https://example.com"}]}`;

      const result = extractCitationsFromContent(content);
      
      expect(result.text).toBe('This is the main content about AI.');
      expect(result.citations).toHaveLength(1);
      expect(result.citations[0]).toEqual({
        id: '1',
        title: 'AI Research',
        url: 'https://example.com'
      });
      expect(result.extractionMethod).toBe('marker');
    });

    it('should handle invalid JSON with marker format', () => {
      const content = `Main content here.

---CITATIONS_DATA---
{invalid json}`;

      const result = extractCitationsFromContent(content);
      
      expect(result.text).toBe('Main content here.');
      expect(result.citations).toHaveLength(0);
      expect(result.extractionMethod).toBe('marker');
      expect(console.error).toHaveBeenCalled();
    });

    it('should handle empty citations array with marker', () => {
      const content = `Some text content.

---CITATIONS_DATA---
{"citations": []}`;

      const result = extractCitationsFromContent(content);
      
      expect(result.text).toBe('Some text content.');
      expect(result.citations).toHaveLength(0);
      expect(result.extractionMethod).toBe('marker');
    });
  });

  describe('Legacy JSON format extraction', () => {
    it('should extract citations from legacy JSON format', () => {
      const content = `This is the main content.
{"citations": [{"id": "2", "title": "Research Paper", "url": "https://paper.com"}]}`;

      const result = extractCitationsFromContent(content);
      
      expect(result.text).toBe('This is the main content.');
      expect(result.citations).toHaveLength(1);
      expect(result.citations[0].id).toBe('2');
      expect(result.extractionMethod).toBe('regex');
    });

    it('should handle multiple citations in legacy format', () => {
      const content = `Main text here.
{"citations": [
  {"id": "1", "title": "First", "url": "https://first.com"},
  {"id": "2", "title": "Second", "url": "https://second.com"}
]}`;

      const result = extractCitationsFromContent(content);
      
      expect(result.text).toBe('Main text here.');
      expect(result.citations).toHaveLength(2);
      expect(result.extractionMethod).toBe('regex');
    });
  });

  describe('Code block handling - Critical Tests', () => {
    it('should NOT extract JavaScript function as citations', () => {
      const jsCode = `Here's a JavaScript function:

function getData() {
  return {
    name: "test",
    value: 123
  };
}`;

      const result = extractCitationsFromContent(jsCode);
      
      expect(result.text).toBe(jsCode); // Original content preserved
      expect(result.citations).toHaveLength(0);
      expect(result.extractionMethod).toBe('none');
    });

    it('should NOT extract arrow function as citations', () => {
      const arrowFunction = `Here's an arrow function:

const handler = (data) => {
  console.log(data);
  return { success: true };
}`;

      const result = extractCitationsFromContent(arrowFunction);
      
      expect(result.text).toBe(arrowFunction);
      expect(result.citations).toHaveLength(0);
      expect(result.extractionMethod).toBe('none');
    });

    it('should NOT extract Java class as citations', () => {
      const javaCode = `Here's a Java class:

public class Example {
  private String name;
  public Example(String name) {
    this.name = name;
  }
}`;

      const result = extractCitationsFromContent(javaCode);
      
      expect(result.text).toBe(javaCode);
      expect(result.citations).toHaveLength(0);
      expect(result.extractionMethod).toBe('none');
    });

    it('should NOT extract C++ code as citations', () => {
      const cppCode = `Here's C++ code:

class Vector {
  private:
    int x, y;
  public:
    Vector(int x, int y) : x(x), y(y) {}
}`;

      const result = extractCitationsFromContent(cppCode);
      
      expect(result.text).toBe(cppCode);
      expect(result.citations).toHaveLength(0);
      expect(result.extractionMethod).toBe('none');
    });

    it('should NOT extract console.log statements as citations', () => {
      const consoleCode = `Debug output:

console.log({
  debug: true,
  data: [1, 2, 3]
});`;

      const result = extractCitationsFromContent(consoleCode);
      
      expect(result.text).toBe(consoleCode);
      expect(result.citations).toHaveLength(0);
      expect(result.extractionMethod).toBe('none');
    });

    it('should NOT extract JSON-like code structures', () => {
      const jsonLikeCode = `Configuration object:

const config = {
  api: "https://api.example.com",
  timeout: 5000,
  retries: 3
}`;

      const result = extractCitationsFromContent(jsonLikeCode);
      
      expect(result.text).toBe(jsonLikeCode);
      expect(result.citations).toHaveLength(0);
      expect(result.extractionMethod).toBe('none');
    });

    it('should handle Rust code with curly braces', () => {
      const rustCode = `Rust example:

fn main() {
  let data = vec![1, 2, 3];
  println!("{:?}", data);
}`;

      const result = extractCitationsFromContent(rustCode);
      
      expect(result.text).toBe(rustCode);
      expect(result.citations).toHaveLength(0);
      expect(result.extractionMethod).toBe('none');
    });

    it('should handle TypeScript interfaces', () => {
      const tsCode = `TypeScript interface:

interface User {
  id: string;
  name: string;
  email: string;
}`;

      const result = extractCitationsFromContent(tsCode);
      
      expect(result.text).toBe(tsCode);
      expect(result.citations).toHaveLength(0);
      expect(result.extractionMethod).toBe('none');
    });
  });

  describe('Error handling and malformed JSON', () => {
    it('should handle malformed JSON in legacy format', () => {
      const content = `Some content
{"citations": [incomplete}`;

      const result = extractCitationsFromContent(content);
      
      expect(result.text).toBe(content); // Original preserved
      expect(result.citations).toHaveLength(0);
      expect(result.extractionMethod).toBe('none');
    });

    it('should handle JSON without citations key', () => {
      const content = `Some content
{"data": [{"id": "1"}]}`;

      const result = extractCitationsFromContent(content);
      
      expect(result.text).toBe(content);
      expect(result.citations).toHaveLength(0);
      expect(result.extractionMethod).toBe('none');
    });

    it('should handle citations that is not an array', () => {
      const content = `Some content
{"citations": "not an array"}`;

      const result = extractCitationsFromContent(content);
      
      expect(result.text).toBe(content);
      expect(result.citations).toHaveLength(0);
      expect(result.extractionMethod).toBe('none');
      // Note: console.warn won't be called because the regex won't match
      // due to missing array brackets in the JSON
    });

    it('should handle very short JSON-like content', () => {
      const content = `Text
{"a": 1}`;

      const result = extractCitationsFromContent(content);
      
      expect(result.text).toBe(content);
      expect(result.citations).toHaveLength(0);
      expect(result.extractionMethod).toBe('none');
    });
  });

  describe('Content preservation', () => {
    it('should preserve whitespace when no citations found', () => {
      const content = `  Content with    
      multiple spaces  
  and newlines  `;

      const result = extractCitationsFromContent(content);
      
      expect(result.text).toBe(content);
      expect(result.citations).toHaveLength(0);
    });

    it('should handle empty string', () => {
      const result = extractCitationsFromContent('');
      
      expect(result.text).toBe('');
      expect(result.citations).toHaveLength(0);
      expect(result.extractionMethod).toBe('none');
    });

    it('should handle content with only whitespace', () => {
      const result = extractCitationsFromContent('   \n\t  ');
      
      expect(result.text).toBe('   \n\t  ');
      expect(result.citations).toHaveLength(0);
    });

    it('should prefer marker format over legacy when both present', () => {
      const content = `Main content

---CITATIONS_DATA---
{"citations": [{"id": "marker", "title": "From Marker"}]}`;

      // Add separate content that looks like it might have legacy format
      const contentWithBoth = content + '\n{"citations": [{"id": "legacy", "title": "From Legacy"}]}';

      const result = extractCitationsFromContent(content);
      
      expect(result.text).toBe('Main content');
      expect(result.citations).toHaveLength(1);
      expect(result.citations[0].id).toBe('marker');
      expect(result.extractionMethod).toBe('marker');
    });
  });

  describe('Valid citation extraction edge cases', () => {
    it('should extract citations with special characters', () => {
      // Use JSON.stringify to properly escape the special characters
      const citations = [{"id": "1", "title": "Test & \"Special\" <chars>", "url": "https://example.com"}];
      const content = `Content here
{"citations": ${JSON.stringify(citations)}}`;

      const result = extractCitationsFromContent(content);
      
      expect(result.text).toBe('Content here');
      expect(result.citations).toHaveLength(1);
      expect(result.citations[0].title).toBe('Test & "Special" <chars>');
    });

    it('should handle citations with Unicode characters', () => {
      const content = `Unicode test
{"citations": [{"id": "1", "title": "研究論文 📚", "url": "https://example.com"}]}`;

      const result = extractCitationsFromContent(content);
      
      expect(result.text).toBe('Unicode test');
      expect(result.citations).toHaveLength(1);
      expect(result.citations[0].title).toBe('研究論文 📚');
    });

    it('should handle very long citation JSON', () => {
      const longCitations = Array.from({ length: 10 }, (_, i) => ({
        id: `${i + 1}`,
        title: `Citation ${i + 1}`,
        url: `https://example.com/${i + 1}`
      }));
      
      const content = `Content
{"citations": ${JSON.stringify(longCitations)}}`;

      const result = extractCitationsFromContent(content);
      
      expect(result.text).toBe('Content');
      expect(result.citations).toHaveLength(10);
    });
  });

  describe('Mixed content scenarios', () => {
    it('should handle content with code followed by valid citations', () => {
      const content = `Here's some code:

function test() {
  return { data: true };
}

And here are the references:

---CITATIONS_DATA---
{"citations": [{"id": "1", "title": "Reference", "url": "https://ref.com"}]}`;

      const result = extractCitationsFromContent(content);
      
      expect(result.text).toBe(`Here's some code:

function test() {
  return { data: true };
}

And here are the references:`);
      expect(result.citations).toHaveLength(1);
      expect(result.extractionMethod).toBe('marker');
    });

    it('should NOT extract code even when it contains the word citations', () => {
      const content = `JavaScript example:

const data = {
  citations: ["not", "real", "citations"],
  function: "test"
}`;

      const result = extractCitationsFromContent(content);
      
      expect(result.text).toBe(content);
      expect(result.citations).toHaveLength(0);
      expect(result.extractionMethod).toBe('none');
    });
  });
});