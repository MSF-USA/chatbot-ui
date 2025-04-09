import { Session } from 'next-auth';

import { SearchResultsStore } from '@/services/searchResultsStore';

import { createAzureOpenAIStreamProcessor } from '@/utils/app/streamProcessor';

import { Bot } from '@/types/bots';
import { Message } from '@/types/chat';
import { Citation, SearchResult } from '@/types/rag';

import { AzureMonitorLoggingService } from './loggingService';

import { AzureKeyCredential, SearchClient } from '@azure/search-documents';
import { AzureOpenAI } from 'openai';
import OpenAI from 'openai';
import { ChatCompletion } from 'openai/resources';

/**
 * Service for handling Retrieval-Augmented Generation (RAG) operations.
 * Integrates search functionality with OpenAI chat completions.
 */
export class RAGService {
  private searchClient: SearchClient<SearchResult>;
  private loggingService: AzureMonitorLoggingService;
  private openAIClient: AzureOpenAI;
  private searchIndex: string;
  private searchResultsStore: SearchResultsStore;
  public searchDocs: SearchResult[] = [];

  // Map to track source numbers presented to the model and their corresponding documents
  private sourcesNumberMap: Map<number, SearchResult> = new Map();

  // Citation tracking properties
  private citationBuffer: string = '';
  private sourceToSequentialMap: Map<number, number> = new Map();
  private citationsUsed: Set<number> = new Set();
  private isInCitation: boolean = false;
  private pendingCitations: string = '';

  /**
   * Creates a new instance of RAGService.
   * @param {string} searchEndpoint - The endpoint URL for the Azure Search service.
   * @param {string} searchIndex - The name of the search index to query.
   * @param {string} searchApiKey - The API key for authenticating with Azure Search.
   * @param {AzureMonitorLoggingService} loggingService - Service for logging operations.
   * @param {AzureOpenAI} openAIClient - Client for making OpenAI API calls.
   */
  constructor(
    searchEndpoint: string,
    searchIndex: string,
    searchApiKey: string,
    loggingService: AzureMonitorLoggingService,
    openAIClient: AzureOpenAI,
  ) {
    this.searchClient = new SearchClient<SearchResult>(
      searchEndpoint,
      searchIndex,
      new AzureKeyCredential(searchApiKey),
    );
    this.loggingService = loggingService;
    this.openAIClient = openAIClient;
    this.searchIndex = searchIndex;

    this.searchResultsStore = new SearchResultsStore();
  }

