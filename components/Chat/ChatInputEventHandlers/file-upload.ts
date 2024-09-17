import React, {Dispatch, SetStateAction} from "react";
import toast from "react-hot-toast";
import {ChatInputSubmitTypes, FileMessageContent, ImageMessageContent} from "@/types/chat";
import FileIcon from "@/components/Icons/file";
import {onImageUpload} from "@/components/Chat/ChatInputEventHandlers/image-upload";


const disallowedExtensions: string[] = [
  '.exe', '.dll', '.cmd', '.msi', '.zip', '.rar', '.7z', '.tar', '.gz', '.iso'
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
  'application/octet-stream'
];

function isFileAllowed(file: File): boolean {
  const extension = '.' + file.name.split('.')[file.name.split('.').length-1].toLowerCase()
  return !disallowedExtensions.includes(extension) && !disallowedMimeTypes.includes(file.type);
}

const unsupportedExtensions: string[] = [
  '.mp3', '.wav', '.ogg', '.flac', '.m4a', '.aac',
  '.mp4', '.avi', '.mov', '.wmv', '.flv', '.mkv', '.webm'
];

function isFileSupported(file: File): boolean {
  const extension = '.' + file.name.split('.').pop()?.toLowerCase();
  return !(file.type.startsWith('audio/') ||
    file.type.startsWith('video/') ||
    unsupportedExtensions.includes(extension));
}


export function onFileUpload(
  event: React.ChangeEvent<any>,
  setSubmitType: Dispatch<SetStateAction<ChatInputSubmitTypes>>,
  setFilePreviews: Dispatch<SetStateAction<string[]>>,
  setFileFieldValue: Dispatch<SetStateAction<FileMessageContent | FileMessageContent[] | null>>,
  setImageFieldValue: Dispatch<SetStateAction<ImageMessageContent | ImageMessageContent[] | null | undefined>>
) {
  event.preventDefault();
  const file: File = event.target.files[0];

  if (!isFileAllowed(file)){
    toast.error(`Invalid file type provided: ${file.name}`);
    return;
  }

  if (!isFileSupported(file)){
    toast.error(`This file type is currently unsupported.`);
    return;
  }

  if (file.type.startsWith("image/")) {
    onImageUpload(event, "", setFilePreviews, setSubmitType, setImageFieldValue);
    return;
  }


  if (file.size > 10485760) {
    toast.error("File upload must be <10mb");
    return;
  }

  const chunkSize = 1024 * 1024 * 5; // 5MB chunks
  let uploadedBytes = 0;

  const uploadChunk = () => {
    const chunk = file.slice(uploadedBytes, uploadedBytes + chunkSize);

    const reader = new FileReader();
    reader.onloadend = () => {
      const base64Chunk = btoa(reader.result as string);
      const encodedFileName = encodeURIComponent(file.name);
      const encodedMimeType = encodeURIComponent(file.type);

      fetch(`/api/v2/file/upload?filename=${encodedFileName}&filetype=file&mime=${encodedMimeType}`, {
        method: "POST",
        body: base64Chunk,
        headers: {
          "x-file-name": encodedFileName
        }
      })
        .then((response: Response) => {
          if (response.ok) {
            uploadedBytes += chunkSize;
            if (uploadedBytes < file.size) {
              uploadChunk();
            } else {
              response.json().then(resp => {
                setFilePreviews(prevState => [...prevState, `file:${file.type}||name:${file.name}`])
                // @ts-ignore
                setFileFieldValue((prevValue: FileMessageContent | FileMessageContent[] | null): FileMessageContent[] => {
                  const newValue: FileMessageContent = {
                    type: 'file_url',
                    url: resp.uri ?? resp.filename,
                    originalFilename: file.name,
                  }
                  if (prevValue && Array.isArray(prevValue)) {
                    setSubmitType("multi-file");
                    return [...prevValue, newValue];
                  } else if (prevValue) {
                    setSubmitType("multi-file");
                    return [prevValue, newValue];
                  } else {
                    setSubmitType("file");
                    return [newValue];
                  }
                })
                toast.success("File uploaded successfully");
              })
            }
          } else {
            setSubmitType("text");
            toast.error("File upload failed");
          }
        })
        .catch(() => {
          setSubmitType("text");
          toast.error("File upload failed");
        });
    };
    reader.readAsBinaryString(chunk);
  };

  uploadChunk();
}
