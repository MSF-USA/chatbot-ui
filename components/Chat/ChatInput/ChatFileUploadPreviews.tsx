import { IconInfoCircle, IconX } from '@tabler/icons-react';
import React, {
  Dispatch,
  FC,
  MouseEvent,
  SetStateAction,
  useState,
} from 'react';

import { ChatInputSubmitTypes, FilePreview } from '@/types/chat';

import { XIcon } from '@/components/Icons/cancel';
import FileIcon from '@/components/Icons/file';

/**
 * Lightbox modal for full-screen image viewing
 */
interface LightboxProps {
  imageUrl: string;
  onClose: () => void;
}

const Lightbox: FC<LightboxProps> = ({ imageUrl, onClose }) => {
  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/90"
      onClick={onClose}
    >
      <button
        className="absolute top-4 right-4 text-white hover:text-gray-300 transition-colors"
        onClick={onClose}
        aria-label="Close"
      >
        <IconX size={32} />
      </button>
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={imageUrl}
        alt="Full size preview"
        className="max-w-[90vw] max-h-[90vh] object-contain"
        onClick={(e) => e.stopPropagation()}
      />
    </div>
  );
};

interface ChatFileUploadPreviewsProps {
  filePreviews: FilePreview[];
  setFilePreviews: Dispatch<SetStateAction<FilePreview[]>>;
  setSubmitType: Dispatch<SetStateAction<ChatInputSubmitTypes>>;
  uploadProgress?: { [key: string]: number };
}

interface ChatFileUploadPreviewProps {
  filePreview: FilePreview;
  setFilePreviews: Dispatch<SetStateAction<FilePreview[]>>;
  setSubmitType: Dispatch<SetStateAction<ChatInputSubmitTypes>>;
  progress?: number;
}

