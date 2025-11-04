import React, { ChangeEvent, Dispatch, SetStateAction } from 'react';
import toast from 'react-hot-toast';

import { FileUploadService } from '@/client/services/fileUploadService';

import {
  ChatInputSubmitTypes,
  FileFieldValue,
  FileMessageContent,
  FilePreview,
  ImageMessageContent,
} from '@/types/chat';

import { isChangeEvent } from '@/client/handlers/chatInput/common';

export async function onFileUpload(
  event: React.ChangeEvent<any> | FileList | File[],
  setSubmitType: Dispatch<SetStateAction<ChatInputSubmitTypes>>,
  setFilePreviews: Dispatch<SetStateAction<FilePreview[]>>,
  setFileFieldValue: Dispatch<SetStateAction<FileFieldValue>>,
  setImageFieldValue: Dispatch<SetStateAction<FileFieldValue>>,
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

  const filesArray = Array.from(files);

  // Reject audio/video files (they should use the transcription button)
  const audioVideoExtensions = [
    '.mp3',
    '.mp4',
    '.mpeg',
    '.mpga',
    '.m4a',
    '.wav',
    '.webm',
  ];
  const hasAudioVideo = filesArray.some((file) => {
    const ext = '.' + file.name.split('.').pop()?.toLowerCase();
    return (
      audioVideoExtensions.includes(ext) ||
      file.type.startsWith('audio/') ||
      file.type.startsWith('video/')
    );
  });

  if (hasAudioVideo) {
    toast.error(
      'Audio/video files cannot be attached. Use the "Transcribe Audio/Video" button in the dropdown menu instead.',
    );
    return;
  }

  // Initialize all file previews at once before processing
  const allFilePreviews: FilePreview[] = filesArray.map((file) => ({
    name: file.name,
    type: file.type,
    status: 'uploading',
    previewUrl: file.type.startsWith('image/') ? URL.createObjectURL(file) : '',
  }));

  setFilePreviews((prevState) => [...prevState, ...allFilePreviews]);

  // Upload files using FileUploadService
  const results = await FileUploadService.uploadMultipleFiles(
    filesArray,
    (progressMap) => {
      setUploadProgress(progressMap);
    },
  );

  // Process successful uploads and update state
  results.forEach((result) => {
    if (result.type === 'image') {
      const imageMessage: ImageMessageContent = {
        type: 'image_url',
        image_url: {
          url: result.url,
          detail: 'auto',
        },
      };

      // Images go to imageFieldValue
      setImageFieldValue((prevValue) => {
        if (prevValue && Array.isArray(prevValue)) {
          return [...prevValue, imageMessage];
        } else if (prevValue) {
          return [prevValue, imageMessage];
        } else {
          return imageMessage;
        }
      });

      // Update submit type based on whether we have files too
      setSubmitType((prevType) => {
        // If we already have files, use multi-file
        if (prevType === 'file' || prevType === 'multi-file') {
          return 'multi-file';
        }
        return 'image';
      });
    } else {
      const fileMessage: FileMessageContent = {
        type: 'file_url',
        url: result.url,
        originalFilename: result.originalFilename,
      };

      setFileFieldValue((prevValue) => {
        let newFileArray: (FileMessageContent | ImageMessageContent)[];
        if (prevValue && Array.isArray(prevValue)) {
          newFileArray = [...prevValue, fileMessage];
        } else if (prevValue) {
          newFileArray = [prevValue, fileMessage];
        } else {
          newFileArray = [fileMessage];
        }

        // Update submit type based on whether we have images too
        setSubmitType((prevType) => {
          // If we already have images, use multi-file
          if (prevType === 'image') {
            return 'multi-file';
          }
          return newFileArray.length > 1 ? 'multi-file' : 'file';
        });

        return newFileArray;
      });
    }

    // Update preview status to completed
    setFilePreviews((prevPreviews) =>
      prevPreviews.map((preview) =>
        preview.name === result.originalFilename
          ? { ...preview, status: 'completed' }
          : preview,
      ),
    );
  });

  // Reset the file input value to allow re-upload of the same files if needed
  if (isChangeEvent(event)) {
    (event as React.ChangeEvent<any>).target.value = '';
  }
}
