import React, { FC, useState, Dispatch, SetStateAction } from 'react';
import {
  IconFileMusic
} from '@tabler/icons-react';
import {ChatInputSubmitTypes} from "@/types/chat";
import {useTranslation} from "next-i18next";

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
}

const ChatInputTranscribe: FC<ChatInputTranscribeProps> = (
  {
    setTextFieldValue,
    onFileUpload,
    setParentModalIsOpen,
    setSubmitType,
    setFilePreviews,
    setFileFieldValue,
    setImageFieldValue,
    setUploadProgress,
  }
) => {
  const { t } = useTranslation('transcribeModal');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [file, setFile] = useState<File | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isTranscribing, setIsTranscribing] = useState<boolean>(false);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);
  const [transcriptModalOpen, setTranscriptModalOpen] = useState<boolean>(false);
  const [transcript, setTranscript] = useState<string>('');

  const openModal = () => {
    setIsModalOpen(true);
    setFile(null);
    setError(null);
  };

  const closeModal = () => {
    setIsModalOpen(false);
    setFile(null);
    setError(null);
  };

  const closeTranscriptModal = () => {
    setTranscriptModalOpen(false);
    setTranscript('');
  };

  const handleFileChange = (
    event: React.ChangeEvent<HTMLInputElement>
  ) => {
    if (event.target.files && event.target.files[0]) {
      const selectedFile = event.target.files[0];
      if (
        selectedFile.type.startsWith('audio/') ||
        selectedFile.type.startsWith('video/')
      ) {
        setFile(selectedFile);
        setError(null);
      } else {
        setError(t('unsupportedFileType'));
      }
    }
  };

  const handleTranscribe = async () => {
    if (!file) {
      setError(t('pleaseSelectFile'));
      return;
    }

    setIsTranscribing(true);
    setError(null);
    setStatusMessage(t('uploadingFile'));

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
        `/api/v2/file/upload?filename=${filename}&filetype=file&mime=${mimeType}`,
        {
          method: 'POST',
          body: base64Data,
          headers: {
            'x-file-name': filename,
          },
        }
      );

      if (!uploadResponse.ok) {
        throw new Error('Failed to upload file');
      }

      const uploadResult = await uploadResponse.json();
      const fileURI = uploadResult.uri;
      const fileID = encodeURIComponent(fileURI.split('/').pop());

      setStatusMessage(t('transcribingStatus'));

      const transcribeResponse = await fetch(`/api/v2/file/${fileID}/transcribe?service=whisper`, {
        method: 'GET'
      });

      if (!transcribeResponse.ok) {
        throw new Error('Failed to transcribe file');
      }

      const transcribeResult = await transcribeResponse.json();
      const transcript = transcribeResult.transcript;

      setTranscript(transcript);
      closeModal();
      setTranscriptModalOpen(true);

    } catch (error) {
      console.error('Error during transcription:', error);
      setError(t('transcriptionError'));
    } finally {
      setIsTranscribing(false);
      setStatusMessage(null);
    }
  };

  const handleCopyToClipboard = () => {
    navigator.clipboard.writeText(transcript)
      .then(() => {
        // Optionally, provide feedback to user
        alert(t('copiedToClipboard'));
      })
      .catch((error) => {
        console.error('Failed to copy text:', error);
      });
  };

  const handleDownload = () => {
    const blob = new Blob([transcript], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = 'transcript.txt';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  const handleInjectToChat = async () => {
    try {
      const blob = new Blob([transcript], { type: 'text/plain' });
      const file = new File([blob], 'transcript.txt', { type: 'text/plain' });

      await onFileUpload(
        [file],
        setSubmitType,
        setFilePreviews,
        setFileFieldValue,
        setImageFieldValue,
        setUploadProgress,
      );

      closeTranscriptModal();
      setParentModalIsOpen(false);
    } catch (error) {
      console.error('Error injecting transcript to chat:', error);
    }
  };

  return (
    <div className="inline-block">
      <button onClick={openModal} title={t('uploadAudioVideoFile')} className="py-2 rounded-full hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors">
        <IconFileMusic className="text-black dark:text-white h-5 w-5"/>
      </button>

      {isModalOpen && (
        <div
          className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50"
          onClick={closeModal}
        >
          <div
            className="bg-white dark:bg-gray-800 rounded-lg w-11/12 max-w-md p-6 relative"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-xl font-bold">{t('title')}</h2>
              <button onClick={closeModal} title={t('close')} className="text-2xl leading-none">&times;</button>
            </div>
            <div className="mb-4">
              <div className="border-2 border-dashed border-gray-300 rounded-lg p-8 text-center cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-700">
                <label htmlFor="file-upload" className="block cursor-pointer">
                  <div>
                    <p className="mb-1"><strong>{t('clickToUpload')}</strong> { /* t('orDragAndDrop') */ }</p>
                    <p className="text-sm text-gray-500">{t('supportedFormats')}:  MP3, WAV, MP4, MOV</p>
                  </div>
                  <input
                    id="file-upload"
                    type="file"
                    className="hidden"
                    onChange={handleFileChange}
                    accept="audio/*,video/*"
                  />
                </label>
              </div>
              {file && (
                <div className="mt-2">
                  <p>{t('selectedFile')}: <strong>{file.name}</strong></p>
                </div>
              )}
              {error && (
                <p className="text-red-500 mt-2">{error}</p>
              )}
            </div>
            <div className="text-right">
              <button
                onClick={handleTranscribe}
                disabled={!file || isTranscribing}
                className={`px-4 py-2 rounded ${
                  !file || isTranscribing
                    ? 'bg-gray-300 cursor-not-allowed'
                    : 'bg-green-500 hover:bg-green-600 text-white'
                }`}
              >
                {isTranscribing ? t('transcribingButton') : t('transcribeButton')}
              </button>
            </div>

            {/* Overlay when transcribing */}
            {isTranscribing && (
              <div className="absolute inset-0 bg-white bg-opacity-75 dark:bg-gray-800 dark:bg-opacity-75 flex flex-col items-center justify-center">
                <svg
                  className="animate-spin h-8 w-8 text-blue-600 dark:text-blue-400"
                  xmlns="http://www.w3.org/2000/svg"
                  fill="none"
                  viewBox="0 0 24 24"
                >
                  <circle
                    className="opacity-25"
                    cx="12"
                    cy="12"
                    r="10"
                    stroke="currentColor"
                    strokeWidth="4"
                  />
                  <path
                    className="opacity-75"
                    fill="currentColor"
                    d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"
                  />
                </svg>
                {statusMessage && (
                  <p className="mt-2 text-gray-700 dark:text-gray-200">
                    {statusMessage}
                  </p>
                )}
              </div>
            )}
          </div>
        </div>
      )}

      {transcriptModalOpen && (
        <div
          className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50"
          onClick={closeTranscriptModal}
        >
          <div
            className="bg-white dark:bg-gray-800 rounded-lg w-11/12 max-w-md p-6 relative"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-xl font-bold">{t('transcriptionResult')}</h2>
              <button onClick={closeTranscriptModal} title={t('close')} className="text-2xl leading-none">&times;</button>
            </div>
            <div className="mb-4">
              <textarea
                readOnly
                value={transcript}
                className="w-full h-40 p-2 border border-gray-300 dark:border-gray-600 rounded-md text-gray-900 dark:text-white bg-white dark:bg-gray-700"
              />
            </div>
            <div className="flex justify-end space-x-2">
              <button
                onClick={handleCopyToClipboard}
                className="px-4 py-2 rounded bg-blue-500 hover:bg-blue-600 text-white"
              >
                {t('copyToClipboard')}
              </button>
              <button
                onClick={handleDownload}
                className="px-4 py-2 rounded bg-green-500 hover:bg-green-600 text-white"
              >
                {t('downloadAsTXT')}
              </button>
              <button
                onClick={handleInjectToChat}
                className="px-4 py-2 rounded bg-purple-500 hover:bg-purple-600 text-white"
              >
                {t('injectIntoChat')}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ChatInputTranscribe;
