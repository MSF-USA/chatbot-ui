import { agentChatService } from '@/client/services/chat/AgentChatService';
import { audioChatService } from '@/client/services/chat/AudioChatService';
import { ChatService } from '@/client/services/chat/ChatService';
import { ragChatService } from '@/client/services/chat/RAGChatService';
import { standardChatService } from '@/client/services/chat/StandardChatService';

import { Message, MessageType } from '@/types/chat';
import { OpenAIModelID, OpenAIModels } from '@/types/openai';

import { beforeEach, describe, expect, it, vi } from 'vitest';

/**
 * Tests for client-side ChatService routing logic
 */
describe('ChatService (Client)', () => {
  let chatService: ChatService;

  beforeEach(() => {
    chatService = new ChatService();

    // Mock all service methods
    vi.spyOn(audioChatService, 'hasAudioVideoFiles');
    vi.spyOn(audioChatService, 'chat');
    vi.spyOn(agentChatService, 'chat');
    vi.spyOn(ragChatService, 'chat');
    vi.spyOn(standardChatService, 'chat');

    // Clear all mocks
    vi.clearAllMocks();
  });

  describe('Audio/Video file routing (Priority 1)', () => {
    it('should route to AudioChatService when audio files present', async () => {
      const messages: Message[] = [
        {
          role: 'user',
          content: [
            { type: 'text', text: 'Transcribe this' },
            { type: 'file_url', url: 'file://audio.mp3' },
          ],
          messageType: MessageType.AUDIO,
        },
      ];
      const model = OpenAIModels[OpenAIModelID.GPT_5];

      vi.mocked(audioChatService.hasAudioVideoFiles).mockReturnValue(true);
      vi.mocked(audioChatService.chat).mockResolvedValue(
        new ReadableStream() as any,
      );

      await chatService.chat(model, messages);

      expect(audioChatService.hasAudioVideoFiles).toHaveBeenCalledWith(
        messages,
      );
      expect(audioChatService.chat).toHaveBeenCalledWith(model, messages, {
        botId: undefined,
      });
      expect(agentChatService.chat).not.toHaveBeenCalled();
      expect(ragChatService.chat).not.toHaveBeenCalled();
      expect(standardChatService.chat).not.toHaveBeenCalled();
    });

    it('should route to AudioChatService for video files', async () => {
      const messages: Message[] = [
        {
          role: 'user',
          content: [{ type: 'file_url', url: 'file://video.mp4' }],
          messageType: MessageType.VIDEO,
        },
      ];
      const model = OpenAIModels[OpenAIModelID.GPT_5];

      vi.mocked(audioChatService.hasAudioVideoFiles).mockReturnValue(true);
      vi.mocked(audioChatService.chat).mockResolvedValue(
        new ReadableStream() as any,
      );

      await chatService.chat(model, messages);

      expect(audioChatService.chat).toHaveBeenCalled();
    });
  });

  describe('RAG/Bot routing (Priority 2)', () => {
    it('should route to RAGChatService when botId provided', async () => {
      const messages: Message[] = [
        { role: 'user', content: 'Query bot', messageType: MessageType.TEXT },
      ];
      const model = OpenAIModels[OpenAIModelID.GPT_5];
      const botId = 'bot-123';

      vi.mocked(audioChatService.hasAudioVideoFiles).mockReturnValue(false);
      vi.mocked(ragChatService.chat).mockResolvedValue(
        new ReadableStream() as any,
      );

      await chatService.chat(model, messages, { botId });

      expect(ragChatService.chat).toHaveBeenCalledWith(model, messages, botId);
      expect(audioChatService.chat).not.toHaveBeenCalled();
      expect(agentChatService.chat).not.toHaveBeenCalled();
      expect(standardChatService.chat).not.toHaveBeenCalled();
    });

    it('should prioritize audio over botId', async () => {
      const messages: Message[] = [
        {
          role: 'user',
          content: [{ type: 'file_url', url: 'audio.mp3' }],
          messageType: MessageType.AUDIO,
        },
      ];
      const model = OpenAIModels[OpenAIModelID.GPT_5];

      vi.mocked(audioChatService.hasAudioVideoFiles).mockReturnValue(true);
      vi.mocked(audioChatService.chat).mockResolvedValue(
        new ReadableStream() as any,
      );

      await chatService.chat(model, messages, { botId: 'bot-123' });

      // Should route to audio, not RAG
      expect(audioChatService.chat).toHaveBeenCalled();
      expect(ragChatService.chat).not.toHaveBeenCalled();
    });
  });

  describe('Azure Agent Mode routing (Priority 3)', () => {
    it('should route to AgentChatService when azureAgentMode is ON', async () => {
      const messages: Message[] = [
        { role: 'user', content: 'Hello', messageType: MessageType.TEXT },
      ];

      // Model with Azure Agent Mode enabled
      const model = {
        ...OpenAIModels[OpenAIModelID.GPT_4_1],
        azureAgentMode: true,
        agentId: 'asst_123',
      };

      vi.mocked(audioChatService.hasAudioVideoFiles).mockReturnValue(false);
      vi.mocked(agentChatService.chat).mockResolvedValue(
        new ReadableStream() as any,
      );

      await chatService.chat(model, messages, { temperature: 0.8 });

      expect(agentChatService.chat).toHaveBeenCalledWith(model, messages, {
        temperature: 0.8,
        threadId: undefined,
        botId: undefined,
      });
      expect(standardChatService.chat).not.toHaveBeenCalled();
    });

    it('should NOT route to agent if no agentId', async () => {
      const messages: Message[] = [
        { role: 'user', content: 'Test', messageType: MessageType.TEXT },
      ];

      const model = {
        ...OpenAIModels[OpenAIModelID.GPT_5],
        azureAgentMode: true,
        agentId: undefined, // No agent ID
      };

      vi.mocked(audioChatService.hasAudioVideoFiles).mockReturnValue(false);

      // Mock fetch for tool-aware endpoint (falls through to search mode)
      global.fetch = vi.fn().mockResolvedValue({
        ok: true,
        body: new ReadableStream(),
      } as Response);

      // Should fetch tool-aware endpoint since searchModeEnabled: true
      await chatService.chat(model, messages);

      // Should NOT call agent chat service
      expect(agentChatService.chat).not.toHaveBeenCalled();

      // Should call tool-aware endpoint instead
      expect(global.fetch).toHaveBeenCalledWith(
        '/api/chat/tool-aware',
        expect.any(Object),
      );
    });
  });

  describe('Search Mode routing (Priority 4)', () => {
    it('should route to tool-aware endpoint when searchModeEnabled', async () => {
      const messages: Message[] = [
        { role: 'user', content: 'Latest news', messageType: MessageType.TEXT },
      ];
      const model = OpenAIModels[OpenAIModelID.GPT_5]; // Has searchModeEnabled: true

      vi.mocked(audioChatService.hasAudioVideoFiles).mockReturnValue(false);

      // Mock fetch for tool-aware endpoint
      global.fetch = vi.fn().mockResolvedValue({
        ok: true,
        body: new ReadableStream(),
      } as Response);

      await chatService.chat(model, messages, {
        prompt: 'System prompt',
        temperature: 0.7,
      });

      // Should call tool-aware endpoint
      expect(global.fetch).toHaveBeenCalledWith(
        '/api/chat/tool-aware',
        expect.objectContaining({
          method: 'POST',
          headers: expect.objectContaining({
            'Content-Type': 'application/json',
          }),
        }),
      );

      expect(agentChatService.chat).not.toHaveBeenCalled();
      expect(standardChatService.chat).not.toHaveBeenCalled();
    });

    it('should route to tool-aware when forcedAgentType provided', async () => {
      const messages: Message[] = [
        { role: 'user', content: 'Test', messageType: MessageType.TEXT },
      ];
      const model = {
        ...OpenAIModels[OpenAIModelID.GPT_5],
        searchModeEnabled: false, // Disabled
      };

      vi.mocked(audioChatService.hasAudioVideoFiles).mockReturnValue(false);

      global.fetch = vi.fn().mockResolvedValue({
        ok: true,
        body: new ReadableStream(),
      } as Response);

      await chatService.chat(model, messages, {
        forcedAgentType: 'web_search',
      });

      // Should still route to tool-aware
      expect(global.fetch).toHaveBeenCalledWith(
        '/api/chat/tool-aware',
        expect.any(Object),
      );
    });
  });

  describe('Standard routing (Default/Priority 5)', () => {
    it('should route to StandardChatService as fallback', async () => {
      const messages: Message[] = [
        { role: 'user', content: 'Hello', messageType: MessageType.TEXT },
      ];

      // Model without any special flags
      const model = {
        ...OpenAIModels[OpenAIModelID.LLAMA_4_MAVERICK],
        searchModeEnabled: false,
        azureAgentMode: false,
      };

      vi.mocked(audioChatService.hasAudioVideoFiles).mockReturnValue(false);
      vi.mocked(standardChatService.chat).mockResolvedValue(
        new ReadableStream() as any,
      );

      await chatService.chat(model, messages, {
        prompt: 'System',
        temperature: 0.5,
      });

      expect(standardChatService.chat).toHaveBeenCalledWith(model, messages, {
        prompt: 'System',
        temperature: 0.5,
        reasoningEffort: undefined,
        verbosity: undefined,
        botId: undefined,
      });

      expect(audioChatService.chat).not.toHaveBeenCalled();
      expect(agentChatService.chat).not.toHaveBeenCalled();
      expect(ragChatService.chat).not.toHaveBeenCalled();
    });

    it('should pass reasoning effort and verbosity to standard chat', async () => {
      const messages: Message[] = [
        {
          role: 'user',
          content: 'Complex task',
          messageType: MessageType.TEXT,
        },
      ];
      const model = {
        ...OpenAIModels[OpenAIModelID.LLAMA_4_MAVERICK],
        searchModeEnabled: false,
      };

      vi.mocked(audioChatService.hasAudioVideoFiles).mockReturnValue(false);
      vi.mocked(standardChatService.chat).mockResolvedValue(
        new ReadableStream() as any,
      );

      await chatService.chat(model, messages, {
        reasoningEffort: 'high',
        verbosity: 'high',
      });

      expect(standardChatService.chat).toHaveBeenCalledWith(
        model,
        messages,
        expect.objectContaining({
          reasoningEffort: 'high',
          verbosity: 'high',
        }),
      );
    });
  });

  describe('Routing priority order', () => {
    it('should respect priority: audio > bot > agent > search > standard', async () => {
      const model = {
        ...OpenAIModels[OpenAIModelID.GPT_4_1],
        azureAgentMode: true,
        agentId: 'asst_123',
        searchModeEnabled: true,
      };

      // Test priority 1: Audio files
      const audioMessages: Message[] = [
        {
          role: 'user',
          content: [{ type: 'file_url', url: 'audio.mp3' }],
          messageType: MessageType.AUDIO,
        },
      ];
      vi.mocked(audioChatService.hasAudioVideoFiles).mockReturnValue(true);
      vi.mocked(audioChatService.chat).mockResolvedValue(
        new ReadableStream() as any,
      );

      await chatService.chat(model, audioMessages, { botId: 'bot-123' });

      // Audio wins despite having botId, agent mode, and search mode
      expect(audioChatService.chat).toHaveBeenCalled();
      expect(ragChatService.chat).not.toHaveBeenCalled();
      expect(agentChatService.chat).not.toHaveBeenCalled();

      vi.clearAllMocks();

      // Test priority 2: Bot ID (no audio)
      const textMessages: Message[] = [
        { role: 'user', content: 'Hello', messageType: MessageType.TEXT },
      ];
      vi.mocked(audioChatService.hasAudioVideoFiles).mockReturnValue(false);
      vi.mocked(ragChatService.chat).mockResolvedValue(
        new ReadableStream() as any,
      );

      await chatService.chat(model, textMessages, { botId: 'bot-123' });

      // Bot wins despite agent mode and search mode
      expect(ragChatService.chat).toHaveBeenCalled();
      expect(agentChatService.chat).not.toHaveBeenCalled();
    });
  });

  describe('Model switching scenarios', () => {
    it('should handle switching from standard to agent model', async () => {
      const messages: Message[] = [
        { role: 'user', content: 'Test', messageType: MessageType.TEXT },
      ];

      // First call with standard model
      const standardModel = {
        ...OpenAIModels[OpenAIModelID.GPT_5],
        searchModeEnabled: false,
      };
      vi.mocked(audioChatService.hasAudioVideoFiles).mockReturnValue(false);
      vi.mocked(standardChatService.chat).mockResolvedValue(
        new ReadableStream() as any,
      );

      await chatService.chat(standardModel, messages);
      expect(standardChatService.chat).toHaveBeenCalled();

      vi.clearAllMocks();

      // Second call with agent model
      const agentModel = {
        ...OpenAIModels[OpenAIModelID.GPT_4_1],
        azureAgentMode: true,
        agentId: 'asst_123',
      };
      vi.mocked(agentChatService.chat).mockResolvedValue(
        new ReadableStream() as any,
      );

      await chatService.chat(agentModel, messages);
      expect(agentChatService.chat).toHaveBeenCalled();
      expect(standardChatService.chat).not.toHaveBeenCalled();
    });

    it('should handle switching from search to standard model', async () => {
      const messages: Message[] = [
        { role: 'user', content: 'Test', messageType: MessageType.TEXT },
      ];

      // First with search mode
      const searchModel = OpenAIModels[OpenAIModelID.GPT_5]; // searchModeEnabled: true
      vi.mocked(audioChatService.hasAudioVideoFiles).mockReturnValue(false);
      global.fetch = vi.fn().mockResolvedValue({
        ok: true,
        body: new ReadableStream(),
      } as Response);

      await chatService.chat(searchModel, messages);
      expect(global.fetch).toHaveBeenCalled();

      vi.clearAllMocks();

      // Switch to standard (no search mode)
      const standardModel = {
        ...OpenAIModels[OpenAIModelID.LLAMA_4_MAVERICK],
        searchModeEnabled: false,
      };
      vi.mocked(standardChatService.chat).mockResolvedValue(
        new ReadableStream() as any,
      );

      await chatService.chat(standardModel, messages);
      expect(standardChatService.chat).toHaveBeenCalled();
    });
  });
});
