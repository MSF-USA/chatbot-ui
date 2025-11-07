'use client';

import React, { ReactNode, createContext, useContext } from 'react';

import { useInputState } from '@/client/hooks/chat/useInputState';
import { useMessageSender } from '@/client/hooks/chat/useMessageSender';
import { useUploadState } from '@/client/hooks/ui/useUploadState';

import {
  ChatInputSubmitTypes,
  FileFieldValue,
  FilePreview,
  ImageFieldValue,
  Message,
} from '@/types/chat';
import { SearchMode } from '@/types/searchMode';

/**
 * Combined chat input state and actions
 * Consolidates all input-related state management
 */
interface ChatInputContextValue {
  // Text input state
  textFieldValue: string;
  setTextFieldValue: React.Dispatch<React.SetStateAction<string>>;
  placeholderText: string;
  setPlaceholderText: React.Dispatch<React.SetStateAction<string>>;
  isTyping: boolean;
  setIsTyping: React.Dispatch<React.SetStateAction<boolean>>;
  isMultiline: boolean;
  setIsMultiline: React.Dispatch<React.SetStateAction<boolean>>;
  isFocused: boolean;
  setIsFocused: React.Dispatch<React.SetStateAction<boolean>>;
  textareaScrollHeight: number;
  setTextareaScrollHeight: React.Dispatch<React.SetStateAction<number>>;

  // Transcription state
  transcriptionStatus: string | null;
  setTranscriptionStatus: React.Dispatch<React.SetStateAction<string | null>>;
  isTranscribing: boolean;
  setIsTranscribing: React.Dispatch<React.SetStateAction<boolean>>;

  // Search mode and tone
  searchMode: SearchMode;
  setSearchMode: React.Dispatch<React.SetStateAction<SearchMode>>;
  selectedToneId: string | null;
  setSelectedToneId: React.Dispatch<React.SetStateAction<string | null>>;

  // Upload state
  filePreviews: FilePreview[];
  setFilePreviews: React.Dispatch<React.SetStateAction<FilePreview[]>>;
  fileFieldValue: FileFieldValue;
  setFileFieldValue: React.Dispatch<React.SetStateAction<FileFieldValue>>;
  imageFieldValue: ImageFieldValue;
  setImageFieldValue: React.Dispatch<React.SetStateAction<ImageFieldValue>>;
  uploadProgress: { [key: string]: number };
  setUploadProgress: React.Dispatch<
    React.SetStateAction<{ [key: string]: number }>
  >;
  submitType: ChatInputSubmitTypes;
  setSubmitType: React.Dispatch<React.SetStateAction<ChatInputSubmitTypes>>;

  // Prompt state
  usedPromptId: string | null;
  setUsedPromptId: React.Dispatch<React.SetStateAction<string | null>>;
  usedPromptVariables: { [key: string]: string } | null;
  setUsedPromptVariables: React.Dispatch<
    React.SetStateAction<{ [key: string]: string } | null>
  >;

  // Actions
  handleSend: () => void;
  handleFileUpload: (files: File[]) => Promise<void>;
  clearInput: () => void;
}

const ChatInputContext = createContext<ChatInputContextValue | undefined>(
  undefined,
);

interface ChatInputProviderProps {
  children: ReactNode;
  onSend: (message: Message, searchMode?: SearchMode) => void;
}

/**
 * Provider that consolidates all chat input state
 * Eliminates prop drilling by providing state through context
 */
export function ChatInputProvider({
  children,
  onSend,
}: ChatInputProviderProps) {
  // Text input state
  const inputState = useInputState();

  // Upload state
  const uploadState = useUploadState();

  // Message sender (handles validation and sending)
  const messageSender = useMessageSender({
    textFieldValue: inputState.textFieldValue,
    submitType: uploadState.submitType,
    imageFieldValue: uploadState.imageFieldValue,
    fileFieldValue: uploadState.fileFieldValue,
    filePreviews: uploadState.filePreviews,
    uploadProgress: uploadState.uploadProgress,
    selectedToneId: inputState.selectedToneId,
    searchMode: inputState.searchMode,
    onSend,
    onClearInput: inputState.clearInput,
    setSubmitType: uploadState.setSubmitType,
    setImageFieldValue: uploadState.setImageFieldValue,
    setFileFieldValue: uploadState.setFileFieldValue,
    setFilePreviews: uploadState.setFilePreviews,
  });

  const value: ChatInputContextValue = {
    // Text input state
    ...inputState,

    // Upload state
    ...uploadState,

    // Prompt state
    usedPromptId: messageSender.usedPromptId,
    setUsedPromptId: messageSender.setUsedPromptId,
    usedPromptVariables: messageSender.usedPromptVariables,
    setUsedPromptVariables: messageSender.setUsedPromptVariables,

    // Actions
    handleSend: messageSender.handleSend,
  };

  return (
    <ChatInputContext.Provider value={value}>
      {children}
    </ChatInputContext.Provider>
  );
}

/**
 * Hook to access chat input context
 * Must be used within ChatInputProvider
 */
export function useChatInput() {
  const context = useContext(ChatInputContext);

  if (context === undefined) {
    throw new Error('useChatInput must be used within ChatInputProvider');
  }

  return context;
}
