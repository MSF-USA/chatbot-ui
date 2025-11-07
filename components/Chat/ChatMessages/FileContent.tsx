import { IconDownload } from '@tabler/icons-react';
import React, { FC, useEffect, useState } from 'react';

import { useTranslations } from 'next-intl';

import { fetchImageBase64FromMessageContent } from '@/lib/services/imageService';

import { FileMessageContent, ImageMessageContent } from '@/types/chat';

import FileIcon from '@/components/Icons/file';
import ImageIcon from '@/components/Icons/image';

/**
 * Component to display image files
 */
const FileImagePreview: FC<{ image: ImageMessageContent }> = ({ image }) => {
  const t = useTranslations();
  const [imageSrc, setImageSrc] = useState<string | null>(null);
  const [isModalOpen, setIsModalOpen] = useState<boolean>(false);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [loadError, setLoadError] = useState<boolean>(false);

  useEffect(() => {
    setTimeout(() => {
      setIsLoading(true);
      setLoadError(false);

      fetchImageBase64FromMessageContent(image)
        .then((imageBase64String) => {
          if (imageBase64String.length > 0) {
            setImageSrc(imageBase64String);
          } else {
            setLoadError(true);
          }
        })
        .catch(() => {
          setLoadError(true);
        })
        .finally(() => {
          setIsLoading(false);
        });
    }, 0);
  }, [image]);

  const handleImageClick = () => {
    setIsModalOpen(true);
  };

  const handleCloseModal = () => {
    setIsModalOpen(false);
  };

  return (
    <>
      <div
        className="relative rounded-lg overflow-hidden border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-900 hover:shadow-lg transition-shadow cursor-pointer group"
        style={{
          width: 'calc(50% - 0.25rem)',
          maxWidth: '280px',
          minWidth: '200px',
          height: '150px',
        }}
        onClick={imageSrc ? handleImageClick : undefined}
      >
        {isLoading ? (
          <div className="w-full h-full bg-gray-200 dark:bg-gray-700 animate-shimmer">
            <span className="sr-only">Loading image...</span>
          </div>
        ) : loadError ? (
          <div className="flex items-center justify-center w-full h-full text-red-500 text-sm p-3">
            <span>Failed to load image</span>
          </div>
        ) : imageSrc ? (
          <>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={imageSrc}
              alt={t('chat.imageContent')}
              className="w-full h-full object-cover"
              onLoad={() => setIsLoading(false)}
            />
            {/* Overlay with badge and download icon */}
            <div className="absolute inset-0 bg-gradient-to-b from-black/30 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity">
              <div className="absolute top-2 left-2 px-2 py-0.5 rounded text-xs font-bold bg-purple-500 text-white">
                IMG
              </div>
              <div className="absolute top-2 right-2 p-1.5 rounded-full bg-white/90 dark:bg-gray-800/90">
                <IconDownload className="w-4 h-4 text-gray-700 dark:text-gray-300" />
              </div>
            </div>
          </>
        ) : (
          <div className="flex items-center justify-center w-full h-full p-3">
            <span className="text-sm text-gray-900 dark:text-gray-100 text-center break-words">
              {image.image_url.url.split('/').pop()}
            </span>
          </div>
        )}
      </div>

      {isModalOpen && imageSrc && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/90"
          onClick={handleCloseModal}
        >
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={imageSrc}
            alt={t('chat.fullSizePreview')}
            className="max-w-[90vw] max-h-[90vh] object-contain"
            onClick={(e) => e.stopPropagation()}
          />
        </div>
      )}
    </>
  );
};

/**
 * Props for FileContent component
 */
interface FileContentProps {
  files: FileMessageContent[];
  images: ImageMessageContent[];
}

/**
 * FileContent Component
 *
 * Renders file attachments with download functionality and image previews.
 */
