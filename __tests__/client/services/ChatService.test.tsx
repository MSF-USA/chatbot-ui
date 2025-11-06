import { agentChatService } from '@/client/services/chat/AgentChatService';
import { audioChatService } from '@/client/services/chat/AudioChatService';
import { ChatService } from '@/client/services/chat/ChatService';
import { ragChatService } from '@/client/services/chat/RAGChatService';
import { standardChatService } from '@/client/services/chat/StandardChatService';

import { Message, MessageType } from '@/types/chat';
import { OpenAIModelID, OpenAIModels } from '@/types/openai';
import { SearchMode } from '@/types/searchMode';

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

  describe('SearchMode routing (Priority 3)', () => {
    it('should route to AgentChatService when SearchMode.AGENT', async () => {
      const messages: Message[] = [
        {
          role: 'user',
          content: 'What is the weather?',
          messageType: MessageType.TEXT,
        },
      ];
      const model = OpenAIModels[OpenAIModelID.GPT_4_1];

      vi.mocked(audioChatService.hasAudioVideoFiles).mockReturnValue(false);
      vi.mocked(agentChatService.chat).mockResolvedValue(
        new ReadableStream() as any,
      );

      // Reset fetch mock
      global.fetch = vi.fn();

      await chatService.chat(model, messages, {
        temperature: 0.8,
        searchMode: SearchMode.AGENT,
      });

      // Should route to agent service (faster, less private)
      expect(agentChatService.chat).toHaveBeenCalledWith(model, messages, {
        temperature: 0.8,
        threadId: undefined,
        botId: undefined,
      });

      // Should NOT call tool-aware or standard chat
      expect(standardChatService.chat).not.toHaveBeenCalled();
      expect(global.fetch).not.toHaveBeenCalled();
    });

    it('should route to tool-aware when SearchMode.INTELLIGENT (privacy mode)', async () => {
      const messages: Message[] = [
        {
          role: 'user',
          content: 'Latest AI news',
          messageType: MessageType.TEXT,
        },
      ];
      const model = OpenAIModels[OpenAIModelID.GPT_4_1];

      vi.mocked(audioChatService.hasAudioVideoFiles).mockReturnValue(false);

      global.fetch = vi.fn().mockResolvedValue({
        ok: true,
        body: new ReadableStream(),
      } as Response);

      await chatService.chat(model, messages, {
        searchMode: SearchMode.INTELLIGENT,
      });

      // Should route to tool-aware endpoint (privacy mode)
      expect(global.fetch).toHaveBeenCalledWith(
        '/api/chat/tool-aware',
        expect.objectContaining({
          method: 'POST',
          body: expect.stringContaining('searchMode'),
        }),
      );

      // Should NOT call agent chat service directly
      expect(agentChatService.chat).not.toHaveBeenCalled();
    });

    it('should route to tool-aware when SearchMode.ALWAYS (force search)', async () => {
      const messages: Message[] = [
        { role: 'user', content: 'Test', messageType: MessageType.TEXT },
      ];
      const model = OpenAIModels[OpenAIModelID.GPT_5];

      vi.mocked(audioChatService.hasAudioVideoFiles).mockReturnValue(false);

      global.fetch = vi.fn().mockResolvedValue({
        ok: true,
        body: new ReadableStream(),
      } as Response);

      await chatService.chat(model, messages, {
        searchMode: SearchMode.ALWAYS,
      });

      // Should route to tool-aware endpoint
      expect(global.fetch).toHaveBeenCalledWith(
        '/api/chat/tool-aware',
        expect.any(Object),
      );
      expect(agentChatService.chat).not.toHaveBeenCalled();
    });

    it('should route to standard chat when SearchMode.OFF', async () => {
      const messages: Message[] = [
        {
          role: 'user',
          content: 'Search query',
          messageType: MessageType.TEXT,
        },
      ];
      const model = OpenAIModels[OpenAIModelID.GPT_5];

      vi.mocked(audioChatService.hasAudioVideoFiles).mockReturnValue(false);
      vi.mocked(standardChatService.chat).mockResolvedValue(
        new ReadableStream() as any,
      );

      global.fetch = vi.fn();

      await chatService.chat(model, messages, {
        searchMode: SearchMode.OFF,
      });

      // Should route to standard chat (no search)
      expect(standardChatService.chat).toHaveBeenCalled();
      expect(global.fetch).not.toHaveBeenCalled();
      expect(agentChatService.chat).not.toHaveBeenCalled();
    });
  });

  describe('Standard routing (Default/Priority 4)', () => {
    it('should route to StandardChatService as fallback', async () => {
      const messages: Message[] = [
        { role: 'user', content: 'Hello', messageType: MessageType.TEXT },
      ];
      const model = OpenAIModels[OpenAIModelID.LLAMA_4_MAVERICK];

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
        agentId: 'asst_123',
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
      };
      vi.mocked(audioChatService.hasAudioVideoFiles).mockReturnValue(false);
      vi.mocked(standardChatService.chat).mockResolvedValue(
        new ReadableStream() as any,
      );

      await chatService.chat(standardModel, messages);
      expect(standardChatService.chat).toHaveBeenCalled();

      vi.clearAllMocks();

      // Second call with agent model and SearchMode.AGENT
      const agentModel = OpenAIModels[OpenAIModelID.GPT_4_1];
      vi.mocked(agentChatService.chat).mockResolvedValue(
        new ReadableStream() as any,
      );

      await chatService.chat(agentModel, messages, {
        searchMode: SearchMode.AGENT,
      });
      expect(agentChatService.chat).toHaveBeenCalled();
      expect(standardChatService.chat).not.toHaveBeenCalled();
    });

    it('should handle switching from search to standard model', async () => {
      const messages: Message[] = [
        { role: 'user', content: 'Test', messageType: MessageType.TEXT },
      ];
      const model = OpenAIModels[OpenAIModelID.GPT_5];

      // First with search mode
      vi.mocked(audioChatService.hasAudioVideoFiles).mockReturnValue(false);
      global.fetch = vi.fn().mockResolvedValue({
        ok: true,
        body: new ReadableStream(),
      } as Response);

      await chatService.chat(model, messages, {
        searchMode: SearchMode.INTELLIGENT,
      });
      expect(global.fetch).toHaveBeenCalled();

      vi.clearAllMocks();

      // Switch to standard (no search mode)
      const standardModel = {
        ...OpenAIModels[OpenAIModelID.LLAMA_4_MAVERICK],
      };
      vi.mocked(standardChatService.chat).mockResolvedValue(
        new ReadableStream() as any,
      );

      await chatService.chat(standardModel, messages);
      expect(standardChatService.chat).toHaveBeenCalled();
    });
  });
});
