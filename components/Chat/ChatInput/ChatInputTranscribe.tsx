import { IconFileMusic } from '@tabler/icons-react';
import React, {
  Dispatch,
  FC,
  SetStateAction,
  useEffect,
  useRef,
  useState,
} from 'react';
import toast from 'react-hot-toast';

import { useTranslations } from 'next-intl';

import { ChatInputSubmitTypes } from '@/types/chat';

async function retryOperation<T>(
  operation: () => Promise<T>,
  maxRetries: number,
  waitTime: number,
  onRetry?: (attempt: number, error: Error) => void,
): Promise<T> {
  let attempt = 0;
  while (attempt < maxRetries) {
    attempt++;
    try {
      return await operation();
    } catch (error) {
      if (attempt < maxRetries) {
        if (onRetry) {
          onRetry(
            attempt,
            error instanceof Error ? error : new Error(String(error)),
          );
        }
        // Wait before retrying
        await new Promise((resolve) => setTimeout(resolve, waitTime));
      } else {
        throw error;
      }
    }
  }
  // Should never reach here
  throw new Error('An unexpected error occurred in retryOperation.');
}

interface ChatInputTranscribeProps {
  setTextFieldValue: Dispatch<SetStateAction<string>>;
  onFileUpload: (
    event: React.ChangeEvent<any> | File[] | FileList,
    setSubmitType: Dispatch<SetStateAction<ChatInputSubmitTypes>>,
    setFilePreviews: Dispatch<SetStateAction<any>>,
    setFileFieldValue: Dispatch<SetStateAction<any>>,
    setImageFieldValue: Dispatch<SetStateAction<any>>,
    setUploadProgress: Dispatch<SetStateAction<{ [key: string]: number }>>,
  ) => Promise<void>;
  setParentModalIsOpen: Dispatch<SetStateAction<boolean>>;
  setSubmitType: Dispatch<SetStateAction<ChatInputSubmitTypes>>;
  setFilePreviews: Dispatch<SetStateAction<any>>;
  setFileFieldValue: Dispatch<SetStateAction<any>>;
  setImageFieldValue: Dispatch<SetStateAction<any>>;
  setUploadProgress: Dispatch<SetStateAction<{ [key: string]: number }>>;
  simulateClick: boolean;
  setTranscriptionStatus: Dispatch<SetStateAction<string | null>>;
}

const ChatInputTranscribe: FC<ChatInputTranscribeProps> = ({
  setTextFieldValue,
  onFileUpload,
  setParentModalIsOpen,
  setSubmitType,
  setFilePreviews,
  setFileFieldValue,
  setImageFieldValue,
  setUploadProgress,
  simulateClick,
  setTranscriptionStatus,
}) => {
  const t = useTranslations();
  const [isTranscribing, setIsTranscribing] = useState<boolean>(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (simulateClick && fileInputRef.current) {
      fileInputRef.current.click();
    }
  }, [simulateClick]);

  const handleButtonClick = () => {
    fileInputRef.current?.click();
  };

  const handleFileChange = async (
    event: React.ChangeEvent<HTMLInputElement>,
  ) => {
    if (event.target.files && event.target.files[0]) {
      const selectedFile = event.target.files[0];

      // Close the modal immediately after file selection
      setParentModalIsOpen(false);

      if (
        selectedFile.type.startsWith('audio/') ||
        selectedFile.type.startsWith('video/')
      ) {
        // Immediately start transcription
        await handleTranscribe(selectedFile);
      } else {
        toast.error(t('unsupportedFileType'));
      }
      // Reset the input so the same file can be selected again
      event.target.value = '';
    }
  };

  const fetchDataWithRetry = async (
    url: string,
    init: RequestInit = { method: 'GET' },
  ) => {
    const maxRetries = 5;
    const waitTime = 10000; // 10 seconds

    const operation = async () => {
      const response = await fetch(url, init);
      if (!response.ok) {
        if (response.status >= 500) {
          // Server error, can retry
          throw new Error(`ServerError: ${response.status}`);
        } else {
          // Client error, do not retry
          throw new Error(`ClientError: ${response.status}`);
        }
      }
      return response.json();
    };

    const onRetry = (attempt: number, error: Error) => {
      console.log(
        `Attempt ${attempt} failed: ${error.message}. Retrying in ${
          waitTime / 1000
        } seconds...`,
      );
    };

    try {
      const data = await retryOperation(
        operation,
        maxRetries,
        waitTime,
        onRetry,
      );
      return data;
    } catch (error) {
      console.error('Failed to fetch data after retries:', error);
      throw error;
    }
  };

  const handleTranscribe = async (file: File) => {
    setIsTranscribing(true);

    // Show uploading status
    setTranscriptionStatus(t('uploadingFile'));

    try {
      const filename = encodeURIComponent(file.name);
      const mimeType = encodeURIComponent(file.type);

      const base64Data = await new Promise<string>((resolve, reject) => {
        const reader = new FileReader();
        reader.onloadend = () => {
          const result = reader.result as string;
          const base64 = result.split(',')[1];
          resolve(base64);
        };
        reader.onerror = () => {
          reject(new Error('Error reading file'));
        };
        reader.readAsDataURL(file);
      });

      const uploadResponse = await fetch(
        `/api/file/upload?filename=${filename}&filetype=file&mime=${mimeType}`,
        {
          method: 'POST',
          body: base64Data,
          headers: {
            'x-file-name': filename,
          },
        },
      );

      if (!uploadResponse.ok) {
        throw new Error('Failed to upload file');
      }

      const uploadResult = await uploadResponse.json();
      const fileURI = uploadResult.uri;
      const fileID = encodeURIComponent(fileURI.split('/').pop());

      // Update status to transcribing
      setTranscriptionStatus(t('transcribingStatus'));

      const transcribeResult = await fetchDataWithRetry(
        `/api/file/${fileID}/transcribe?service=whisper`,
        {
          method: 'GET',
        },
      );

      const transcript = transcribeResult.transcript;

      // Format the transcription with markdown heading
      const fileName = file.name;
      const formattedTranscript = `## Transcription from ${fileName}\n\n${transcript}`;

      // Insert directly into chat input
      setTextFieldValue(formattedTranscript);

      // Clear status (transcription complete)
      setTranscriptionStatus(null);
    } catch (error) {
      console.error('Error during transcription:', error);
      setTranscriptionStatus(null);
      toast.error(t('transcriptionError'));
    } finally {
      setIsTranscribing(false);
    }
  };

  return (
    <>
      <input
        type="file"
        className="hidden"
        onChange={handleFileChange}
        accept="audio/*,video/*"
        ref={fileInputRef}
      />
      {!simulateClick && (
        <button
          onClick={handleButtonClick}
          disabled={isTranscribing}
          title={t('uploadAudioVideoFile')}
          className={`py-2 rounded-full hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors ${
            isTranscribing ? 'opacity-50 cursor-not-allowed' : ''
          }`}
        >
          <IconFileMusic className="text-black dark:text-white h-5 w-5" />
        </button>
      )}
    </>
  );
};

export default ChatInputTranscribe;
