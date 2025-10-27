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
      <div className="relative p-1 m-1 rounded-lg overflow-hidden border border-black dark:border-white w-full sm:w-[calc(50%-0.5rem)]">
        <div className="flex items-center">
          <ImageIcon className="w-8 h-8 mr-2 flex-shrink-0" />

          {isLoading ? (
            <div className="flex-grow flex items-center">
              <div className="h-12 w-full bg-gray-200 dark:bg-gray-700 animate-pulse rounded">
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
              className="h-12 w-auto max-w-[calc(100%-40px)] object-cover cursor-pointer"
              onClick={handleImageClick}
              onLoad={() => setIsLoading(false)}
            />
          ) : (
            <div className="relative flex-grow overflow-hidden">
              <span className="block whitespace-nowrap hover:animate-scroll-text">
                {image.image_url.url.split('/').pop()}
              </span>
            </div>
          )}

          <IconDownload className="w-6 h-6 ml-auto flex-shrink-0" />
        </div>
      </div>

      {isModalOpen && imageSrc && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-75"
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
      {files.map((file, index) => (
        <div
          key={`file-${index}`}
          onClick={(event) => downloadFile(event, file.url)}
          className="relative flex items-center justify-between p-3 m-1 rounded-lg border border-black dark:border-white cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors w-full sm:w-[calc(50%-0.5rem)]"
        >
          <FileIcon className="w-8 h-8 mr-2 flex-shrink-0" />
          <div className="relative flex-grow overflow-hidden">
            <span className="block whitespace-nowrap hover:animate-scroll-text">
              {file.originalFilename || file.url.split('/').pop()}
            </span>
          </div>
          <IconDownload className="w-6 h-6 ml-auto flex-shrink-0" />
        </div>
      ))}
    </div>
  );
};

export default FileContent;
