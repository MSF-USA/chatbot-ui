import FileIcon from "@/components/Icons/file";
import React, {ChangeEvent, Dispatch, MutableRefObject, SetStateAction, useContext, useRef} from "react";
import {ChatInputSubmitTypes, FileMessageContent, FilePreview, ImageMessageContent} from "@/types/chat";
import {userAuthorizedForFileUploads} from "@/utils/app/userAuth";
import HomeContext from "@/pages/api/home/home.context";

interface ChatInputFileProps {
    onFileUpload: (
        event: React.ChangeEvent<any>,
        setSubmitType: Dispatch<SetStateAction<ChatInputSubmitTypes>>,
        setFilePreviews: Dispatch<SetStateAction<FilePreview[]>>,
        setFileFieldValue: Dispatch<SetStateAction<FileMessageContent | FileMessageContent[] | ImageMessageContent | ImageMessageContent[] | null>>,
        setImageFieldValue: Dispatch<SetStateAction<ImageMessageContent | ImageMessageContent[] | null | undefined>>,
        setUploadProgress: Dispatch<SetStateAction<{ [key: string]: number }>>
  ) => void
    setSubmitType: Dispatch<SetStateAction<ChatInputSubmitTypes>>,
    setFilePreviews: Dispatch<SetStateAction<FilePreview[]>>,
    setFileFieldValue: Dispatch<SetStateAction<FileMessageContent | FileMessageContent[] | ImageMessageContent | ImageMessageContent[] | null>>,
    setImageFieldValue: Dispatch<SetStateAction<ImageMessageContent | ImageMessageContent[] | null | undefined>>,
    setUploadProgress: Dispatch<SetStateAction<{ [key: string]: number }>>

}

const ChatInputFile = (
    {
        onFileUpload, setSubmitType, setFilePreviews, setFileFieldValue, setImageFieldValue, setUploadProgress
    }: ChatInputFileProps
) => {
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
        multiple
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
            setUploadProgress
          );
        }}
      />
      <div className="relative group">
      <button
        onClick={(event: React.MouseEvent<HTMLButtonElement>) => {
          event.preventDefault();
          fileInputRef.current?.click();
        }}
        className="flex"
      >
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
