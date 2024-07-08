import ImageIcon from "@/components/Icons/image";
import React, {Dispatch, MutableRefObject, SetStateAction, useRef} from "react";
import {ChatInputSubmitTypes, ImageMessageContent, TextMessageContent} from "@/types/chat";
import toast from 'react-hot-toast';

const onImageUpload = (
    event: React.ChangeEvent<any>,
    // setContent: Dispatch<SetStateAction<string | Array<TextMessageContent | ImageMessageContent>>>,
    prompt: string,
    setFilePreviews:  Dispatch<SetStateAction<string[]>>,
    setSubmitType: Dispatch<SetStateAction<ChatInputSubmitTypes>>,
    setImageFieldValue: Dispatch<SetStateAction<ImageMessageContent | null | undefined>>,
) => {
    event.preventDefault();
    const file = event.target.files[0];

    // User cancelled the file dialog, reset to 'text' submit type
    if (!file) {
        setSubmitType('text');
        return;
    } else {
        setSubmitType("image");
    }
    if (file.size > 5242480) {
        toast.error("Image upload must be <5mb");
        return
    }
    const formData = new FormData();
    formData.append("file", file);

    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onloadend = () => {
        const base64String = reader.result as string;
        fetch(`/api/v2/file/upload?filename=${encodeURI(file.name)}&filetype=image`, {
            method: 'POST',
            body: base64String,
        }).then(page => {
            page.json().then(data => {
                const imageMessage: ImageMessageContent = {
                    type: 'image_url',
                    image_url: {
                        url: data.uri
                    }
                }
                setImageFieldValue(imageMessage)
                setFilePreviews(prevFilePreviews => {
                    if (Array.isArray(prevFilePreviews)) {
                        prevFilePreviews.push(base64String)
                        return prevFilePreviews
                    } else {
                        return [base64String]
                    }
                })
            })
        })

    };

    console.log(file)

}

const onImageUploadButtonClick = (event: React.ChangeEvent<any>, fileInputRef: MutableRefObject<any>) => {
    event.preventDefault();
    fileInputRef.current.click();
}

export interface ChatInputImageProps {
    setFilePreviews: Dispatch<SetStateAction<string[]>>;
    setSubmitType: Dispatch<SetStateAction<ChatInputSubmitTypes>>;
    prompt: string;
    // setContent: Dispatch<SetStateAction<string | Array<TextMessageContent | ImageMessageContent>>> | null;
    setImageFieldValue: Dispatch<SetStateAction<ImageMessageContent  | null | undefined>>;
}

const ChatInputImage = (
    {
        setSubmitType,
        prompt,
        setFilePreviews,
        setImageFieldValue
    }: ChatInputImageProps
) => {
    const imageInputRef: MutableRefObject<any> = useRef(null);


    return <>
        <input
            type="file"
            ref={imageInputRef}
            style={{display: "none"}}
            onChange={(event) => {
                onImageUpload(event, prompt, setFilePreviews, setSubmitType, setImageFieldValue)
            }}
            accept={"image/*"}
        />
        <button
            onClick={(e) => {
                onImageUploadButtonClick(e, imageInputRef)
            }}
            className={""}
        >
            <ImageIcon className="bg-[#212121] rounded h-5 w-5"/>
            <span className="sr-only">Add image</span>
        </button>
    </>
}

export default ChatInputImage;
