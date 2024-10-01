import React, { FC, useEffect, useState, useRef } from "react";
import MicIcon from "@/components/Icons/mic";
import { IconPlayerRecordFilled } from "@tabler/icons-react";

interface ChatInputVoiceCaptureProps {}

const SILENCE_THRESHOLD = -50; // in decibels
const MAX_SILENT_DURATION = 6000; // in milliseconds

const ChatInputVoiceCapture: FC<ChatInputVoiceCaptureProps> = () => {
    const [hasMicrophone, setHasMicrophone] = useState(false);
    const [isRecording, setIsRecording] = useState(false);
    const [transcribedText, setTranscribedText] = useState("");

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
        // Upload the audioBlob to the server
        try {
            const filename = 'audio.webm';
            const mimeType = 'audio/webm';

            // Create the query parameters
            const queryParams = new URLSearchParams({
                filename,
                filetype: 'webm',
                mime: mimeType,
            });

            const uploadResponse = await fetch(`/api/v2/file/upload?${queryParams.toString()}`, {
                method: 'POST',
                body: audioBlob,
                headers: {
                    'Content-Type': mimeType,
                },
            });

            if (!uploadResponse.ok) {
                throw new Error('Failed to upload audio');
            }

            const uploadResult = await uploadResponse.json();
            const fileURI = uploadResult.uri;
            const fileID = encodeURIComponent(fileURI.split('/').pop());

            // Call the transcribe endpoint
            const transcribeResponse = await fetch(`/api/v2/file/${fileID}/transcribe`, {
                method: 'GET',
            });

            if (!transcribeResponse.ok) {
                throw new Error('Failed to transcribe audio');
            }

            const transcribeResult = await transcribeResponse.json();
            const transcript = transcribeResult.transcript;

            setTranscribedText((prevText) => prevText + transcript);

        } catch (error) {
            console.error('Error during transcription:', error);
        }
    };

    if (!hasMicrophone) {
        return null; // Don't display the component if no microphones are available
    }

    return (
        <div className="voice-capture">
            <button onClick={isRecording ? stopRecording : startRecording}>
                {isRecording
                ? <IconPlayerRecordFilled className={'rounded h-5 w-5 animate-pulse text-red-500'} />
                : <MicIcon
                        className={`text-black dark:text-white rounded h-5 w-5`}
                    />
                }


                <span className="sr-only">Voice input</span>
            </button>
            {isRecording && <div className="recording-indicator">Recording...</div>}
            {transcribedText && (
                <div className="transcribed-text">Transcribed Text: {transcribedText}</div>
            )}
        </div>
    );
};

export default ChatInputVoiceCapture;
