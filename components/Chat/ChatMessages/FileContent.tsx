import { IconDownload } from '@tabler/icons-react';
import React, { FC, useEffect, useState } from 'react';

import { fetchImageBase64FromMessageContent } from '@/lib/services/imageService';

import { FileMessageContent, ImageMessageContent } from '@/types/chat';

import FileIcon from '@/components/Icons/file';
import ImageIcon from '@/components/Icons/image';

/**
 * Component to display image files
 */
const FileImagePreview: FC<{ image: ImageMessageContent }> = ({ image }) => {
  const [imageSrc, setImageSrc] = useState<string | null>(null);
  const [isModalOpen, setIsModalOpen] = useState<boolean>(false);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [loadError, setLoadError] = useState<boolean>(false);

  useEffect(() => {
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
  }, [image]);

  const handleImageClick = () => {
    setIsModalOpen(true);
  };

  const handleCloseModal = () => {
    setIsModalOpen(false);
  };

  return (
    <>
      <div className="relative p-3 m-1 rounded-lg overflow-hidden border border-gray-300 dark:border-gray-700 w-full sm:w-[calc(50%-0.5rem)] bg-white dark:bg-gray-900">
        <div className="flex items-center gap-3">
          <div className="px-2 py-0.5 rounded text-xs font-semibold uppercase bg-purple-500 text-white">
            IMG
          </div>

          {isLoading ? (
            <div className="flex-grow flex items-center">
              <div className="h-12 w-full bg-gray-200 dark:bg-gray-700 animate-shimmer rounded">
                <span className="sr-only">Loading image...</span>
              </div>
            </div>
          ) : loadError ? (
            <div className="relative flex-grow overflow-hidden text-red-500 text-sm">
              <span>Failed to load image</span>
            </div>
          ) : imageSrc ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={imageSrc}
              alt="Image Content"
              className="h-12 w-auto max-w-[calc(100%-80px)] object-cover cursor-pointer rounded"
              onClick={handleImageClick}
              onLoad={() => setIsLoading(false)}
            />
          ) : (
            <div className="relative flex-grow overflow-hidden">
              <span className="block whitespace-nowrap text-sm text-gray-900 dark:text-gray-100">
                {image.image_url.url.split('/').pop()}
              </span>
            </div>
          )}

          <IconDownload className="w-5 h-5 ml-auto flex-shrink-0 text-gray-600 dark:text-gray-400" />
        </div>
      </div>

      {isModalOpen && imageSrc && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/90"
          onClick={handleCloseModal}
        >
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={imageSrc}
            alt="Full size preview"
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
    <div className="flex flex-wrap items-center w-full">
      {/* Render Images */}
      {images.map((image, index) => (
        <FileImagePreview key={`image-${index}`} image={image} />
      ))}

      {/* Render Files */}
      {files.map((file, index) => {
        const filename =
          file.originalFilename || file.url.split('/').pop() || '';
        const extension = filename.split('.').pop()?.toLowerCase() || '';

        // File type badge color
        const getBadgeColor = (ext: string) => {
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

        return (
          <div
            key={`file-${index}`}
            onClick={(event) => downloadFile(event, file.url)}
            className="relative flex flex-col p-3 m-1 rounded-lg border border-gray-300 dark:border-gray-700 cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors w-full sm:w-[calc(50%-0.5rem)] bg-white dark:bg-gray-900"
          >
            <div className="flex items-center justify-between mb-2">
              <div
                className={`px-2 py-0.5 rounded text-xs font-semibold uppercase ${getBadgeColor(extension)}`}
              >
                {extension}
              </div>
              <IconDownload className="w-5 h-5 text-gray-600 dark:text-gray-400" />
            </div>
            <div className="relative overflow-hidden">
              <span className="block text-sm font-medium text-gray-900 dark:text-gray-100 truncate">
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
