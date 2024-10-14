import React, { Dispatch, SetStateAction, useState, useRef, useEffect } from 'react';
import { IconWorld } from '@tabler/icons-react';
import ChatInputSearch from "@/components/Chat/ChatInput/ChatInputSearch";
import ChatInputUrl from "@/components/Chat/ChatInput/ChatInputUrl";
import { ChatInputSubmitTypes, FileMessageContent, FilePreview, ImageMessageContent } from "@/types/chat";

interface DropdownProps {
  onFileUpload: (
    event: React.ChangeEvent<any> | File[] | FileList,
    setSubmitType: Dispatch<SetStateAction<ChatInputSubmitTypes>>,
    setFilePreviews: Dispatch<SetStateAction<FilePreview[]>>,
    setFileFieldValue: Dispatch<
      SetStateAction<
        | FileMessageContent
        | FileMessageContent[]
        | ImageMessageContent
        | ImageMessageContent[]
        | null
      >
    >,
    setImageFieldValue: Dispatch<
      SetStateAction<ImageMessageContent | ImageMessageContent[] | null | undefined>
    >,
    setUploadProgress: Dispatch<SetStateAction<{ [key: string]: number }>>,
  ) => Promise<void>;
  setSubmitType: Dispatch<SetStateAction<ChatInputSubmitTypes>>;
  setFilePreviews: Dispatch<SetStateAction<FilePreview[]>>;
  setFileFieldValue: Dispatch<
    SetStateAction<
      | FileMessageContent
      | FileMessageContent[]
      | ImageMessageContent
      | ImageMessageContent[]
      | null
    >
  >;
  setImageFieldValue: Dispatch<
    SetStateAction<ImageMessageContent | ImageMessageContent[] | null | undefined>
  >;
  setUploadProgress: Dispatch<SetStateAction<{ [key: string]: number }>>;
  setTextFieldValue: Dispatch<SetStateAction<string>>;
  handleSend: () => void;
}

const Dropdown: React.FC<DropdownProps> = (
  {
    setFileFieldValue, onFileUpload, setFilePreviews, setTextFieldValue, setImageFieldValue, setUploadProgress,
    setSubmitType, handleSend
  }
) => {
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const handleKeyDown = (event: React.KeyboardEvent) => {
    if (event.key === 'Escape') {
      setIsOpen(false);
    }
  };

  useEffect(() => {
    if (isOpen) {
      dropdownRef.current?.focus();
    }
  }, [isOpen]);

  return (
    <div className="relative" onKeyDown={handleKeyDown}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        aria-haspopup="true"
        aria-expanded={isOpen}
        aria-label="Toggle dropdown menu"
      >
        <IconWorld size={24} />
      </button>
      {isOpen && (
        <div
          ref={dropdownRef}
          className="absolute right-0 bottom-full mb-2 bg-white dark:bg-black border border-gray-200 rounded shadow-lg"
          tabIndex={-1}
        >
          <ChatInputSearch
            onFileUpload={onFileUpload}
            setSubmitType={setSubmitType}
            setFilePreviews={setFilePreviews}
            setFileFieldValue={setFileFieldValue}
            setImageFieldValue={setImageFieldValue}
            setUploadProgress={setUploadProgress}
            setTextFieldValue={setTextFieldValue}
            handleSend={handleSend}
          />
          <ChatInputUrl
            onFileUpload={onFileUpload}
            setSubmitType={setSubmitType}
            setFilePreviews={setFilePreviews}
            setFileFieldValue={setFileFieldValue}
            setImageFieldValue={setImageFieldValue}
            setUploadProgress={setUploadProgress}
          />
        </div>
      )}
    </div>
  );
};

export default Dropdown;
