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

  // Citation tracking state
  private citationBuffer: string = '';
  private citationOrderMap: Map<number, number> = new Map();
  private nextCitationNumber: number = 1;
  private currentCitation: string = '';

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

    // For non-streaming responses
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
    this.citationOrderMap.clear();
    this.nextCitationNumber = 1;
    this.currentCitation = '';
  }

  public processCitationInChunk(chunk: string): string {
    // Add to buffer for tracking complete citations
    this.citationBuffer += chunk;

    // Start with the chunk we received
    let result = chunk;

    // Handle citation parts
    if (chunk.includes('[')) {
      this.currentCitation = '[';
    } else if (/^\d+$/.test(chunk)) {
      if (this.currentCitation?.startsWith('[')) {
        this.currentCitation += chunk + ']';

        // Try to find a complete citation pattern
        const match = /\[(\d+)\]/.exec(this.currentCitation);
        if (match) {
          const sourceNumber = parseInt(match[1]);
          if (!this.citationOrderMap.has(sourceNumber)) {
            this.citationOrderMap.set(sourceNumber, this.nextCitationNumber++);
          }
          const newNumber = this.citationOrderMap.get(sourceNumber);
          console.log(
            `Updating citation number ${sourceNumber} -> ${newNumber}`,
          );
          result = newNumber?.toString() || chunk;
        }

        // Reset current citation
        this.currentCitation = '';
      }
    } else {
      if (this.currentCitation) {
        this.currentCitation += chunk;
      }
    }

    console.log('Processed chunk:', {
      input: chunk,
      output: result,
      currentCitation: this.currentCitation,
      citations: Object.fromEntries(this.citationOrderMap),
      replacedNumber: result !== chunk,
    });

    return result;
  }

  private processCitationsInContent(content: string): Citation[] {
    this.resetCitationTracking();
    this.processCitationInChunk(content);
    return this.getCurrentCitations();
  }

  public getCurrentCitations(): Citation[] {
    const citations: Citation[] = [];

    // Convert the map to array of [originalNumber, newNumber] pairs and sort by newNumber
    const sortedCitations = Array.from(this.citationOrderMap.entries()).sort(
      (a, b) => a[1] - b[1],
    );

    // Create citation objects in order
    for (const [originalNumber, newNumber] of sortedCitations) {
      const docIndex = originalNumber - 1;
      if (docIndex >= 0 && docIndex < this.searchDocs.length) {
        const doc = this.searchDocs[docIndex];
        const existingCitation = citations.find((c) => c.number === newNumber);

        // Only add if we haven't already added this citation number
        if (!existingCitation) {
          citations.push({
            title: doc.title,
            date: new Date(doc.date).toISOString().split('T')[0],
            url: doc.url,
            number: newNumber,
          });
        }
      }
    }

    return citations;
  }
}