  /**
   * Augments chat messages with relevant search results and generates a completion.
   * Supports both streaming and non-streaming responses.
   *
   * @param {Message[]} messages - The conversation messages to augment.
   * @param {string} botId - The ID of the bot to use for the completion.
   * @param {Bot[]} bots - Available bots configuration.
   * @param {string} modelId - The ID of the model to use for completion.
   * @param {boolean} [stream=false] - Whether to stream the response.
   * @param {Session['user']} user - User information for logging.
   * @param {string} [conversationId] - Optional conversation ID for caching search results.
   * @returns {Promise<ReadableStream | ChatCompletion>}
   *          Returns either a streaming response or chat completion depending on the stream parameter.
   * @throws {Error} If the specified bot is not found.
   */
  async augmentMessages(
    messages: Message[],
    botId: string,
    bots: Bot[],
    modelId: string,
    stream: boolean = false,
    user: Session['user'],
    conversationId?: string,
  ): Promise<ReadableStream | ChatCompletion> {
    const startTime = Date.now();

    try {
      // Initialize citation tracking for this request
      this.initCitationTracking(true);

      console.log(`Processing request with conversationId: ${conversationId}`);

      const { searchDocs, searchMetadata } = await this.performSearch(
        messages,
        botId,
        bots,
        user,
        conversationId,
      );
      this.searchDocs = searchDocs;

      const bot = bots.find((b) => b.id === botId);
      if (!bot) throw new Error('Bot not found');

      const enhancedMessages: OpenAI.Chat.ChatCompletionMessageParam[] = [
        {
          role: 'system',
          content: `${bot.prompt}\n\nWhen citing sources:
            1. ONLY cite source numbers that are actually provided in the search results
            2. Do not make up or reference source numbers that don't exist in the provided sources
            3. Use source numbers exactly as provided (e.g., if source 5 is relevant, use [5])
            4. Each source should only be cited once
            5. Place source numbers immediately after the relevant information
            6. DO NOT include numbered source lists at the beginning or end of your response
            7. DO NOT include "Sources:" or "References:" sections
            8. DO NOT create hyperlinked source titles
            9. Remember that the frontend will automatically display all source information based on your citation numbers

            The frontend system will handle the formatting and display of sources. Only cite sources that actually exist in the provided search results.`,
        },
        ...this.getCompletionMessages(messages, bot, searchDocs),
      ];

      if (stream) {
        const streamResponse = await this.openAIClient.chat.completions.create({
          model: modelId,
          messages: enhancedMessages,
          temperature: 0.5,
          stream: true,
        });

        // Process the stream and log after citations are processed
        const processedStream = createAzureOpenAIStreamProcessor(
          streamResponse,
          this,
        );

        // Log after stream is created but before returning
        await this.loggingService.logChatCompletion(
          startTime,
          modelId,
          messages.length,
          0.5,
          user,
          botId,
        );

        return processedStream;
      } else {
        const completion = await this.openAIClient.chat.completions.create({
          model: modelId,
          messages: enhancedMessages,
          temperature: 0.5,
          stream: false,
        });

        const content = completion.choices[0]?.message?.content || '';

        // Process citations but preserve the source mapping
        const citations = this.processCitationsInContent(content);

        // Deduplicate citations for display
        const uniqueCitations = this.deduplicateCitations(citations);

        // Format the content to include metadata at the end
        const metadataSection = `\n\nSources used: ${uniqueCitations
          .map((c) => `[${c.number}] ${c.title}`)
          .join(', ')}
        Date range: ${searchMetadata.dateRange.oldest || 'N/A'} to ${
          searchMetadata.dateRange.newest || 'N/A'
        }
        Total sources: ${uniqueCitations.length}`;

        // Update the completion with the enhanced content
        completion.choices[0].message.content = content + metadataSection;

        // Log after processing is complete
        await this.loggingService.logChatCompletion(
          startTime,
          modelId,
          messages.length,
          0.5,
          user,
          botId,
        );

        return completion;
      }
    } catch (error) {
      console.error('Error in augmentMessages:', error);
      throw error;
    }
  }

