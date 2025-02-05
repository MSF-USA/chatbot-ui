import { Bot } from '@/types/bots';
import { Message, MessageType } from '@/types/chat';

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
  answer: string;
  sources_used: Array<{
    title: string;
    date: string;
    url: string;
    number: number;
  }>;
  sources_date_range: DateRange;
  total_sources: number;
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
        sources_used: parsedContent.sources_used,
        sources_date_range: {
          newest: parsedContent.newestDate?.toISOString().split('T')[0] || null,
          oldest: parsedContent.oldestDate?.toISOString().split('T')[0] || null,
        },
        total_sources: parsedContent.total_sources,
      };
    } catch (error) {
      console.error('Error parsing JSON response from OpenAI', error, content);
      return {
        answer: content,
        sources_used: [],
        sources_date_range: {
          newest: null,
          oldest: null,
        },
        total_sources: 0,
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
            description:
              'Your response using citations [1], [2], etc. in order of first appearance',
          },
          sources_used: {
            type: 'array',
            description:
              'Citations in order of first appearance in answer, numbered sequentially from 1',
            items: {
              type: 'object',
              properties: {
                title: { type: 'string' },
                date: {
                  type: 'string',
                  description: 'Date in YYYY-MM-DD format',
                },
                url: { type: 'string' },
                number: {
                  type: 'integer',
                  description:
                    'Sequential number starting from 1, matching order in answer',
                },
              },
              required: ['title', 'date', 'url', 'number'],
              additionalProperties: false,
            },
          },
          total_sources: {
            type: 'integer',
            description: 'Total number of unique sources used in the answer',
          },
        },
        required: ['answer', 'sources_used', 'total_sources'],
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

    const systemPrompt = bot.prompt;

    return [
      {
        role: 'system' as const,
        content: systemPrompt,
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
        content: `${contextString}\n\nQuestion: ${query}`,
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
          newest: newestDate?.toISOString().split('T')[0] || null,
          oldest: oldestDate?.toISOString().split('T')[0] || null,
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
