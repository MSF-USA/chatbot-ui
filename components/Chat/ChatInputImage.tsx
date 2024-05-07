import ImageIcon from "@/components/Icons/image";
import React, {Dispatch, MutableRefObject, SetStateAction, useRef} from "react";
import {ImageMessageContent, TextMessageContent} from "@/types/chat";


const onImageUpload = (
    event: React.ChangeEvent<any>,
    setContent: Dispatch<SetStateAction<string | Array<TextMessageContent | ImageMessageContent>>>,
    prompt: string,
    setFilePreviews:  Dispatch<SetStateAction<string[]>>,
    setSubmitType: Dispatch<SetStateAction<string>>,
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

    const formData = new FormData();
    formData.append("file", file);

    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onloadend = () => {
        const base64String = reader.result as string;
        fetch(`/api/image?filename=${encodeURI(file.name)}`, {
            method: 'POST',
            body: base64String,
        }).then(page => {
            page.json().then(data => {
                setContent([
                    {
                        type: 'text',
                        text: prompt,
                    },
                    {
                        type: 'image_url',
                        image_url: {url: data.uri}
                    },
                ])
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

const ChatInputImage = (
    {
        setSubmitType,
        setContent,
        prompt,
        setFilePreviews
    }: any
) => {
    const imageInputRef: MutableRefObject<any> = useRef(null);


    return <>
        <input
            type="file"
            ref={imageInputRef}
            style={{display: "none"}}
            onChange={(event) => {
                onImageUpload(event, setContent, prompt, setFilePreviews, setSubmitType)
            }}
            accept={"image/*"}
        />
        <button
            onClick={(e) => {
                onImageUploadButtonClick(e, imageInputRef)
            }}
            className={""}
        >
            <ImageIcon className="bg-[#343541] rounded h-5 w-5"/>
            <span className="sr-only">Add image</span>
        </button>
    </>
}

export default ChatInputImage;
