import React, {Dispatch, SetStateAction} from "react";
import toast from "react-hot-toast";
import {ChatInputSubmitTypes} from "@/types/chat";

export function onFileUpload(event: React.ChangeEvent<any>, setSubmitType: Dispatch<SetStateAction<ChatInputSubmitTypes>>) {
  event.preventDefault();
  const file: File = event.target.files[0];

  if (file.size > 10485760) {
    toast.error("Image upload must be <10mb");
    return;
  }

  const chunkSize = 1024 * 1024 * 5; // 5MB chunks
  let uploadedBytes = 0;

  const uploadChunk = () => {
    const chunk = file.slice(uploadedBytes, uploadedBytes + chunkSize);

    const formData = new FormData();
    formData.append("chunk", chunk);
    formData.append("name", file.name);

    fetch("/api/file/upload", {
      method: "POST",
      body: formData,
      headers: {
        "x-file-name": file.name
      }
    })
      .then((response: Response) => {
        if (response.ok) {
          uploadedBytes += chunkSize;
          if (uploadedBytes < file.size) {
            uploadChunk();
          } else {
            setSubmitType("file");
            toast.success("File uploaded successfully");
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

  uploadChunk();
}
