import { Bot } from '@/types/bots';
import { Message } from '@/types/chat';

import { AzureMonitorLoggingService } from './loggingService';

import { AzureKeyCredential, SearchClient } from '@azure/search-documents';
import { AzureOpenAI } from 'openai';
import OpenAI from 'openai';

interface SearchResult {
  content: string;
  title: string;
  date: string;
  url: string;
}

interface DateRange {
  newest: string | null;
  oldest: string | null;
}

interface RAGResponse {
  messages: Message[];
  metadata: {
    dateRange: DateRange;
    resultCount: number;
    response?: any;
  };
}

export class RAGService {
  private searchClient: SearchClient<SearchResult>;
  private loggingService: AzureMonitorLoggingService;
  private openAIClient: AzureOpenAI;

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

  private getCompletionMessages(
    messages: Message[],
    bot: Bot,
    searchDocs: SearchResult[],
    query: string,
  ) {
    return [
      {
        role: 'system',
        content: `${bot.prompt}\n\nProvide answers using the supplied sources. Include relevant quotes and citations.`,
      },
      ...messages.slice(0, -1).map((msg) => ({
        role:
          msg.role === 'user'
            ? 'user'
            : msg.role === 'assistant'
            ? 'assistant'
            : 'system',
        content:
          typeof msg.content === 'string'
            ? msg.content
            : JSON.stringify(msg.content),
      })),
      {
        role: 'user',
        content: `Context:\n${JSON.stringify(
          searchDocs,
        )}\n\nQuestion: ${query}`,
      },
    ] as OpenAI.Chat.ChatCompletionMessageParam[];
  }

  async augmentMessages(
    messages: Message[],
    botId: string,
    bots: Bot[],
    modelId: string,
    stream: boolean = false,
  ): Promise<RAGResponse> {
    try {
      const { searchDocs, searchMetadata } = await this.performSearch(
        messages,
        botId,
        bots,
      );
      const bot = bots.find((b) => b.id === botId);
      if (!bot) throw new Error('Bot not found');
      const query = this.extractQuery(messages);

      const completionMessages = this.getCompletionMessages(
        messages,
        bot,
        searchDocs,
        query,
      );

      console.log(completionMessages);

      const requestParams = {
        model: modelId,
        messages: completionMessages,
        response_format: {
          type: 'json_schema' as const,
          json_schema: {
            name: 'StructuredResponse',
            strict: true,
            schema: {
              type: 'object',
              properties: {
                answer: {
                  type: 'string',
                  description: "The complete answer to the user's question",
                },
                citations: {
                  type: 'array',
                  items: {
                    type: 'object',
                    properties: {
                      content: { type: 'string' },
                      title: { type: 'string' },
                      date: { type: 'string' },
                      url: { type: 'string' },
                      number: { type: 'integer' },
                    },
                    required: ['content', 'title', 'date', 'url', 'number'],
                    additionalProperties: false,
                  },
                },
                sources_used: { type: 'integer' },
              },
              required: ['answer', 'citations', 'sources_used'],
              additionalProperties: false,
            },
          },
        },
        temperature: 0.5,
        stream: false,
      } as const;

      const response = await this.openAIClient.chat.completions.create(
        requestParams,
      );

      const content = response?.choices?.[0]?.message?.content?.trim() ?? '';
      console.log(content);

      return {
        messages,
        metadata: {
          ...searchMetadata,
          response,
        },
      };
    } catch (error) {
      console.error('RAG Error:', error);
      throw error;
    }
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
          newest: newestDate?.toISOString() || null,
          oldest: oldestDate?.toISOString() || null,
        },
        resultCount: searchDocs.length,
      },
    };
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
}
