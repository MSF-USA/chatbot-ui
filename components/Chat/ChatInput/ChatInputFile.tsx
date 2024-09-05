import React, {
  ChangeEvent,
  Dispatch,
  MutableRefObject,
  SetStateAction,
  useContext,
  useRef,
} from 'react';

import { userAuthorizedForFileUploads } from '@/utils/app/userAuth';

import {
  ChatInputSubmitTypes,
  FileMessageContent,
  ImageMessageContent,
} from '@/types/chat';

import FileIcon from '@/components/Icons/file';

import HomeContext from '@/app/home.context';

interface ChatInputFileProps {
  onFileUpload: (
    event: React.ChangeEvent<any>,
    setSubmitType: Dispatch<SetStateAction<ChatInputSubmitTypes>>,
    setFilePreviews: Dispatch<SetStateAction<string[]>>,
    setFileFieldValue: Dispatch<SetStateAction<FileMessageContent | null>>,
    setImageFieldValue: Dispatch<
      SetStateAction<ImageMessageContent | null | undefined>
    >,
  ) => void;
  setSubmitType: Dispatch<SetStateAction<ChatInputSubmitTypes>>;
  setFilePreviews: Dispatch<SetStateAction<string[]>>;
  setFileFieldValue: Dispatch<SetStateAction<FileMessageContent | null>>;
  setImageFieldValue: Dispatch<
    SetStateAction<ImageMessageContent | null | undefined>
  >;
}

const ChatInputFile = ({
  onFileUpload,
  setSubmitType,
  setFilePreviews,
  setFileFieldValue,
  setImageFieldValue,
}: ChatInputFileProps) => {
  const fileInputRef: MutableRefObject<any> = useRef(null);

  const {
    state: { user },
    dispatch: homeDispatch,
  } = useContext(HomeContext);
  if (!userAuthorizedForFileUploads(user)) return null;

  return (
    <>
      <input
        type="file"
        ref={fileInputRef}
        style={{ display: 'none' }}
        onChange={(event: ChangeEvent<HTMLInputElement>) => {
          event.preventDefault();
          onFileUpload(
            event,
            setSubmitType,
            setFilePreviews,
            setFileFieldValue,
            setImageFieldValue,
          );
        }}
      />
      <button
        onClick={(event: React.MouseEvent<HTMLButtonElement>) => {
          event.preventDefault();
          fileInputRef.current?.click();
        }}
      >
        <FileIcon className="text-black dark:text-white rounded h-5 w-5 hover:bg-gray-200 dark:hover:bg-gray-700" />
        <span className="sr-only">Add document</span>
      </button>
    </>
  );
};

export default ChatInputFile;
