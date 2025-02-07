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
      1. Use source numbers exactly as provided (e.g., if source 5 is relevant, use [^5])
      2. Only cite the most relevant sources
      3. Each source should only be cited once
      4. Place source numbers immediately after the relevant information`,
        },
        ...this.getCompletionMessages(messages, bot, searchDocs),
      ];

    const completion = await this.openAIClient.chat.completions.create({
      model: modelId,
      messages: enhancedMessages,
      temperature: 0.5,
      stream: true,
    });

    // For streaming, return the raw completion
    if (stream) {
      return completion;
    }

    // For non-streaming, collect and process the entire response
    const fullResponse = await this.collectStreamResponse(completion);

    return {
      answer: fullResponse.content,
      sources_used: fullResponse.citations,
      sources_date_range: searchMetadata.dateRange,
      total_sources: fullResponse.citations.length,
    };
  }

  private async collectStreamResponse(
    stream: AsyncIterable<OpenAI.Chat.Completions.ChatCompletionChunk>,
  ): Promise<{ content: string; citations: Citation[] }> {
    let fullContent = '';

    for await (const chunk of stream) {
      const content = chunk.choices[0]?.delta?.content;
      if (!content) continue;
      fullContent += content;
    }

    const citations = this.findCitationsInContent(fullContent);
    return {
      content: fullContent,
      citations,
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

  public findCitationsInContent(content: string): Citation[] {
    const citations: Citation[] = [];
    const uniqueCitationsSet = new Set<number>();
    const citationRegex = /\[\^(\d+)\]/g;
    let match;
    const numberMap = new Map<number, number>(); // Map original numbers to new ones
    let newNumber = 1;

    // First pass: collect unique citations and build number mapping
    while ((match = citationRegex.exec(content)) !== null) {
      const originalNumber = parseInt(match[1]);
      if (!uniqueCitationsSet.has(originalNumber)) {
        uniqueCitationsSet.add(originalNumber);
        numberMap.set(originalNumber, newNumber++);

        const docIndex = originalNumber - 1;
        if (docIndex >= 0 && docIndex < this.searchDocs.length) {
          const doc = this.searchDocs[docIndex];
          citations.push({
            title: doc.title,
            date: new Date(doc.date).toISOString().split('T')[0],
            url: doc.url,
            number: numberMap.get(originalNumber)!,
          });
        }
      }
    }

    // Sort citations by their new numbers
    citations.sort((a, b) => a.number - b.number);

    return citations;
  }
}
