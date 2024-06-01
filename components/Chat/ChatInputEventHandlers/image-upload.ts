import React, {Dispatch, MutableRefObject, SetStateAction} from "react";
import {ChatInputSubmitTypes, ImageMessageContent} from "@/types/chat";
import toast from "react-hot-toast";

export const onImageUpload = (
  event: React.ChangeEvent<any>,
  prompt: string,
  setFilePreviews: Dispatch<SetStateAction<string[]>>,
  setSubmitType: Dispatch<SetStateAction<ChatInputSubmitTypes>>,
  setImageFieldValue: Dispatch<SetStateAction<ImageMessageContent | null | undefined>>
) => {
    event.preventDefault();
    const file = event.target.files[0];

    if (!file) {
        setSubmitType("text");
        return;
    } else {
        setSubmitType("image");
    }

    if (file.size > 5242480) {
        toast.error("Image upload must be <5mb");
        return;
    }

    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onloadend = () => {
        const base64String = reader.result as string;
        fetch(`/api/image?filename=${encodeURI(file.name)}`, {
            method: "POST",
            body: base64String,
        }).then((page) => {
            page.json().then((data) => {
                const imageMessage: ImageMessageContent = {
                    type: "image_url",
                    image_url: {
                        url: data.uri,
                    },
                };
                setImageFieldValue(imageMessage);
                setFilePreviews((prevFilePreviews) => {
                    if (Array.isArray(prevFilePreviews)) {
                        prevFilePreviews.push(base64String);
                        return prevFilePreviews;
                    } else {
                        return [base64String];
                    }
                });
            });
        });
    };
};

export function onImageUploadButtonClick(event: React.ChangeEvent<any>, fileInputRef: MutableRefObject<any>) {
    event.preventDefault();
    fileInputRef.current.click();
}
