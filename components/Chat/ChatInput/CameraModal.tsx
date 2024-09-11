import React, {Dispatch, FC, MutableRefObject, SetStateAction, useEffect, useState} from "react";
import {ChatInputSubmitTypes, ImageMessageContent} from "@/types/chat";
import {useTranslation} from "next-i18next";
import {IconCamera, IconX} from "@tabler/icons-react";
import {onImageUpload} from "@/components/Chat/ChatInputEventHandlers/image-upload";

const onTakePhotoButtonClick = (
  videoRef: MutableRefObject<HTMLVideoElement | null>,
  canvasRef: MutableRefObject<HTMLCanvasElement | null>,
  fileInputRef: MutableRefObject<HTMLInputElement | null>,
  setIsCameraOpen: Dispatch<SetStateAction<boolean>>,
  setFilePreviews: Dispatch<SetStateAction<string[]>>,
  setSubmitType: Dispatch<SetStateAction<ChatInputSubmitTypes>>,
  setImageFieldValue: Dispatch<SetStateAction<ImageMessageContent | ImageMessageContent[] | null | undefined>>,
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
        const newEvent = new Event("change");
        fileInputRef.current!.dispatchEvent(newEvent);
        onImageUpload(
            newEvent,
            prompt,
            setFilePreviews,
            setSubmitType,
            setImageFieldValue
        );
      }
    }, "image/png");

    stopMediaStream(videoRef.current);
    setIsCameraOpen(false);
  }
  closeModal();
};

const stopMediaStream = (videoElement: HTMLVideoElement | null) => {
  if (videoElement && videoElement.srcObject instanceof MediaStream) {
    const tracks = videoElement.srcObject.getTracks();
    tracks.forEach((track) => track.stop());
  }
};

interface CameraModalProps {
  isOpen: boolean;
  closeModal: () => void;
  videoRef: MutableRefObject<HTMLVideoElement | null>;
  canvasRef: MutableRefObject<HTMLCanvasElement | null>;
  fileInputRef: MutableRefObject<HTMLInputElement | null>;
  setIsCameraOpen: Dispatch<SetStateAction<boolean>>;
  setFilePreviews: Dispatch<SetStateAction<string[]>>;
  setSubmitType: Dispatch<SetStateAction<ChatInputSubmitTypes>>;
  setImageFieldValue: Dispatch<SetStateAction<ImageMessageContent | ImageMessageContent[] | null | undefined>>;
}

export const CameraModal: FC<CameraModalProps> = (
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
    stopMediaStream(videoRef.current);
    startCamera(deviceId);
  };

  if (!isOpen) return null;

  const exitModal = () => {
    stopMediaStream(videoRef.current);
    setIsCameraOpen(false);
    closeModal();
  };

  return (
      <div className="fixed inset-0 flex items-center justify-center z-50">
        <div className="bg-white dark:bg-black rounded-lg shadow-lg p-6 relative max-w-lg w-full">
          <button
              onClick={exitModal}
              className="absolute top-2 right-2 text-gray-500 hover:text-gray-800"
          >
            <IconX />
          </button>
          {cameras.length > 1 && (
              <select
                  value={selectedCamera}
                  onChange={e => handleCameraChange(e.target.value)}
                  className="mb-4 w-full px-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                {cameras.map((camera) => (
                    <option key={camera.deviceId} value={camera.deviceId}>
                      {camera.label || `Camera (${camera.deviceId})`}
                    </option>
                ))}
              </select>
          )}
          {cameras.length === 1 && (
              <div className="mb-4 text-center dark:text-white text-gray-900">
                {cameras[0].label || 'Camera'}
              </div>
          )}
          <div className="relative mb-4">
            <video ref={videoRef} autoPlay playsInline className="w-full h-auto rounded-md" />
            <canvas ref={canvasRef} style={{ display: "none" }} />
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
            <IconCamera className="w-6 h-6 mr-2" />
            <span>{t('Take photo')}</span>
          </button>
        </div>
      </div>
  );
};
