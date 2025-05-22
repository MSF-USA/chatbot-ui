import { XIcon } from "@/components/Icons/cancel";
import { Dispatch, FC, SetStateAction, MouseEvent, useState } from "react";
import {ChatInputSubmitTypes, FilePreview} from "@/types/chat";
import FileIcon from "@/components/Icons/file";
import {IconInfoCircle} from "@tabler/icons-react";

interface ChatFileUploadPreviewsProps {
  filePreviews: FilePreview[];
  setFilePreviews: Dispatch<SetStateAction<FilePreview[]>>;
  setSubmitType: Dispatch<SetStateAction<ChatInputSubmitTypes>>;
}

interface ChatFileUploadPreviewProps {
  filePreview: FilePreview;
  setFilePreviews: Dispatch<SetStateAction<FilePreview[]>>;
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
  
  const [isHovered, setIsHovered] = useState(false);
  
  const removeFilePreview = (
    event: MouseEvent<HTMLButtonElement>,
    filePreview: FilePreview
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

  const { name, type, status, previewUrl } = filePreview;
  const isImage = type.startsWith('image/');

  let filename = name;

  // Check if the file is a PDF
  let isPdf = false;
  if (filename) {
    const extension = filename.split('.').pop()?.toLowerCase();
    if (extension === 'pdf') {
      isPdf = true;
    }
  }

  // Determine if the filename is long
  const isLongFilename = filename && filename.length > 16;
  // Apply auto-scrolling animation for long filenames
  const textClassName = isLongFilename ? "animate-scroll-text-auto" : "";

  return (
    <div
      className="relative rounded-md overflow-hidden border border-black dark:border-white bg-white dark:bg-[#2f2f2f] text-black dark:text-white m-1 p-2 group"
      style={{
        width: "calc(50% - 0.5rem)",
        maxWidth: "280px",
        minWidth: "200px",
        height: isImage ? "auto" : "74px", // Fixed height for non-image files
      }}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      onTouchStart={() => setIsHovered(true)}
      onTouchEnd={() => setTimeout(() => setIsHovered(false), 3000)} // Hide after 3 seconds on mobile
    >
      {isImage ? (
        <img
          alt="Preview"
          className="object-cover w-full h-auto max-h-[150px]"
          src={previewUrl}
        />
      ) : (
        <div className="flex items-center h-full pr-8"> {/* Added right padding to avoid text under remove button */}
          <FileIcon className="w-8 h-8 mr-2 flex-shrink-0" />
          {filename && (
            <div className="flex flex-col overflow-hidden max-w-full">
              <div className="relative overflow-hidden w-full">
                <span className={`block whitespace-nowrap ${textClassName}`} style={{ paddingRight: "8px" }}>
                  {filename}
                </span>
              </div>
              
              {/* Display warning if file is a PDF */}
              {isPdf && status === 'completed' && (
                <span
                  title="Currently only the text content of PDFs gets processed; images, charts, and other visualizations are not included."
                  className="flex items-center text-xs text-blue-500 mt-1"
                >
                  <IconInfoCircle size={16} className="flex-shrink-0" />
                  <span className="ml-1 whitespace-nowrap">Text Only</span>
                </span>
              )}
            </div>
          )}
        </div>
      )}
      
      {status !== 'completed' && (
        <div className="absolute bottom-1 left-1 text-xs text-white bg-black bg-opacity-50 px-1 rounded">
          {status}
        </div>
      )}
      
      <button
        className={`absolute top-1 right-1 rounded-full ${isHovered ? 'opacity-100' : 'opacity-0 md:group-hover:opacity-100'} transition-opacity duration-200`}
        onClick={(event) => removeFilePreview(event, filePreview)}
        aria-label="Remove"
      >
        <XIcon className="dark:bg-[#212121] bg-white rounded w-5 h-5"/>
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
    <div className="flex flex-wrap max-w-full overflow-x-auto py-2">
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