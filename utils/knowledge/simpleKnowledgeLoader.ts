/**
 * Simple Knowledge Loader
 * 
 * Minimal implementation for loading and searching FAQ and privacy policy content
 * without complex vector databases or semantic search engines.
 */

import faqData from './faq.json';
import privacyData from './privacyPolicy.json';

/**
 * Simple Knowledge Item Interface
 */
export interface SimpleKnowledgeItem {
  id: string;
  type: 'faq' | 'privacy_policy';
  category: string;
  question?: string;
  answer: string;
  keywords: string[];
}

/**
 * Search Result Interface
 */
export interface SimpleSearchResult {
  item: SimpleKnowledgeItem;
  score: number;
  matchedKeywords: string[];
  explanation: string;
}

/**
 * Search Configuration
 */
export interface SimpleSearchConfig {
  /** Minimum score threshold for results */
  minScore: number;
  /** Maximum number of results to return */
  maxResults: number;
  /** Enable fuzzy matching */
  enableFuzzyMatch: boolean;
  /** Weight for exact keyword matches */
  exactMatchWeight: number;
  /** Weight for partial keyword matches */
  partialMatchWeight: number;
}

/**
 * Default search configuration
 */
const DEFAULT_SEARCH_CONFIG: SimpleSearchConfig = {
  minScore: 0.2,
  maxResults: 5,
  enableFuzzyMatch: true,
  exactMatchWeight: 1.0,
  partialMatchWeight: 0.5,
};

/**
 * Simple Knowledge Loader Service
 */
export class SimpleKnowledgeLoader {
  private knowledgeItems: SimpleKnowledgeItem[] = [];
  private config: SimpleSearchConfig;
  private initialized = false;

  constructor(config?: Partial<SimpleSearchConfig>) {
    this.config = { ...DEFAULT_SEARCH_CONFIG, ...config };
  }

