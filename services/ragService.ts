import { Bot } from '@/types/bots';
import { Message } from '@/types/chat';
import { Citation, DateRange, RAGResponse, SearchResult } from '@/types/rag';

import { AzureMonitorLoggingService } from './loggingService';

import { AzureKeyCredential, SearchClient } from '@azure/search-documents';
import { AzureOpenAI } from 'openai';
import OpenAI from 'openai';

export class RAGService {
  private searchClient: SearchClient<SearchResult>;
  private loggingService: AzureMonitorLoggingService;
  private openAIClient: AzureOpenAI;
  private searchDocs: SearchResult[] = [];

  // Citation tracking properties
  private citationBuffer: string = '';
  private sourceToSequentialMap: Map<number, number> = new Map();
  private citationsUsed: Set<number> = new Set();
  private isInCitation: boolean = false;

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

  async augmentMessages(
    messages: Message[],
    botId: string,
    bots: Bot[],
    modelId: string,
    stream: boolean = false,
  ): Promise<
    AsyncIterable<OpenAI.Chat.Completions.ChatCompletionChunk> | RAGResponse
  > {
    const { searchDocs, searchMetadata } = await this.performSearch(
      messages,
      botId,
      bots,
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

    if (stream) {
      return this.openAIClient.chat.completions.create({
        model: modelId,
        messages: enhancedMessages,
        temperature: 0.5,
        stream: true,
      });
    }

    const completion = await this.openAIClient.chat.completions.create({
      model: modelId,
      messages: enhancedMessages,
      temperature: 0.5,
      stream: false,
    });

    const content = completion.choices[0]?.message?.content || '';
    const citations = this.processCitationsInContent(content);

    return {
      answer: content,
      sources_used: citations,
      sources_date_range: searchMetadata.dateRange,
      total_sources: citations.length,
    };
  }

  private async performSearch(messages: Message[], botId: string, bots: Bot[]) {
    const bot = bots.find((b) => b.id === botId);
    if (!bot) throw new Error(`Bot ${botId} not found`);

    const query = this.extractQuery(messages);
    const searchResults = await this.searchClient.search(query, {
      select: ['content', 'title', 'date', 'url'],
      top: 10,
      queryType: 'simple',
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

    return {
      searchDocs,
      searchMetadata: {
        dateRange: {
          newest: newestDate?.toISOString().split('T')[0] || null,
          oldest: oldestDate?.toISOString().split('T')[0] || null,
        },
        resultCount: searchDocs.length,
      },
    };
  }

  private getCompletionMessages(
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

  private extractQuery(messages: Message[]): string {
    const lastUserMessage = messages
      .slice()
      .reverse()
      .find((m) => m.role === 'user');
    if (!lastUserMessage?.content) throw new Error('No user message found');
    return typeof lastUserMessage.content === 'string'
      ? lastUserMessage.content
      : '';
  }

  public resetCitationTracking() {
    this.citationBuffer = '';
    this.sourceToSequentialMap.clear();
    this.citationsUsed.clear();
    this.isInCitation = false;
  }

  public processCitationInChunk(chunk: string): string {
    // If we're not in a citation and chunk has no citation markers, return as is
    if (!this.isInCitation && !chunk.includes('[')) {
      return chunk;
    }

    let result = '';
    let currentPosition = 0;

    // Process the chunk character by character
    while (currentPosition < chunk.length) {
      // If we're not in a citation, look for the next '['
      if (!this.isInCitation) {
        const nextBracket = chunk.indexOf('[', currentPosition);
        if (nextBracket === -1) {
          // No more citations in this chunk
          result += chunk.slice(currentPosition);
          break;
        }
        // Add text before the citation
        result += chunk.slice(currentPosition, nextBracket);

        // Check if this is a section header bracket
        const nextCloseBracket = chunk.indexOf(']', nextBracket);
        if (nextCloseBracket !== -1) {
          const potentialHeader = chunk.substring(
            nextBracket,
            nextCloseBracket + 1,
          );
          if (
            potentialHeader.match(/\[.*Events\]/i) ||
            potentialHeader.match(/\[.*Analysis\]/i)
          ) {
            // This is a section header, not a citation
            result += potentialHeader;
            currentPosition = nextCloseBracket + 1;
            continue;
          }
        }

        this.isInCitation = true;
        this.citationBuffer = '';
        currentPosition = nextBracket;
      }

      // Add characters to citation buffer until we find ']'
      while (currentPosition < chunk.length) {
        const char = chunk[currentPosition];
        this.citationBuffer += char;
        currentPosition++;

        if (char === ']') {
          const match = this.citationBuffer.match(/\[(\d+)\]/);
          if (match) {
            const sourceNumber = parseInt(match[1], 10);

            // Get or create sequential number
            if (!this.sourceToSequentialMap.has(sourceNumber)) {
              const nextNumber = this.citationsUsed.size + 1;
              this.sourceToSequentialMap.set(sourceNumber, nextNumber);
              this.citationsUsed.add(nextNumber);
            }
            const sequentialNumber =
              this.sourceToSequentialMap.get(sourceNumber)!;

            // Replace citation with sequential number
            result += `[${sequentialNumber}]`;
            this.citationBuffer = '';
            this.isInCitation = false;
            break;
          } else {
            // This might be a section header that we missed
            result += this.citationBuffer;
            this.citationBuffer = '';
            this.isInCitation = false;
            break;
          }
        }
      }
    }

    // If we're still in a citation, the citation is incomplete
    if (this.isInCitation) {
      return ''; // Hold onto the partial citation
    }

    // Clean up any markdown-style headers that might have been affected
    result = result.replace(/###\s+\[([^\]]+)\]/g, '### $1');

    return result;
  }

  private processCitationsInContent(content: string): Citation[] {
    this.resetCitationTracking();
    // Process the entire content as one chunk to get citation mappings
    this.processCitationInChunk(content);
    return this.getCurrentCitations();
  }

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
