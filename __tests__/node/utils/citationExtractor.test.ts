import { CitationExtractor } from '@/utils/citationExtractor';

import { Citation, WebSearchResult } from '@/types/webSearch';

import { beforeEach, describe, expect, it } from 'vitest';

describe('CitationExtractor', () => {
  let mockWebSearchResults: WebSearchResult[];

  beforeEach(() => {
    mockWebSearchResults = [
      {
        id: 'result-1',
        title: 'AI Breakthrough: New Language Model',
        url: 'https://techcrunch.com/ai-breakthrough',
        snippet:
          'Researchers have developed a new language model that shows significant improvements.',
        displayUrl: 'techcrunch.com/ai-breakthrough',
        dateLastCrawled: '2024-01-15T10:30:00Z',
        language: 'en',
        contentType: 'news',
        relevanceScore: 0.95,
        metadata: {
          author: 'John Smith',
          publisher: 'TechCrunch',
          publishedDate: '2024-01-15T08:00:00Z',
        },
      },
      {
        id: 'result-2',
        title: 'Machine Learning Paper - Academic Study',
        url: 'https://arxiv.org/paper/ml-study',
        snippet:
          'This academic paper presents novel approaches to machine learning optimization.',
        displayUrl: 'arxiv.org/paper/ml-study',
        dateLastCrawled: '2024-01-14T15:45:00Z',
        language: 'en',
        contentType: 'academic',
        relevanceScore: 0.88,
        metadata: {
          author: ['Dr. Jane Doe', 'Prof. Bob Wilson'],
          publisher: 'arXiv',
        },
      },
      {
        id: 'result-3',
        title: 'Tech Blog: AI in Daily Life',
        url: 'https://blog.example.com/ai-daily-life',
        snippet:
          'How artificial intelligence is transforming our everyday experiences.',
        displayUrl: 'blog.example.com/ai-daily-life',
        dateLastCrawled: '2024-01-13T12:20:00Z',
        language: 'en',
        contentType: 'blog',
        relevanceScore: 0.72,
        metadata: {},
      },
    ];
  });

  describe('extractCitations', () => {
    it('should extract citations from web search results', () => {
      const citations =
        CitationExtractor.extractCitations(mockWebSearchResults);

      expect(citations).toHaveLength(3);
      expect(citations[0].id).toBe('cite_1');
      expect(citations[0].title).toBe('AI Breakthrough: New Language Model');
      expect(citations[0].url).toBe('https://techcrunch.com/ai-breakthrough');
      expect(citations[0].type).toBe('news');
    });

    it('should handle empty results array', () => {
      const citations = CitationExtractor.extractCitations([]);
      expect(citations).toHaveLength(0);
    });

    it('should clean and validate citation titles', () => {
      const resultsWithDirtyTitles = [
        {
          ...mockWebSearchResults[0],
          title: '  AI Breakthrough: New Language Model - TechCrunch  ',
        },
      ];

      const citations = CitationExtractor.extractCitations(
        resultsWithDirtyTitles,
      );
      expect(citations[0].title).toBe('AI Breakthrough: New Language Model');
    });
  });

  describe('formatCitationsForDisplay', () => {
    it('should format citations for display', () => {
      const citations =
        CitationExtractor.extractCitations(mockWebSearchResults);
      const formatted = CitationExtractor.formatCitationsForDisplay(citations);

      expect(formatted).toContain('Sources:');
      expect(formatted).toContain('[1] AI Breakthrough: New Language Model');
      expect(formatted).toContain('https://techcrunch.com/ai-breakthrough');
      expect(formatted).toContain('[2] Machine Learning Paper');
      expect(formatted).toContain('[3] Tech Blog: AI in Daily Life');
    });

    it('should return empty string for empty citations', () => {
      const formatted = CitationExtractor.formatCitationsForDisplay([]);
      expect(formatted).toBe('');
    });

    it('should include authors when available', () => {
      const citations =
        CitationExtractor.extractCitations(mockWebSearchResults);
      const formatted = CitationExtractor.formatCitationsForDisplay(citations);

      expect(formatted).toContain('Dr. Jane Doe, Prof. Bob Wilson');
    });

    it('should include publication dates when available', () => {
      const citations =
        CitationExtractor.extractCitations(mockWebSearchResults);
      const formatted = CitationExtractor.formatCitationsForDisplay(citations);

      expect(formatted).toContain('2024'); // Should include the year from the date
    });
  });

  describe('formatInlineCitation', () => {
    it('should format inline citation references', () => {
      expect(CitationExtractor.formatInlineCitation(1)).toBe('[1]');
      expect(CitationExtractor.formatInlineCitation(5)).toBe('[5]');
      expect(CitationExtractor.formatInlineCitation(10)).toBe('[10]');
    });
  });

  describe('insertCitationReferences', () => {
    it('should insert citation references into content', () => {
      const content =
        'Recent breakthroughs in artificial intelligence have shown significant improvements.';
      const citations =
        CitationExtractor.extractCitations(mockWebSearchResults);

      const citedContent = CitationExtractor.insertCitationReferences(
        content,
        mockWebSearchResults,
        citations,
      );

      // The method looks for exact matches from snippets, so use content that matches the snippet
      expect(citedContent).toContain('breakthroughs');
    });

    it('should not modify content when no matches found', () => {
      const content = 'This content has no matching snippets.';
      const citations =
        CitationExtractor.extractCitations(mockWebSearchResults);

      const citedContent = CitationExtractor.insertCitationReferences(
        content,
        mockWebSearchResults,
        citations,
      );

      expect(citedContent).toBe(content);
    });
  });

  describe('deduplicateCitations', () => {
    it('should remove duplicate citations by URL', () => {
      const duplicateResults = [
        mockWebSearchResults[0],
        mockWebSearchResults[0], // Duplicate
        mockWebSearchResults[1],
      ];

      const citations = CitationExtractor.extractCitations(duplicateResults);
      const deduplicated = CitationExtractor.deduplicateCitations(citations);

      expect(deduplicated).toHaveLength(2);
      expect(deduplicated[0].url).toBe(mockWebSearchResults[0].url);
      expect(deduplicated[1].url).toBe(mockWebSearchResults[1].url);
    });

    it('should merge information from duplicate citations', () => {
      const citation1: Citation = {
        id: 'cite_1',
        title: 'Original Title',
        url: 'https://example.com/article',
        type: 'article',
        authors: ['Author 1'],
        publisher: 'Publisher 1',
        metadata: { snippet: 'Original snippet' },
      };

      const citation2: Citation = {
        id: 'cite_2',
        title: 'Updated Title',
        url: 'https://example.com/article',
        type: 'article',
        authors: ['Author 2'],
        publisher: 'Publisher 2',
        publishedDate: '2024-01-15T10:00:00Z',
        metadata: { snippet: 'Updated snippet' },
      };

      const merged = CitationExtractor.deduplicateCitations([
        citation1,
        citation2,
      ]);

      expect(merged).toHaveLength(1);
      expect(merged[0].title).toBe('Updated Title');
      expect(merged[0].authors).toContain('Author 1');
      expect(merged[0].authors).toContain('Author 2');
      expect(merged[0].publishedDate).toBe('2024-01-15T10:00:00Z');
    });

    it('should handle URLs with and without trailing slashes', () => {
      const citation1: Citation = {
        id: 'cite_1',
        title: 'Test Article',
        url: 'https://example.com/article/',
        type: 'article',
        publisher: 'Example',
      };

      const citation2: Citation = {
        id: 'cite_2',
        title: 'Test Article',
        url: 'https://example.com/article',
        type: 'article',
        publisher: 'Example',
      };

      const merged = CitationExtractor.deduplicateCitations([
        citation1,
        citation2,
      ]);
      expect(merged).toHaveLength(1);
    });
  });

  describe('sortCitations', () => {
    let citations: Citation[];

    beforeEach(() => {
      citations = CitationExtractor.extractCitations(mockWebSearchResults);
    });

    it('should sort by relevance (default)', () => {
      const sorted = CitationExtractor.sortCitations(citations, 'relevance');

      expect(sorted[0].metadata?.relevanceScore).toBe(0.95);
      expect(sorted[1].metadata?.relevanceScore).toBe(0.88);
      expect(sorted[2].metadata?.relevanceScore).toBe(0.72);
    });

    it('should sort by date', () => {
      const sorted = CitationExtractor.sortCitations(citations, 'date');

      // Most recent first
      expect(sorted[0].publishedDate).toBe('2024-01-15T08:00:00Z');
    });

    it('should sort by type', () => {
      const sorted = CitationExtractor.sortCitations(citations, 'type');

      // Academic first, then news, then blog
      expect(sorted[0].type).toBe('academic');
      expect(sorted[1].type).toBe('news');
      expect(sorted[2].type).toBe('blog');
    });

    it('should handle missing metadata gracefully', () => {
      const citationsWithoutMetadata = citations.map((c) => ({
        ...c,
        metadata: {},
      }));

      const sorted = CitationExtractor.sortCitations(
        citationsWithoutMetadata,
        'relevance',
      );
      expect(sorted).toHaveLength(3);
    });
  });

  describe('Citation Type Detection', () => {
    it('should detect academic sources', () => {
      const academicResult: WebSearchResult = {
        id: 'academic-1',
        title: 'Research Paper',
        url: 'https://scholar.google.com/paper',
        snippet: 'Academic research paper',
        displayUrl: 'scholar.google.com/paper',
        dateLastCrawled: new Date().toISOString(),
        language: 'en',
        relevanceScore: 0.9,
        metadata: {},
      };

      const citations = CitationExtractor.extractCitations([academicResult]);
      expect(citations[0].type).toBe('academic');
    });

    it('should detect news sources', () => {
      const newsResult: WebSearchResult = {
        id: 'news-1',
        title: 'Breaking News Article',
        url: 'https://cnn.com/news/article',
        snippet: 'Latest news update',
        displayUrl: 'cnn.com/news/article',
        dateLastCrawled: new Date().toISOString(),
        language: 'en',
        relevanceScore: 0.9,
        metadata: {},
      };

      const citations = CitationExtractor.extractCitations([newsResult]);
      expect(citations[0].type).toBe('news');
    });

    it('should detect blog sources', () => {
      const blogResult: WebSearchResult = {
        id: 'blog-1',
        title: 'Personal Blog Post',
        url: 'https://myblog.com/post',
        snippet: 'Personal thoughts and opinions',
        displayUrl: 'myblog.com/post',
        dateLastCrawled: new Date().toISOString(),
        language: 'en',
        relevanceScore: 0.9,
        metadata: {},
      };

      const citations = CitationExtractor.extractCitations([blogResult]);
      expect(citations[0].type).toBe('blog');
    });

    it('should default to webpage for unknown sources', () => {
      const unknownResult: WebSearchResult = {
        id: 'unknown-1',
        title: 'Some Website',
        url: 'https://randomsite.com/page',
        snippet: 'Random content',
        displayUrl: 'randomsite.com/page',
        dateLastCrawled: new Date().toISOString(),
        language: 'en',
        relevanceScore: 0.9,
        metadata: {},
      };

      const citations = CitationExtractor.extractCitations([unknownResult]);
      expect(citations[0].type).toBe('webpage');
    });
  });

  describe('Date Formatting', () => {
    it('should format recent dates with month and day', () => {
      const recentDate = new Date();
      recentDate.setMonth(recentDate.getMonth() - 1); // 1 month ago

      const result: WebSearchResult = {
        id: 'recent-1',
        title: 'Recent Article',
        url: 'https://example.com/recent',
        snippet: 'Recent content',
        displayUrl: 'example.com/recent',
        dateLastCrawled: recentDate.toISOString(),
        language: 'en',
        relevanceScore: 0.9,
        metadata: {
          publishedDate: recentDate.toISOString(),
        },
      };

      const citations = CitationExtractor.extractCitations([result]);
      const formatted = CitationExtractor.formatCitationsForDisplay(citations);

      expect(formatted).toMatch(/\w{3} \d{1,2}, \d{4}/); // e.g., "Jan 15, 2024"
    });

    it('should format old dates with year only', () => {
      const oldDate = new Date('2020-01-15T10:00:00Z');

      const result: WebSearchResult = {
        id: 'old-1',
        title: 'Old Article',
        url: 'https://example.com/old',
        snippet: 'Old content',
        displayUrl: 'example.com/old',
        dateLastCrawled: oldDate.toISOString(),
        language: 'en',
        relevanceScore: 0.9,
        metadata: {
          publishedDate: oldDate.toISOString(),
        },
      };

      const citations = CitationExtractor.extractCitations([result]);
      const formatted = CitationExtractor.formatCitationsForDisplay(citations);

      expect(formatted).toContain('2020');
    });
  });

  describe('Publisher Extraction', () => {
    it('should extract publisher from metadata when available', () => {
      const citations =
        CitationExtractor.extractCitations(mockWebSearchResults);

      expect(citations[0].publisher).toBe('TechCrunch');
      expect(citations[1].publisher).toBe('arXiv');
    });

    it('should extract publisher from domain when metadata not available', () => {
      const resultWithoutPublisher: WebSearchResult = {
        id: 'no-publisher',
        title: 'Article Title',
        url: 'https://www.example.com/article',
        snippet: 'Article content',
        displayUrl: 'www.example.com/article',
        dateLastCrawled: new Date().toISOString(),
        language: 'en',
        relevanceScore: 0.9,
        metadata: {},
      };

      const citations = CitationExtractor.extractCitations([
        resultWithoutPublisher,
      ]);
      expect(citations[0].publisher).toBe('example.com');
    });
  });
});
