import { Citation, WebSearchResult } from '@/types/webSearch';

/**
 * Utility class for extracting and formatting citations from web search results
 */
export class CitationExtractor {
  /**
   * Extract and format citations from search results
   */
  static extractCitations(results: WebSearchResult[]): Citation[] {
    return results.map((result, index) => {
      const citation = this.createCitationFromResult(result, index + 1);
      return this.validateAndCleanCitation(citation);
    });
  }

  /**
   * Format citations for display in response content
   */
  static formatCitationsForDisplay(citations: Citation[]): string {
    if (citations.length === 0) {
      return '';
    }

    let formatted = '\n\nSources:\n';

    citations.forEach((citation, index) => {
      formatted += this.formatSingleCitation(citation, index + 1);
    });

    return formatted;
  }

  /**
   * Format inline citation references (e.g., [1], [2])
   */
  static formatInlineCitation(index: number): string {
    return `[${index}]`;
  }

  /**
   * Insert citation references into content
   */
  static insertCitationReferences(
    content: string,
    results: WebSearchResult[],
    citations: Citation[],
  ): string {
    let citedContent = content;

    // For each result, try to find where its content is referenced
    results.forEach((result, index) => {
      if (result.snippet) {
        // Find sentences or phrases from the snippet in the content
        const snippetSentences = this.extractSentences(result.snippet);

        snippetSentences.forEach((sentence) => {
          const cleanSentence = this.cleanTextForMatching(sentence);
          if (
            cleanSentence.length > 20 &&
            citedContent.includes(cleanSentence)
          ) {
            // Add citation after the sentence
            const citationRef = this.formatInlineCitation(index + 1);
            citedContent = citedContent.replace(
              cleanSentence,
              `${cleanSentence} ${citationRef}`,
            );
          }
        });
      }
    });

    return citedContent;
  }

  /**
   * Deduplicate citations by URL
   */
  static deduplicateCitations(citations: Citation[]): Citation[] {
    const uniqueUrls = new Map<string, Citation>();

    citations.forEach((citation) => {
      const normalizedUrl = this.normalizeUrl(citation.url);
      if (!uniqueUrls.has(normalizedUrl)) {
        uniqueUrls.set(normalizedUrl, citation);
      } else {
        // Merge information if we have duplicates
        const existing = uniqueUrls.get(normalizedUrl)!;
        uniqueUrls.set(normalizedUrl, this.mergeCitations(existing, citation));
      }
    });

    return Array.from(uniqueUrls.values());
  }

  /**
   * Sort citations by relevance or other criteria
   */
  static sortCitations(
    citations: Citation[],
    criteria: 'relevance' | 'date' | 'type' = 'relevance',
  ): Citation[] {
    const sorted = [...citations];

    switch (criteria) {
      case 'relevance':
        return sorted.sort((a, b) => {
          const scoreA = a.metadata?.relevanceScore || 0;
          const scoreB = b.metadata?.relevanceScore || 0;
          return scoreB - scoreA;
        });

      case 'date':
        return sorted.sort((a, b) => {
          const dateA = a.publishedDate
            ? new Date(a.publishedDate).getTime()
            : 0;
          const dateB = b.publishedDate
            ? new Date(b.publishedDate).getTime()
            : 0;
          return dateB - dateA;
        });

      case 'type':
        const typeOrder = ['academic', 'news', 'article', 'webpage', 'blog'];
        return sorted.sort((a, b) => {
          const indexA = typeOrder.indexOf(a.type);
          const indexB = typeOrder.indexOf(b.type);
          return indexA - indexB;
        });

      default:
        return sorted;
    }
  }

  /**
   * Private helper methods
   */

  private static createCitationFromResult(
    result: WebSearchResult,
    index: number,
  ): Citation {
    return {
      id: `cite_${index}`,
      title: result.title || 'Untitled',
      url: result.url,
      authors: this.extractAuthorsFromResult(result),
      publishedDate: this.extractPublishedDate(result),
      publisher: this.extractPublisher(result),
      type: this.determineCitationType(result),
      metadata: {
        snippet: result.snippet,
        relevanceScore: result.relevanceScore,
        language: result.language,
        displayUrl: result.displayUrl,
      },
    };
  }

  private static validateAndCleanCitation(citation: Citation): Citation {
    // Clean and validate title
    if (citation.title) {
      citation.title = this.cleanTitle(citation.title);
    }

    // Ensure URL is valid
    if (!this.isValidUrl(citation.url)) {
      console.warn(`Invalid URL in citation: ${citation.url}`);
    }

    // Clean authors array
    if (citation.authors) {
      citation.authors = citation.authors.filter(
        (author) => author && author.trim(),
      );
    }

    return citation;
  }

