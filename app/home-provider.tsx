'use client';

import React, {
  ReactNode,
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
} from 'react';
import { QueryClient, QueryClientProvider } from 'react-query';

import { useCreateReducer } from '@/hooks/useCreateReducer';

import useErrorService from '@/services/errorService';
import useApiService from '@/services/useApiService';

import {
  cleanConversationHistory,
  cleanSelectedConversation,
} from '@/utils/app/clean';
import {
  saveConversation,
  saveConversations,
  updateConversation,
} from '@/utils/app/conversation';
import { saveFolders } from '@/utils/app/folders';
import { savePrompts } from '@/utils/app/prompts';
import { getSettings } from '@/utils/app/settings';

import { Conversation, Message } from '@/types/chat';
import { KeyValuePair } from '@/types/data';
import { FolderInterface, FolderType } from '@/types/folder';
import { OpenAIModelID, OpenAIModels } from '@/types/openai';
import { Prompt } from '@/types/prompt';

import { HomeInitialState, initialState } from './home.state';

import { v4 as uuidv4 } from 'uuid';

export interface HomeContextProps {
  state: HomeInitialState;
  dispatch: React.Dispatch<any>;
  handleNewConversation: () => void;
  handleCreateFolder: (name: string, type: FolderType) => void;
  handleDeleteFolder: (folderId: string) => void;
  handleUpdateFolder: (folderId: string, name: string) => void;
  handleSelectConversation: (conversation: Conversation) => void;
  handleUpdateConversation: (
    conversation: Conversation,
    data: KeyValuePair,
  ) => void;
}

const HomeContext = createContext<HomeContextProps | undefined>(undefined);

export function useHomeContext() {
  const context = useContext(HomeContext);
  if (context === undefined) {
    throw new Error('useHomeContext must be used within a HomeProvider');
  }
  return context;
}

const queryClient = new QueryClient();

