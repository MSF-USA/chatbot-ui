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
  });

  afterEach(() => {
    vi.clearAllMocks();
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