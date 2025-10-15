import React, { Dispatch, MutableRefObject, SetStateAction } from 'react';
import toast from 'react-hot-toast';

import {
  ChatInputSubmitTypes,
  FileMessageContent,
  FilePreview,
  ImageMessageContent,
  FileFieldValue,
} from '@/types/chat';

import { isChangeEvent } from '@/components/Chat/ChatInputEventHandlers/common';

export const onImageUpload = async (
  event: React.ChangeEvent<any> | Event | File,
  prompt: any,
  setFilePreviews: Dispatch<SetStateAction<FilePreview[]>>,
  setSubmitType: Dispatch<SetStateAction<ChatInputSubmitTypes>>,
  setFileFieldValue: Dispatch<SetStateAction<FileFieldValue>>,
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

  const base64String = await readFileAsDataURL(file);
  const data = await uploadImage(file.name, base64String);

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
      return [...prevValue, imageMessage] as (FileMessageContent | ImageMessageContent)[];
    } else if (prevValue) {
      setSubmitType('multi-file');
      return [prevValue, imageMessage] as (FileMessageContent | ImageMessageContent)[];
    } else {
      setSubmitType('image');
      return [imageMessage];
    }
  });
  setFilePreviews((prevFilePreviews) =>
    prevFilePreviews.map((preview) =>
      preview.name === file.name
        ? { ...preview, previewUrl: base64String, status: 'completed' }
        : preview,
    ),
  );
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
): Promise<{ uri: string }> => {
  const response = await fetch(
    `/api/v2/file/upload?filename=${encodeURI(filename)}&filetype=image`,
    {
      method: 'POST',
      body: base64String,
    },
  );
  return response.json();
};

export function onImageUploadButtonClick(
  event: React.ChangeEvent<any>,
  fileInputRef: MutableRefObject<any>,
) {
  event.preventDefault();
  fileInputRef.current.click();
}
