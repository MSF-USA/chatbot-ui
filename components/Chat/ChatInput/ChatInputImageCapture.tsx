import { IconCamera, IconX } from '@tabler/icons-react';
import React, {
  Dispatch,
  FC,
  MouseEventHandler,
  MutableRefObject,
  SetStateAction,
  useEffect,
  useRef,
  useState,
} from 'react';
import toast from 'react-hot-toast';

import { useTranslation } from 'next-i18next';

import { isMobile } from '@/utils/app/env';

import { ChatInputSubmitTypes, ImageMessageContent } from '@/types/chat';

import { CameraModal } from '@/components/Chat/ChatInput/CameraModal';
import { onImageUpload } from '@/components/Chat/ChatInputEventHandlers/image-upload';

const onImageUploadButtonClick = async (
  event: React.MouseEvent<HTMLButtonElement>,
  videoRef: MutableRefObject<HTMLVideoElement | null>,
  canvasRef: MutableRefObject<HTMLCanvasElement | null>,
  fileInputRef: MutableRefObject<HTMLInputElement | null>,
  setIsCameraOpen: Dispatch<SetStateAction<boolean>>,
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
      console.error('Error accessing camera:', error);
    }
  }
};

export interface ChatInputImageCaptureProps {
  setFilePreviews: Dispatch<SetStateAction<string[]>>;
  setSubmitType: Dispatch<SetStateAction<ChatInputSubmitTypes>>;
  prompt: string;
  setImageFieldValue: Dispatch<
    SetStateAction<ImageMessageContent | null | undefined>
  >;
}

const ChatInputImageCapture: FC<ChatInputImageCaptureProps> = ({
  setSubmitType,
  prompt,
  setFilePreviews,
  setImageFieldValue,
}) => {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const [isCameraOpen, setIsCameraOpen] = useState(false);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [hasCameraSupport, setHasCameraSupport] = useState(false);

  const openModal = () => setIsModalOpen(true);
  const closeModal = () => setIsModalOpen(false);

  useEffect(() => {
    const checkCameraSupport = async () => {
      try {
        const devices = await navigator.mediaDevices.enumerateDevices();
        const hasCamera = devices.some(
          (device) => device.kind === 'videoinput',
        );
        setHasCameraSupport(hasCamera);
      } catch (error) {
        console.error('Error checking camera support:', error);
        setHasCameraSupport(false);
      }
    };

    checkCameraSupport();
  }, []);

  const handleCameraButtonClick = (e: React.MouseEvent<HTMLButtonElement>) => {
    if (isMobile()) {
      if (fileInputRef.current) {
        fileInputRef.current.click();
      }
    } else {
      onImageUploadButtonClick(
        e,
        videoRef,
        canvasRef,
        fileInputRef,
        setIsCameraOpen,
      ).then((r) => null);
      openModal();
    }
  };

  return (
    <>
      {/*<video ref={videoRef} autoPlay playsInline style={{ display: isCameraOpen ? "block" : "none" }} />*/}
      <canvas ref={canvasRef} style={{ display: 'none' }} />
      <input
        type="file"
        ref={fileInputRef}
        accept="image/*"
        capture={'environment'}
        onChange={(event) => {
          onImageUpload(
            event,
            prompt,
            setFilePreviews,
            setSubmitType,
            setImageFieldValue,
          );
        }}
        style={{ display: 'none' }}
      />
      {!isCameraOpen && hasCameraSupport && (
        <button onClick={handleCameraButtonClick} className="open-photo-button">
          <IconCamera className="text-black dark:text-white rounded h-5 w-5 hover:bg-gray-200 dark:hover:bg-gray-700" />
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
    </>
  );
};

export default ChatInputImageCapture;