  /**
   * Performs a search operation based on the conversation messages.
   * Uses Redis for caching previous search results between requests.
   *
   * @param {Message[]} messages - The conversation messages to extract query from.
   * @param {string} botId - The ID of the bot making the search request.
   * @param {Bot[]} bots - Available bots configuration.
   * @param {Session['user']} user - User information for logging.
   * @param {string} [conversationId] - Optional conversation ID for caching search results.
   * @returns {Promise<{searchDocs: SearchResult[], searchMetadata: {dateRange: DateRange, resultCount: number}}>}
   *          Returns search results and metadata including date range of results.
   * @throws {Error} If the specified bot is not found.
   */
  public async performSearch(
    messages: Message[],
    botId: string,
    bots: Bot[],
    user: Session['user'],
    conversationId?: string,
  ) {
    const startTime = Date.now();

    try {
      const bot = bots.find((b) => b.id === botId);
      if (!bot) throw new Error(`Bot ${botId} not found`);

      const query = this.extractQuery(messages);
      const semanticConfigName = `${this.searchIndex}-semantic-configuration`;

      // Perform the search
      const searchResults = await this.searchClient.search(query, {
        select: ['chunk', 'title', 'date', 'url'],
        top: 7, // Get fewer results since we'll combine with previous results on follow up
        queryType: 'semantic' as any,
        semanticSearchOptions: {
          configurationName: semanticConfigName,
          captions: {
            captionType: 'extractive',
            highlight: true,
          },
          answers: {
            answerType: 'extractive',
            count: 10,
            threshold: 0.7,
          },
        },
        vectorSearchOptions: {
          queries: [
            {
              kind: 'text',
              text: query,
              fields: ['text_vector'] as any,
              kNearestNeighborsCount: 10,
            },
          ],
        },
      });

      const currentSearchDocs: SearchResult[] = [];
      let newestDate: Date | null = null;
      let oldestDate: Date | null = null;

      for await (const result of searchResults.results) {
        const doc = result.document;
        currentSearchDocs.push(doc);
        const docDate = new Date(doc.date);
        if (!newestDate || docDate > newestDate) newestDate = docDate;
        if (!oldestDate || docDate < oldestDate) oldestDate = docDate;
      }

      // Get previously cached search docs from Redis if conversationId is provided
      let previousResults: SearchResult[] = [];
      if (conversationId && user?.id) {
        try {
          const cacheKey = `${user.id}:${conversationId}`;
          console.log(`Fetching previous search results with key: ${cacheKey}`);

          // Fetch from Redis cache
          previousResults = await this.searchResultsStore.getPreviousSearchDocs(
            cacheKey,
          );

          console.log(
            `Retrieved ${previousResults.length} previous search results from Redis`,
          );
        } catch (error) {
          console.error('Error retrieving search results from Redis:', error);
          // If Redis fails, we just use an empty previous results array
          previousResults = [];
        }
      }

      // Combine with previous context if available and not the first message
      let combinedSearchDocs = [...currentSearchDocs];

      if (
        previousResults.length > 0 &&
        messages.filter((m) => m.role === 'user').length > 1
      ) {
        // Only add previous context if this isn't the first message
        console.log('Adding previous context from cache to search results');

        // Add the top 3 previous results
        const topPreviousResults = previousResults.slice(0, 3);

        // Combine and deduplicate
        combinedSearchDocs = this.deduplicateResults([
          ...currentSearchDocs,
          ...topPreviousResults,
        ]);

        // Update date range to include all results
        for (const doc of topPreviousResults) {
          const docDate = new Date(doc.date);
          if (!newestDate || docDate > newestDate) newestDate = docDate;
          if (!oldestDate || docDate < oldestDate) oldestDate = docDate;
        }
      }

      // Save the current search results to cache for future queries
      if (conversationId && user?.id) {
        try {
          // Create the key
          const cacheKey = `${user.id}:${conversationId}`;
          console.log(
            `Saving ${currentSearchDocs.length} search results with key: ${cacheKey}`,
          );

          // Save to Redis
          await this.searchResultsStore.savePreviousSearchDocs(
            cacheKey,
            currentSearchDocs,
          );
        } catch (error) {
          // Log error but continue without Redis caching
          console.error('Error saving search results to Redis:', error);
        }
      }

      const searchMetadata = {
        dateRange: {
          newest: newestDate?.toISOString().split('T')[0] || null,
          oldest: oldestDate?.toISOString().split('T')[0] || null,
        },
        resultCount: combinedSearchDocs.length,
      };

      // Log successful search
      await this.loggingService.logSearch(
        startTime,
        botId,
        combinedSearchDocs.length,
        searchMetadata.dateRange.oldest || undefined,
        searchMetadata.dateRange.newest || undefined,
        user,
      );

      return {
        searchDocs: combinedSearchDocs,
        searchMetadata,
      };
    } catch (error) {
      // Log search error
      await this.loggingService.logSearchError(startTime, error, botId, user);
      throw error;
    }
  }

  /**
   * Deduplication of search results.
   *
   * @param {SearchResult[]} results - The search results to deduplicate.
   * @returns {SearchResult[]} Deduplicated search results.
   */
  private deduplicateResults(results: SearchResult[]): SearchResult[] {
    const uniqueResults: SearchResult[] = [];
    const seenUrls = new Set<string>();
    const seenTitles = new Set<string>();

    for (const result of results) {
      const url = result.url || '';
      const title = result.title || '';

      // Check if we've seen either the URL or the title before
      if ((url && seenUrls.has(url)) || (title && seenTitles.has(title))) {
        // Skip this duplicate
        continue;
      }

      // Add to our seen sets and unique results
      if (url) seenUrls.add(url);
      if (title) seenTitles.add(title);
      uniqueResults.push(result);
    }

    return uniqueResults;
  }

  /**
   * Deduplicates citations while preserving the citation numbers used in the text.
   *
   * @param {Citation[]} citations - The citations to deduplicate.
   * @returns {Citation[]} Deduplicated citations with original numbering preserved.
   */
  public deduplicateCitations(citations: Citation[]): Citation[] {
    // Create a map to track unique sources by URL or title
    const uniqueSources = new Map<string, Citation>();
    const uniqueCitations: Citation[] = [];

    for (const citation of citations) {
      const key = citation.url || citation.title; // Use URL as primary key, fallback to title

      if (!uniqueSources.has(key)) {
        // This is a new unique source
        uniqueSources.set(key, citation);
        uniqueCitations.push(citation);
      }
      // If we've already seen this source, we don't add it again
      // The original citation number is preserved in the text
    }

    return uniqueCitations;
  }

