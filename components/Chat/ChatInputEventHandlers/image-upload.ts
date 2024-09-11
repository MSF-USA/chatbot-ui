import React, {Dispatch, MutableRefObject, SetStateAction} from "react";
import {ChatInputSubmitTypes, ImageMessageContent} from "@/types/chat";
import toast from "react-hot-toast";

export const onImageUpload = async (
  event: React.ChangeEvent<any> | Event,
  prompt: any,
  setFilePreviews: Dispatch<SetStateAction<string[]>>,
  setSubmitType: Dispatch<SetStateAction<ChatInputSubmitTypes>>,
  setImageFieldValue: Dispatch<SetStateAction<ImageMessageContent | ImageMessageContent[] | null | undefined>>
) => {
    event.preventDefault();
    const file = event.target.files[0];

    if (!file) {
        setSubmitType("text");
        return;
    }

    if (file.size > 5242480) {
        toast.error("Image upload must be <5mb");
        return;
    }

    const base64String = await readFileAsDataURL(file);
    const data = await uploadImage(file.name, base64String);

    const imageMessage: ImageMessageContent = {
        type: "image_url",
        image_url: {
            url: data.uri,
            detail: 'auto'
        },
    };

    setImageFieldValue((prevValue: ImageMessageContent | ImageMessageContent[] | null | undefined) => {
        if (prevValue && Array.isArray(prevValue)) {
            setSubmitType("multi-file");
            return [...prevValue, imageMessage];
        } else if (prevValue) {
            setSubmitType("multi-file");
            return [prevValue, imageMessage];
        } else {
            setSubmitType("image");
            return [imageMessage];
        }
    });
    setFilePreviews((prevFilePreviews) => [...(prevFilePreviews || []), base64String]);
};

const readFileAsDataURL = (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(reader.result as string);
        reader.onerror = (error) => reject(error);
        reader.readAsDataURL(file);
    });
};

const uploadImage = async (filename: string, base64String: string): Promise<{ uri: string }> => {
    const response = await fetch(`/api/v2/file/upload?filename=${encodeURI(filename)}&filetype=image`, {
        method: "POST",
        body: base64String,
    });
    return response.json();
};


export function onImageUploadButtonClick(event: React.ChangeEvent<any>, fileInputRef: MutableRefObject<any>) {
    event.preventDefault();
    fileInputRef.current.click();
}
