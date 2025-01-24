import { Bot } from '@/types/bots';
import { Message, MessageType } from '@/types/chat';

import { AzureMonitorLoggingService } from './loggingService';

import { AzureKeyCredential, SearchClient } from '@azure/search-documents';
import crypto from 'crypto';
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
  answer: string;
  metadata?: {
    dateRange: DateRange;
    resultCount: number;
    citations: Array<{
      content: string;
      title: string;
      date: string;
      url: string;
      number: number;
    }>;
    sources_used: number;
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
    const bot = bots.find((b) => b.id === botId);
    if (!bot) throw new Error('Bot not found');

    const completion = await this.openAIClient.chat.completions.create({
      model: modelId,
      messages: this.getCompletionMessages(messages, bot, searchDocs),
      response_format: {
        type: 'json_schema' as const,
        json_schema: this.getResponseSchema(),
      },
      temperature: 0.5,
      stream,
    });

    if (stream) {
      return completion as AsyncIterable<OpenAI.Chat.Completions.ChatCompletionChunk>;
    }

    const content =
      (
        completion as OpenAI.Chat.Completions.ChatCompletion
      ).choices[0]?.message?.content?.trim() ?? '';

    try {
      const parsedContent = JSON.parse(content);

      return {
        answer: parsedContent.answer,
        metadata: {
          citations: parsedContent.citations,
          sources_used: parsedContent.sources_used,
          dateRange: searchMetadata.dateRange,
          resultCount: searchMetadata.resultCount,
        },
      };
    } catch (error) {
      console.error('Error parsing JSON response from OpenAI', error, content);
      return {
        answer: content,
      };
    }
  }

  private getResponseSchema() {
    return {
      name: 'StructuredResponse',
      strict: true,
      schema: {
        type: 'object',
        properties: {
          answer: {
            type: 'string',
          },
          metadata: {
            type: 'object',
            properties: {
              dateRange: {
                type: 'object',
                properties: {
                  newest: { type: 'string' },
                  oldest: { type: 'string' },
                },
                required: ['newest', 'oldest'],
                additionalProperties: false,
              },
              resultCount: { type: 'integer' },
              sources_used: { type: 'integer' },
              citations: {
                type: 'array',
                items: {
                  type: 'object',
                  properties: {
                    title: { type: 'string' },
                    date: { type: 'string' },
                    url: { type: 'string' },
                    number: {
                      type: 'integer',
                    },
                  },
                  required: ['title', 'date', 'url', 'number'],
                  additionalProperties: false,
                },
              },
            },
            required: ['dateRange', 'resultCount', 'sources_used', 'citations'],
            additionalProperties: false,
          },
        },
        required: ['answer', 'metadata'],
        additionalProperties: false,
      },
    };
  }

  private getCompletionMessages(
    messages: Message[],
    bot: Bot,
    searchDocs: SearchResult[],
  ): OpenAI.Chat.ChatCompletionMessageParam[] {
    const query = this.extractQuery(messages);
    return [
      {
        role: 'system' as const,
        content: `${bot.prompt}`,
      },
      ...messages.slice(0, -1).map((msg) => ({
        role: msg.role as 'assistant' | 'user' | 'system',
        content:
          typeof msg.content === 'string'
            ? msg.content
            : JSON.stringify(msg.content),
      })),
      {
        role: 'user' as const,
        content: `Context:\n${JSON.stringify(
          searchDocs,
        )}\n\nQuestion: ${query}`,
      },
    ];
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