  /**
   * Prepares messages for the chat completion by incorporating search results.
   * Now all sources are consolidated and given unique numbers.
   *
   * @param {Message[]} messages - The original conversation messages.
   * @param {Bot} bot - The bot configuration to use.
   * @param {SearchResult[]} searchDocs - The search results to incorporate.
   * @returns {OpenAI.Chat.ChatCompletionMessageParam[]} Messages formatted for the chat completion API.
   */
  public getCompletionMessages(
    messages: Message[],
    bot: Bot,
    searchDocs: SearchResult[],
  ): OpenAI.Chat.ChatCompletionMessageParam[] {
    const query = this.extractQuery(messages);

    // Apply deduplication to ensure unique sources
    const uniqueSearchDocs = this.deduplicateResults(searchDocs);

    // Clear the existing sources number map
    this.sourcesNumberMap.clear();

    // Create a unified context string with deduped sources, consistently numbered
    const contextString =
      'Available sources:\n\n' +
      uniqueSearchDocs
        .map((doc, index) => {
          const sourceNumber = index + 1;
          const date = new Date(doc.date).toISOString().split('T')[0];

          // Store mapping of source number to document
          this.sourcesNumberMap.set(sourceNumber, doc);

          return `Source ${sourceNumber}:\nTitle: ${doc.title}\nDate: ${date}\nURL: ${doc.url}\nContent: ${doc.chunk}`;
        })
        .join('\n\n');

    // Add context about search results
    const searchInfoNote =
      messages.filter((m) => m.role === 'user').length > 1
        ? '\n\nNote: Sources include relevant context from previous messages.'
        : '';

    return [
      ...messages.slice(0, -1).map((msg) => ({
        role: msg.role as 'assistant' | 'user' | 'system',
        content:
          typeof msg.content === 'string'
            ? msg.content
            : JSON.stringify(msg.content),
      })),
      {
        role: 'user' as const,
        content: `${contextString}${searchInfoNote}\n\nQuestion: ${query}`,
      },
    ];
  }

  /**
   * Extracts the search query from the conversation messages.
   *
   * @param {Message[]} messages - The conversation messages to extract from.
   * @returns {string} The extracted query from the last user message.
   * @throws {Error} If no user message is found.
   */
  public extractQuery(messages: Message[]): string {
    const lastUserMessage = messages
      .slice()
      .reverse()
      .find((m) => m.role === 'user');
    if (!lastUserMessage?.content) throw new Error('No user message found');
    return typeof lastUserMessage.content === 'string'
      ? lastUserMessage.content
      : '';
  }

  /**
   * Resets the Redis cache for a conversation.
   * This is necessary because Redis persists data across requests.
   *
   * @param {string} conversationId - The conversation ID to clear from Redis cache.
   * @param {Session['user']} user - User information for creating composite key.
   */
  public async resetConversationCache(
    conversationId: string,
    user: Session['user'],
  ) {
    if (conversationId && user?.id) {
      try {
        // Use composite key of user ID and conversation ID
        const cacheKey = `${user.id}:${conversationId}`;
        console.log(`Clearing cache for conversation: ${cacheKey}`);

        await this.searchResultsStore.clearPreviousSearchDocs(cacheKey);
        console.log(`Successfully cleared cache for conversation: ${cacheKey}`);
      } catch (error) {
        // Log error but continue without Redis clearing
        console.error('Error clearing search results from Redis:', error);
      }
    }
  }

  /**
   * Initializes citation tracking state for processing a new response.
   * This is used within a single request lifecycle and doesn't need to persist.
   *
   * @param {boolean} preserveSourceMap - Whether to preserve the source number mapping.
   */
  public initCitationTracking(preserveSourceMap: boolean = false) {
    this.citationBuffer = '';
    this.sourceToSequentialMap.clear();
    this.citationsUsed.clear();
    this.isInCitation = false;
    this.pendingCitations = '';

    // Only clear the source mapping if explicitly requested
    if (!preserveSourceMap) {
      this.sourcesNumberMap.clear();
    }
  }

