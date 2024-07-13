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
  'application/x-iso9660-image'
];

function isFileAllowed(file: File): boolean {
  const extension = '.' + file.name.split('.')[file.name.split('.').length-1].toLowerCase()
  return !disallowedExtensions.includes(extension) && !disallowedMimeTypes.includes(file.type);
}

export function onFileUpload(
  event: React.ChangeEvent<any>,
  setSubmitType: Dispatch<SetStateAction<ChatInputSubmitTypes>>,
  setFilePreviews: Dispatch<SetStateAction<string[]>>,
  setFileFieldValue: Dispatch<SetStateAction<FileMessageContent | null>>,
  setImageFieldValue: Dispatch<SetStateAction<ImageMessageContent | null | undefined>>
) {
  event.preventDefault();
  const file: File = event.target.files[0];

  if (!isFileAllowed(file)){
    toast.error(`Invalid file type provided: ${file.name}`);
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
                setSubmitType("file");
                setFilePreviews(prevState => [...prevState, `file:${file.type}||name:${file.name}`])
                setFileFieldValue({
                  type: 'file_url',
                  url: resp.uri ?? resp.filename
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
