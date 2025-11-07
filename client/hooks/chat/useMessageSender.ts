import { useCallback, useState } from 'react';

import { useTranslations } from 'next-intl';

import { buildMessageContent } from '@/lib/utils/chat/contentBuilder';
import { validateMessageSubmission } from '@/lib/utils/chat/validation';

import {
  ChatInputSubmitTypes,
  FileFieldValue,
  FilePreview,
  ImageFieldValue,
  Message,
  MessageType,
} from '@/types/chat';
import { SearchMode } from '@/types/searchMode';

import { useCodeEditorStore } from '@/client/stores/codeEditorStore';

interface UseMessageSenderProps {
  textFieldValue: string;
  submitType: ChatInputSubmitTypes;
  imageFieldValue: ImageFieldValue;
  fileFieldValue: FileFieldValue;
  filePreviews: FilePreview[];
  uploadProgress: { [key: string]: number };
  selectedToneId: string | null;
  searchMode: SearchMode;
  onSend: (message: Message, searchMode?: SearchMode) => void;
  onClearInput: () => void;
  setSubmitType: React.Dispatch<React.SetStateAction<ChatInputSubmitTypes>>;
  setImageFieldValue: React.Dispatch<React.SetStateAction<ImageFieldValue>>;
  setFileFieldValue: React.Dispatch<React.SetStateAction<FileFieldValue>>;
  setFilePreviews: React.Dispatch<React.SetStateAction<FilePreview[]>>;
}

/**
 * Maps ChatInputSubmitTypes to MessageType enum
 */
const mapSubmitTypeToMessageType = (
  submitType: ChatInputSubmitTypes,
): MessageType => {
  const mapping: Record<ChatInputSubmitTypes, MessageType> = {
    text: MessageType.TEXT,
    image: MessageType.IMAGE,
    file: MessageType.FILE,
    'multi-file': MessageType.FILE, // Multi-file also maps to FILE
  };
  return mapping[submitType];
};

/**
 * Custom hook to manage message sending logic
 * Handles validation, content building, and sending
 */
export function useMessageSender({
  textFieldValue,
  submitType,
  imageFieldValue,
  fileFieldValue,
  filePreviews,
  uploadProgress,
  selectedToneId,
  searchMode,
  onSend,
  onClearInput,
  setSubmitType,
  setImageFieldValue,
  setFileFieldValue,
  setFilePreviews,
}: UseMessageSenderProps) {
  const t = useTranslations();
  const { getArtifactContext } = useCodeEditorStore();

  const [usedPromptId, setUsedPromptId] = useState<string | null>(null);
  const [usedPromptVariables, setUsedPromptVariables] = useState<{
    [key: string]: string;
  } | null>(null);

  const buildContent = useCallback(() => {
    // Don't prepend artifact context to content anymore
    // It will be attached as metadata
    return buildMessageContent(
      submitType,
      textFieldValue,
      imageFieldValue,
      fileFieldValue,
      null, // No longer prepending artifact context
    );
  }, [submitType, textFieldValue, imageFieldValue, fileFieldValue]);

  const handleSend = useCallback(() => {
    const validation = validateMessageSubmission(
      textFieldValue,
      filePreviews,
      uploadProgress,
    );

    if (!validation.valid) {
      alert(t(validation.error || 'Cannot send message'));
      return;
    }

    console.log('[MessageSender handleSend] submitType:', submitType);
    console.log('[MessageSender handleSend] filePreviews:', filePreviews);
    console.log('[MessageSender handleSend] fileFieldValue:', fileFieldValue);

    const content = buildContent();

    console.log(
      '[MessageSender handleSend] built content:',
      JSON.stringify(content).substring(0, 200),
    );

    // Get artifact context if editor is open
    const artifactContext = getArtifactContext();

    onSend(
      {
        role: 'user',
        content,
        messageType: mapSubmitTypeToMessageType(submitType ?? 'text'),
        toneId: selectedToneId,
        promptId: usedPromptId,
        promptVariables: usedPromptVariables || undefined,
        artifactContext: artifactContext || undefined,
      },
      searchMode,
    );

    // Clear input state
    onClearInput();
    setImageFieldValue(null);
    setFileFieldValue(null);
    setSubmitType('text');
    setUsedPromptId(null);
    setUsedPromptVariables(null);

    if (filePreviews.length > 0) {
      setFilePreviews([]);
    }
  }, [
    textFieldValue,
    filePreviews,
    uploadProgress,
    submitType,
    fileFieldValue,
    selectedToneId,
    searchMode,
    usedPromptId,
    usedPromptVariables,
    t,
    buildContent,
    onSend,
    onClearInput,
    setImageFieldValue,
    setFileFieldValue,
    setSubmitType,
    setFilePreviews,
    getArtifactContext,
  ]);

  return {
    handleSend,
    usedPromptId,
    setUsedPromptId,
    usedPromptVariables,
    setUsedPromptVariables,
  };
}
