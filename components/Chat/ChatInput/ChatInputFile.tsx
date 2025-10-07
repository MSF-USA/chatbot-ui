import React, {
  ChangeEvent,
  Dispatch,
  MutableRefObject,
  SetStateAction,
  useContext,
  useRef,
} from 'react';
import toast from 'react-hot-toast';

import { userAuthorizedForFileUploads } from '@/utils/app/userAuth';

import {
  ChatInputSubmitTypes,
  FileMessageContent,
  FilePreview,
  ImageMessageContent,
} from '@/types/chat';

import HomeContext from '@/contexts/home.context';

import FileIcon from '@/components/Icons/file';

interface ChatInputFileProps {
  onFileUpload: (
    event: React.ChangeEvent<any>,
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
      SetStateAction<
        ImageMessageContent | ImageMessageContent[] | null | undefined
      >
    >,
    setUploadProgress: Dispatch<SetStateAction<{ [key: string]: number }>>,
  ) => void;
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
    SetStateAction<
      ImageMessageContent | ImageMessageContent[] | null | undefined
    >
  >;
  setUploadProgress: Dispatch<SetStateAction<{ [key: string]: number }>>;
}

const ChatInputFile = ({
  onFileUpload,
  setSubmitType,
  setFilePreviews,
  setFileFieldValue,
  setImageFieldValue,
  setUploadProgress,
}: ChatInputFileProps) => {
  const fileInputRef: MutableRefObject<any> = useRef(null);

  const {
    state: { user },
    dispatch: homeDispatch,
  } = useContext(HomeContext);
  if (!userAuthorizedForFileUploads(user)) return null;

  const handleFileButtonClick = (
    event: React.MouseEvent<HTMLButtonElement>,
  ) => {
    event.preventDefault();
    try {
      if (fileInputRef.current) {
        fileInputRef.current.click();
      } else {
        console.error('File input reference is not available');
        toast.error(
          'Could not open file picker. Try using drag and drop instead.',
        );
      }
    } catch (error) {
      console.error('Error triggering file input:', error);
      toast.error(
        'Could not open file picker. Try using drag and drop instead.',
      );
    }
  };

  return (
    <>
      <input
        type="file"
        multiple
        ref={fileInputRef}
        className="opacity-0 absolute w-px h-px overflow-hidden"
        aria-hidden="true"
        tabIndex={-1}
        onChange={(event: ChangeEvent<HTMLInputElement>) => {
          event.preventDefault();
          onFileUpload(
            event,
            setSubmitType,
            setFilePreviews,
            setFileFieldValue,
            setImageFieldValue,
            setUploadProgress,
          );
        }}
      />
      <div className="relative group">
        <button onClick={handleFileButtonClick} className="flex">
          <FileIcon className="text-black dark:text-white rounded h-5 w-5 hover:bg-gray-200 dark:hover:bg-gray-700" />
          <span className="sr-only">Add document</span>
        </button>
        <div className="absolute left-1/2 transform -translate-x-1/2 bottom-full mb-2 hidden group-hover:block bg-black text-white text-xs py-1 px-2 rounded shadow-md">
          Upload Document
        </div>
      </div>
    </>
  );
};

export default ChatInputFile;