const ChatFileUploadPreview: FC<ChatFileUploadPreviewProps> = ({
  filePreview,
  setFilePreviews,
  setSubmitType,
  progress,
}) => {
  if (!filePreview) {
    throw new Error('Empty filePreview found');
  }

  const [isHovered, setIsHovered] = useState(false);
  const [lightboxImage, setLightboxImage] = useState<string | null>(null);

  const removeFilePreview = (
    event: MouseEvent<HTMLButtonElement>,
    filePreview: FilePreview,
  ) => {
    event.preventDefault();
    setFilePreviews((prevPreviews) => {
      const newPreviews = prevPreviews.filter(
        (prevPreview) => prevPreview !== filePreview,
      );
      if (newPreviews.length === 0) setSubmitType('text');
      return newPreviews;
    });
  };

  const openLightbox = (imageUrl: string) => {
    setLightboxImage(imageUrl);
  };

  const { name, type, status, previewUrl } = filePreview;
  const isImage = type.startsWith('image/');
  const isAudio = type.startsWith('audio/');
  const isVideo = type.startsWith('video/');
  const showProgress = status === 'uploading' && progress !== undefined;

  let filename = name;

  // Get file extension and type info
  const extension = filename?.split('.').pop()?.toLowerCase() || '';
  const isPdf = extension === 'pdf';

  // File type styling - just for the badge color
  const getFileTypeColor = (ext: string, fileType: string) => {
    if (fileType.startsWith('audio/')) return 'bg-purple-500 text-white';
    if (fileType.startsWith('video/')) return 'bg-pink-500 text-white';
    switch (ext) {
      case 'pdf':
        return 'bg-red-500 text-white';
      case 'doc':
      case 'docx':
        return 'bg-blue-500 text-white';
      case 'xls':
      case 'xlsx':
        return 'bg-green-500 text-white';
      case 'ppt':
      case 'pptx':
        return 'bg-orange-500 text-white';
      case 'txt':
      case 'md':
        return 'bg-gray-500 text-white';
      default:
        return 'bg-gray-500 text-white';
    }
  };

  const badgeColor = getFileTypeColor(extension, type);
  const badgeText = isAudio ? '🎵' : isVideo ? '🎬' : extension.toUpperCase();

  // Determine if the filename is long
  const isLongFilename = filename && filename.length > 16;
  // Apply auto-scrolling animation for long filenames
  const textClassName = isLongFilename ? 'animate-scroll-text-auto' : '';

  return (
    <>
      {/* Render lightbox if image is selected */}
      {lightboxImage && (
        <Lightbox
          imageUrl={lightboxImage}
          onClose={() => setLightboxImage(null)}
        />
      )}

      <div
        className="relative rounded-lg overflow-hidden bg-gradient-to-br from-gray-100 to-gray-200 dark:from-gray-800 dark:to-gray-900 group"
        style={{
          width: 'calc(50% - 0.25rem)',
          maxWidth: '280px',
          minWidth: '200px',
          height: isImage ? '150px' : 'auto',
        }}
        onMouseEnter={() => setIsHovered(true)}
        onMouseLeave={() => setIsHovered(false)}
        onTouchStart={() => setIsHovered(true)}
        onTouchEnd={() => setTimeout(() => setIsHovered(false), 3000)}
      >
        {isImage ? (
          <div className="relative w-full h-full">
            {previewUrl ? (
              <>
                <div
                  className="w-full h-full cursor-pointer hover:opacity-90 transition-opacity"
                  style={{
                    backgroundImage: `url(${previewUrl})`,
                    backgroundSize: 'cover',
                    backgroundPosition: 'center',
                  }}
                  onClick={() => openLightbox(previewUrl)}
                />
                {/* Shimmer overlay during upload */}
                {status === 'uploading' && (
                  <div className="absolute inset-0 pointer-events-none">
                    <div
                      className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent animate-shimmer"
                      style={{
                        backgroundSize: '200% 100%',
                      }}
                    />
                    <div className="absolute inset-0 bg-black/20" />
                  </div>
                )}
              </>
            ) : (
              <div className="w-full h-full relative overflow-hidden bg-gray-200 dark:bg-gray-700">
                {/* Skeleton shimmer for loading preview */}
                <div
                  className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 dark:via-white/10 to-transparent animate-shimmer"
                  style={{
                    backgroundSize: '200% 100%',
                  }}
                />
                <span className="sr-only">Loading preview...</span>
              </div>
            )}
          </div>
        ) : (
          <div className="flex flex-col p-2.5 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg">
            <div className="flex items-center gap-2 mb-1.5">
              <div
                className={`px-1.5 py-0.5 rounded text-xs font-semibold ${badgeColor}`}
              >
                {badgeText}
              </div>
              {status === 'uploading' && progress !== undefined && (
                <div className="text-xs font-medium text-gray-600 dark:text-gray-400">
                  {Math.round(progress)}%
                </div>
              )}
            </div>
            <div className="min-w-0">
              <div className="text-sm font-medium truncate text-gray-900 dark:text-gray-100">
                {filename}
              </div>
              {isPdf && status === 'completed' && (
                <div className="flex items-center gap-1 text-xs mt-0.5 text-gray-600 dark:text-gray-400">
                  <IconInfoCircle size={12} />
                  <span>Text extraction only</span>
                </div>
              )}
              {(isAudio || isVideo) && status === 'completed' && (
                <div className="flex items-center gap-1 text-xs mt-0.5 text-purple-600 dark:text-purple-400">
                  <IconInfoCircle size={12} />
                  <span>Will be transcribed</span>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Remove button */}
        <button
          className={`absolute top-2 right-2 rounded-full bg-white dark:bg-gray-800 shadow-lg ${
            isHovered ? 'opacity-100' : 'opacity-0 md:group-hover:opacity-100'
          } transition-opacity duration-200 hover:scale-110`}
          onClick={(event) => removeFilePreview(event, filePreview)}
          aria-label="Remove"
        >
          <XIcon className="w-5 h-5 text-gray-700 dark:text-gray-300" />
          <span className="sr-only">Remove</span>
        </button>

        {/* Status indicator */}
        {status === 'failed' && (
          <div className="absolute inset-0 bg-red-500/10 backdrop-blur-sm flex items-center justify-center">
            <span className="text-red-600 dark:text-red-400 text-sm font-medium">
              Failed to upload
            </span>
          </div>
        )}
      </div>
    </>
  );
};

const ChatFileUploadPreviews: FC<ChatFileUploadPreviewsProps> = ({
  filePreviews,
  setFilePreviews,
  setSubmitType,
  uploadProgress,
}) => {
  if (filePreviews.length === 0) {
    return null;
  }

  return (
    <div className="px-4 pt-2 bg-white dark:bg-[#212121]">
      <div className="mb-1.5">
        <span className="text-xs text-gray-500 dark:text-gray-400">
          {filePreviews.length}{' '}
          {filePreviews.length === 1 ? 'attachment' : 'attachments'}
        </span>
      </div>
      <div className="flex flex-wrap gap-2 mb-2">
        {filePreviews.map((filePreview, index) => (
          <ChatFileUploadPreview
            key={`${filePreview}-${index}`}
            filePreview={filePreview}
            setFilePreviews={setFilePreviews}
            setSubmitType={setSubmitType}
            progress={uploadProgress?.[filePreview.name]}
          />
        ))}
      </div>
    </div>
  );
};

export default ChatFileUploadPreviews;
