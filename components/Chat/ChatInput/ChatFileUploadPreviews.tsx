import { XIcon } from "@/components/Icons/cancel";
import { Dispatch, FC, SetStateAction, MouseEvent } from "react";
import Image from "next/image";
import { ChatInputSubmitTypes } from "@/types/chat";
import FileIcon from "@/components/Icons/file";

interface ChatFileUploadPreviewsProps {
  filePreviews: string[];
  setFilePreviews: Dispatch<SetStateAction<string[]>>;
  setSubmitType: Dispatch<SetStateAction<ChatInputSubmitTypes>>;
}

interface ChatFileUploadPreviewProps {
  filePreview: string;
  setFilePreviews: Dispatch<SetStateAction<string[]>>;
  setSubmitType: Dispatch<SetStateAction<ChatInputSubmitTypes>>;
}


const ChatFileUploadPreview: FC<ChatFileUploadPreviewProps> = ({
                                                                 filePreview,
                                                                 setFilePreviews,
                                                                 setSubmitType,
                                                               }) => {
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
          <FileIcon className="object-cover" />
          {filename && (
            <span>
                            {filename.slice(0, 16)}...
              {/* Display warning if file is a PDF */}
              {isPdf && (
                <>
                <br/>
                <span
                  title="Currently only the text content of PDFs gets processed; images, charts, and other visualizations are not included."
                  style={{ marginLeft: '4px' }}
                  className={'text-xs'}
                >
                                    ⚠️ Text Only
                                </span>
                </>
              )}
                        </span>
          )}
        </>
      )}
      <button
        className="absolute top-1 right-1 rounded-full"
        onClick={(event) => removeFilePreview(event, filePreview)}
      >
        <XIcon className="bg-[#212121] rounded w-4 h-4" />
        <span className="sr-only">Remove</span>
      </button>
    </div>
  );
};

const ChatFileUploadPreviews: FC<ChatFileUploadPreviewsProps> = ({
                                                                   filePreviews,
                                                                   setFilePreviews,
                                                                   setSubmitType,
                                                                 }) => {
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
        />
      ))}
    </div>
  );
};

export default ChatFileUploadPreviews;
