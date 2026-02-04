import { act, renderHook } from '@testing-library/react';

import { useClearConversation } from '@/client/hooks/conversation/useClearConversation';

import { Conversation, MessageType } from '@/types/chat';

import { beforeEach, describe, expect, it, vi } from 'vitest';

// Mock the conversation store
const mockUpdateConversation = vi.fn();
const mockState = {
  conversations: [] as Conversation[],
  selectedConversationId: null as string | null,
  updateConversation: mockUpdateConversation,
};

vi.mock('@/client/stores/conversationStore', () => ({
  useConversationStore: vi.fn((selector: (state: typeof mockState) => any) =>
    selector(mockState),
  ),
}));

// Mock next-intl
vi.mock('next-intl', () => ({
  useTranslations: () => (key: string) => {
    const translations: Record<string, string> = {
      'chat.clearConversationConfirm':
        'Are you sure you want to clear this conversation?',
    };
    return translations[key] || key;
  },
}));

// Mock window.confirm
global.confirm = vi.fn(() => true);

describe('useClearConversation', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockState.conversations = [];
    mockState.selectedConversationId = null;
  });

  it('should clear messages and name when user confirms', () => {
    const conversation: Conversation = {
      id: 'conv-1',
      name: 'Test Conversation',
      messages: [
        { role: 'user', content: 'Hello', messageType: MessageType.TEXT },
        { role: 'assistant', content: 'Hi', messageType: MessageType.TEXT },
      ],
      model: { id: 'gpt-4', name: 'GPT-4' } as any,
      prompt: '',
      temperature: 0.7,
      folderId: null,
    };

    mockState.conversations = [conversation];
    mockState.selectedConversationId = 'conv-1';

    const { result } = renderHook(() => useClearConversation());

    act(() => {
      result.current.clearConversation();
    });

    expect(global.confirm).toHaveBeenCalledWith(
      'Are you sure you want to clear this conversation?',
    );
    expect(mockUpdateConversation).toHaveBeenCalledWith('conv-1', {
      messages: [],
      name: '',
    });
  });

  it('should not clear messages when user cancels', () => {
    (global.confirm as any).mockReturnValueOnce(false);

    const conversation: Conversation = {
      id: 'conv-1',
      name: 'Test Conversation',
      messages: [
        { role: 'user', content: 'Hello', messageType: MessageType.TEXT },
      ],
      model: { id: 'gpt-4', name: 'GPT-4' } as any,
      prompt: '',
      temperature: 0.7,
      folderId: null,
    };

    mockState.conversations = [conversation];
    mockState.selectedConversationId = 'conv-1';

    const { result } = renderHook(() => useClearConversation());

    act(() => {
      result.current.clearConversation();
    });

    expect(global.confirm).toHaveBeenCalled();
    expect(mockUpdateConversation).not.toHaveBeenCalled();
  });

  it('should not show confirmation when no conversation is selected', () => {
    mockState.conversations = [];
    mockState.selectedConversationId = null;

    const { result } = renderHook(() => useClearConversation());

    act(() => {
      result.current.clearConversation();
    });

    expect(global.confirm).not.toHaveBeenCalled();
    expect(mockUpdateConversation).not.toHaveBeenCalled();
  });

  it('should handle case when selected conversation is not found', () => {
    const conversation: Conversation = {
      id: 'conv-1',
      name: 'Test',
      messages: [],
      model: { id: 'gpt-4', name: 'GPT-4' } as any,
      prompt: '',
      temperature: 0.7,
      folderId: null,
    };

    mockState.conversations = [conversation];
    mockState.selectedConversationId = 'non-existent-id';

    const { result } = renderHook(() => useClearConversation());

    act(() => {
      result.current.clearConversation();
    });

    expect(global.confirm).not.toHaveBeenCalled();
    expect(mockUpdateConversation).not.toHaveBeenCalled();
  });
});
