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
} from '@/types/chat';
import { SearchMode } from '@/types/searchMode';

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

  const [usedPromptId, setUsedPromptId] = useState<string | null>(null);
  const [usedPromptVariables, setUsedPromptVariables] = useState<{
    [key: string]: string;
  } | null>(null);

  const buildContent = useCallback(
    () =>
      buildMessageContent(
        submitType,
        textFieldValue,
        imageFieldValue,
        fileFieldValue,
      ),
    [submitType, textFieldValue, imageFieldValue, fileFieldValue],
  );

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

    onSend(
      {
        role: 'user',
        content,
        messageType: submitType ?? 'text',
        toneId: selectedToneId,
        promptId: usedPromptId,
        promptVariables: usedPromptVariables || undefined,
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
  ]);

  return {
    handleSend,
    usedPromptId,
    setUsedPromptId,
    usedPromptVariables,
    setUsedPromptVariables,
  };
}
