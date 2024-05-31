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

interface CameraModalProps {
    isOpen: boolean;
    closeModal: () => void;
    videoRef: MutableRefObject<HTMLVideoElement | null>;
    canvasRef: MutableRefObject<HTMLCanvasElement | null>;
    fileInputRef: MutableRefObject<HTMLInputElement | null>;
    setIsCameraOpen: Dispatch<SetStateAction<boolean>>;
    setFilePreviews: Dispatch<SetStateAction<string[]>>;
    setSubmitType: Dispatch<SetStateAction<ChatInputSubmitTypes>>;
    setImageFieldValue: Dispatch<SetStateAction<ImageMessageContent | null | undefined>>;
}

const CameraModal: FC<CameraModalProps> = (
    {
        isOpen,
        closeModal,
        videoRef,
        canvasRef,
        fileInputRef,
        setIsCameraOpen,
        setFilePreviews,
        setSubmitType,
        setImageFieldValue,
    }
) => {
    const { t } = useTranslation('chat');
    const [cameras, setCameras] = useState<MediaDeviceInfo[]>([]);
    const [selectedCamera, setSelectedCamera] = useState<string>('');

    useEffect(() => {
        const getDevices = async () => {
            const devices = await navigator.mediaDevices.enumerateDevices();
            const videoDevices = devices.filter(device => device.kind === 'videoinput');
            setCameras(videoDevices);
            if (videoDevices.length > 0) {
                setSelectedCamera(videoDevices[0].deviceId);
            }
        };
        getDevices();
    }, []);

    const startCamera = async (deviceId: string) => {
        const stream: MediaStream = await navigator.mediaDevices.getUserMedia({ video: { deviceId } });
        if (videoRef.current) {
            videoRef.current.srcObject = stream;
        }
    };

    const handleCameraChange = (deviceId: string) => {
        setSelectedCamera(deviceId);
        if (videoRef.current?.srcObject) {
            (videoRef.current.srcObject as MediaStream).getTracks().forEach(track => track.stop());
        }
        startCamera(deviceId);
    };

    if (!isOpen) return null;

    const exitModal = (_: any): void => {
        if (videoRef.current && videoRef.current.srcObject instanceof MediaStream) {
            const tracks = videoRef.current.srcObject.getTracks();
            tracks.forEach((track) => track.stop());
        }
        setIsCameraOpen(false);
        closeModal();
    }

    return (
      <div className="fixed inset-0 flex items-center justify-center z-50">
          <div className="bg-white dark:bg-black rounded-lg shadow-lg p-6 relative max-w-lg w-full">
              <button
                onClick={exitModal}
                className="absolute top-2 right-2 text-gray-500 hover:text-gray-800"
              >
                  <IconX/>
              </button>
              {cameras.length > 1 && (
                <select
                  value={selectedCamera}
                  onChange={e => handleCameraChange(e.target.value)}
                  className="mb-4 w-full px-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                    {cameras.map(camera => (
                      <option key={`camera-${camera.deviceId}`} value={camera.deviceId}>
                          {camera.label ?? camera.deviceId}
                      </option>
                    ))}
                </select>
              )}
              {cameras.length === 1 && (
                <div className="mb-4 text-center">{cameras[0].label ?? cameras[0].deviceId}</div>
              )}
              <div className="relative mb-4">
                  <video ref={videoRef} autoPlay playsInline className="w-full h-auto rounded-md"/>
                  <canvas ref={canvasRef} style={{display: "none"}}/>
              </div>
              <button
                onClick={() => {
                    onTakePhotoButtonClick(
                      videoRef,
                      canvasRef,
                      fileInputRef,
                      setIsCameraOpen,
                      setFilePreviews,
                      setSubmitType,
                      setImageFieldValue,
                      closeModal
                    );
                }}
                className="w-full bg-blue-500 text-white px-4 py-2 rounded-md flex items-center justify-center"
              >
                  <IconCamera className="w-6 h-6 mr-2"/>
                  <span>{t('Take photo')}</span>
              </button>
          </div>
      </div>

    );
};


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
    setImageFieldValue: Dispatch<SetStateAction<ImageMessageContent | null | undefined>>,
    closeModal: () => void
) => {
    if (videoRef.current && canvasRef.current && fileInputRef.current) {
        canvasRef.current.width = videoRef.current.videoWidth;
        canvasRef.current.height = videoRef.current.videoHeight;
        canvasRef.current.getContext("2d")?.drawImage(videoRef.current, 0, 0);

        canvasRef.current.toBlob((blob) => {
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
    closeModal();
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
