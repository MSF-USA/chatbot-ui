import React, { FC, useEffect, useState, useRef, Dispatch, SetStateAction } from "react";
import MicIcon from "@/components/Icons/mic";
import { IconPlayerRecordFilled } from "@tabler/icons-react";

interface ChatInputVoiceCaptureProps {
    setTextFieldValue: Dispatch<SetStateAction<string>>;
    setIsTranscribing: Dispatch<SetStateAction<boolean>>;
}

const SILENCE_THRESHOLD = -50; // in decibels
const MAX_SILENT_DURATION = 6000; // in milliseconds

const ChatInputVoiceCapture: FC<ChatInputVoiceCaptureProps> = (
  {
    setTextFieldValue,
    setIsTranscribing,
  }
) => {
    const [hasMicrophone, setHasMicrophone] = useState(false);
    const [isRecording, setIsRecording] = useState(false);

    const mediaRecorderRef = useRef<MediaRecorder | null>(null);
    const mediaStreamRef = useRef<MediaStream | null>(null);
    const audioChunksRef = useRef<BlobPart[]>([]);

    const audioContextRef = useRef<AudioContext | null>(null);
    const analyserRef = useRef<AnalyserNode | null>(null);
    const silenceStartTimeRef = useRef<number | null>(null);
    const checkSilenceIntervalRef = useRef<number | null>(null);

    useEffect(() => {
        // Check for microphone availability
        navigator.mediaDevices
            .enumerateDevices()
            .then((devices) => {
                const hasMic = devices.some((device) => device.kind === "audioinput");
                setHasMicrophone(hasMic);
            })
            .catch((err) => {
                console.error("Error accessing media devices.", err);
                setHasMicrophone(false);
            });
    }, []);

    const startRecording = () => {
        navigator.mediaDevices
            .getUserMedia({ audio: true })
            .then((stream) => {
                mediaStreamRef.current = stream;
                const mediaRecorder = new MediaRecorder(stream);
                mediaRecorderRef.current = mediaRecorder;
                mediaRecorder.start();

                // Empty the chunks
                audioChunksRef.current = [];

                mediaRecorder.ondataavailable = (event) => {
                    audioChunksRef.current.push(event.data);
                };

                mediaRecorder.onstop = () => {
                    const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/webm' });
                    // Send audioBlob to the API to transcribe
                    transcribeAudio(audioBlob);
                };

                // Set up audio context for silence detection
                audioContextRef.current = new (window.AudioContext ||
                    (window as any).webkitAudioContext)();
                const source = audioContextRef.current.createMediaStreamSource(stream);
                analyserRef.current = audioContextRef.current.createAnalyser();
                analyserRef.current.minDecibels = -90;
                analyserRef.current.maxDecibels = -10;
                analyserRef.current.smoothingTimeConstant = 0.85;

                source.connect(analyserRef.current);

                // Start checking for silence
                silenceStartTimeRef.current = null;
                checkSilenceIntervalRef.current = window.setInterval(() => {
                    if (analyserRef.current) {
                        const dataArray = new Uint8Array(analyserRef.current.fftSize);
                        analyserRef.current.getByteTimeDomainData(dataArray);

                        // Calculate RMS (Root Mean Square) to get volume level
                        let sum = 0;
                        for (const amplitude of dataArray) {
                            const normalized = amplitude / 128 - 1;
                            sum += normalized * normalized;
                        }
                        const rms = Math.sqrt(sum / dataArray.length);
                        const db = 20 * Math.log10(rms);

                        if (db < SILENCE_THRESHOLD || isNaN(db)) {
                            if (silenceStartTimeRef.current === null) {
                                silenceStartTimeRef.current = Date.now();
                            } else {
                                const silentDuration = Date.now() - silenceStartTimeRef.current;
                                if (silentDuration > MAX_SILENT_DURATION) {
                                    // Stop recording due to silence
                                    stopRecording();
                                }
                            }
                        } else {
                            silenceStartTimeRef.current = null;
                        }
                    }
                }, 100);

                setIsRecording(true);
            })
            .catch((err) => {
                console.error("The following error occurred: " + err);
            });
    };

    const stopRecording = () => {
        if (
            mediaRecorderRef.current &&
            mediaRecorderRef.current.state !== "inactive"
        ) {
            mediaRecorderRef.current.stop();
        }
        if (mediaStreamRef.current) {
            mediaStreamRef.current.getTracks().forEach((track) => track.stop());
        }
        if (checkSilenceIntervalRef.current) {
            clearInterval(checkSilenceIntervalRef.current);
            checkSilenceIntervalRef.current = null;
        }
        if (audioContextRef.current) {
            audioContextRef.current.close();
            audioContextRef.current = null;
        }
        silenceStartTimeRef.current = null;
        setIsRecording(false);
    };

    const transcribeAudio = async (audioBlob: Blob) => {
        setIsTranscribing(true);
        try {
            const filename = 'audio.webm';
            const mimeType = 'audio/x-matroska';

            // Encode filename and MIME type
            const encodedFileName = encodeURIComponent(filename);
            const encodedMimeType = encodeURIComponent(mimeType);

            // Convert blob to base64
            const base64Chunk = await new Promise<string>((resolve) => {
                const reader = new FileReader();
                reader.onloadend = () => resolve(reader.result as string);
                reader.readAsDataURL(audioBlob);
            });

            // Remove the data URL prefix (e.g., "data:audio/webm;base64,")
            const base64Data = base64Chunk.split(',')[1];

            // Upload the audioBlob to the server
            const uploadResponse = await fetch(
              `/api/file/upload?filename=${encodedFileName}&filetype=file&mime=${encodedMimeType}`,
              {
                  method: 'POST',
                  body: base64Data,
                  headers: {
                      'x-file-name': encodedFileName,
                  },
              }
            );

            if (!uploadResponse.ok) {
                throw new Error('Failed to upload audio');
            }

            const uploadResult = await uploadResponse.json();
            const fileURI = uploadResult.uri;
            const fileID = encodeURIComponent(fileURI.split('/').pop());

            // Call the transcribe endpoint
            const transcribeResponse = await fetch(`/api/file/${fileID}/transcribe`, {
                method: 'GET',
            });

            if (!transcribeResponse.ok) {
                throw new Error('Failed to transcribe audio');
            }

            const transcribeResult = await transcribeResponse.json();
            const transcript = transcribeResult.transcript;

            setTextFieldValue((prevText) =>
              prevText?.length ? prevText + ' ' + transcript : transcript
            );
        } catch (error) {
            console.error('Error during transcription:', error);
        } finally {
            setIsTranscribing(false);
        }
    };

    if (!hasMicrophone) {
        return null; // Don't display the component if no microphones are available
    }

    return (
        <div className="voice-capture">
          <button
              className={isRecording ? ' backdrop-blur' : ''}
              onClick={isRecording ? stopRecording : startRecording}
              title={isRecording ? 'Click to stop recording' : 'Click to start recording'} // Tooltip added
          >
              {isRecording ? (
                <div className="flex items-center">
                    <IconPlayerRecordFilled className="rounded h-5 w-5 animate-pulse text-red-500" />
                    {/* Optional visible text to indicate stopping */}
                    <span className="ml-2 text-red-500">Click to stop recording</span>
                </div>
              ) : (
                <MicIcon className="text-black dark:text-white rounded h-5 w-5" />
              )}
              <span className="sr-only">
                {isRecording ? 'Click to stop recording' : 'Click to start recording'}
              </span>
          </button>
        </div>
    );
};

export default ChatInputVoiceCapture;