  /**
   * Initialize the knowledge loader
   */
  async initialize(): Promise<void> {
    if (this.initialized) return;

    try {
      console.log('[INFO] Initializing SimpleKnowledgeLoader');

      // Load FAQ items
      const faqItems: SimpleKnowledgeItem[] = faqData.items.map(item => ({
        id: item.id,
        type: 'faq' as const,
        category: item.category,
        question: item.question,
        answer: item.answer,
        keywords: item.keywords,
      }));

      // Load privacy policy items
      const privacyItems: SimpleKnowledgeItem[] = privacyData.items.map(item => ({
        id: item.id,
        type: 'privacy_policy' as const,
        category: item.category,
        question: item.question,
        answer: item.answer,
        keywords: item.keywords,
      }));

      // Combine all knowledge items
      this.knowledgeItems = [...faqItems, ...privacyItems];

      console.log(`[INFO] Loaded ${this.knowledgeItems.length} knowledge items (${faqItems.length} FAQ, ${privacyItems.length} privacy)`);
      this.initialized = true;
    } catch (error) {
      console.error('[ERROR] Failed to initialize SimpleKnowledgeLoader:', error);
      throw new Error(`Knowledge loader initialization failed: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  /**
   * Search knowledge items using simple text matching
   */
  async search(query: string, type?: 'faq' | 'privacy_policy'): Promise<SimpleSearchResult[]> {
    if (!this.initialized) {
      await this.initialize();
    }

    if (!query || query.trim().length === 0) {
      return [];
    }

    console.log(`[INFO] Searching knowledge base for: "${query}" (type: ${type || 'all'})`);

    // Normalize query
    const normalizedQuery = this.normalizeText(query);
    const queryWords = this.extractWords(normalizedQuery);

    // Filter items by type if specified
    let itemsToSearch = this.knowledgeItems;
    if (type) {
      itemsToSearch = this.knowledgeItems.filter(item => item.type === type);
    }

    // Score each item
    const results: SimpleSearchResult[] = [];
    for (const item of itemsToSearch) {
      const result = this.scoreItem(item, normalizedQuery, queryWords);
      if (result.score >= this.config.minScore) {
        results.push(result);
      }
    }

    // Sort by score and limit results
    results.sort((a, b) => b.score - a.score);
    const limitedResults = results.slice(0, this.config.maxResults);

    console.log(`[INFO] Found ${limitedResults.length} relevant knowledge items (${results.length} total above threshold)`);
    
    return limitedResults;
  }

  /**
   * Get knowledge statistics
   */
  getStatistics() {
    return {
      totalItems: this.knowledgeItems.length,
      faqItems: this.knowledgeItems.filter(item => item.type === 'faq').length,
      privacyItems: this.knowledgeItems.filter(item => item.type === 'privacy_policy').length,
      initialized: this.initialized,
      categories: [...new Set(this.knowledgeItems.map(item => item.category))],
    };
  }

  /**
   * Get all knowledge items by type
   */
  getItemsByType(type: 'faq' | 'privacy_policy'): SimpleKnowledgeItem[] {
    return this.knowledgeItems.filter(item => item.type === type);
  }

  /**
   * Get knowledge item by ID
   */
  getItemById(id: string): SimpleKnowledgeItem | undefined {
    return this.knowledgeItems.find(item => item.id === id);
  }

  /**
   * Check if query is likely FAQ-related
   */
  isFaqQuery(query: string): boolean {
    const faqIndicators = [
      'what is', 'how do', 'how can', 'how to', 'where',
      'msf ai', 'ai assistant', 'prompt', 'conversation',
      'help', 'guide', 'faq', 'question', 'feature'
    ];

    const normalizedQuery = this.normalizeText(query);
    return faqIndicators.some(indicator => normalizedQuery.includes(indicator));
  }

  /**
   * Check if query is likely privacy-related
   */
  isPrivacyQuery(query: string): boolean {
    const privacyIndicators = [
      'privacy', 'data', 'storage', 'stored', 'terms',
      'policy', 'secure', 'safety', 'personal', 'sensitive',
      'prohibited', 'responsible use', 'accuracy', 'contact'
    ];

    const normalizedQuery = this.normalizeText(query);
    return privacyIndicators.some(indicator => normalizedQuery.includes(indicator));
  }

  /**
   * Private helper methods
   */

  private scoreItem(item: SimpleKnowledgeItem, normalizedQuery: string, queryWords: string[]): SimpleSearchResult {
    let score = 0;
    const matchedKeywords: string[] = [];
    const explanations: string[] = [];

    // Check for exact keyword matches
    for (const keyword of item.keywords) {
      const normalizedKeyword = this.normalizeText(keyword);
      
      if (normalizedQuery.includes(normalizedKeyword)) {
        score += this.config.exactMatchWeight;
        matchedKeywords.push(keyword);
        explanations.push(`exact match: "${keyword}"`);
      } else if (this.config.enableFuzzyMatch) {
        // Check for partial matches
        const keywordWords = this.extractWords(normalizedKeyword);
        const matchingWords = keywordWords.filter(word => 
          queryWords.some(queryWord => 
            queryWord.includes(word) || word.includes(queryWord)
          )
        );
        
        if (matchingWords.length > 0) {
          const partialScore = (matchingWords.length / keywordWords.length) * this.config.partialMatchWeight;
          score += partialScore;
          matchedKeywords.push(keyword);
          explanations.push(`partial match: "${keyword}" (${matchingWords.join(', ')})`);
        }
      }
    }

    // Check for matches in question and answer content
    if (item.question) {
      const normalizedQuestion = this.normalizeText(item.question);
      const questionWords = this.extractWords(normalizedQuestion);
      const questionMatches = queryWords.filter(word => questionWords.includes(word));
      
      if (questionMatches.length > 0) {
        score += (questionMatches.length / queryWords.length) * 0.3;
        explanations.push(`question content match: ${questionMatches.length} words`);
      }
    }

    const normalizedAnswer = this.normalizeText(item.answer);
    const answerWords = this.extractWords(normalizedAnswer);
    const answerMatches = queryWords.filter(word => answerWords.includes(word));
    
    if (answerMatches.length > 0) {
      score += (answerMatches.length / queryWords.length) * 0.2;
      explanations.push(`answer content match: ${answerMatches.length} words`);
    }

    // Boost score for category matches
    const normalizedCategory = this.normalizeText(item.category);
    if (queryWords.some(word => normalizedCategory.includes(word))) {
      score += 0.1;
      explanations.push('category match');
    }

    return {
      item,
      score: Math.min(score, 1.0), // Cap at 1.0
      matchedKeywords: [...new Set(matchedKeywords)], // Remove duplicates
      explanation: explanations.join(', ') || 'low relevance match',
    };
  }

  private normalizeText(text: string): string {
    return text.toLowerCase()
      .replace(/[^\w\s]/g, ' ')
      .replace(/\s+/g, ' ')
      .trim();
  }

  private extractWords(text: string): string[] {
    return text.split(' ')
      .filter(word => word.length > 2) // Filter out very short words
      .filter(word => !this.isStopWord(word));
  }

  private isStopWord(word: string): boolean {
    const stopWords = new Set([
      'the', 'and', 'or', 'but', 'in', 'on', 'at', 'to', 'for', 'of', 'with',
      'by', 'is', 'are', 'was', 'were', 'be', 'been', 'have', 'has', 'had',
      'do', 'does', 'did', 'will', 'would', 'should', 'could', 'can', 'may',
      'this', 'that', 'these', 'those', 'i', 'you', 'he', 'she', 'it', 'we', 'they'
    ]);
    
    return stopWords.has(word.toLowerCase());
  }
}

/**
 * Singleton instance for the knowledge loader
 */
let instance: SimpleKnowledgeLoader | null = null;

/**
 * Get or create the knowledge loader instance
 */
export function getKnowledgeLoader(config?: Partial<SimpleSearchConfig>): SimpleKnowledgeLoader {
  if (!instance) {
    instance = new SimpleKnowledgeLoader(config);
  }
  return instance;
}

/**
 * Reset the knowledge loader instance (useful for testing)
 */
export function resetKnowledgeLoader(): void {
  instance = null;
}