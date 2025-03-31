import { Session } from 'next-auth';

import { createAzureOpenAIStreamProcessor } from '@/utils/app/streamProcessor';

import { Bot } from '@/types/bots';
import { Message } from '@/types/chat';
import { Citation, RAGResponse, SearchResult } from '@/types/rag';

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
  public searchDocs: SearchResult[] = [];

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
   * @returns {Promise<ReadableStream | ChatCompletion>}
   *          Returns either a streaming response, RAG response, or chat completion depending on the stream parameter.
   * @throws {Error} If the specified bot is not found.
   */
  async augmentMessages(
    messages: Message[],
    botId: string,
    bots: Bot[],
    modelId: string,
    stream: boolean = false,
    user: Session['user'],
  ): Promise<ReadableStream | ChatCompletion> {
    const startTime = Date.now();

    try {
      this.resetCitationTracking();

      const { searchDocs, searchMetadata } = await this.performSearch(
        messages,
        botId,
        bots,
        user,
      );
      this.searchDocs = searchDocs;

      const bot = bots.find((b) => b.id === botId);
      if (!bot) throw new Error('Bot not found');

      const enhancedMessages: OpenAI.Chat.Completions.ChatCompletionMessageParam[] =
        [
          {
            role: 'system',
            content: `${bot.prompt}\n\nWhen citing sources:
            1. Use source numbers exactly as provided (e.g., if source 5 is relevant, use [5])
            2. Only cite the most relevant sources
            3. Each source should only be cited once
            4. Place source numbers immediately after the relevant information`,
          },
          ...this.getCompletionMessages(messages, bot, searchDocs),
        ];

      this.resetCitationTracking(); // Reset citation state before processing

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
        const citations = this.processCitationsInContent(content);

        // Format the content to include metadata at the end
        const metadataSection = `\n\nSources used: ${citations
          .map((c) => `[${c.number}] ${c.title}`)
          .join(', ')}
        Date range: ${searchMetadata.dateRange.oldest || 'N/A'} to ${
          searchMetadata.dateRange.newest || 'N/A'
        }
        Total sources: ${citations.length}`;

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
      throw error;
    }
  }

  /**
   * Performs a search operation based on the conversation messages.
   *
   * @param {Message[]} messages - The conversation messages to extract query from.
   * @param {string} botId - The ID of the bot making the search request.
   * @param {Bot[]} bots - Available bots configuration.
   * @param {Session['user']} user - User information for logging.
   * @returns {Promise<{searchDocs: SearchResult[], searchMetadata: {dateRange: DateRange, resultCount: number}}>}
   *          Returns search results and metadata including date range of results.
   * @throws {Error} If the specified bot is not found.
   */
  public async performSearch(
    messages: Message[],
    botId: string,
    bots: Bot[],
    user: Session['user'],
  ) {
    const startTime = Date.now();

    try {
      const bot = bots.find((b) => b.id === botId);
      if (!bot) throw new Error(`Bot ${botId} not found`);

      const query = this.extractQuery(messages);
      const searchResults = await this.searchClient.search(query, {
        select: ['content', 'title', 'date', 'url'],
        top: 10,
        queryType: 'semantic' as any,
        semanticSearchOptions: {
          configurationName: 'MSFCommsConfig',
          captions: {
            captionType: 'extractive',
            highlight: true,
          },
          answers: {
            answerType: 'extractive',
            count: 1,
            threshold: 0.7,
          },
        },
        vectorSearchOptions: {
          queries: [
            {
              kind: 'text',
              text: query,
              fields: ['contentVector'] as any,
              kNearestNeighborsCount: 10,
            },
          ],
        },
      });

      const searchDocs: SearchResult[] = [];
      let newestDate: Date | null = null;
      let oldestDate: Date | null = null;

      for await (const result of searchResults.results) {
        const doc = result.document;
        searchDocs.push(doc);
        const docDate = new Date(doc.date);
        if (!newestDate || docDate > newestDate) newestDate = docDate;
        if (!oldestDate || docDate < oldestDate) oldestDate = docDate;
      }

      const searchMetadata = {
        dateRange: {
          newest: newestDate?.toISOString().split('T')[0] || null,
          oldest: oldestDate?.toISOString().split('T')[0] || null,
        },
        resultCount: searchDocs.length,
      };

      // Log successful search
      await this.loggingService.logSearch(
        startTime,
        botId,
        searchDocs.length,
        searchMetadata.dateRange.oldest || undefined,
        searchMetadata.dateRange.newest || undefined,
        user,
      );

      return {
        searchDocs,
        searchMetadata,
      };
    } catch (error) {
      // Log search error
      await this.loggingService.logSearchError(startTime, error, botId, user);
      throw error;
    }
  }

  /**
   * Prepares messages for the chat completion by incorporating search results.
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

    const contextString =
      'Available sources:\n\n' +
      searchDocs
        .map((doc, index) => {
          const date = new Date(doc.date).toISOString().split('T')[0];
          return `Source ${index + 1}:\nTitle: ${
            doc.title
          }\nDate: ${date}\nURL: ${doc.url}\nContent: ${doc.content}`;
        })
        .join('\n\n');

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
        content: `${contextString}\n\nQuestion: ${query}`,
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
   * Resets all citation tracking state to initial values.
   */
  public resetCitationTracking() {
    this.citationBuffer = '';
    this.sourceToSequentialMap.clear();
    this.citationsUsed.clear();
    this.isInCitation = false;
    this.pendingCitations = '';
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
   *
   * @param {string} content - The complete content to process citations for.
   * @returns {Citation[]} Array of citations with metadata.
   */
  public processCitationsInContent(content: string): Citation[] {
    this.resetCitationTracking();
    // Process the entire content as one chunk to get citation mappings
    this.processCitationInChunk(content);
    return this.getCurrentCitations();
  }

  /**
   * Gets the current state of processed citations.
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
        const docIndex = sourceNumber - 1;
        if (docIndex >= 0 && docIndex < this.searchDocs.length) {
          const doc = this.searchDocs[docIndex];
          citations.push({
            title: doc.title,
            date: new Date(doc.date).toISOString().split('T')[0],
            url: doc.url,
            number: i,
          });
        }
      }
    }

    return citations;
  }
}
