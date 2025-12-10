import { describe, expect, it, vi, beforeEach, afterEach } from 'vitest';

import { makeRequest } from '@/services/frontendChatServices';
import { getEndpoint } from '@/utils/app/api';

import { Conversation, Message } from '@/types/chat';
import { OpenAIModel, OpenAIModelID } from '@/types/openai';
import { Plugin, PluginID } from '@/types/plugin';

// Mock the API module
vi.mock('@/utils/app/api', () => ({
  getEndpoint: vi.fn(() => 'api/v2/chat'),
}));

describe('frontendChatServices', () => {
  let mockFetch: ReturnType<typeof vi.fn>;
  let mockSetRequestStatusMessage: ReturnType<typeof vi.fn>;
  let mockSetProgress: ReturnType<typeof vi.fn>;
  let consoleLogSpy: ReturnType<typeof vi.spyOn>;

  const createMockConversation = (messages: Message[]): Conversation => ({
    id: 'test-conversation',
    name: 'Test Conversation',
    messages,
    model: {
      id: OpenAIModelID.GPT_4,
      name: 'GPT-4',
      maxLength: 8000,
      tokenLimit: 8000,
    } as OpenAIModel,
    prompt: 'Test prompt',
    temperature: 0.5,
    folderId: null,
    promptTemplate: null,
  });

  beforeEach(() => {
    mockSetRequestStatusMessage = vi.fn();
    mockSetProgress = vi.fn();
    mockFetch = vi.fn();
    global.fetch = mockFetch;
    consoleLogSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
  });

  afterEach(() => {
    vi.clearAllMocks();
    consoleLogSpy.mockRestore();
  });

  describe('Multi-file upload processing', () => {
    it('should correctly parse v2 API response structure for multiple files', async () => {
      // Create a multi-file message
      const multiFileMessage: Message = {
        role: 'user',
        content: [
          { type: 'text', text: 'Compare these two files' },
          {
            type: 'file_url',
            url: 'https://example.com/file1.pdf',
            originalFilename: 'document1.pdf'
          },
          {
            type: 'file_url',
            url: 'https://example.com/file2.sql',
            originalFilename: 'query.sql'
          },
        ],
        messageType: 'text',
      };

      const conversation = createMockConversation([multiFileMessage]);

      // Mock v2 API responses for individual file summaries
      const mockV2Response1 = {
        success: true,
        data: {
          text: 'This is a summary of document1.pdf containing important information.',
          agentType: undefined,
          confidence: undefined,
          sources: [],
          processingTime: 1234,
          usedFallback: false,
        },
        metadata: {
          version: '2.0',
          timestamp: new Date().toISOString(),
          requestId: 'req_123',
        },
      };

      const mockV2Response2 = {
        success: true,
        data: {
          text: 'This is a summary of query.sql with database operations.',
          agentType: undefined,
          confidence: undefined,
          sources: [],
          processingTime: 1234,
          usedFallback: false,
        },
        metadata: {
          version: '2.0',
          timestamp: new Date().toISOString(),
          requestId: 'req_124',
        },
      };

      // Mock final comparison response (streaming)
      const mockStreamResponse = new ReadableStream({
        start(controller) {
          controller.enqueue(new TextEncoder().encode('data: {"text": "Comparison result"}\n\n'));
          controller.close();
        },
      });

      // Set up fetch mock to return different responses
      let callCount = 0;
      mockFetch.mockImplementation(() => {
        callCount++;
        if (callCount === 1) {
          // First file summary request
          return Promise.resolve({
            ok: true,
            json: () => Promise.resolve(mockV2Response1),
            text: () => Promise.resolve(JSON.stringify(mockV2Response1)),
          });
        } else if (callCount === 2) {
          // Second file summary request
          return Promise.resolve({
            ok: true,
            json: () => Promise.resolve(mockV2Response2),
            text: () => Promise.resolve(JSON.stringify(mockV2Response2)),
          });
        } else {
          // Final comparison request (streaming)
          return Promise.resolve({
            ok: true,
            body: mockStreamResponse,
          });
        }
      });

      const result = await makeRequest(
        null,
        mockSetRequestStatusMessage,
        conversation,
        'test-api-key',
        [],
        'System prompt',
        0.5,
        true, // stream
        mockSetProgress,
        undefined, // stopConversationRef
        true, // forceStandardChat
      );

      // Verify that status messages were updated
      expect(mockSetRequestStatusMessage).toHaveBeenCalledWith('Handling multi-file processing. Please wait...');
      expect(mockSetRequestStatusMessage).toHaveBeenCalledWith('Processing document1.pdf...');
      expect(mockSetRequestStatusMessage).toHaveBeenCalledWith('Processing query.sql...');
      expect(mockSetRequestStatusMessage).toHaveBeenCalledWith('File processing complete! Handling user prompt...');

      // Verify progress was updated
      expect(mockSetProgress).toHaveBeenCalled();

      // Verify the final request body includes the summaries
      const finalRequestCall = mockFetch.mock.calls[2];
      const finalRequestBody = JSON.parse(finalRequestCall[1].body);
      const finalMessage = finalRequestBody.messages[finalRequestBody.messages.length - 1];

      // Check that the comparison prompt includes both summaries
      expect(finalMessage.content[0].text).toContain('document1.pdf');
      expect(finalMessage.content[0].text).toContain('This is a summary of document1.pdf containing important information.');
      expect(finalMessage.content[0].text).toContain('query.sql');
      expect(finalMessage.content[0].text).toContain('This is a summary of query.sql with database operations.');
      expect(finalMessage.content[0].text).toContain('Compare these two files');

      // Verify result
      expect(result.hasComplexContent).toBe(true);
      expect(result.response).toBeDefined();
    });

    it('should handle v1 API backward compatibility', async () => {
      // Create a multi-file message
      const multiFileMessage: Message = {
        role: 'user',
        content: [
          { type: 'text', text: 'Analyze this file' },
          {
            type: 'file_url',
            url: 'https://example.com/legacy.txt',
            originalFilename: 'legacy.txt'
          },
          {
            type: 'file_url',
            url: 'https://example.com/old.csv',
            originalFilename: 'old.csv'
          },
        ],
        messageType: 'text',
      };

      const conversation = createMockConversation([multiFileMessage]);

      // Mock v1 API responses (direct text field)
      const mockV1Response1 = {
        text: 'Legacy format summary of legacy.txt file.',
      };

      const mockV1Response2 = {
        text: 'Old format summary of old.csv data.',
      };

      let callCount = 0;
      mockFetch.mockImplementation(() => {
        callCount++;
        if (callCount === 1) {
          return Promise.resolve({
            ok: true,
            json: () => Promise.resolve(mockV1Response1),
          });
        } else if (callCount === 2) {
          return Promise.resolve({
            ok: true,
            json: () => Promise.resolve(mockV1Response2),
          });
        } else {
          return Promise.resolve({
            ok: true,
            body: new ReadableStream(),
          });
        }
      });

      await makeRequest(
        null,
        mockSetRequestStatusMessage,
        conversation,
        'test-api-key',
        [],
        'System prompt',
        0.5,
        true,
        mockSetProgress,
        undefined,
        true,
      );

      // Verify the final request includes v1 format summaries
      const finalRequestCall = mockFetch.mock.calls[2];
      const finalRequestBody = JSON.parse(finalRequestCall[1].body);
      const finalMessage = finalRequestBody.messages[finalRequestBody.messages.length - 1];

      expect(finalMessage.content[0].text).toContain('Legacy format summary of legacy.txt file.');
      expect(finalMessage.content[0].text).toContain('Old format summary of old.csv data.');
    });

    it('should handle mixed v1 and v2 API responses', async () => {
      const multiFileMessage: Message = {
        role: 'user',
        content: [
          { type: 'text', text: 'Compare files' },
          {
            type: 'file_url',
            url: 'https://example.com/new.pdf',
            originalFilename: 'new.pdf'
          },
          {
            type: 'file_url',
            url: 'https://example.com/old.txt',
            originalFilename: 'old.txt'
          },
        ],
        messageType: 'text',
      };

      const conversation = createMockConversation([multiFileMessage]);

      // v2 response for first file
      const mockV2Response = {
        success: true,
        data: {
          text: 'New v2 format summary',
        },
        metadata: {},
      };

      // v1 response for second file
      const mockV1Response = {
        text: 'Old v1 format summary',
      };

      let callCount = 0;
      mockFetch.mockImplementation(() => {
        callCount++;
        if (callCount === 1) {
          return Promise.resolve({
            ok: true,
            json: () => Promise.resolve(mockV2Response),
          });
        } else if (callCount === 2) {
          return Promise.resolve({
            ok: true,
            json: () => Promise.resolve(mockV1Response),
          });
        } else {
          return Promise.resolve({
            ok: true,
            body: new ReadableStream(),
          });
        }
      });

      await makeRequest(
        null,
        mockSetRequestStatusMessage,
        conversation,
        'test-api-key',
        [],
        'System prompt',
        0.5,
        true,
        mockSetProgress,
      );

      const finalRequestCall = mockFetch.mock.calls[2];
      const finalRequestBody = JSON.parse(finalRequestCall[1].body);
      const finalMessage = finalRequestBody.messages[finalRequestBody.messages.length - 1];

      // Both summaries should be included
      expect(finalMessage.content[0].text).toContain('New v2 format summary');
      expect(finalMessage.content[0].text).toContain('Old v1 format summary');
    });

    it('should handle empty or null summary responses gracefully', async () => {
      const multiFileMessage: Message = {
        role: 'user',
        content: [
          { type: 'text', text: 'Analyze files' },
          {
            type: 'file_url',
            url: 'https://example.com/empty.pdf',
            originalFilename: 'empty.pdf'
          },
          {
            type: 'file_url',
            url: 'https://example.com/null.txt',
            originalFilename: 'null.txt'
          },
        ],
        messageType: 'text',
      };

      const conversation = createMockConversation([multiFileMessage]);

      // Response with undefined text in v2 format
      const mockEmptyV2Response = {
        success: true,
        data: {
          // text is undefined
        },
        metadata: {},
      };

      // Response with null text in v1 format
      const mockNullV1Response = {
        text: null,
      };

      let callCount = 0;
      mockFetch.mockImplementation(() => {
        callCount++;
        if (callCount === 1) {
          return Promise.resolve({
            ok: true,
            json: () => Promise.resolve(mockEmptyV2Response),
          });
        } else if (callCount === 2) {
          return Promise.resolve({
            ok: true,
            json: () => Promise.resolve(mockNullV1Response),
          });
        } else {
          return Promise.resolve({
            ok: true,
            body: new ReadableStream(),
          });
        }
      });

      await makeRequest(
        null,
        mockSetRequestStatusMessage,
        conversation,
        'test-api-key',
        [],
        'System prompt',
        0.5,
        true,
        mockSetProgress,
      );

      const finalRequestCall = mockFetch.mock.calls[2];
      const finalRequestBody = JSON.parse(finalRequestCall[1].body);
      const finalMessage = finalRequestBody.messages[finalRequestBody.messages.length - 1];

      // Should have empty summaries but still include file names
      expect(finalMessage.content[0].text).toContain('empty.pdf');
      expect(finalMessage.content[0].text).toContain('null.txt');
      // The summaries should be empty strings (between the filename and closing backticks)
      expect(finalMessage.content[0].text).toMatch(/```empty\.pdf\n\n```/);
      expect(finalMessage.content[0].text).toMatch(/```null\.txt\n\n```/);
    });

    it('should handle image files alongside regular files', async () => {
      const multiFileMessage: Message = {
        role: 'user',
        content: [
          { type: 'text', text: 'Analyze these items' },
          {
            type: 'file_url',
            url: 'https://example.com/document.pdf',
            originalFilename: 'document.pdf'
          },
          {
            type: 'image_url',
            image_url: { url: 'https://example.com/image.png' }
          },
        ],
        messageType: 'text',
      };

      const conversation = createMockConversation([multiFileMessage]);

      const mockFileResponse = {
        success: true,
        data: {
          text: 'Document summary',
        },
      };

      const mockImageResponse = {
        success: true,
        data: {
          text: 'Image analysis result',
        },
      };

      let callCount = 0;
      mockFetch.mockImplementation(() => {
        callCount++;
        if (callCount === 1) {
          return Promise.resolve({
            ok: true,
            json: () => Promise.resolve(mockFileResponse),
          });
        } else if (callCount === 2) {
          return Promise.resolve({
            ok: true,
            json: () => Promise.resolve(mockImageResponse),
          });
        } else {
          return Promise.resolve({
            ok: true,
            body: new ReadableStream(),
          });
        }
      });

      await makeRequest(
        null,
        mockSetRequestStatusMessage,
        conversation,
        'test-api-key',
        [],
        'System prompt',
        0.5,
        true,
        mockSetProgress,
      );

      // Verify processing messages for both file types
      expect(mockSetRequestStatusMessage).toHaveBeenCalledWith('Processing document.pdf...');
      expect(mockSetRequestStatusMessage).toHaveBeenCalledWith('Processing Image: image.png...');

      const finalRequestCall = mockFetch.mock.calls[2];
      const finalRequestBody = JSON.parse(finalRequestCall[1].body);
      const finalMessage = finalRequestBody.messages[finalRequestBody.messages.length - 1];

      expect(finalMessage.content[0].text).toContain('document.pdf');
      expect(finalMessage.content[0].text).toContain('Document summary');
      expect(finalMessage.content[0].text).toContain('Image: image.png');
      expect(finalMessage.content[0].text).toContain('Image analysis result');
    });

    it('should update progress correctly during multi-file processing', async () => {
      const multiFileMessage: Message = {
        role: 'user',
        content: [
          { type: 'text', text: 'Process files' },
          {
            type: 'file_url',
            url: 'https://example.com/file1.pdf',
            originalFilename: 'file1.pdf'
          },
          {
            type: 'file_url',
            url: 'https://example.com/file2.pdf',
            originalFilename: 'file2.pdf'
          },
          {
            type: 'file_url',
            url: 'https://example.com/file3.pdf',
            originalFilename: 'file3.pdf'
          },
        ],
        messageType: 'text',
      };

      const conversation = createMockConversation([multiFileMessage]);

      mockFetch.mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({ data: { text: 'Summary' } }),
        body: new ReadableStream(),
      });

      await makeRequest(
        null,
        mockSetRequestStatusMessage,
        conversation,
        'test-api-key',
        [],
        'System prompt',
        0.5,
        true,
        mockSetProgress,
      );

      // Progress should be called multiple times
      // Initial: 0%
      expect(mockSetProgress).toHaveBeenCalledWith(0);
      // After first file: 25% (1/4 including final step)
      expect(mockSetProgress).toHaveBeenCalledWith(25);
      // After second file: 50% (2/4)
      expect(mockSetProgress).toHaveBeenCalledWith(50);
      // After third file: 75% (3/4)
      expect(mockSetProgress).toHaveBeenCalledWith(75);
      // Before final request: still 75%
      expect(mockSetProgress).toHaveBeenCalledWith(75);
      // Reset after completion
      expect(mockSetProgress).toHaveBeenCalledWith(null);
    });

    it('should not treat single file with text as complex content', async () => {
      const singleFileMessage: Message = {
        role: 'user',
        content: [
          { type: 'text', text: 'Analyze this file' },
          {
            type: 'file_url',
            url: 'https://example.com/single.pdf',
            originalFilename: 'single.pdf'
          },
        ],
        messageType: 'text',
      };

      const conversation = createMockConversation([singleFileMessage]);

      mockFetch.mockResolvedValue({
        ok: true,
        body: new ReadableStream(),
      });

      const result = await makeRequest(
        null,
        mockSetRequestStatusMessage,
        conversation,
        'test-api-key',
        [],
        'System prompt',
        0.5,
        true,
        mockSetProgress,
      );

      // Should not be treated as complex content (only 2 content items: text + 1 file)
      expect(result.hasComplexContent).toBe(false);
      // Should not show multi-file processing message
      expect(mockSetRequestStatusMessage).not.toHaveBeenCalledWith('Handling multi-file processing. Please wait...');
      // Should make only one request (no intermediate summaries)
      expect(mockFetch).toHaveBeenCalledTimes(1);
    });
  });

  describe('Helper functions', () => {
    it('should correctly identify complex content', async () => {
      // Import the helper function directly
      const chatModule = await vi.importActual('@/services/frontendChatServices') as any;
      const isComplexContent = chatModule.isComplexContent;

      // More than 2 content items
      expect(isComplexContent([
        { type: 'text', text: 'test' },
        { type: 'file_url', url: 'file1' },
        { type: 'file_url', url: 'file2' },
      ])).toBe(true);

      // Multiple files
      expect(isComplexContent([
        { type: 'text', text: 'test' },
        { type: 'file_url', url: 'file1' },
        { type: 'file_url', url: 'file2' },
      ])).toBe(true);

      // Multiple images
      expect(isComplexContent([
        { type: 'text', text: 'test' },
        { type: 'image_url', image_url: { url: 'img1' } },
        { type: 'image_url', image_url: { url: 'img2' } },
      ])).toBe(true);

      // Mixed file and image
      expect(isComplexContent([
        { type: 'text', text: 'test' },
        { type: 'file_url', url: 'file' },
        { type: 'image_url', image_url: { url: 'img' } },
      ])).toBe(true);

      // Not complex - single file
      expect(isComplexContent([
        { type: 'text', text: 'test' },
        { type: 'file_url', url: 'file' },
      ])).toBe(false);

      // Not complex - single image
      expect(isComplexContent([
        { type: 'text', text: 'test' },
        { type: 'image_url', image_url: { url: 'img' } },
      ])).toBe(false);
    });

    it('should create chat body with correct parameters', async () => {
      const chatModule = await vi.importActual('@/services/frontendChatServices') as any;
      const createChatBody = chatModule.createChatBody;

      const conversation = createMockConversation([]);
      const messages: Message[] = [{ role: 'user', content: 'test' }];

      // Basic chat body
      const chatBody = createChatBody(
        conversation,
        messages,
        'api-key',
        'system-prompt',
        0.7,
        'bot-123',
        true,
      );

      expect(chatBody.model).toEqual(conversation.model);
      expect(chatBody.messages).toEqual(messages);
      expect(chatBody.key).toBe('api-key');
      expect(chatBody.prompt).toBe('Test prompt'); // Uses conversation prompt
      expect(chatBody.temperature).toBe(0.5); // Uses conversation temperature
      expect(chatBody.botId).toBe('bot-123');
      expect(chatBody.stream).toBe(true);

      // With force standard chat
      const chatBodyForced = createChatBody(
        { ...conversation, prompt: null, temperature: null },
        messages,
        'api-key',
        'system-prompt',
        0.7,
        undefined,
        false,
        true,
      );

      expect(chatBodyForced.prompt).toBe('system-prompt');
      expect(chatBodyForced.temperature).toBe(0.7);
      expect(chatBodyForced.forceStandardChat).toBe(true);

      // With agent settings
      const agentSettings = { enabled: true, enabledAgentTypes: ['web_search'] };
      const chatBodyWithAgent = createChatBody(
        conversation,
        messages,
        'api-key',
        'system-prompt',
        0.7,
        undefined,
        true,
        false,
        agentSettings,
        'web_search' as AgentType,
      );

      expect(chatBodyWithAgent.agentSettings).toEqual(agentSettings);
      expect(chatBodyWithAgent.forceAgentType).toBe('web_search');
    });

    it('should append plugin keys correctly', async () => {
      const chatModule = await vi.importActual('@/services/frontendChatServices') as any;
      const appendPluginKeys = chatModule.appendPluginKeys;

      const chatBody: ChatBody = {
        model: {} as any,
        messages: [],
        key: 'test',
        prompt: 'test',
        temperature: 0.5,
      };

      const pluginKeys = [
        {
          pluginId: PluginID.GOOGLE_SEARCH,
          requiredKeys: [
            { key: 'GOOGLE_API_KEY', value: 'test-api-key' },
            { key: 'GOOGLE_CSE_ID', value: 'test-cse-id' },
          ],
        },
      ];

      const result = appendPluginKeys(chatBody, pluginKeys);

      expect(result.googleAPIKey).toBe('test-api-key');
      expect(result.googleCSEId).toBe('test-cse-id');
      expect(result.model).toEqual(chatBody.model);

      // Test with empty plugin keys
      const resultEmpty = appendPluginKeys(chatBody, []);
      expect(resultEmpty.googleAPIKey).toBeUndefined();
      expect(resultEmpty.googleCSEId).toBeUndefined();
    });
  });

  describe('Simple conversations (non-complex content)', () => {
    it('should handle text-only messages', async () => {
      const textMessage: Message = {
        role: 'user',
        content: 'What is the weather today?',
      };

      const conversation = createMockConversation([textMessage]);

      mockFetch.mockResolvedValue({
        ok: true,
        body: new ReadableStream({
          start(controller) {
            controller.enqueue(new TextEncoder().encode('data: {"text": "The weather is sunny"}\n\n'));
            controller.close();
          },
        }),
      });

      const result = await makeRequest(
        null,
        mockSetRequestStatusMessage,
        conversation,
        'api-key',
        [],
        'System prompt',
        0.5,
        true,
        mockSetProgress,
      );

      expect(result.hasComplexContent).toBe(false);
      expect(mockFetch).toHaveBeenCalledTimes(1);
      expect(mockSetRequestStatusMessage).not.toHaveBeenCalledWith('Handling multi-file processing. Please wait...');

      const requestBody = JSON.parse(mockFetch.mock.calls[0][1].body);
      expect(requestBody.messages).toHaveLength(1);
      expect(requestBody.stream).toBe(true);
    });

    it('should handle single image messages', async () => {
      const imageMessage: Message = {
        role: 'user',
        content: [
          { type: 'text', text: 'What is in this image?' },
          { type: 'image_url', image_url: { url: 'https://example.com/image.jpg' } },
        ],
        messageType: 'text',
      };

      const conversation = createMockConversation([imageMessage]);

      mockFetch.mockResolvedValue({
        ok: true,
        body: new ReadableStream(),
      });

      const result = await makeRequest(
        null,
        mockSetRequestStatusMessage,
        conversation,
        'api-key',
        [],
        'System prompt',
        0.5,
        true,
        mockSetProgress,
      );

      expect(result.hasComplexContent).toBe(false);
      expect(mockFetch).toHaveBeenCalledTimes(1);
    });

    it('should include bot ID when provided', async () => {
      const message: Message = {
        role: 'user',
        content: 'Hello bot',
      };

      const conversation = {
        ...createMockConversation([message]),
        bot: 'bot-123',
      };

      mockFetch.mockResolvedValue({
        ok: true,
        body: new ReadableStream(),
      });

      await makeRequest(
        null,
        mockSetRequestStatusMessage,
        conversation,
        'api-key',
        [],
        'System prompt',
        0.5,
        true,
        mockSetProgress,
      );

      const requestBody = JSON.parse(mockFetch.mock.calls[0][1].body);
      expect(requestBody.botId).toBe('bot-123');
    });

    it('should handle conversation history correctly', async () => {
      const messages: Message[] = [
        { role: 'user', content: 'Message 1' },
        { role: 'assistant', content: 'Response 1' },
        { role: 'user', content: 'Message 2' },
        { role: 'assistant', content: 'Response 2' },
        { role: 'user', content: 'Message 3' },
        { role: 'assistant', content: 'Response 3' },
        { role: 'user', content: 'Message 4' },
        { role: 'assistant', content: 'Response 4' },
        { role: 'user', content: 'Current message' },
      ];

      const conversation = createMockConversation(messages);

      mockFetch.mockResolvedValue({
        ok: true,
        body: new ReadableStream(),
      });

      await makeRequest(
        null,
        mockSetRequestStatusMessage,
        conversation,
        'api-key',
        [],
        'System prompt',
        0.5,
        true,
        mockSetProgress,
      );

      const requestBody = JSON.parse(mockFetch.mock.calls[0][1].body);
      // Should include last 6 messages (slice(-6))
      expect(requestBody.messages).toHaveLength(6);
      expect(requestBody.messages[0].content).toBe('Response 2');
      expect(requestBody.messages[5].content).toBe('Current message');
    });
  });

  describe('Plugin support', () => {
    it('should handle Google Search plugin', async () => {
      const message: Message = {
        role: 'user',
        content: 'Search for latest news',
      };

      const conversation = createMockConversation([message]);

      const plugin: Plugin = {
        id: PluginID.GOOGLE_SEARCH,
        name: 'Google Search',
        requiredKeys: [],
      };

      const pluginKeys = [
        {
          pluginId: PluginID.GOOGLE_SEARCH,
          requiredKeys: [
            { key: 'GOOGLE_API_KEY', value: 'google-key' },
            { key: 'GOOGLE_CSE_ID', value: 'cse-id' },
          ],
        },
      ];

      mockFetch.mockResolvedValue({
        ok: true,
        body: new ReadableStream(),
      });

      // Mock getEndpoint to throw for Google plugin
      const getEndpointMock = vi.mocked(getEndpoint);
      getEndpointMock.mockImplementation((plugin) => {
        if (plugin?.id === PluginID.GOOGLE_SEARCH) {
          throw new Error('Google Plugin no longer supported.');
        }
        return 'api/v2/chat';
      });

      await expect(
        makeRequest(
          plugin,
          mockSetRequestStatusMessage,
          conversation,
          'api-key',
          pluginKeys,
          'System prompt',
          0.5,
          true,
          mockSetProgress,
        )
      ).rejects.toThrow('Google Plugin no longer supported.');
    });
  });

  describe('Stop conversation handling', () => {
    it('should abort request when stop is triggered', async () => {
      const message: Message = {
        role: 'user',
        content: 'Long running query',
      };

      const conversation = createMockConversation([message]);
      const stopConversationRef = { current: false };

      let fetchResolve: any;
      const fetchPromise = new Promise((resolve) => {
        fetchResolve = resolve;
      });

      mockFetch.mockImplementation(() => {
        // Simulate stop being triggered during request
        setTimeout(() => {
          stopConversationRef.current = true;
        }, 50);

        return fetchPromise;
      });

      const requestPromise = makeRequest(
        null,
        mockSetRequestStatusMessage,
        conversation,
        'api-key',
        [],
        'System prompt',
        0.5,
        true,
        mockSetProgress,
        stopConversationRef,
      );

      // Wait for abort to be triggered
      await new Promise(resolve => setTimeout(resolve, 150));

      // Resolve the fetch to complete the test
      fetchResolve({
        ok: true,
        body: new ReadableStream(),
      });

      await requestPromise;

      // Verify abort was logged
      expect(console.log).toHaveBeenCalledWith('Aborting due to stop request');
    });

    it('should handle abort error gracefully', async () => {
      const message: Message = {
        role: 'user',
        content: 'Query',
      };

      const conversation = createMockConversation([message]);
      const stopConversationRef = { current: false };

      mockFetch.mockRejectedValue(new DOMException('Aborted', 'AbortError'));

      const result = await makeRequest(
        null,
        mockSetRequestStatusMessage,
        conversation,
        'api-key',
        [],
        'System prompt',
        0.5,
        true,
        mockSetProgress,
        stopConversationRef,
      );

      expect(result.response).toBeDefined();
      expect(result.response.status).toBe(200);
      expect(console.log).toHaveBeenCalledWith('Request was aborted by user');
    });
  });

  describe('Agent settings', () => {
    it('should pass agent settings correctly', async () => {
      const message: Message = {
        role: 'user',
        content: 'Query with agents',
      };

      const conversation = createMockConversation([message]);

      const agentSettings = {
        enabled: true,
        enabledAgentTypes: ['web_search', 'local_knowledge'],
      };

      mockFetch.mockResolvedValue({
        ok: true,
        body: new ReadableStream(),
      });

      await makeRequest(
        null,
        mockSetRequestStatusMessage,
        conversation,
        'api-key',
        [],
        'System prompt',
        0.5,
        true,
        mockSetProgress,
        undefined,
        false,
        agentSettings,
        'web_search' as AgentType,
      );

      const requestBody = JSON.parse(mockFetch.mock.calls[0][1].body);
      expect(requestBody.agentSettings).toEqual(agentSettings);
      expect(requestBody.forceAgentType).toBe('web_search');
    });
  });

  describe('Non-streaming responses', () => {
    it('should handle non-streaming mode for simple content', async () => {
      const message: Message = {
        role: 'user',
        content: 'Non-streaming query',
      };

      const conversation = createMockConversation([message]);

      mockFetch.mockResolvedValue({
        ok: true,
        body: new ReadableStream(),
      });

      const result = await makeRequest(
        null,
        mockSetRequestStatusMessage,
        conversation,
        'api-key',
        [],
        'System prompt',
        0.5,
        false, // Non-streaming
        mockSetProgress,
      );

      const requestBody = JSON.parse(mockFetch.mock.calls[0][1].body);
      expect(requestBody.stream).toBe(false);
      expect(result.response).toBeDefined();
    });

    it('should handle non-streaming mode for complex content', async () => {
      const multiFileMessage: Message = {
        role: 'user',
        content: [
          { type: 'text', text: 'Compare files' },
          { type: 'file_url', url: 'file1.pdf', originalFilename: 'file1.pdf' },
          { type: 'file_url', url: 'file2.pdf', originalFilename: 'file2.pdf' },
        ],
        messageType: 'text',
      };

      const conversation = createMockConversation([multiFileMessage]);

      mockFetch.mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({ data: { text: 'Summary' } }),
        body: new ReadableStream(),
      });

      await makeRequest(
        null,
        mockSetRequestStatusMessage,
        conversation,
        'api-key',
        [],
        'System prompt',
        0.5,
        false, // Non-streaming
        mockSetProgress,
      );

      // First two requests are non-streaming (for summaries)
      const firstRequestBody = JSON.parse(mockFetch.mock.calls[0][1].body);
      expect(firstRequestBody.stream).toBe(false);

      // Final request should also be non-streaming
      const finalRequestBody = JSON.parse(mockFetch.mock.calls[2][1].body);
      expect(finalRequestBody.stream).toBe(false);
    });
  });

  describe('Edge cases', () => {
    it('should handle very long filenames', async () => {
      const longFilename = 'a'.repeat(255) + '.pdf';
      const multiFileMessage: Message = {
        role: 'user',
        content: [
          { type: 'text', text: 'Analyze' },
          { type: 'file_url', url: 'file1.pdf', originalFilename: longFilename },
          { type: 'file_url', url: 'file2.pdf', originalFilename: 'normal.pdf' },
        ],
        messageType: 'text',
      };

      const conversation = createMockConversation([multiFileMessage]);

      mockFetch.mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({ data: { text: 'Summary' } }),
        body: new ReadableStream(),
      });

      await makeRequest(
        null,
        mockSetRequestStatusMessage,
        conversation,
        'api-key',
        [],
        'System prompt',
        0.5,
        true,
        mockSetProgress,
      );

      expect(mockSetRequestStatusMessage).toHaveBeenCalledWith(`Processing ${longFilename}...`);
    });

    it('should handle special characters in filenames', async () => {
      const specialFilename = 'file with spaces & special!@#$%^&*()chars.pdf';
      const multiFileMessage: Message = {
        role: 'user',
        content: [
          { type: 'text', text: 'Analyze' },
          { type: 'file_url', url: 'file1.pdf', originalFilename: specialFilename },
          { type: 'file_url', url: 'file2.pdf', originalFilename: 'normal.pdf' },
        ],
        messageType: 'text',
      };

      const conversation = createMockConversation([multiFileMessage]);

      mockFetch.mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({ data: { text: 'Summary' } }),
        body: new ReadableStream(),
      });

      await makeRequest(
        null,
        mockSetRequestStatusMessage,
        conversation,
        'api-key',
        [],
        'System prompt',
        0.5,
        true,
        mockSetProgress,
      );

      const finalRequestCall = mockFetch.mock.calls[2];
      const finalRequestBody = JSON.parse(finalRequestCall[1].body);
      const finalMessage = finalRequestBody.messages[finalRequestBody.messages.length - 1];

      // Should properly escape special characters in the prompt
      expect(finalMessage.content[0].text).toContain(specialFilename);
    });

    it('should handle maximum number of files (10+)', async () => {
      const files = Array.from({ length: 10 }, (_, i) => ({
        type: 'file_url' as const,
        url: `file${i}.pdf`,
        originalFilename: `file${i}.pdf`,
      }));

      const multiFileMessage: Message = {
        role: 'user',
        content: [
          { type: 'text', text: 'Analyze all' },
          ...files,
        ],
        messageType: 'text',
      };

      const conversation = createMockConversation([multiFileMessage]);

      mockFetch.mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({ data: { text: 'Summary' } }),
        body: new ReadableStream(),
      });

      await makeRequest(
        null,
        mockSetRequestStatusMessage,
        conversation,
        'api-key',
        [],
        'System prompt',
        0.5,
        true,
        mockSetProgress,
      );

      // Should make 10 summary requests + 1 final request
      expect(mockFetch).toHaveBeenCalledTimes(11);

      // Progress should be updated correctly
      const expectedProgress = [0, 9.09, 18.18, 27.27, 36.36, 45.45, 54.55, 63.64, 72.73, 81.82, 90.91];
      expectedProgress.forEach(progress => {
        expect(mockSetProgress).toHaveBeenCalledWith(expect.closeTo(progress, 0.1));
      });
    });

    it('should handle empty message history', async () => {
      const message: Message = {
        role: 'user',
        content: 'First message',
      };

      const conversation = createMockConversation([message]);

      mockFetch.mockResolvedValue({
        ok: true,
        body: new ReadableStream(),
      });

      await makeRequest(
        null,
        mockSetRequestStatusMessage,
        conversation,
        'api-key',
        [],
        'System prompt',
        0.5,
        true,
        mockSetProgress,
      );

      const requestBody = JSON.parse(mockFetch.mock.calls[0][1].body);
      expect(requestBody.messages).toHaveLength(1);
      expect(requestBody.messages[0].content).toBe('First message');
    });
  });

  describe('Error handling', () => {
    it('should handle API errors during file processing', async () => {
      const multiFileMessage: Message = {
        role: 'user',
        content: [
          { type: 'text', text: 'Compare files' },
          {
            type: 'file_url',
            url: 'https://example.com/file1.pdf',
            originalFilename: 'file1.pdf'
          },
          {
            type: 'file_url',
            url: 'https://example.com/file2.pdf',
            originalFilename: 'file2.pdf'
          },
        ],
        messageType: 'text',
      };

      const conversation = createMockConversation([multiFileMessage]);

      // First request succeeds
      let callCount = 0;
      mockFetch.mockImplementation(() => {
        callCount++;
        if (callCount === 1) {
          return Promise.resolve({
            ok: true,
            json: () => Promise.resolve({ data: { text: 'Summary 1' } }),
          });
        } else {
          // Second request fails
          return Promise.resolve({
            ok: false,
            text: () => Promise.resolve('API Error'),
          });
        }
      });

      await expect(
        makeRequest(
          null,
          mockSetRequestStatusMessage,
          conversation,
          'test-api-key',
          [],
          'System prompt',
          0.5,
          true,
          mockSetProgress,
        )
      ).rejects.toThrow('Request failed with status');
    });
  });
});
