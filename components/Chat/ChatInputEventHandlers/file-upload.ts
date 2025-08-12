import React, { ChangeEvent, Dispatch, SetStateAction } from 'react';
import toast from 'react-hot-toast';

import {
  ChatInputSubmitTypes,
  FileMessageContent,
  FilePreview,
  ImageMessageContent,
} from '@/types/chat';

import { isChangeEvent } from '@/components/Chat/ChatInputEventHandlers/common';
import { onImageUpload } from '@/components/Chat/ChatInputEventHandlers/image-upload';

const disallowedExtensions: string[] = [
  '.exe',
  '.dll',
  '.cmd',
  '.msi',
  '.zip',
  '.rar',
  '.7z',
  '.tar',
  '.gz',
  '.iso',
];

const disallowedMimeTypes: string[] = [
  'application/x-msdownload',
  'application/x-executable',
  'application/x-dosexec',
  'application/x-msdos-program',
  'application/x-msi',
  'application/zip',
  'application/x-rar-compressed',
  'application/x-7z-compressed',
  'application/x-tar',
  'application/gzip',
  'application/x-iso9660-image',
  'application/octet-stream',
];

function isFileAllowed(file: File): boolean {
  const extension =
    '.' + file.name.split('.')[file.name.split('.').length - 1].toLowerCase();
  return (
    !disallowedExtensions.includes(extension) &&
    !disallowedMimeTypes.includes(file.type)
  );
}

const unsupportedExtensions: string[] = [
  '.mp3',
  '.wav',
  '.ogg',
  '.flac',
  '.m4a',
  '.aac',
  '.mp4',
  '.avi',
  '.mov',
  '.wmv',
  '.flv',
  '.mkv',
  '.webm',
];

function isFileSupported(file: File): boolean {
  const extension = '.' + file.name.split('.').pop()?.toLowerCase();
  return (
    !(file.type.startsWith('audio/') || file.type.startsWith('video/')) &&
    !unsupportedExtensions.includes(extension)
  );
}

export async function onFileUpload(
  event: React.ChangeEvent<any> | FileList | File[],
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
) {
  let files: FileList | File[];
  if (isChangeEvent(event)) {
    (event as React.ChangeEvent<any>).preventDefault();
    files = (event as React.ChangeEvent<any>).target.files;
  } else {
    files = event as FileList | File[];
  }

  if (files.length === 0) {
    toast.error('No files selected.');
    return;
  }

  if (files.length > 5) {
    toast.error('You can upload a maximum of 5 files at a time.');
    return;
  }

  // Initialize all file previews at once before processing
  const allFilePreviews: FilePreview[] = Array.from(files).map((file) => ({
    name: file.name,
    type: file.type,
    status: 'pending',
    previewUrl: file.type.startsWith('image/') ? URL.createObjectURL(file) : '',
  }));

  // Set all previews at once
  setFilePreviews((prevState) => [...prevState, ...allFilePreviews]);

  const fileFieldValues: FileMessageContent[] = [];
  const imageFieldValues: ImageMessageContent[] = [];

  const uploadPromises = Array.from(files).map(async (file) => {
    if (!isFileAllowed(file)) {
      toast.error(`Invalid file type provided: ${file.name}`);
      return;
    }

    if (!isFileSupported(file)) {
      toast.error(`This file type is currently unsupported: ${file.name}`);
      return;
    }

    if (file.size > 10485760) {
      toast.error(`File ${file.name} must be less than 10MB.`);
      return;
    }

    const isImage = file.type.startsWith('image/');

    if (isImage) {
      // Handle image upload
      return new Promise<void>((resolve, reject) => {
        onImageUpload(
          file,
          '',
          setFilePreviews,
          setSubmitType,
          // @ts-ignore
          setFileFieldValue,
        );
        resolve();
      });
    } else {
      // Handle non-image file upload
      return new Promise<void>((resolve, reject) => {
        // Implement the upload logic here
        // For simplicity, let's assume uploading the file to your server
        const chunkSize = 1024 * 1024 * 5; // 5MB chunks
        let uploadedBytes = 0;

        setFilePreviews((prevPreviews) =>
          prevPreviews.map((preview) =>
            preview.name === file.name
              ? { ...preview, status: 'uploading' }
              : preview,
          ),
        );

        const uploadChunk = () => {
          const chunk = file.slice(uploadedBytes, uploadedBytes + chunkSize);

          const reader = new FileReader();
          reader.onloadend = async () => {
            const base64Chunk = btoa(reader.result as string);
            const encodedFileName = encodeURIComponent(file.name);
            const encodedMimeType = encodeURIComponent(file.type);

            try {
              const response = await fetch(
                `/api/v2/file/upload?filename=${encodedFileName}&filetype=file&mime=${encodedMimeType}`,
                {
                  method: 'POST',
                  body: base64Chunk,
                  headers: {
                    'x-file-name': encodedFileName,
                  },
                },
              );

              if (response.ok) {
                uploadedBytes += chunkSize;
                const progress = Math.min(
                  (uploadedBytes / file.size) * 100,
                  100,
                );
                setUploadProgress((prev) => ({
                  ...prev,
                  [file.name]: progress,
                }));

                if (uploadedBytes < file.size) {
                  uploadChunk();
                } else {
                  const resp = await response.json();

                  const newValue: FileMessageContent = {
                    type: 'file_url',
                    url: resp.uri ?? resp.filename,
                    originalFilename: file.name,
                  };

                  setFileFieldValue((prevValue) => {
                    let newFileArray: FileMessageContent[];
                    if (prevValue && Array.isArray(prevValue)) {
                      newFileArray = [
                        ...(
                          prevValue as (
                            | FileMessageContent
                            | ImageMessageContent
                          )[]
                        ).filter(
                          (item): item is FileMessageContent =>
                            (item as FileMessageContent).type === 'file_url',
                        ),
                        newValue,
                      ];
                    } else if (
                      prevValue &&
                      (prevValue as FileMessageContent).type === 'file_url'
                    ) {
                      newFileArray = [
                        prevValue as FileMessageContent,
                        newValue,
                      ];
                    } else {
                      newFileArray = [newValue];
                    }

                    setSubmitType(
                      newFileArray.length > 1 ? 'multi-file' : 'file',
                    );
                    return newFileArray;
                  });

                  setFilePreviews((prevPreviews) =>
                    prevPreviews.map((preview) =>
                      preview.name === file.name
                        ? { ...preview, status: 'completed' }
                        : preview,
                    ),
                  );

                  resolve();
                }
              } else {
                toast.error(`File upload failed: ${file.name}`);
                setFilePreviews((prevPreviews) =>
                  prevPreviews.map((preview) =>
                    preview.name === file.name
                      ? { ...preview, status: 'failed' }
                      : preview,
                  ),
                );

                reject();
              }
            } catch (error) {
              toast.error(`File upload failed: ${file.name}`);
              setFilePreviews((prevPreviews) =>
                prevPreviews.map((preview) =>
                  preview.name === file.name
                    ? { ...preview, status: 'failed' }
                    : preview,
                ),
              );

              reject();
            }
          };
          reader.readAsBinaryString(chunk);
        };

        uploadChunk();
      });
    }
  });

  // Wait for all uploads to complete
  await Promise.all(uploadPromises);

  toast.success('Files uploaded successfully');

  // Reset the file input value to allow re-upload of the same files if needed
  if (isChangeEvent(event)) {
    (event as React.ChangeEvent<any>).target.value = '';
  }
}
