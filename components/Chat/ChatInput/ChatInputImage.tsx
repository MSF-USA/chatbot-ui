import React, {
  Dispatch,
  MutableRefObject,
  SetStateAction,
  useImperativeHandle,
  useRef,
} from 'react';

import {
  ChatInputSubmitTypes,
  FileMessageContent,
  FilePreview,
  ImageMessageContent,
} from '@/types/chat';

import { onFileUpload } from '@/components/Chat/ChatInputEventHandlers/file-upload';
import ImageIcon from '@/components/Icons/image';

const onImageUploadButtonClick = (
  event: React.ChangeEvent<any>,
  fileInputRef: MutableRefObject<any>,
) => {
  event.preventDefault();
  fileInputRef.current.click();
};

export interface ChatInputImageProps {
  setFilePreviews: Dispatch<SetStateAction<FilePreview[]>>;
  setSubmitType: Dispatch<SetStateAction<ChatInputSubmitTypes>>;
  prompt: string;
  setFileFieldValue: Dispatch<
    SetStateAction<
      | FileMessageContent
      | FileMessageContent[]
      | ImageMessageContent
      | ImageMessageContent[]
      | null
    >
  >;
  setUploadProgress: Dispatch<SetStateAction<{ [p: string]: number }>>;
  setParentModalIsOpen: Dispatch<SetStateAction<boolean>>;
  simulateClick?: boolean;
  labelText?: string;
  imageInputRef?: React.RefObject<{ openFilePicker: () => void } | null>;
}

const ChatInputImage = ({
  setSubmitType,
  prompt,
  setFilePreviews,
  setFileFieldValue,
  setUploadProgress,
  setParentModalIsOpen,
  labelText,
  imageInputRef,
}: ChatInputImageProps) => {
  const fileInputRef = useRef<HTMLInputElement>(null);

  useImperativeHandle(imageInputRef, () => ({
    openFilePicker: () => {
      fileInputRef.current?.click();
    },
  }));

  const openModalButtonRef: MutableRefObject<any> = useRef(null);

  return (
    <>
      <input
        type="file"
        ref={fileInputRef}
        style={{ display: 'none' }}
        onChange={(event) => {
          onFileUpload(
            event,
            setSubmitType,
            setFilePreviews,
            setFileFieldValue,
            setFileFieldValue,
            setUploadProgress,
          );
          setParentModalIsOpen(false);
        }}
        accept={'image/*'}
      />
      <button
        style={{ display: 'none' }}
        onClick={(e) => {
          onImageUploadButtonClick(e, imageInputRef as MutableRefObject<any>);
        }}
        ref={openModalButtonRef}
        className="flex items-center w-full text-right hover:bg-gray-100 dark:hover:bg-gray-800 focus:outline-none"
      >
        <ImageIcon className="text-black dark:text-white mr-2 rounded h-5 w-5 hover:bg-gray-200 dark:hover:bg-gray-700" />
        <span className="text-black dark:text-white">
          {labelText ?? 'Images'}
        </span>

        <span className="sr-only">Add image</span>
      </button>
    </>
  );
};

export default ChatInputImage;
