import React, { Dispatch, MutableRefObject, SetStateAction } from 'react';
import toast from 'react-hot-toast';

import { cacheImageBase64 } from '@/lib/services/imageService';

import {
  ChatInputSubmitTypes,
  FileFieldValue,
  FileMessageContent,
  FilePreview,
  ImageMessageContent,
} from '@/types/chat';

import { isChangeEvent } from '@/components/Chat/ChatInputEventHandlers/common';

export const onImageUpload = async (
  event: React.ChangeEvent<any> | Event | File,
  prompt: any,
  setFilePreviews: Dispatch<SetStateAction<FilePreview[]>>,
  setSubmitType: Dispatch<SetStateAction<ChatInputSubmitTypes>>,
  setFileFieldValue: Dispatch<SetStateAction<FileFieldValue>>,
  setUploadProgress?: Dispatch<SetStateAction<{ [key: string]: number }>>,
) => {
  let file: File;
  if (isChangeEvent(event)) {
    (event as React.ChangeEvent<any>).preventDefault();
    file = (event as React.ChangeEvent<any>).target.files[0];
  } else {
    file = event as File;
  }

  if (!file) {
    setSubmitType('text');
    return;
  }

  if (file.size > 5242480) {
    toast.error('Image upload must be <5mb');
    return;
  }

  try {
    // Status is already set to 'uploading' when preview is created
    const base64String = await readFileAsDataURL(file);
    const data = await uploadImage(file.name, base64String, (progress) => {
      if (setUploadProgress) {
        setUploadProgress((prev) => ({
          ...prev,
          [file.name]: progress,
        }));
      }
    });

    // Cache the base64 data so we don't need to fetch it from server again
    cacheImageBase64(data.uri, base64String);

    const imageMessage: ImageMessageContent = {
      type: 'image_url',
      image_url: {
        url: data.uri,
        detail: 'auto',
      },
    };

    setFileFieldValue((prevValue) => {
      if (prevValue && Array.isArray(prevValue)) {
        setSubmitType('multi-file');
        return [...prevValue, imageMessage] as (
          | FileMessageContent
          | ImageMessageContent
        )[];
      } else if (prevValue) {
        setSubmitType('multi-file');
        return [prevValue, imageMessage] as (
          | FileMessageContent
          | ImageMessageContent
        )[];
      } else {
        setSubmitType('image');
        return [imageMessage];
      }
    });

    // Update status to completed
    setFilePreviews((prevFilePreviews) =>
      prevFilePreviews.map((preview) =>
        preview.name === file.name
          ? { ...preview, previewUrl: base64String, status: 'completed' }
          : preview,
      ),
    );
  } catch (error) {
    console.error('Image upload failed:', error);
    toast.error(`Failed to upload image: ${file.name}`);

    // Update status to failed
    setFilePreviews((prevFilePreviews) =>
      prevFilePreviews.map((preview) =>
        preview.name === file.name ? { ...preview, status: 'failed' } : preview,
      ),
    );
  }
};

const readFileAsDataURL = (file: File): Promise<string> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = (error) => reject(error);
    reader.readAsDataURL(file);
  });
};

const uploadImage = async (
  filename: string,
  base64String: string,
  onProgress?: (progress: number) => void,
): Promise<{ uri: string }> => {
  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest();

    // Track upload progress
    xhr.upload.addEventListener('progress', (event) => {
      if (event.lengthComputable && onProgress) {
        const progress = (event.loaded / event.total) * 100;
        onProgress(progress);
      }
    });

    // Handle completion
    xhr.addEventListener('load', () => {
      if (xhr.status >= 200 && xhr.status < 300) {
        try {
          const data = JSON.parse(xhr.responseText);
          resolve(data);
        } catch (error) {
          reject(new Error('Failed to parse response'));
        }
      } else {
        try {
          const error = JSON.parse(xhr.responseText);
          reject(
            new Error(error.error || `Upload failed with status ${xhr.status}`),
          );
        } catch {
          reject(new Error(`Upload failed with status ${xhr.status}`));
        }
      }
    });

    // Handle errors
    xhr.addEventListener('error', () => {
      reject(new Error('Network error occurred'));
    });

    xhr.addEventListener('abort', () => {
      reject(new Error('Upload aborted'));
    });

    // Open connection and send data
    xhr.open(
      'POST',
      `/api/file/upload?filename=${encodeURI(filename)}&filetype=image`,
    );
    xhr.send(base64String);
  });
};

export function onImageUploadButtonClick(
  event: React.ChangeEvent<any>,
  fileInputRef: MutableRefObject<any>,
) {
  event.preventDefault();
  fileInputRef.current.click();
}
