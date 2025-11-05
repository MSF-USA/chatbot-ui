import React, { Dispatch, SetStateAction } from 'react';

import {
  ChatInputSubmitTypes,
  FileFieldValue,
  FilePreview,
  ImageFieldValue,
} from '@/types/chat';
import { SearchMode } from '@/types/searchMode';
import { Tone } from '@/types/tone';

import ChatInputSubmitButton from '@/components/Chat/ChatInput/ChatInputSubmitButton';
import ChatInputVoiceCapture from '@/components/Chat/ChatInput/ChatInputVoiceCapture';
import ChatDropdown from '@/components/Chat/ChatInput/Dropdown';

interface InputControlsBarProps {
  // Dropdown props
  onFileUpload: (
    event: React.ChangeEvent<HTMLInputElement> | File[] | FileList,
  ) => Promise<void>;
  setSubmitType: Dispatch<SetStateAction<ChatInputSubmitTypes>>;
  setFilePreviews: Dispatch<SetStateAction<FilePreview[]>>;
  setFileFieldValue: Dispatch<SetStateAction<FileFieldValue>>;
  setImageFieldValue: Dispatch<SetStateAction<ImageFieldValue>>;
  setUploadProgress: Dispatch<SetStateAction<{ [key: string]: number }>>;
  setTextFieldValue: Dispatch<SetStateAction<string>>;
  handleSend: () => void;
  textFieldValue: string;
  onCameraClick: () => void;
  showDisclaimer: boolean;
  searchMode: SearchMode;
  setSearchMode: Dispatch<SetStateAction<SearchMode>>;
  setTranscriptionStatus: Dispatch<SetStateAction<string | null>>;
  selectedToneId: string | null;
  setSelectedToneId: Dispatch<SetStateAction<string | null>>;
  tones: Tone[];
  filePreviews: FilePreview[];

  // Voice capture props
  setIsTranscribing: Dispatch<SetStateAction<boolean>>;

  // Submit button props
  isStreaming: boolean;
  isTranscribing: boolean;
  handleStopConversation: () => void;
  preventSubmission: () => boolean;

  // Position props
  isMultiline: boolean;
}

/**
 * Input controls bar component
 * Contains dropdown menu, voice capture, and submit button
 */
export const InputControlsBar: React.FC<InputControlsBarProps> = ({
  onFileUpload,
  setSubmitType,
  setFilePreviews,
  setFileFieldValue,
  setImageFieldValue,
  setUploadProgress,
  setTextFieldValue,
  handleSend,
  textFieldValue,
  onCameraClick,
  showDisclaimer,
  searchMode,
  setSearchMode,
  setTranscriptionStatus,
  selectedToneId,
  setSelectedToneId,
  tones,
  filePreviews,
  setIsTranscribing,
  isStreaming,
  isTranscribing,
  handleStopConversation,
  preventSubmission,
  isMultiline,
}) => {
  return (
    <>
      {/* Left controls */}
      <div
        className={`absolute left-2 flex items-center gap-2 z-[10001] transition-all duration-200 ${
          searchMode === SearchMode.ALWAYS || selectedToneId || isMultiline
            ? 'bottom-2'
            : 'top-1/2 transform -translate-y-1/2'
        }`}
      >
        <ChatDropdown
          onFileUpload={onFileUpload}
          setSubmitType={setSubmitType}
          setFilePreviews={setFilePreviews}
          setFileFieldValue={setFileFieldValue}
          setImageFieldValue={setImageFieldValue}
          setUploadProgress={setUploadProgress}
          setTextFieldValue={setTextFieldValue}
          handleSend={handleSend}
          textFieldValue={textFieldValue}
          onCameraClick={onCameraClick}
          openDownward={!showDisclaimer}
          searchMode={searchMode}
          setSearchMode={setSearchMode}
          setTranscriptionStatus={setTranscriptionStatus}
          selectedToneId={selectedToneId}
          setSelectedToneId={setSelectedToneId}
          tones={tones}
          filePreviews={filePreviews}
        />
      </div>

      {/* Right controls */}
      <div
        className={`absolute right-2.5 flex items-center gap-2 z-[10001] transition-all duration-200 ${
          searchMode === SearchMode.ALWAYS || selectedToneId || isMultiline
            ? 'bottom-2'
            : 'top-1/2 transform -translate-y-1/2'
        }`}
      >
        <ChatInputVoiceCapture
          setTextFieldValue={setTextFieldValue}
          setIsTranscribing={setIsTranscribing}
        />
        <ChatInputSubmitButton
          isStreaming={isStreaming}
          isTranscribing={isTranscribing}
          handleSend={handleSend}
          handleStopConversation={handleStopConversation}
          preventSubmission={preventSubmission}
        />
      </div>
    </>
  );
};
