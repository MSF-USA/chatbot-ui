import { describe, expect, it, vi, beforeEach } from 'vitest';
import { makeRequest } from '@/lib/services/chat/frontendChatService';
import { Conversation } from '@/types/chat';
import { OpenAIModel, OpenAIModelID, OpenAIModels } from '@/types/openai';

// Mock fetch
global.fetch = vi.fn();

describe('frontendChatService', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('makeRequest - Model Configuration Merging', () => {
    const createMockConversation = (modelOverrides: Partial<OpenAIModel> = {}): Conversation => ({
      id: 'conv-1',
      name: 'Test Conversation',
      messages: [{ role: 'user', content: 'Hello', messageType: undefined }],
      model: {
        id: OpenAIModelID.DEEPSEEK_V3_1,
        name: 'DeepSeek-V3.1',
        maxLength: 64000,
        tokenLimit: 8000,
        ...modelOverrides,
      },
      prompt: '',
      temperature: 0.7,
      folderId: null,
    });

    it('merges latest model configuration with conversation model', async () => {
      const mockResponse = new Response('{"text":"response"}', {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      });
      vi.mocked(fetch).mockResolvedValue(mockResponse);

      const conversation = createMockConversation();

      await makeRequest(
        () => {},
        conversation,
        '',
        'system prompt',
        0.7,
        true,
        () => {},
        { current: false }
      );

      expect(fetch).toHaveBeenCalledWith('/api/chat', expect.objectContaining({
        method: 'POST',
        body: expect.stringContaining('"sdk":"openai"'),
      }));
    });

    it('preserves agentEnabled from conversation model', async () => {
      const mockResponse = new Response('{"text":"response"}', {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      });
      vi.mocked(fetch).mockResolvedValue(mockResponse);

      const conversation = createMockConversation({
        id: OpenAIModelID.GPT_5,
        agentEnabled: true,
        agentId: 'asst_DHpJVkpNlBiaGgglkvvFALMI',
      });

      await makeRequest(
        () => {},
        conversation,
        '',
        'system prompt',
        0.7,
        true,
        () => {},
        { current: false }
      );

      const fetchCall = vi.mocked(fetch).mock.calls[0];
      const requestBody = JSON.parse(fetchCall[1]?.body as string);

      expect(requestBody.model.agentEnabled).toBe(true);
      expect(requestBody.model.agentId).toBe('asst_DHpJVkpNlBiaGgglkvvFALMI');
    });

    it('ensures sdk field is always present', async () => {
      const mockResponse = new Response('{"text":"response"}', {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      });
      vi.mocked(fetch).mockResolvedValue(mockResponse);

      // Conversation model without sdk field (simulating old localStorage data)
      const conversation: Conversation = {
        id: 'conv-1',
        name: 'Test',
        messages: [],
        model: {
          id: OpenAIModelID.DEEPSEEK_V3_1,
          name: 'DeepSeek-V3.1',
          maxLength: 64000,
          tokenLimit: 8000,
          // No sdk field here - simulating old data
        },
        prompt: '',
        temperature: 0.7,
        folderId: null,
      };

      await makeRequest(
        () => {},
        conversation,
        '',
        'system prompt',
        0.7,
        true,
        () => {},
        { current: false }
      );

      const fetchCall = vi.mocked(fetch).mock.calls[0];
      const requestBody = JSON.parse(fetchCall[1]?.body as string);

      // Should have sdk field from OpenAIModels
      expect(requestBody.model.sdk).toBe('openai');
    });

    it('ensures supportsTemperature field is always present', async () => {
      const mockResponse = new Response('{"text":"response"}', {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      });
      vi.mocked(fetch).mockResolvedValue(mockResponse);

      // Conversation model without supportsTemperature field
      const conversation: Conversation = {
        id: 'conv-1',
        name: 'Test',
        messages: [],
        model: {
          id: OpenAIModelID.GPT_5,
          name: 'GPT-5',
          maxLength: 128000,
          tokenLimit: 16000,
          // No supportsTemperature field - simulating old data
        },
        prompt: '',
        temperature: 0.7,
        folderId: null,
      };

      await makeRequest(
        () => {},
        conversation,
        '',
        'system prompt',
        0.7,
        true,
        () => {},
        { current: false }
      );

      const fetchCall = vi.mocked(fetch).mock.calls[0];
      const requestBody = JSON.parse(fetchCall[1]?.body as string);

      // Should have supportsTemperature field from OpenAIModels
      expect(requestBody.model.supportsTemperature).toBe(false);
    });

    it('updates all model fields from latest configuration', async () => {
      const mockResponse = new Response('{"text":"response"}', {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      });
      vi.mocked(fetch).mockResolvedValue(mockResponse);

      // Old conversation with partial model data
      const conversation: Conversation = {
        id: 'conv-1',
        name: 'Test',
        messages: [],
        model: {
          id: OpenAIModelID.GROK_3,
          name: 'Grok 3',
          maxLength: 128000,
          tokenLimit: 16000,
          // Missing: provider, knowledgeCutoff, sdk, supportsTemperature, modelType
        },
        prompt: '',
        temperature: 0.7,
        folderId: null,
      };

      await makeRequest(
        () => {},
        conversation,
        '',
        'system prompt',
        0.7,
        true,
        () => {},
        { current: false }
      );

      const fetchCall = vi.mocked(fetch).mock.calls[0];
      const requestBody = JSON.parse(fetchCall[1]?.body as string);
      const sentModel = requestBody.model;

      // Should have all fields from OpenAIModels[GROK_3]
      expect(sentModel.provider).toBe('xai');
      expect(sentModel.sdk).toBe('openai');
      expect(sentModel.supportsTemperature).toBe(true);
      expect(sentModel.modelType).toBe('omni');
      expect(sentModel.knowledgeCutoff).toBeDefined();
    });

    it('handles model not in OpenAIModels gracefully', async () => {
      const mockResponse = new Response('{"text":"response"}', {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      });
      vi.mocked(fetch).mockResolvedValue(mockResponse);

      // Custom model not in OpenAIModels
      const conversation: Conversation = {
        id: 'conv-1',
        name: 'Test',
        messages: [],
        model: {
          id: 'custom-model-id' as OpenAIModelID,
          name: 'Custom Model',
          maxLength: 4096,
          tokenLimit: 4096,
        },
        prompt: '',
        temperature: 0.7,
        folderId: null,
      };

      await makeRequest(
        () => {},
        conversation,
        '',
        'system prompt',
        0.7,
        true,
        () => {},
        { current: false }
      );

      const fetchCall = vi.mocked(fetch).mock.calls[0];
      const requestBody = JSON.parse(fetchCall[1]?.body as string);

      // Should still send the model as-is
      expect(requestBody.model.id).toBe('custom-model-id');
      expect(requestBody.model.name).toBe('Custom Model');
    });

    it('conversation-specific overrides take precedence', async () => {
      const mockResponse = new Response('{"text":"response"}', {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      });
      vi.mocked(fetch).mockResolvedValue(mockResponse);

      // Override the default name
      const conversation = createMockConversation({
        name: 'My Custom DeepSeek Name',
      });

      await makeRequest(
        () => {},
        conversation,
        '',
        'system prompt',
        0.7,
        true,
        () => {},
        { current: false }
      );

      const fetchCall = vi.mocked(fetch).mock.calls[0];
      const requestBody = JSON.parse(fetchCall[1]?.body as string);

      // Should preserve custom name but have sdk from config
      expect(requestBody.model.name).toBe('My Custom DeepSeek Name');
      expect(requestBody.model.sdk).toBe('openai');
    });
  });

  describe('makeRequest - API Integration', () => {
    it('sends correct request to /api/chat endpoint', async () => {
      const mockResponse = new Response('{"text":"response"}', {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      });
      vi.mocked(fetch).mockResolvedValue(mockResponse);

      const conversation: Conversation = {
        id: 'conv-1',
        name: 'Test',
        messages: [{ role: 'user', content: 'Hello', messageType: undefined }],
        model: OpenAIModels[OpenAIModelID.GPT_5],
        prompt: '',
        temperature: 0.7,
        folderId: null,
      };

      await makeRequest(
        () => {},
        conversation,
        'api-key',
        'You are helpful',
        0.7,
        true,
        () => {},
        { current: false }
      );

      expect(fetch).toHaveBeenCalledWith('/api/chat', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: expect.stringContaining('"temperature":0.7'),
      });
    });

    it('includes threadId when present', async () => {
      const mockResponse = new Response('{"text":"response"}', {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      });
      vi.mocked(fetch).mockResolvedValue(mockResponse);

      const conversation: Conversation = {
        id: 'conv-1',
        name: 'Test',
        messages: [],
        model: OpenAIModels[OpenAIModelID.GPT_5],
        prompt: '',
        temperature: 0.7,
        folderId: null,
        threadId: 'thread-123',
      };

      await makeRequest(
        () => {},
        conversation,
        '',
        'system prompt',
        0.7,
        true,
        () => {},
        { current: false }
      );

      const fetchCall = vi.mocked(fetch).mock.calls[0];
      const requestBody = JSON.parse(fetchCall[1]?.body as string);

      expect(requestBody.threadId).toBe('thread-123');
    });

    it('throws error when response is not ok', async () => {
      const mockResponse = new Response(
        JSON.stringify({ message: 'Server error' }),
        {
          status: 500,
          headers: { 'Content-Type': 'application/json' },
        }
      );
      vi.mocked(fetch).mockResolvedValue(mockResponse);

      const conversation: Conversation = {
        id: 'conv-1',
        name: 'Test',
        messages: [],
        model: OpenAIModels[OpenAIModelID.GPT_5],
        prompt: '',
        temperature: 0.7,
        folderId: null,
      };

      await expect(
        makeRequest(
          () => {},
          conversation,
          '',
          'system prompt',
          0.7,
          true,
          () => {},
          { current: false }
        )
      ).rejects.toThrow();
    });
  });
});
