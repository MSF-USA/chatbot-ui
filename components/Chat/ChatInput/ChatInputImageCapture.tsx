import { IconCamera, IconX } from '@tabler/icons-react';
import React, {
  Dispatch,
  forwardRef,
  useImperativeHandle,
  MouseEventHandler,
  MutableRefObject,
  SetStateAction,
  useContext,
  useEffect,
  useRef,
  useState,
} from 'react';
import toast from 'react-hot-toast';

import { useTranslation } from 'next-i18next';

import { isMobile } from '@/utils/app/env';
import { userAuthorizedForFileUploads } from '@/utils/app/userAuth';

import {ChatInputSubmitTypes, FileMessageContent, FilePreview, ImageMessageContent} from '@/types/chat';

import HomeContext from '@/pages/api/home/home.context';

import { CameraModal } from '@/components/Chat/ChatInput/CameraModal';
import { onImageUpload } from '@/components/Chat/ChatInputEventHandlers/image-upload';
import {onFileUpload} from "@/components/Chat/ChatInputEventHandlers/file-upload";

const onImageUploadButtonClick = async (
  event: React.MouseEvent<HTMLButtonElement> | MouseEvent,
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
  setFilePreviews: Dispatch<SetStateAction<FilePreview[]>>;
  setSubmitType: Dispatch<SetStateAction<ChatInputSubmitTypes>>;
  prompt: string;
  setImageFieldValue: Dispatch<
    SetStateAction<FileMessageContent | FileMessageContent[] | ImageMessageContent | ImageMessageContent[] | null>
  >;
  setUploadProgress: Dispatch<SetStateAction<{ [p: string]: number }>>;
  visible?: boolean;
}

export interface ChatInputImageCaptureRef {
  triggerCamera: () => void;
}

const ChatInputImageCapture = forwardRef<ChatInputImageCaptureRef, ChatInputImageCaptureProps>(({
  setSubmitType,
  prompt,
  setFilePreviews,
  setImageFieldValue,
  setUploadProgress,
  visible = true,
}, ref) => {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const [isCameraOpen, setIsCameraOpen] = useState(false);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [hasCameraSupport, setHasCameraSupport] = useState(false);

  const openModal = () => setIsModalOpen(true);
  const closeModal = () => setIsModalOpen(false);

  const handleCameraButtonClick = (e: React.MouseEvent<HTMLButtonElement> | null) => {
    if (isMobile()) {
      if (fileInputRef.current) {
        fileInputRef.current.click();
      }
    } else {
      onImageUploadButtonClick(
        e || new MouseEvent('click') as any,
        videoRef,
        canvasRef,
        fileInputRef,
        setIsCameraOpen,
      ).then(() => null);
      openModal();
    }
  };

  // Expose the trigger method through the ref
  useImperativeHandle(ref, () => ({
    triggerCamera: () => {
      if (hasCameraSupport) {
        handleCameraButtonClick(null);
      }
    }
  }));

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

  const {
    state: { user },
    dispatch: homeDispatch,
  } = useContext(HomeContext);
  
  if (!userAuthorizedForFileUploads(user)) return null;

  return (
    <>
      <canvas ref={canvasRef} style={{ display: 'none' }} />
      <input
        type="file"
        ref={fileInputRef}
        accept="image/*"
        capture={'environment'}
        onChange={(event) => {
          onFileUpload(
            event,
            setSubmitType,
            setFilePreviews,
            setImageFieldValue,
            // @ts-ignore
            setImageFieldValue,
            setUploadProgress,
          );
        }}
        style={{ display: 'none' }}
      />
      {!isCameraOpen && hasCameraSupport && visible && (
        <div className="relative group">
          <button
            onClick={(e) => handleCameraButtonClick(e)}
            className="open-photo-button flex"
          >
            <IconCamera className="text-black dark:text-white rounded h-5 w-5 hover:bg-gray-200 dark:hover:bg-gray-700" />
            <span className="sr-only">Open Camera</span>
          </button>
          <div className="absolute left-1/2 transform -translate-x-1/2 bottom-full mb-2 hidden group-hover:block bg-black text-white text-xs py-1 px-2 rounded shadow-md">
            Enable Camera
          </div>
        </div>
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
        setUploadProgress={setUploadProgress}
      />
    </>
  );
});

ChatInputImageCapture.displayName = 'ChatInputImageCapture';

export default ChatInputImageCapture;