  /**
   * Processes citation markers in a chunk of text, maintaining citation tracking state.
   * Handles both single and consecutive citations, and text within brackets.
   *
   * @param {string} chunk - The text chunk to process.
   * @returns {string} The processed text with sequential citation numbers.
   */
  public processCitationInChunk(chunk: string): string {
    if (!this.isInCitation && !chunk.includes('[') && !this.pendingCitations) {
      return chunk;
    }

    let result = '';
    let currentPosition = 0;
    let textBuffer = '';

    const flushPendingCitations = () => {
      if (this.pendingCitations) {
        result += this.pendingCitations;
        this.pendingCitations = '';
      }
    };

    while (currentPosition < chunk.length) {
      const char = chunk[currentPosition];

      if (!this.isInCitation && char === '[') {
        // Check if this is a text bracket (contains letters) rather than a citation number
        const remainingChunk = chunk.slice(currentPosition);
        const textBracketMatch = remainingChunk.match(
          /^\[[^\]]*[a-zA-Z][^\]]*\]/,
        );
        if (textBracketMatch) {
          flushPendingCitations();
          if (textBuffer) {
            result += textBuffer;
            textBuffer = '';
          }
          result += textBracketMatch[0];
          currentPosition += textBracketMatch[0].length;
          continue;
        }

        // Output any buffered text before starting new citation
        if (textBuffer) {
          result += textBuffer;
          textBuffer = '';
        }
        this.isInCitation = true;
        this.citationBuffer = '[';
        currentPosition++;
        continue;
      }

      if (this.isInCitation) {
        this.citationBuffer += char;
        currentPosition++;

        if (char === ']') {
          const match = this.citationBuffer.match(/\[(\d+)\]/);
          if (match) {
            const sourceNumber = parseInt(match[1], 10);
            if (!this.sourceToSequentialMap.has(sourceNumber)) {
              const nextNumber = this.citationsUsed.size + 1;
              this.sourceToSequentialMap.set(sourceNumber, nextNumber);
              this.citationsUsed.add(nextNumber);
            }
            const sequentialNumber =
              this.sourceToSequentialMap.get(sourceNumber)!;
            this.pendingCitations += `[${sequentialNumber}]`;

            // Look ahead for another citation
            if (
              currentPosition < chunk.length &&
              chunk[currentPosition] === '['
            ) {
              this.citationBuffer = '';
              this.isInCitation = false;
              continue;
            }

            // No more citations, flush pending
            flushPendingCitations();
            this.citationBuffer = '';
            this.isInCitation = false;
          } else {
            // Invalid citation format
            if (textBuffer) {
              result += textBuffer;
              textBuffer = '';
            }
            result += this.citationBuffer;
            this.citationBuffer = '';
            this.isInCitation = false;
          }
        }
      } else {
        textBuffer += char;
        currentPosition++;
      }
    }

    // End of chunk processing
    if (this.isInCitation) {
      // In the middle of a citation - keep the buffer
      if (textBuffer) {
        result += textBuffer;
      }
      return result;
    }

    // Flush any remaining citations and text
    if (this.pendingCitations) {
      // Only flush pending citations if we have text after them
      if (textBuffer) {
        result += this.pendingCitations + textBuffer;
        this.pendingCitations = '';
        textBuffer = '';
      }
    } else if (textBuffer) {
      result += textBuffer;
    }

    return result;
  }

  /**
   * Processes citations in the complete content and returns citation information.
   * Preserves the source mapping when initializing citation tracking.
   *
   * @param {string} content - The complete content to process citations for.
   * @returns {Citation[]} Array of citations with metadata.
   */
  public processCitationsInContent(content: string): Citation[] {
    // Initialize citation tracking but preserve the source number mapping
    this.initCitationTracking(true);

    // Process the entire content as one chunk to get citation mappings
    this.processCitationInChunk(content);
    return this.getCurrentCitations();
  }

  /**
   * Gets the current state of processed citations, using the source number mapping.
   *
   * @returns {Citation[]} Array of citations sorted by sequential number,
   *          including title, date, URL, and citation number.
   */
  public getCurrentCitations(): Citation[] {
    // Create array of citations sorted by sequential number
    const citations: Citation[] = [];

    // Go through each sequential number in order
    for (let i = 1; i <= this.citationsUsed.size; i++) {
      // Find the source number that maps to this sequential number
      const sourceNumber = Array.from(
        this.sourceToSequentialMap.entries(),
      ).find(([_, seq]) => seq === i)?.[0];

      if (sourceNumber !== undefined) {
        // Get the document from our mapping, not by array index
        const doc = this.sourcesNumberMap.get(sourceNumber);

        if (doc) {
          citations.push({
            title: doc.title,
            date: new Date(doc.date).toISOString().split('T')[0],
            url: doc.url,
            number: i,
          });
        } else {
          console.warn(
            `Citation references non-existent source number: ${sourceNumber}`,
          );
        }
      }
    }

    return citations;
  }
}
