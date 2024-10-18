import React, { FC, useState, Dispatch, SetStateAction } from 'react';
import {
  IconFileMusic
} from '@tabler/icons-react';

interface ChatInputTranscribeProps {
  setTextFieldValue: Dispatch<SetStateAction<string>>;
}

const ChatInputTranscribe: FC<ChatInputTranscribeProps> = (
  {
    setTextFieldValue,
  }
) => {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [file, setFile] = useState<File | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isTranscribing, setIsTranscribing] = useState<boolean>(false);

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
        setError('Unsupported file type. Please select an audio or video file.');
      }
    }
  };

  const handleTranscribe = async () => {
    if (!file) {
      setError('Please select a file to transcribe.');
      return;
    }

    setIsTranscribing(true);
    setError(null);

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

      const transcribeResponse = await fetch(`/api/v2/file/${fileID}/transcribe?service=whisper`, {
        method: 'GET'
      });

      if (!transcribeResponse.ok) {
        throw new Error('Failed to transcribe file');
      }

      const transcribeResult = await transcribeResponse.json();
      const transcript = transcribeResult.transcript;

      setTextFieldValue((prevText) =>
        prevText?.length ? prevText + ' ' + transcript : transcript
      );
      closeModal();

    } catch (error) {
      console.error('Error during transcription:', error);
      setError('An error occurred during transcription. Please try again.');
    } finally {
      setIsTranscribing(false);
    }
  };

  return (
    <div className="inline-block">
      <button onClick={openModal} title="Upload audio or video file" className="p-2 rounded-full hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors">
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
              <h2 className="text-xl font-bold">Upload Audio/Video File</h2>
              <button onClick={closeModal} title="Close" className="text-2xl leading-none">&times;</button>
            </div>
            <div className="mb-4">
              <div className="border-2 border-dashed border-gray-300 rounded-lg p-8 text-center cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-700">
                <label htmlFor="file-upload" className="block cursor-pointer">
                  <div>
                    <p className="mb-1"><strong>Click to upload</strong> or drag and drop</p>
                    <p className="text-sm text-gray-500">Supported formats: MP3, WAV, MP4, MOV</p>
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
                  <p>Selected file: <strong>{file.name}</strong></p>
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
                {isTranscribing ? 'Transcribing...' : 'Transcribe'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ChatInputTranscribe;
