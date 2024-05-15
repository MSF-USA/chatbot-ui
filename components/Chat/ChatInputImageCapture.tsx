import React, {Dispatch, FC, MutableRefObject, SetStateAction, useEffect, useRef, useState} from "react";
import {IconCamera} from "@tabler/icons-react";
import {ChatInputSubmitTypes, ImageMessageContent} from "@/types/chat";
import toast from "react-hot-toast";

const onImageUpload = (
    event: React.ChangeEvent<any>,
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
        fetch(`/api/image?filename=${encodeURI(file.name)}`, {
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

export interface ChatInputImageCaptureProps {
    setFilePreviews: Dispatch<SetStateAction<string[]>>;
    setSubmitType: Dispatch<SetStateAction<ChatInputSubmitTypes>>;
    prompt: string;
    setImageFieldValue: Dispatch<SetStateAction<ImageMessageContent  | null | undefined>>;
}

const ChatInputImageCapture: FC<ChatInputImageCaptureProps> = (
    {
        setSubmitType,
        prompt,
        setFilePreviews,
        setImageFieldValue
    }) => {
    const cameraInputRef: MutableRefObject<any> = useRef(null);
    const [hasCameras, setHasCameras] = useState<boolean>(false);

    useEffect(() => {
        if (navigator?.mediaDevices) {
            navigator.mediaDevices.enumerateDevices().then((devices: MediaDeviceInfo[]) => {
                const hasCameraDevice = devices.some((device) => {
                    return device.kind === 'videoinput';
                })
                setHasCameras(hasCameraDevice);
            }).catch((error) => {
                /* handle error */
                setHasCameras(false);
            })
        }
    }, [])

    if (!hasCameras)
        return null;

    return (
        <>
            <input
                type={"file"}
                ref={cameraInputRef}
                accept={"image/*"}
                capture={"user"}
                onChange={(event) => {
                    onImageUpload(event, prompt, setFilePreviews, setSubmitType, setImageFieldValue)
                }}
                style={{display: "none"}}
            />
            <button
                onClick={(e) => {
                    onImageUploadButtonClick(e, cameraInputRef)
                }}
                className={""}
            >
                <IconCamera className="bg-[#343541] rounded h-5 w-5"/>
                <span className="sr-only">Add image</span>
            </button>
        </>
    );
}

export default  ChatInputImageCapture;
