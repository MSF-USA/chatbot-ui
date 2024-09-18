import React, {ChangeEvent, Dispatch, SetStateAction} from "react";
import toast from "react-hot-toast";
import {
  ChatInputSubmitTypes,
  FileMessageContent,
  ImageMessageContent,
} from "@/types/chat";
import { onImageUpload } from "@/components/Chat/ChatInputEventHandlers/image-upload";

const disallowedExtensions: string[] = [
  ".exe",
  ".dll",
  ".cmd",
  ".msi",
  ".zip",
  ".rar",
  ".7z",
  ".tar",
  ".gz",
  ".iso",
];

const disallowedMimeTypes: string[] = [
  "application/x-msdownload",
  "application/x-executable",
  "application/x-dosexec",
  "application/x-msdos-program",
  "application/x-msi",
  "application/zip",
  "application/x-rar-compressed",
  "application/x-7z-compressed",
  "application/x-tar",
  "application/gzip",
  "application/x-iso9660-image",
  "application/octet-stream",
];

function isFileAllowed(file: File): boolean {
  const extension =
      "." + file.name.split(".")[file.name.split(".").length - 1].toLowerCase();
  return (
      !disallowedExtensions.includes(extension) &&
      !disallowedMimeTypes.includes(file.type)
  );
}

const unsupportedExtensions: string[] = [
  ".mp3",
  ".wav",
  ".ogg",
  ".flac",
  ".m4a",
  ".aac",
  ".mp4",
  ".avi",
  ".mov",
  ".wmv",
  ".flv",
  ".mkv",
  ".webm",
];

function isFileSupported(file: File): boolean {
  const extension = "." + file.name.split(".").pop()?.toLowerCase();
  return (
      !(file.type.startsWith("audio/") || file.type.startsWith("video/")) &&
      !unsupportedExtensions.includes(extension)
  );
}

export async function onFileUpload(
    event: React.ChangeEvent<any>,
    setSubmitType: Dispatch<SetStateAction<ChatInputSubmitTypes>>,
    setFilePreviews: Dispatch<SetStateAction<string[]>>,
    setFileFieldValue: Dispatch<
        SetStateAction<FileMessageContent[] | null>
    >,
    setImageFieldValue: Dispatch<
        SetStateAction<ImageMessageContent | ImageMessageContent[] | null | undefined>
    >
) {
  event.preventDefault();
  const files: FileList = event.target.files;

  if (files.length === 0) {
    toast.error("No files selected.");
    return;
  }

  if (files.length > 5) {
    toast.error("You can upload a maximum of 5 files at a time.");
    return;
  }

  const filePreviews: string[] = [];
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

    if (file.type.startsWith("image/")) {
      // Handle image upload
      return new Promise<void>((resolve, reject) => {
        onImageUpload(
            { target: { files: [file] } } as ChangeEvent<any>,
            "",
            (prevState) => {
              (prevState as string[]).push(URL.createObjectURL(file));
              setFilePreviews([...(prevState as string[])]);
            },
            setSubmitType,
            setImageFieldValue,
        );
      });
    } else {
      // Handle non-image file upload
      return new Promise<void>((resolve, reject) => {
        // Implement the upload logic here
        // For simplicity, let's assume uploading the file to your server
        const chunkSize = 1024 * 1024 * 5; // 5MB chunks
        let uploadedBytes = 0;

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
                    method: "POST",
                    body: base64Chunk,
                    headers: {
                      "x-file-name": encodedFileName,
                    },
                  }
              );

              if (response.ok) {
                uploadedBytes += chunkSize;
                if (uploadedBytes < file.size) {
                  uploadChunk();
                } else {
                  const resp = await response.json();
                  filePreviews.push(`file:${file.type}||name:${file.name}`);

                  const newValue: FileMessageContent = {
                    type: "file_url",
                    url: resp.uri ?? resp.filename,
                    originalFilename: file.name,
                  };
                  fileFieldValues.push(newValue);
                  resolve();
                }
              } else {
                toast.error(`File upload failed: ${file.name}`);
                reject();
              }
            } catch (error) {
              toast.error(`File upload failed: ${file.name}`);
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

  // Update state after all files have been processed
  if (fileFieldValues.length > 0) {
    setFilePreviews((prevState) => [...prevState, ...filePreviews]);
    setFileFieldValue((prevValue) => {
      if (prevValue && Array.isArray(prevValue)) {
        return [...prevValue, ...fileFieldValues];
      } else {
        return [...fileFieldValues];
      }
    });
    setSubmitType(fileFieldValues.length > 1 ? "multi-file" : "file");
    toast.success("Files uploaded successfully");
  }

  if (imageFieldValues.length > 0) {
    setFilePreviews((prevState) => [...prevState, ...filePreviews]);
    setImageFieldValue((prevValue) => {
      if (prevValue && Array.isArray(prevValue)) {
        return [...prevValue, ...imageFieldValues];
      } else {
        return [...imageFieldValues];
      }
    });
    setSubmitType(
        imageFieldValues.length > 1 ? "multi-file" : "image"
    );
    toast.success("Images uploaded successfully");
  }

  // Reset the file input value to allow re-upload of the same files if needed
  event.target.value = "";
}