export function HomeProvider({ children }: { children: ReactNode }) {
  const { state, dispatch } = useCreateReducer<HomeInitialState>({
    initialState,
  });
  const { getModels } = useApiService();
  const { getModelsError } = useErrorService();

  const { conversations, selectedConversation, folders, prompts, temperature } =
    state;

  const stopConversationRef = useRef<boolean>(false);

  // CONVERSATION OPERATIONS  --------------------------------------------

  const handleNewConversation = useCallback(() => {
    const lastConversation = conversations[conversations.length - 1];

    const newConversation: Conversation = {
      id: uuidv4(),
      name: 'New Conversation',
      messages: [],
      model: lastConversation?.model || {
        id: OpenAIModels[state.defaultModelId || 'gpt-35-turbo'].id,
        name: OpenAIModels[state.defaultModelId || 'gpt-35-turbo'].name,
        maxLength:
          OpenAIModels[state.defaultModelId || 'gpt-35-turbo'].maxLength,
        tokenLimit:
          OpenAIModels[state.defaultModelId || 'gpt-35-turbo'].tokenLimit,
      },
      prompt: state.systemPrompt,
      temperature: temperature,
      folderId: null,
    };

    const updatedConversations = [...conversations, newConversation];

    dispatch({ field: 'selectedConversation', value: newConversation });
    dispatch({ field: 'conversations', value: updatedConversations });

    saveConversation(newConversation);
    saveConversations(updatedConversations);

    dispatch({ field: 'loading', value: false });
  }, [
    conversations,
    dispatch,
    state.defaultModelId,
    state.systemPrompt,
    temperature,
  ]);

  const handleSelectConversation = useCallback(
    (conversation: Conversation) => {
      dispatch({ field: 'selectedConversation', value: conversation });
      saveConversation(conversation);
    },
    [dispatch],
  );

  const handleUpdateConversation = useCallback(
    (conversation: Conversation, data: KeyValuePair) => {
      const updatedConversation = {
        ...conversation,
        [data.key]: data.value,
      };

      const { single, all } = updateConversation(
        updatedConversation,
        conversations,
      );

      dispatch({ field: 'selectedConversation', value: single });
      dispatch({ field: 'conversations', value: all });
    },
    [dispatch, conversations],
  );

  // FOLDER OPERATIONS  --------------------------------------------

  const handleCreateFolder = useCallback(
    (name: string, type: FolderType) => {
      const newFolder: FolderInterface = {
        id: uuidv4(),
        name,
        type,
      };

      const updatedFolders = [...folders, newFolder];

      dispatch({ field: 'folders', value: updatedFolders });
      saveFolders(updatedFolders);
    },
    [folders, dispatch],
  );

  const handleDeleteFolder = useCallback(
    (folderId: string) => {
      const updatedFolders = folders.filter((f) => f.id !== folderId);
      dispatch({ field: 'folders', value: updatedFolders });
      saveFolders(updatedFolders);

      const updatedConversations: Conversation[] = conversations.map((c) => {
        if (c.folderId === folderId) {
          return {
            ...c,
            folderId: null,
          };
        }
        return c;
      });

      dispatch({ field: 'conversations', value: updatedConversations });
      saveConversations(updatedConversations);

      const updatedPrompts: Prompt[] = prompts.map((p) => {
        if (p.folderId === folderId) {
          return {
            ...p,
            folderId: null,
          };
        }
        return p;
      });

      dispatch({ field: 'prompts', value: updatedPrompts });
      savePrompts(updatedPrompts);
    },
    [folders, dispatch, conversations, prompts],
  );

  const handleUpdateFolder = useCallback(
    (folderId: string, name: string) => {
      const updatedFolders = folders.map((f) => {
        if (f.id === folderId) {
          return {
            ...f,
            name,
          };
        }
        return f;
      });

      dispatch({ field: 'folders', value: updatedFolders });
      saveFolders(updatedFolders);
    },
    [folders, dispatch],
  );

  // EFFECTS  --------------------------------------------

  useEffect(() => {
    if (window.innerWidth < 640) {
      dispatch({ field: 'showChatbar', value: false });
    }
  }, [selectedConversation, dispatch]);

  useEffect(() => {
    const settings = getSettings();
    if (settings.theme) dispatch({ field: 'lightMode', value: settings.theme });
    if (settings.temperature)
      dispatch({ field: 'temperature', value: settings.temperature });
    if (settings.systemPrompt)
      dispatch({ field: 'systemPrompt', value: settings.systemPrompt });

    const apiKey = localStorage.getItem('apiKey');
    if (apiKey) {
      dispatch({ field: 'apiKey', value: apiKey });
    }

    const pluginKeys = localStorage.getItem('pluginKeys');
    if (pluginKeys) {
      dispatch({ field: 'pluginKeys', value: JSON.parse(pluginKeys) });
    }

    if (window.innerWidth < 640) {
      dispatch({ field: 'showChatbar', value: false });
    }

    const showChatbar = localStorage.getItem('showChatbar');
    if (showChatbar) {
      dispatch({ field: 'showChatbar', value: showChatbar === 'true' });
    }

    const folders = localStorage.getItem('folders');
    if (folders) {
      dispatch({ field: 'folders', value: JSON.parse(folders) });
    }

    const prompts = localStorage.getItem('prompts');
    if (prompts) {
      dispatch({ field: 'prompts', value: JSON.parse(prompts) });
    }

    const conversationHistory = localStorage.getItem('conversationHistory');
    if (conversationHistory) {
      const parsedConversationHistory: Conversation[] =
        JSON.parse(conversationHistory);
      const cleanedConversationHistory = cleanConversationHistory(
        parsedConversationHistory,
      );
      dispatch({ field: 'conversations', value: cleanedConversationHistory });
    }

    const selectedConversation = localStorage.getItem('selectedConversation');
    if (selectedConversation) {
      const parsedSelectedConversation: Conversation =
        JSON.parse(selectedConversation);
      const cleanedSelectedConversation = cleanSelectedConversation(
        parsedSelectedConversation,
      );
      dispatch({
        field: 'selectedConversation',
        value: cleanedSelectedConversation,
      });
    } else {
      const lastConversation = conversations[conversations.length - 1];
      dispatch({
        field: 'selectedConversation',
        value: {
          id: uuidv4(),
          name: 'New Conversation',
          messages: [],
          model: OpenAIModels[state.defaultModelId || 'gpt-35-turbo'],
          prompt: state.systemPrompt,
          temperature: temperature,
          folderId: null,
        },
      });
    }
  }, [
    dispatch,
    state.defaultModelId,
    state.systemPrompt,
    temperature,
    conversations,
  ]);

  const contextValue: HomeContextProps = {
    state,
    dispatch,
    handleNewConversation,
    handleCreateFolder,
    handleDeleteFolder,
    handleUpdateFolder,
    handleSelectConversation,
    handleUpdateConversation,
  };

  return (
    <QueryClientProvider client={queryClient}>
      <HomeContext.Provider value={contextValue}>
        {children}
      </HomeContext.Provider>
    </QueryClientProvider>
  );
}
