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

      setFileFieldValue((prevValue) => {
        if (prevValue && Array.isArray(prevValue)) {
          setSubmitType('multi-file');
          return [...prevValue, imageMessage];
        } else if (prevValue) {
          setSubmitType('multi-file');
          return [prevValue, imageMessage];
        } else {
          setSubmitType('image');
          return [imageMessage];
        }
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

        setSubmitType(newFileArray.length > 1 ? 'multi-file' : 'file');
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