export const FileContent: FC<FileContentProps> = ({ files, images }) => {
  const downloadFile = (event: React.MouseEvent, fileUrl: string) => {
    event.preventDefault();
    if (fileUrl) {
      const filename = fileUrl.split('/').pop();
      const downloadUrl = `/api/file/${filename}`;
      window.open(downloadUrl, '_blank');
    }
  };

  return (
    <div className="flex flex-wrap gap-2 w-full py-2">
      {/* Render Images */}
      {images.map((image, index) => (
        <FileImagePreview key={`image-${index}`} image={image} />
      ))}

      {/* Render Files */}
      {files.map((file, index) => {
        const filename =
          file.originalFilename || file.url.split('/').pop() || '';
        const extension = filename.split('.').pop()?.toLowerCase() || '';

        // Check if this is an audio or video file
        const isAudioVideo = [
          'mp3',
          'mp4',
          'mpeg',
          'mpga',
          'm4a',
          'wav',
          'webm',
        ].includes(extension);

        // File type badge color
        const getBadgeColor = (ext: string) => {
          // Audio/video files
          if (isAudioVideo) return 'bg-purple-500 text-white';

          switch (ext) {
            // Documents
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

            // Text
            case 'txt':
            case 'md':
              return 'bg-gray-500 text-white';

            // Data
            case 'csv':
              return 'bg-emerald-500 text-white';
            case 'json':
              return 'bg-yellow-500 text-white';
            case 'xml':
              return 'bg-amber-600 text-white';
            case 'yaml':
            case 'yml':
              return 'bg-violet-500 text-white';

            // Code - Programming Languages
            case 'py':
              return 'bg-blue-600 text-white';
            case 'js':
            case 'jsx':
              return 'bg-yellow-400 text-black';
            case 'ts':
            case 'tsx':
              return 'bg-blue-500 text-white';
            case 'java':
              return 'bg-red-600 text-white';
            case 'c':
            case 'cpp':
            case 'cs':
              return 'bg-purple-600 text-white';
            case 'go':
              return 'bg-cyan-500 text-white';
            case 'rb':
              return 'bg-red-500 text-white';
            case 'php':
              return 'bg-indigo-500 text-white';
            case 'swift':
              return 'bg-orange-600 text-white';
            case 'kt':
              return 'bg-purple-500 text-white';
            case 'rs':
              return 'bg-orange-700 text-white';
            case 'scala':
              return 'bg-red-700 text-white';

            // Scripts & Config
            case 'sql':
              return 'bg-blue-700 text-white';
            case 'sh':
            case 'bash':
              return 'bg-gray-700 text-white';
            case 'ps1':
              return 'bg-blue-800 text-white';
            case 'r':
              return 'bg-blue-400 text-white';
            case 'env':
            case 'config':
            case 'ini':
            case 'toml':
              return 'bg-slate-600 text-white';

            default:
              return 'bg-gray-500 text-white';
          }
        };

        // Determine if filename is long
        const isLongFilename = filename.length > 30;

        return (
          <div
            key={`file-${index}`}
            onClick={(event) => downloadFile(event, file.url)}
            className="relative flex flex-col p-3 rounded-lg border border-gray-300 dark:border-gray-700 cursor-pointer hover:shadow-lg hover:border-gray-400 dark:hover:border-gray-600 transition-all bg-white dark:bg-gray-900 group"
            style={{
              width: 'calc(50% - 0.25rem)',
              maxWidth: '280px',
              minWidth: '200px',
              minHeight: isLongFilename ? '90px' : '75px',
            }}
          >
            <div className="flex items-center justify-between gap-2 mb-2">
              <div
                className={`px-2 py-1 rounded text-xs font-bold ${getBadgeColor(extension)} flex-shrink-0`}
              >
                {extension.toUpperCase()}
              </div>
              <div className="p-1 rounded group-hover:bg-gray-100 dark:group-hover:bg-gray-800 transition-colors">
                <IconDownload className="w-4 h-4 text-gray-600 dark:text-gray-400" />
              </div>
            </div>
            <div className="min-w-0 flex-1">
              <span
                className="block text-sm font-medium text-gray-900 dark:text-gray-100 break-words line-clamp-2"
                title={filename}
              >
                {filename}
              </span>
            </div>
          </div>
        );
      })}
    </div>
  );
};

export default FileContent;
