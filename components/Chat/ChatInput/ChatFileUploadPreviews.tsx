import { XIcon } from "@/components/Icons/cancel";
import { Dispatch, FC, SetStateAction, MouseEvent } from "react";
import Image from "next/image";
import { ChatInputSubmitTypes } from "@/types/chat";
import FileIcon from "@/components/Icons/file";
import {IconInfoCircle} from "@tabler/icons-react";

interface ChatFileUploadPreviewsProps {
  filePreviews: string[];
  setFilePreviews: Dispatch<SetStateAction<string[]>>;
  setSubmitType: Dispatch<SetStateAction<ChatInputSubmitTypes>>;
  uploadProgress: {[key: string]: number;};
}

interface ChatFileUploadPreviewProps {
  filePreview: string;
  setFilePreviews: Dispatch<SetStateAction<string[]>>;
  setSubmitType: Dispatch<SetStateAction<ChatInputSubmitTypes>>;
  progress: number;
}


const ChatFileUploadPreview: FC<ChatFileUploadPreviewProps> = (
  {
    filePreview,
    setFilePreviews,
    setSubmitType,
    progress
  }
) => {
  if (!filePreview) {
    throw new Error('Empty filePreview found');
  }
  const removeFilePreview = (
    event: MouseEvent<HTMLButtonElement>,
    filePreview: string
  ) => {
    event.preventDefault();
    setFilePreviews((prevPreviews) => {
      const newPreviews = prevPreviews.filter(
        (prevPreview) => prevPreview !== filePreview
      );
      if (newPreviews.length === 0) setSubmitType("text");
      return newPreviews;
    });
  };

  const isImage: boolean = !filePreview.startsWith("file:")
  let filename;
  if (!isImage)
    filename =
      filePreview?.split("||name:")?.[filePreview.split("||name:").length - 1] ?? '';

  // Check if the file is a PDF
  let isPdf = false;
  if (filename) {
    const extension = filename.split('.').pop()?.toLowerCase();
    if (extension === 'pdf') {
      isPdf = true;
    }
  }

  return (
    <div
      className="relative p-2 aspect-video rounded-md overflow-hidden border border-black dark:border-white bg-white px-3 text-black
              hover:opacity-80 dark:bg-[#2f2f2f] dark:text-white me-2"
      style={{
        maxHeight: "150px",
        maxWidth: "150px",
      }}
    >
      {isImage ? (
        <img
          alt="Preview"
          className="object-cover"
          height="150"
          src={filePreview}
          style={{
            aspectRatio: "200/150",
            objectFit: "cover",
          }}
          width="200"
        />
      ) : (
        <>
          <FileIcon className="object-cover"/>
          {filename && (
            <span>
              {filename.slice(0, 15)}...
              {/* Display warning if file is a PDF */}
              {isPdf && (
                <span
                  title="Currently only the text content of PDFs gets processed; images, charts, and other visualizations are not included."
                  style={{display: 'inline-flex', alignItems: 'center'}}
                  className="text-xs text-blue-500"
                >
                  <IconInfoCircle size={20}/>
                  <span style={{marginLeft: '4px'}}>Text Only</span>
                </span>
              )}
            </span>
          )}
        </>
      )}
      <button
        className="absolute top-1 right-1 rounded-full"
        onClick={(event) => removeFilePreview(event, filePreview)}
      >
        <XIcon className="bg-[#212121] rounded w-4 h-4"/>
        <span className="sr-only">Remove</span>
      </button>

      {/* Progress bar */}
      {progress < 100 && <div className="w-full bg-gray-200 rounded-full h-2.5 dark:bg-gray-700 mt-2">
        <div
          className="bg-blue-600 h-2.5 rounded-full"
          style={{width: `${progress}%`}}
        ></div>
      </div>}

    </div>
  );
};

const ChatFileUploadPreviews: FC<ChatFileUploadPreviewsProps> = (
  {
    filePreviews,
    setFilePreviews,
    setSubmitType,
    uploadProgress
  }
) => {
  if (filePreviews.length === 0) {
    return null;
  }

  return (
    <div className="grid grid-cols-4">
      {filePreviews.map((filePreview, index) => (
        <ChatFileUploadPreview
          key={`${filePreview}-${index}`}
          filePreview={filePreview}
          setFilePreviews={setFilePreviews}
          setSubmitType={setSubmitType}
          progress={uploadProgress[filePreview?.split("||name:")?.[filePreview.split("||name:").length - 1] ?? '']}
        />
      ))}
    </div>
  );
};

export default ChatFileUploadPreviews;
