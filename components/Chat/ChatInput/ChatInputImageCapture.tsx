import React, {
    Dispatch,
    FC,
    MouseEventHandler,
    MutableRefObject,
    SetStateAction,
    useEffect,
    useRef,
    useState
} from "react";
import {IconCamera, IconX} from "@tabler/icons-react";
import { ChatInputSubmitTypes, ImageMessageContent } from "@/types/chat";
import toast from "react-hot-toast";
import {useTranslation} from "next-i18next";
import {CameraModal} from "@/components/Chat/ChatInput/CameraModal";
import {onImageUpload} from "@/components/Chat/ChatInputEventHandlers/image-upload";




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
    const [isModalOpen, setIsModalOpen] = useState(false);

    const openModal = () => setIsModalOpen(true);
    const closeModal = () => setIsModalOpen(false);

    return (
        <>
            {/*<video ref={videoRef} autoPlay playsInline style={{ display: isCameraOpen ? "block" : "none" }} />*/}
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
                        onImageUploadButtonClick(e, videoRef, canvasRef, fileInputRef, setIsCameraOpen).then(
                            r => null
                        );
                        openModal()
                    }}
                    className="open-photo-button"
                >
                    <IconCamera className="bg-[#343541] rounded h-5 w-5" />
                    <span className="sr-only">Open Camera</span>
                </button>
            )}
            <CameraModal
                isOpen={isModalOpen}
                closeModal={closeModal}
                videoRef={videoRef}
                canvasRef={canvasRef}
                fileInputRef={fileInputRef}
                setIsCameraOpen={setIsCameraOpen}
                setFilePreviews={setFilePreviews}
                setSubmitType={setSubmitType}
                setImageFieldValue={setImageFieldValue}
            />
            {/*{isCameraOpen && (*/}
            {/*    <button*/}
            {/*        onClick={() => {*/}
            {/*            onTakePhotoButtonClick(*/}
            {/*                videoRef,*/}
            {/*                canvasRef,*/}
            {/*                fileInputRef,*/}
            {/*                setIsCameraOpen,*/}
            {/*                setFilePreviews,*/}
            {/*                setSubmitType,*/}
            {/*                setImageFieldValue,*/}
            {/*                closeModal*/}
            {/*            );*/}
            {/*        }}*/}
            {/*        className="take-photo-button"*/}
            {/*    >*/}
            {/*        /!*<IconPhotoCamera className="bg-[#343541] rounded h-5 w-5" />*!/*/}
            {/*        <IconCamera className="bg-[#343541] rounded h-5 w-5" />*/}
            {/*        <span className="sr-only">Take Photo</span>*/}
            {/*    </button>*/}
            {/*)}*/}
        </>
    );
};

export default ChatInputImageCapture;