  private static formatSingleCitation(
    citation: Citation,
    index: number,
  ): string {
    let formatted = `[${index}] `;

    // Add title
    formatted += citation.title;

    // Add authors if available
    if (citation.authors && citation.authors.length > 0) {
      formatted += ` - ${citation.authors.join(', ')}`;
    }

    // Add publisher if different from domain
    const domain = this.extractDomain(citation.url);
    if (citation.publisher && citation.publisher !== domain) {
      formatted += ` (${citation.publisher})`;
    }

    // Add date if available
    if (citation.publishedDate) {
      const date = this.formatDate(citation.publishedDate);
      if (date) {
        formatted += ` - ${date}`;
      }
    }

    // Add URL
    formatted += `\n   ${citation.url}\n\n`;

    return formatted;
  }

  private static extractSentences(text: string): string[] {
    // Simple sentence extraction - could be improved with NLP
    return text
      .split(/[.!?]+/)
      .map((s) => s.trim())
      .filter((s) => s.length > 0);
  }

  private static cleanTextForMatching(text: string): string {
    return text
      .toLowerCase()
      .replace(/[^\w\s]/g, ' ')
      .replace(/\s+/g, ' ')
      .trim();
  }

  private static normalizeUrl(url: string): string {
    try {
      const urlObj = new URL(url);
      // Remove trailing slashes and www
      return urlObj.href.replace(/\/$/, '').replace('://www.', '://');
    } catch {
      return url;
    }
  }

  private static mergeCitations(
    existing: Citation,
    newCitation: Citation,
  ): Citation {
    return {
      ...existing,
      // Prefer non-empty values from new citation
      title: newCitation.title || existing.title,
      authors: [...(existing.authors || []), ...(newCitation.authors || [])],
      publishedDate: newCitation.publishedDate || existing.publishedDate,
      publisher: newCitation.publisher || existing.publisher,
      metadata: {
        ...existing.metadata,
        ...newCitation.metadata,
      },
    };
  }

  private static extractAuthorsFromResult(result: WebSearchResult): string[] {
    // This would need more sophisticated extraction
    // Could look for author meta tags, bylines, etc.
    const authors: string[] = [];

    // Check metadata for author information
    if (result.metadata?.author) {
      if (typeof result.metadata.author === 'string') {
        authors.push(result.metadata.author);
      } else if (Array.isArray(result.metadata.author)) {
        authors.push(...result.metadata.author);
      }
    }

    return authors;
  }

  private static extractPublishedDate(
    result: WebSearchResult,
  ): string | undefined {
    // Try multiple date sources
    if (result.metadata?.publishedDate) {
      return result.metadata.publishedDate;
    }

    if (result.dateLastCrawled) {
      // Use crawl date as fallback
      return result.dateLastCrawled;
    }

    return undefined;
  }

  private static extractPublisher(result: WebSearchResult): string {
    // First check metadata
    if (result.metadata?.publisher) {
      return result.metadata.publisher;
    }

    // Extract from URL domain
    return this.extractDomain(result.url);
  }

  private static extractDomain(url: string): string {
    try {
      const urlObj = new URL(url);
      return urlObj.hostname.replace('www.', '');
    } catch {
      return 'Unknown Source';
    }
  }

  private static determineCitationType(
    result: WebSearchResult,
  ): Citation['type'] {
    // Use content type if available
    if (result.contentType) {
      switch (result.contentType) {
        case 'news':
          return 'news';
        case 'academic':
          return 'academic';
        default:
        // Continue to other checks
      }
    }

    const url = result.url.toLowerCase();
    const title = result.title?.toLowerCase() || '';

    // Check for academic sources
    if (
      url.includes('.edu') ||
      url.includes('scholar') ||
      url.includes('journal') ||
      url.includes('pubmed')
    ) {
      return 'academic';
    }

    // Check for news sources
    if (
      url.includes('news') ||
      url.includes('article') ||
      title.includes('news')
    ) {
      return 'news';
    }

    // Check for blog posts
    if (url.includes('blog') || title.includes('blog')) {
      return 'blog';
    }

    // Default to webpage
    return 'webpage';
  }

  private static cleanTitle(title: string): string {
    return title
      .replace(/\s+/g, ' ')
      .replace(/[|–-].+$/, '') // Remove site names after separators
      .trim();
  }

  private static isValidUrl(url: string): boolean {
    try {
      new URL(url);
      return true;
    } catch {
      return false;
    }
  }

  private static formatDate(dateString: string): string | null {
    try {
      const date = new Date(dateString);
      if (isNaN(date.getTime())) {
        return null;
      }

      // Format as "Month Day, Year" or just "Year" if it's old
      const now = new Date();
      const monthsAgo =
        (now.getTime() - date.getTime()) / (1000 * 60 * 60 * 24 * 30);

      if (monthsAgo > 12) {
        return date.getFullYear().toString();
      }

      return date.toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
      });
    } catch {
      return null;
    }
  }
}
