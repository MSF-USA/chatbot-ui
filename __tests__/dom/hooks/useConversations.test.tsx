import { renderHook, act } from '@testing-library/react';
import { describe, expect, it, beforeEach } from 'vitest';

import { useConversations } from '@/lib/hooks/conversation/useConversations';
import { useConversationStore } from '@/lib/stores/conversationStore';
import { Conversation } from '@/types/chat';
import { FolderInterface } from '@/types/folder';

describe('useConversations', () => {
  beforeEach(() => {
    // Reset store state before each test
    useConversationStore.setState({
      conversations: [],
      selectedConversationId: null,
      folders: [],
      searchTerm: '',
      isLoaded: false,
    });
  });

  const createMockConversation = (id: string, name: string, messages: any[] = []): Conversation => ({
    id,
    name,
    messages,
    model: { id: 'gpt-4', name: 'GPT-4', maxLength: 4000, tokenLimit: 4000 },
    prompt: '',
    temperature: 0.7,
    folderId: null,
  });

  const createMockFolder = (id: string, name: string): FolderInterface => ({
    id,
    name,
    type: 'chat',
  });

  describe('State Access', () => {
    it('returns conversations from store', () => {
      const conversations = [
        createMockConversation('1', 'First'),
        createMockConversation('2', 'Second'),
      ];
      useConversationStore.getState().setConversations(conversations);

      const { result } = renderHook(() => useConversations());

      expect(result.current.conversations).toEqual(conversations);
    });

    it('returns folders from store', () => {
      const folders = [
        createMockFolder('1', 'Work'),
        createMockFolder('2', 'Personal'),
      ];
      useConversationStore.getState().setFolders(folders);

      const { result } = renderHook(() => useConversations());

      expect(result.current.folders).toEqual(folders);
    });

    it('returns searchTerm from store', () => {
      useConversationStore.getState().setSearchTerm('test query');

      const { result } = renderHook(() => useConversations());

      expect(result.current.searchTerm).toBe('test query');
    });

    it('returns isLoaded from store', () => {
      useConversationStore.getState().setIsLoaded(true);

      const { result } = renderHook(() => useConversations());

      expect(result.current.isLoaded).toBe(true);
    });
  });

  describe('Selected Conversation', () => {
    it('returns null when no conversation is selected', () => {
      const { result } = renderHook(() => useConversations());

      expect(result.current.selectedConversation).toBeNull();
    });

    it('returns selected conversation', () => {
      const conversations = [
        createMockConversation('1', 'First'),
        createMockConversation('2', 'Second'),
      ];
      useConversationStore.getState().setConversations(conversations);
      useConversationStore.getState().selectConversation('2');

      const { result } = renderHook(() => useConversations());

      expect(result.current.selectedConversation).toEqual(conversations[1]);
    });

    it('returns null when selected conversation does not exist', () => {
      const conversations = [createMockConversation('1', 'First')];
      useConversationStore.getState().setConversations(conversations);
      useConversationStore.getState().selectConversation('999');

      const { result } = renderHook(() => useConversations());

      expect(result.current.selectedConversation).toBeNull();
    });

    it('updates when selection changes', () => {
      const conversations = [
        createMockConversation('1', 'First'),
        createMockConversation('2', 'Second'),
      ];
      useConversationStore.getState().setConversations(conversations);

      const { result, rerender } = renderHook(() => useConversations());

      act(() => {
        useConversationStore.getState().selectConversation('1');
      });
      rerender();
      expect(result.current.selectedConversation).toEqual(conversations[0]);

      act(() => {
        useConversationStore.getState().selectConversation('2');
      });
      rerender();
      expect(result.current.selectedConversation).toEqual(conversations[1]);
    });
  });

  describe('Filtered Conversations', () => {
    it('returns all conversations when search term is empty', () => {
      const conversations = [
        createMockConversation('1', 'First'),
        createMockConversation('2', 'Second'),
        createMockConversation('3', 'Third'),
      ];
      useConversationStore.getState().setConversations(conversations);

      const { result } = renderHook(() => useConversations());

      expect(result.current.filteredConversations).toEqual(conversations);
    });

    it('filters conversations by name (case insensitive)', () => {
      const conversations = [
        createMockConversation('1', 'JavaScript Tutorial'),
        createMockConversation('2', 'Python Guide'),
        createMockConversation('3', 'JavaScript Best Practices'),
      ];
      useConversationStore.getState().setConversations(conversations);
      useConversationStore.getState().setSearchTerm('javascript');

      const { result } = renderHook(() => useConversations());

      expect(result.current.filteredConversations).toHaveLength(2);
      expect(result.current.filteredConversations[0].id).toBe('1');
      expect(result.current.filteredConversations[1].id).toBe('3');
    });

    it('filters conversations by name (exact match)', () => {
      const conversations = [
        createMockConversation('1', 'Test'),
        createMockConversation('2', 'Testing'),
        createMockConversation('3', 'Other'),
      ];
      useConversationStore.getState().setConversations(conversations);
      useConversationStore.getState().setSearchTerm('Test');

      const { result } = renderHook(() => useConversations());

      expect(result.current.filteredConversations).toHaveLength(2);
      expect(result.current.filteredConversations.map(c => c.id)).toEqual(['1', '2']);
    });

    it('filters conversations by message content', () => {
      const conversations = [
        createMockConversation('1', 'Conv 1', [
          { role: 'user', content: 'Tell me about React' },
        ]),
        createMockConversation('2', 'Conv 2', [
          { role: 'user', content: 'Tell me about Vue' },
        ]),
        createMockConversation('3', 'Conv 3', [
          { role: 'user', content: 'How to use React hooks?' },
        ]),
      ];
      useConversationStore.getState().setConversations(conversations);
      useConversationStore.getState().setSearchTerm('react');

      const { result } = renderHook(() => useConversations());

      expect(result.current.filteredConversations).toHaveLength(2);
      expect(result.current.filteredConversations.map(c => c.id)).toEqual(['1', '3']);
    });

    it('filters by name and message content (case insensitive)', () => {
      const conversations = [
        createMockConversation('1', 'Python Tutorial', [
          { role: 'user', content: 'Explain python basics' },
        ]),
        createMockConversation('2', 'JavaScript Guide', [
          { role: 'user', content: 'How does Python compare to JS?' },
        ]),
        createMockConversation('3', 'Ruby Guide', [
          { role: 'user', content: 'Ruby vs JavaScript' },
        ]),
      ];
      useConversationStore.getState().setConversations(conversations);
      useConversationStore.getState().setSearchTerm('PYTHON');

      const { result } = renderHook(() => useConversations());

      // Should match conversations 1 (name) and 2 (message content)
      expect(result.current.filteredConversations).toHaveLength(2);
      expect(result.current.filteredConversations.map(c => c.id)).toEqual(['1', '2']);
    });

    it('returns empty array when no conversations match', () => {
      const conversations = [
        createMockConversation('1', 'First'),
        createMockConversation('2', 'Second'),
      ];
      useConversationStore.getState().setConversations(conversations);
      useConversationStore.getState().setSearchTerm('nonexistent');

      const { result } = renderHook(() => useConversations());

      expect(result.current.filteredConversations).toEqual([]);
    });

    it('handles empty conversations list', () => {
      useConversationStore.getState().setSearchTerm('test');

      const { result } = renderHook(() => useConversations());

      expect(result.current.filteredConversations).toEqual([]);
    });

    it('updates when search term changes', () => {
      const conversations = [
        createMockConversation('1', 'React Tutorial'),
        createMockConversation('2', 'Vue Tutorial'),
      ];
      useConversationStore.getState().setConversations(conversations);

      const { result, rerender } = renderHook(() => useConversations());

      // Initially no filter
      expect(result.current.filteredConversations).toHaveLength(2);

      // Filter for React
      act(() => {
        useConversationStore.getState().setSearchTerm('react');
      });
      rerender();
      expect(result.current.filteredConversations).toHaveLength(1);
      expect(result.current.filteredConversations[0].id).toBe('1');

      // Filter for Vue
      act(() => {
        useConversationStore.getState().setSearchTerm('vue');
      });
      rerender();
      expect(result.current.filteredConversations).toHaveLength(1);
      expect(result.current.filteredConversations[0].id).toBe('2');

      // Clear filter
      act(() => {
        useConversationStore.getState().setSearchTerm('');
      });
      rerender();
      expect(result.current.filteredConversations).toHaveLength(2);
    });

    it('searches in multiple messages', () => {
      const conversations = [
        createMockConversation('1', 'Conv 1', [
          { role: 'user', content: 'Hello' },
          { role: 'assistant', content: 'Hi there' },
          { role: 'user', content: 'Tell me about TypeScript' },
        ]),
        createMockConversation('2', 'Conv 2', [
          { role: 'user', content: 'Python question' },
        ]),
      ];
      useConversationStore.getState().setConversations(conversations);
      useConversationStore.getState().setSearchTerm('typescript');

      const { result } = renderHook(() => useConversations());

      expect(result.current.filteredConversations).toHaveLength(1);
      expect(result.current.filteredConversations[0].id).toBe('1');
    });

    it('handles partial word matches', () => {
      const conversations = [
        createMockConversation('1', 'JavaScript'),
        createMockConversation('2', 'Java'),
        createMockConversation('3', 'TypeScript'),
      ];
      useConversationStore.getState().setConversations(conversations);
      useConversationStore.getState().setSearchTerm('java');

      const { result } = renderHook(() => useConversations());

      // Should match both JavaScript and Java
      expect(result.current.filteredConversations).toHaveLength(2);
      expect(result.current.filteredConversations.map(c => c.id)).toEqual(['1', '2']);
    });

    it('handles special characters in search', () => {
      const conversations = [
        createMockConversation('1', 'C++ Programming'),
        createMockConversation('2', 'C# Basics'),
        createMockConversation('3', 'JavaScript'),
      ];
      useConversationStore.getState().setConversations(conversations);
      useConversationStore.getState().setSearchTerm('c++');

      const { result } = renderHook(() => useConversations());

      expect(result.current.filteredConversations).toHaveLength(1);
      expect(result.current.filteredConversations[0].id).toBe('1');
    });
  });

  describe('Actions', () => {
    it('provides addConversation action', () => {
      const { result } = renderHook(() => useConversations());

      const conversation = createMockConversation('1', 'Test');
      act(() => {
        result.current.addConversation(conversation);
      });

      expect(useConversationStore.getState().conversations).toHaveLength(1);
    });

    it('provides updateConversation action', () => {
      const conversation = createMockConversation('1', 'Original');
      useConversationStore.getState().setConversations([conversation]);

      const { result } = renderHook(() => useConversations());

      act(() => {
        result.current.updateConversation('1', { name: 'Updated' });
      });

      expect(useConversationStore.getState().conversations[0].name).toBe('Updated');
    });

    it('provides deleteConversation action', () => {
      const conversations = [
        createMockConversation('1', 'First'),
        createMockConversation('2', 'Second'),
      ];
      useConversationStore.getState().setConversations(conversations);

      const { result } = renderHook(() => useConversations());

      act(() => {
        result.current.deleteConversation('1');
      });

      expect(useConversationStore.getState().conversations).toHaveLength(1);
      expect(useConversationStore.getState().conversations[0].id).toBe('2');
    });

    it('provides selectConversation action', () => {
      const { result } = renderHook(() => useConversations());

      act(() => {
        result.current.selectConversation('123');
      });

      expect(useConversationStore.getState().selectedConversationId).toBe('123');
    });

    it('provides setConversations action', () => {
      const { result } = renderHook(() => useConversations());

      const conversations = [
        createMockConversation('1', 'First'),
        createMockConversation('2', 'Second'),
      ];
      act(() => {
        result.current.setConversations(conversations);
      });

      expect(useConversationStore.getState().conversations).toEqual(conversations);
    });

    it('provides folder actions', () => {
      const { result } = renderHook(() => useConversations());

      const folder = createMockFolder('1', 'Work');
      act(() => {
        result.current.addFolder(folder);
      });

      expect(useConversationStore.getState().folders).toHaveLength(1);

      act(() => {
        result.current.updateFolder('1', 'Personal');
      });

      expect(useConversationStore.getState().folders[0].name).toBe('Personal');

      act(() => {
        result.current.deleteFolder('1');
      });

      expect(useConversationStore.getState().folders).toHaveLength(0);
    });

    it('provides setSearchTerm action', () => {
      const { result } = renderHook(() => useConversations());

      act(() => {
        result.current.setSearchTerm('test query');
      });

      expect(useConversationStore.getState().searchTerm).toBe('test query');
    });

    it('provides clearAll action', () => {
      const conversation = createMockConversation('1', 'Test');
      const folder = createMockFolder('1', 'Work');
      useConversationStore.getState().setConversations([conversation]);
      useConversationStore.getState().setFolders([folder]);
      useConversationStore.getState().setSearchTerm('search');

      const { result } = renderHook(() => useConversations());

      act(() => {
        result.current.clearAll();
      });

      const state = useConversationStore.getState();
      expect(state.conversations).toEqual([]);
      expect(state.folders).toEqual([]);
      expect(state.searchTerm).toBe('');
    });
  });

  describe('Reactivity', () => {
    it('re-renders when conversations change', () => {
      const { result, rerender } = renderHook(() => useConversations());

      expect(result.current.conversations).toHaveLength(0);

      act(() => {
        useConversationStore.getState().addConversation(createMockConversation('1', 'Test'));
      });
      rerender();

      expect(result.current.conversations).toHaveLength(1);
    });

    it('re-renders when selectedConversationId changes', () => {
      const conversations = [
        createMockConversation('1', 'First'),
        createMockConversation('2', 'Second'),
      ];
      useConversationStore.getState().setConversations(conversations);

      const { result, rerender } = renderHook(() => useConversations());

      expect(result.current.selectedConversation).toBeNull();

      act(() => {
        useConversationStore.getState().selectConversation('1');
      });
      rerender();

      expect(result.current.selectedConversation?.id).toBe('1');
    });

    it('re-computes filteredConversations when searchTerm changes', () => {
      const conversations = [
        createMockConversation('1', 'React'),
        createMockConversation('2', 'Vue'),
      ];
      useConversationStore.getState().setConversations(conversations);

      const { result, rerender } = renderHook(() => useConversations());

      expect(result.current.filteredConversations).toHaveLength(2);

      act(() => {
        useConversationStore.getState().setSearchTerm('react');
      });
      rerender();

      expect(result.current.filteredConversations).toHaveLength(1);
    });

    it('re-computes filteredConversations when conversations change', () => {
      useConversationStore.getState().setSearchTerm('test');

      const { result, rerender } = renderHook(() => useConversations());

      expect(result.current.filteredConversations).toHaveLength(0);

      act(() => {
        useConversationStore.getState().addConversation(createMockConversation('1', 'Test'));
      });
      rerender();

      expect(result.current.filteredConversations).toHaveLength(1);
    });
  });
});
