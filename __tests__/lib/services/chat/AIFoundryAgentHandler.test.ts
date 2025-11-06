import { Session } from 'next-auth';

import { AIFoundryAgentHandler } from '@/lib/services/chat/AIFoundryAgentHandler';
import { AzureMonitorLoggingService } from '@/lib/services/loggingService';

import { Message, MessageType } from '@/types/chat';

import { beforeEach, describe, expect, it, vi } from 'vitest';

// Hoist mocks before imports
const mockDefaultAzureCredential = vi.hoisted(() => vi.fn());
const mockAgentsClient = vi.hoisted(() => vi.fn());
const mockThreadsCreate = vi.hoisted(() => vi.fn());
const mockMessagesCreate = vi.hoisted(() => vi.fn());
const mockRunsCreate = vi.hoisted(() => vi.fn());
const mockStream = vi.hoisted(() => vi.fn());

const mockLogChatCompletion = vi.hoisted(() => vi.fn());
const mockLogError = vi.hoisted(() => vi.fn());

// Mock dependencies
vi.mock('@azure/identity', () => ({
  DefaultAzureCredential: mockDefaultAzureCredential,
}));

vi.mock('@azure/ai-agents', () => ({
  AgentsClient: mockAgentsClient,
}));

/**
 * Tests for AIFoundryAgentHandler
 * Azure AI Foundry Agent chat handler with Bing grounding
 */
