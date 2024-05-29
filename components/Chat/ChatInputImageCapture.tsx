import React, { Dispatch, FC, MutableRefObject, SetStateAction, useEffect, useRef, useState } from "react";
import { IconCamera } from "@tabler/icons-react";
import { ChatInputSubmitTypes, ImageMessageContent } from "@/types/chat";
import toast from "react-hot-toast";

const onImageUpload = (
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

const onImageUploadButtonClick = async (
    event: React.MouseEvent<HTMLButtonElement>,
    videoRef: MutableRefObject<HTMLVideoElement | null>,
    canvasRef: MutableRefObject<HTMLCanvasElement | null>,
    fileInputRef: MutableRefObject<HTMLInputElement | null>,
    setIsCameraOpen: Dispatch<SetStateAction<boolean>>
): Promise<void> => {
    event.preventDefault();

    if (navigator?.mediaDevices?.getUserMedia) {
        try {
            const stream = await navigator.mediaDevices.getUserMedia({ video: true });
            if (videoRef.current) {
                videoRef.current.srcObject = stream;
                setIsCameraOpen(true);
            }
        } catch (error) {
            console.error("Error accessing camera:", error);
        }
    }
};

const onTakePhotoButtonClick = (
    videoRef: MutableRefObject<HTMLVideoElement | null>,
    canvasRef: MutableRefObject<HTMLCanvasElement | null>,
    fileInputRef: MutableRefObject<HTMLInputElement | null>,
    setIsCameraOpen: Dispatch<SetStateAction<boolean>>,
    setFilePreviews: Dispatch<SetStateAction<string[]>>,
    setSubmitType: Dispatch<SetStateAction<ChatInputSubmitTypes>>,
    setImageFieldValue: Dispatch<SetStateAction<ImageMessageContent | null | undefined>>
) => {
    if (videoRef.current && canvasRef.current && fileInputRef.current) {
        canvasRef.current.width = videoRef.current.videoWidth;
        canvasRef.current.height = videoRef.current.videoHeight;
        canvasRef.current.getContext("2d")?.drawImage(videoRef.current, 0, 0);

        canvasRef.current.toBlob((blob) => {
            debugger
            if (blob) {
                const file = new File([blob], "camera_image.png", { type: "image/png" });
                const dataTransfer = new DataTransfer();
                dataTransfer.items.add(file);
                fileInputRef.current!.files = dataTransfer.files;
                const newEvent = new Event("change")
                fileInputRef.current!.dispatchEvent(newEvent);
                onImageUpload(
                    // @ts-ignore
                    newEvent,
                    prompt,
                    setFilePreviews,
                    setSubmitType,
                    setImageFieldValue
                );

            }
        }, "image/png");

        if (videoRef.current && videoRef.current.srcObject instanceof MediaStream) {
            const tracks = videoRef.current.srcObject.getTracks();
            tracks.forEach((track) => track.stop());
        }
        setIsCameraOpen(false);
    }
};

export interface ChatInputImageCaptureProps {
    setFilePreviews: Dispatch<SetStateAction<string[]>>;
    setSubmitType: Dispatch<SetStateAction<ChatInputSubmitTypes>>;
    prompt: string;
    setImageFieldValue: Dispatch<SetStateAction<ImageMessageContent | null | undefined>>;
}

const ChatInputImageCapture: FC<ChatInputImageCaptureProps> = (
    {
       setSubmitType,
       prompt,
       setFilePreviews,
       setImageFieldValue,
    }
) => {
    const videoRef = useRef<HTMLVideoElement | null>(null);
    const canvasRef = useRef<HTMLCanvasElement | null>(null);
    const fileInputRef = useRef<HTMLInputElement | null>(null);
    const [isCameraOpen, setIsCameraOpen] = useState(false);

    return (
        <>
            <video ref={videoRef} autoPlay playsInline style={{ display: isCameraOpen ? "block" : "none" }} />
            <canvas ref={canvasRef} style={{ display: "none" }} />
            <input
                type="file"
                ref={fileInputRef}
                accept="image/*"
                onChange={(event) => {
                    onImageUpload(event, prompt, setFilePreviews, setSubmitType, setImageFieldValue);
                }}
                style={{ display: "none" }}
            />
            {!isCameraOpen && (
                <button
                    onClick={(e) => {
                        onImageUploadButtonClick(e, videoRef, canvasRef, fileInputRef, setIsCameraOpen);
                    }}
                    className="open-photo-button"
                >
                    <IconCamera className="bg-[#343541] rounded h-5 w-5" />
                    <span className="sr-only">Open Camera</span>
                </button>
            )}
            {isCameraOpen && (
                <button
                    onClick={() => {
                        onTakePhotoButtonClick(
                            videoRef,
                            canvasRef,
                            fileInputRef,
                            setIsCameraOpen,
                            setFilePreviews,
                            setSubmitType,
                            setImageFieldValue
                        );
                    }}
                    className="take-photo-button"
                >
                    {/*<IconPhotoCamera className="bg-[#343541] rounded h-5 w-5" />*/}
                    <IconCamera className="bg-[#343541] rounded h-5 w-5" />
                    <span className="sr-only">Take Photo</span>
                </button>
            )}
        </>
    );
};

export default ChatInputImageCapture;