describe('AIFoundryAgentHandler', () => {
  let handler: AIFoundryAgentHandler;
  let mockLoggingService: AzureMonitorLoggingService;
  let mockUser: Session['user'];

  beforeEach(() => {
    vi.clearAllMocks();

    // Setup environment
    process.env.AZURE_AI_FOUNDRY_ENDPOINT =
      'https://test-foundry.services.ai.azure.com';

    // Setup mock user
    mockUser = {
      id: 'user-123',
      mail: 'test@example.com',
      displayName: 'Test User',
    };

    // Setup logging service mock
    mockLoggingService = {
      logChatCompletion: mockLogChatCompletion,
      logError: mockLogError,
    } as any;

    // Setup Azure Identity mock
    mockDefaultAzureCredential.mockImplementation(function (this: any) {
      return {};
    });

    // Setup default stream events
    const defaultStreamEvents = [
      {
        event: 'thread.message.delta',
        data: {
          delta: {
            content: [
              {
                type: 'text',
                text: { value: 'Hello from agent' },
              },
            ],
          },
        },
      },
      {
        event: 'thread.message.completed',
        data: {
          content: [
            {
              text: {
                annotations: [],
              },
            },
          ],
        },
      },
      {
        event: 'thread.run.completed',
        data: {},
      },
      {
        event: 'done',
        data: {},
      },
    ];

    // Setup Azure Agents Client mock
    mockStream.mockResolvedValue(
      (async function* () {
        for (const event of defaultStreamEvents) {
          yield event;
        }
      })(),
    );

    mockRunsCreate.mockReturnValue({
      stream: mockStream,
    });

    mockThreadsCreate.mockResolvedValue({
      id: 'thread-123',
    });

    mockMessagesCreate.mockResolvedValue({});

    mockAgentsClient.mockImplementation(function (this: any) {
      return {
        threads: {
          create: mockThreadsCreate,
        },
        messages: {
          create: mockMessagesCreate,
        },
        runs: {
          create: mockRunsCreate,
        },
      };
    });

    // Create handler
    handler = new AIFoundryAgentHandler(mockLoggingService);
  });

  describe('Environment Configuration', () => {
    it('throws error when AZURE_AI_FOUNDRY_ENDPOINT is not configured', async () => {
      delete process.env.AZURE_AI_FOUNDRY_ENDPOINT;

      const messages: Message[] = [
        {
          role: 'user',
          content: 'Test message',
          messageType: MessageType.TEXT,
        },
      ];

      await expect(
        handler.handleAgentChat(
          'gpt-4.1',
          { agentId: 'asst_test' },
          messages,
          0.7,
          mockUser,
          undefined,
        ),
      ).rejects.toThrow('Azure AI Foundry endpoint or Agent ID not configured');

      // Restore
      process.env.AZURE_AI_FOUNDRY_ENDPOINT =
        'https://test-foundry.services.ai.azure.com';
    });

    it('throws error when agentId is not in modelConfig', async () => {
      const messages: Message[] = [
        {
          role: 'user',
          content: 'Test message',
          messageType: MessageType.TEXT,
        },
      ];

      await expect(
        handler.handleAgentChat(
          'gpt-4.1',
          {},
          messages,
          0.7,
          mockUser,
          undefined,
        ),
      ).rejects.toThrow('Azure AI Foundry endpoint or Agent ID not configured');
    });
  });

  describe('Thread Management', () => {
    it('creates a new thread when threadId is not provided', async () => {
      const messages: Message[] = [
        {
          role: 'user',
          content: 'First message',
          messageType: MessageType.TEXT,
        },
      ];

      await handler.handleAgentChat(
        'gpt-4.1',
        { agentId: 'asst_test' },
        messages,
        0.7,
        mockUser,
        undefined,
      );

      expect(mockThreadsCreate).toHaveBeenCalled();
    });

    it('reuses existing thread when threadId is provided', async () => {
      const messages: Message[] = [
        {
          role: 'user',
          content: 'Follow-up message',
          messageType: MessageType.TEXT,
        },
      ];

      await handler.handleAgentChat(
        'gpt-4.1',
        { agentId: 'asst_test' },
        messages,
        0.7,
        mockUser,
        undefined,
        'thread-existing-456',
      );

      expect(mockThreadsCreate).not.toHaveBeenCalled();
    });

    it('throws error when thread creation fails', async () => {
      mockThreadsCreate.mockRejectedValue(new Error('Thread creation failed'));

      const messages: Message[] = [
        {
          role: 'user',
          content: 'Test message',
          messageType: MessageType.TEXT,
        },
      ];

      await expect(
        handler.handleAgentChat(
          'gpt-4.1',
          { agentId: 'asst_test' },
          messages,
          0.7,
          mockUser,
          undefined,
        ),
      ).rejects.toThrow('Thread creation failed');
    });
  });

  describe('Message Creation', () => {
    it('creates message with text content', async () => {
      const messages: Message[] = [
        {
          role: 'user',
          content: 'Simple text message',
          messageType: MessageType.TEXT,
        },
      ];

      await handler.handleAgentChat(
        'gpt-4.1',
        { agentId: 'asst_test' },
        messages,
        0.7,
        mockUser,
        undefined,
      );

      expect(mockMessagesCreate).toHaveBeenCalledWith(
        'thread-123',
        'user',
        'Simple text message',
      );
    });

    it('handles multimodal content with images', async () => {
      const messages: Message[] = [
        {
          role: 'user',
          content: [
            { type: 'text', text: 'Look at this image' },
            {
              type: 'image_url',
              image_url: {
                url: 'https://example.com/image.jpg',
                detail: 'high',
              },
            },
          ],
          messageType: MessageType.IMAGE,
        },
      ];

      await handler.handleAgentChat(
        'gpt-4.1',
        { agentId: 'asst_test' },
        messages,
        0.7,
        mockUser,
        undefined,
      );

      expect(mockMessagesCreate).toHaveBeenCalledWith('thread-123', 'user', [
        { type: 'text', text: 'Look at this image' },
        {
          type: 'image_url',
          imageUrl: {
            url: 'https://example.com/image.jpg',
            detail: 'high',
          },
        },
      ]);
    });

    it('handles multimodal content with files', async () => {
      const messages: Message[] = [
        {
          role: 'user',
          content: [
            { type: 'text', text: 'Analyze this document' },
            {
              type: 'file_url',
              file_url: { url: 'https://example.com/doc.pdf' },
              originalFilename: 'report.pdf',
            } as any,
          ],
          messageType: MessageType.TEXT,
        },
      ];

      await handler.handleAgentChat(
        'gpt-4.1',
        { agentId: 'asst_test' },
        messages,
        0.7,
        mockUser,
        undefined,
      );

      expect(mockMessagesCreate).toHaveBeenCalledWith('thread-123', 'user', [
        { type: 'text', text: 'Analyze this document' },
        { type: 'text', text: '[File attached: report.pdf]' },
      ]);
    });

    it('handles single TextMessageContent object', async () => {
      const messages: Message[] = [
        {
          role: 'user',
          content: { type: 'text', text: 'Object format message' },
          messageType: MessageType.TEXT,
        },
      ];

      await handler.handleAgentChat(
        'gpt-4.1',
        { agentId: 'asst_test' },
        messages,
        0.7,
        mockUser,
        undefined,
      );

      expect(mockMessagesCreate).toHaveBeenCalledWith(
        'thread-123',
        'user',
        'Object format message',
      );
    });

    it('falls back to String() for unknown content types', async () => {
      const messages: Message[] = [
        {
          role: 'user',
          content: { unknown: 'format' } as any,
          messageType: MessageType.TEXT,
        },
      ];

      await handler.handleAgentChat(
        'gpt-4.1',
        { agentId: 'asst_test' },
        messages,
        0.7,
        mockUser,
        undefined,
      );

      expect(mockMessagesCreate).toHaveBeenCalledWith(
        'thread-123',
        'user',
        '[object Object]',
      );
    });

    it('throws error when message creation fails', async () => {
      mockMessagesCreate.mockRejectedValue(
        new Error('Message creation failed'),
      );

      const messages: Message[] = [
        {
          role: 'user',
          content: 'Test message',
          messageType: MessageType.TEXT,
        },
      ];

      await expect(
        handler.handleAgentChat(
          'gpt-4.1',
          { agentId: 'asst_test' },
          messages,
          0.7,
          mockUser,
          undefined,
        ),
      ).rejects.toThrow('Message creation failed');
    });
  });

  describe('Run Creation and Streaming', () => {
    it('creates run with correct threadId and agentId', async () => {
      const messages: Message[] = [
        {
          role: 'user',
          content: 'Test',
          messageType: MessageType.TEXT,
        },
      ];

      await handler.handleAgentChat(
        'gpt-4.1',
        { agentId: 'asst_custom_agent' },
        messages,
        0.7,
        mockUser,
        undefined,
      );

      expect(mockRunsCreate).toHaveBeenCalledWith(
        'thread-123',
        'asst_custom_agent',
      );
      expect(mockStream).toHaveBeenCalled();
    });

    it('throws error when client.runs is undefined', async () => {
      mockAgentsClient.mockImplementation(function (this: any) {
        return {
          threads: { create: mockThreadsCreate },
          messages: { create: mockMessagesCreate },
          // runs is missing
        };
      });

      const messages: Message[] = [
        {
          role: 'user',
          content: 'Test',
          messageType: MessageType.TEXT,
        },
      ];

      await expect(
        handler.handleAgentChat(
          'gpt-4.1',
          { agentId: 'asst_test' },
          messages,
          0.7,
          mockUser,
          undefined,
        ),
      ).rejects.toThrow('AgentsClient does not have runs property');
    });
  });

  describe('Citation Processing', () => {
    it('converts Bing citation format to numbered citations', async () => {
      mockStream.mockResolvedValue(
        (async function* () {
          yield {
            event: 'thread.message.delta',
            data: {
              delta: {
                content: [
                  {
                    type: 'text',
                    text: { value: 'According to【1:0†source】the data shows' },
                  },
                ],
              },
            },
          };
          yield {
            event: 'thread.message.completed',
            data: {
              content: [
                {
                  text: {
                    annotations: [
                      {
                        type: 'url_citation',
                        urlCitation: {
                          title: 'Source Title',
                          url: 'https://example.com',
                        },
                      },
                    ],
                  },
                },
              ],
            },
          };
          yield { event: 'thread.run.completed', data: {} };
          yield { event: 'done', data: {} };
        })(),
      );

      const messages: Message[] = [
        {
          role: 'user',
          content: 'Search query',
          messageType: MessageType.TEXT,
        },
      ];

      const response = await handler.handleAgentChat(
        'gpt-4.1',
        { agentId: 'asst_test' },
        messages,
        0.7,
        mockUser,
        undefined,
      );

      const text = await response.text();
      expect(text).toContain('[1]');
      expect(text).toContain('According to');
    });

    it('extracts citations from annotations', async () => {
      mockStream.mockResolvedValue(
        (async function* () {
          yield {
            event: 'thread.message.delta',
            data: {
              delta: {
                content: [
                  {
                    type: 'text',
                    text: { value: 'Response text' },
                  },
                ],
              },
            },
          };
          yield {
            event: 'thread.message.completed',
            data: {
              content: [
                {
                  text: {
                    annotations: [
                      {
                        type: 'url_citation',
                        urlCitation: {
                          title: 'Article Title',
                          url: 'https://source.com/article',
                        },
                      },
                    ],
                  },
                },
              ],
            },
          };
          yield { event: 'thread.run.completed', data: {} };
          yield { event: 'done', data: {} };
        })(),
      );

      const messages: Message[] = [
        {
          role: 'user',
          content: 'Query',
          messageType: MessageType.TEXT,
        },
      ];

      const response = await handler.handleAgentChat(
        'gpt-4.1',
        { agentId: 'asst_test' },
        messages,
        0.7,
        mockUser,
        undefined,
      );

      const text = await response.text();
      expect(text).toContain('citations');
      expect(text).toContain('Article Title');
    });
  });

  describe('Response Streaming', () => {
    it('returns Response with correct headers', async () => {
      const messages: Message[] = [
        {
          role: 'user',
          content: 'Test',
          messageType: MessageType.TEXT,
        },
      ];

      const response = await handler.handleAgentChat(
        'gpt-4.1',
        { agentId: 'asst_test' },
        messages,
        0.7,
        mockUser,
        undefined,
      );

      expect(response).toBeInstanceOf(Response);
      expect(response.headers.get('Content-Type')).toBe(
        'text/plain; charset=utf-8',
      );
      expect(response.headers.get('Cache-Control')).toBe('no-cache');
      expect(response.headers.get('Connection')).toBe('keep-alive');
    });

    it('streams text chunks from thread.message.delta events', async () => {
      mockStream.mockResolvedValue(
        (async function* () {
          yield {
            event: 'thread.message.delta',
            data: {
              delta: {
                content: [{ type: 'text', text: { value: 'Chunk 1 ' } }],
              },
            },
          };
          yield {
            event: 'thread.message.delta',
            data: {
              delta: {
                content: [{ type: 'text', text: { value: 'Chunk 2' } }],
              },
            },
          };
          yield {
            event: 'thread.message.completed',
            data: { content: [{ text: {} }] },
          };
          yield { event: 'thread.run.completed', data: {} };
          yield { event: 'done', data: {} };
        })(),
      );

      const messages: Message[] = [
        {
          role: 'user',
          content: 'Test',
          messageType: MessageType.TEXT,
        },
      ];

      const response = await handler.handleAgentChat(
        'gpt-4.1',
        { agentId: 'asst_test' },
        messages,
        0.7,
        mockUser,
        undefined,
      );

      const text = await response.text();
      expect(text).toContain('Chunk 1');
      expect(text).toContain('Chunk 2');
    });

    it('includes threadId in metadata for new threads', async () => {
      const messages: Message[] = [
        {
          role: 'user',
          content: 'Test',
          messageType: MessageType.TEXT,
        },
      ];

      const response = await handler.handleAgentChat(
        'gpt-4.1',
        { agentId: 'asst_test' },
        messages,
        0.7,
        mockUser,
        undefined,
      );

      const text = await response.text();
      expect(text).toContain('threadId');
      expect(text).toContain('thread-123');
    });

    it('does not include threadId for existing threads', async () => {
      const messages: Message[] = [
        {
          role: 'user',
          content: 'Test',
          messageType: MessageType.TEXT,
        },
      ];

      const response = await handler.handleAgentChat(
        'gpt-4.1',
        { agentId: 'asst_test' },
        messages,
        0.7,
        mockUser,
        undefined,
        'thread-existing-789',
      );

      const text = await response.text();
      // Should not have threadId in metadata for existing threads
      const hasNewThreadId =
        text.includes('threadId') && text.includes('thread-existing');
      expect(hasNewThreadId).toBe(false);
    });

    it('handles error events in stream', async () => {
      mockStream.mockResolvedValue(
        (async function* () {
          yield {
            event: 'error',
            data: { message: 'Stream error occurred' },
          };
        })(),
      );

      const messages: Message[] = [
        {
          role: 'user',
          content: 'Test',
          messageType: MessageType.TEXT,
        },
      ];

      const response = await handler.handleAgentChat(
        'gpt-4.1',
        { agentId: 'asst_test' },
        messages,
        0.7,
        mockUser,
        undefined,
      );

      // The stream should error out when consumed
      await expect(response.text()).rejects.toThrow();
    });
  });

  describe('Logging', () => {
    it('logs chat completion on success', async () => {
      const messages: Message[] = [
        {
          role: 'user',
          content: 'Test',
          messageType: MessageType.TEXT,
        },
      ];

      await handler.handleAgentChat(
        'gpt-4.1',
        { agentId: 'asst_test' },
        messages,
        0.8,
        mockUser,
        'bot-123',
      );

      expect(mockLogChatCompletion).toHaveBeenCalledWith(
        expect.any(Number),
        'gpt-4.1',
        1,
        0.8,
        mockUser,
        'bot-123',
      );
    });

    it('logs error on failure', async () => {
      mockMessagesCreate.mockRejectedValue(new Error('Test error'));

      const messages: Message[] = [
        {
          role: 'user',
          content: 'Test',
          messageType: MessageType.TEXT,
        },
      ];

      await expect(
        handler.handleAgentChat(
          'gpt-4.1',
          { agentId: 'asst_test' },
          messages,
          0.7,
          mockUser,
          'bot-456',
        ),
      ).rejects.toThrow('Test error');

      expect(mockLogError).toHaveBeenCalledWith(
        expect.any(Number),
        expect.any(Error),
        'gpt-4.1',
        1,
        0.7,
        mockUser,
        'bot-456',
      );
    });
  });

  describe('Integration Scenarios', () => {
    it('handles complete new conversation workflow', async () => {
      const messages: Message[] = [
        {
          role: 'user',
          content: 'What is the latest news about AI?',
          messageType: MessageType.TEXT,
        },
      ];

      const response = await handler.handleAgentChat(
        'gpt-4.1',
        { agentId: 'asst_news_agent' },
        messages,
        0.7,
        mockUser,
        'news-bot',
      );

      // Verify thread was created
      expect(mockThreadsCreate).toHaveBeenCalled();

      // Verify message was added
      expect(mockMessagesCreate).toHaveBeenCalledWith(
        'thread-123',
        'user',
        'What is the latest news about AI?',
      );

      // Verify run was created
      expect(mockRunsCreate).toHaveBeenCalledWith(
        'thread-123',
        'asst_news_agent',
      );

      // Verify response
      expect(response).toBeInstanceOf(Response);
      const text = await response.text();
      expect(text).toContain('Hello from agent');

      // Verify logging
      expect(mockLogChatCompletion).toHaveBeenCalled();
    });

    it('handles conversation continuation workflow', async () => {
      const messages: Message[] = [
        {
          role: 'user',
          content: 'Follow-up question',
          messageType: MessageType.TEXT,
        },
      ];

      const response = await handler.handleAgentChat(
        'gpt-4.1',
        { agentId: 'asst_agent' },
        messages,
        0.7,
        mockUser,
        undefined,
        'thread-existing-123',
      );

      // Verify thread was NOT created
      expect(mockThreadsCreate).not.toHaveBeenCalled();

      // Verify message was added to existing thread
      expect(mockMessagesCreate).toHaveBeenCalledWith(
        'thread-existing-123',
        'user',
        'Follow-up question',
      );

      expect(response).toBeInstanceOf(Response);
    });
  });
});
