import {
  IconDownload,
  IconPlayerPause,
  IconPlayerPlay,
  IconX,
} from '@tabler/icons-react';
import React, { useEffect, useRef, useState } from 'react';

interface AudioPlayerProps {
  audioUrl: string;
  onClose: () => void;
}

const AudioPlayer: React.FC<AudioPlayerProps> = ({ audioUrl, onClose }) => {
  const [isPlaying, setIsPlaying] = useState<boolean>(false);
  const [audioDuration, setAudioDuration] = useState<number>(0);
  const [audioProgress, setAudioProgress] = useState<number>(0);
  const [playbackSpeed, setPlaybackSpeed] = useState<number>(1);

  const audioRef = useRef<HTMLAudioElement | null>(null);
  const progressIntervalRef = useRef<NodeJS.Timeout | null>(null);

  // Format time from seconds to MM:SS
  const formatTime = (seconds: number): string => {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs < 10 ? '0' : ''}${secs}`;
  };

  // Clean up resources when component unmounts
  useEffect(() => {
    // Auto-play the audio when component mounts
    if (audioRef.current) {
      audioRef.current.play()
        .then(() => {
          setIsPlaying(true);
          // Set up progress tracking interval
          progressIntervalRef.current = setInterval(updateProgress, 100);
        })
        .catch(err => {
          console.error('Failed to autoplay audio:', err);
        });
    }

    return () => {
      if (progressIntervalRef.current) {
        clearInterval(progressIntervalRef.current);
      }
    };
  }, []);

  // Update progress bar during playback
  const updateProgress = () => {
    if (!audioRef.current) return;

    const progress = (audioRef.current.currentTime / audioRef.current.duration) * 100;
    setAudioProgress(progress);
  };

  // Toggle play/pause
  const togglePlayback = () => {
    if (!audioRef.current) return;

    if (isPlaying) {
      audioRef.current.pause();
    } else {
      audioRef.current.play();
    }
  };

  // Seek to position in audio when progress bar is clicked
  const handleSeek = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!audioRef.current) return;

    const progressBar = e.currentTarget;
    const rect = progressBar.getBoundingClientRect();
    const clickPosition = (e.clientX - rect.left) / rect.width;

    audioRef.current.currentTime = clickPosition * audioRef.current.duration;
    setAudioProgress(clickPosition * 100);
  };

  // Clean up resources when audio playback ends
  const handleAudioEnd = () => {
    setIsPlaying(false);
    setAudioProgress(0);
    if (progressIntervalRef.current) {
      clearInterval(progressIntervalRef.current);
      progressIntervalRef.current = null;
    }
  };

  // Setup audio metadata when loaded
  const handleAudioLoad = () => {
    if (!audioRef.current) return;
    setAudioDuration(audioRef.current.duration);
  };

  // Change playback speed
  const changePlaybackSpeed = () => {
    if (!audioRef.current) return;

    // Cycle through common playback speeds: 1.0 -> 1.5 -> 2.0 -> 0.75 -> 1.0
    const speeds = [1, 1.25, 1.5, 1.75, 2, 0.75];
    const currentIndex = speeds.indexOf(playbackSpeed);
    const nextIndex = (currentIndex + 1) % speeds.length;
    const newSpeed = speeds[nextIndex];

    setPlaybackSpeed(newSpeed);
    audioRef.current.playbackRate = newSpeed;
  };

  // Download audio file
  const handleDownload = () => {
    const a = document.createElement('a');
    a.href = audioUrl;
    a.download = 'assistant-audio.mp3';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  };

  return (
    <div className="mb-4 rounded-md border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 p-3">
      {/* Hidden native audio element for functionality */}
      <audio
        ref={audioRef}
        src={audioUrl}
        onPlay={() => {
          setIsPlaying(true);
          if (progressIntervalRef.current === null) {
            progressIntervalRef.current = setInterval(updateProgress, 100);
          }
        }}
        onPause={() => {
          setIsPlaying(false);
          if (progressIntervalRef.current) {
            clearInterval(progressIntervalRef.current);
            progressIntervalRef.current = null;
          }
        }}
        onEnded={handleAudioEnd}
        onLoadedMetadata={handleAudioLoad}
        className="hidden"
      />

      {/* Custom audio player UI */}
      <div className="flex flex-col">
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center">
            <button
              onClick={togglePlayback}
              className="mr-2 p-1 rounded-full hover:bg-gray-200 dark:hover:bg-gray-700 focus:outline-none"
              aria-label={isPlaying ? "Pause" : "Play"}
            >
              {isPlaying ?
                <IconPlayerPause size={20} /> :
                <IconPlayerPlay size={20} />
              }
            </button>
            <div className="text-xs text-gray-600 dark:text-gray-300">
              {formatTime(audioRef.current?.currentTime || 0)} / {formatTime(audioDuration)}
            </div>
          </div>

          <div className="flex items-center">
            {/* Playback speed button */}
            <button
              onClick={changePlaybackSpeed}
              className="mx-1 px-2 py-1 text-xs rounded bg-gray-200 hover:bg-gray-300 dark:bg-gray-700 dark:hover:bg-gray-600 focus:outline-none"
              aria-label="Change playback speed"
              title="Change playback speed"
            >
              {playbackSpeed}x
            </button>

            {/* Download button */}
            <button
              onClick={handleDownload}
              className="mx-1 p-1 rounded-full hover:bg-gray-200 dark:hover:bg-gray-700 focus:outline-none"
              aria-label="Download audio"
              title="Download audio"
            >
              <IconDownload size={18} />
            </button>

            {/* Close button */}
            <button
              onClick={onClose}
              className="p-1 rounded-full hover:bg-gray-200 dark:hover:bg-gray-700 focus:outline-none"
              aria-label="Close audio player"
              title="Close audio player"
            >
              <IconX size={18} />
            </button>
          </div>
        </div>

        {/* Progress bar */}
        <div
          className="relative h-2 rounded-full bg-gray-200 dark:bg-gray-700 cursor-pointer"
          onClick={handleSeek}
        >
          <div
            className="absolute top-0 left-0 h-2 rounded-full bg-blue-500 dark:bg-blue-600 transition-all duration-100"
            style={{ width: `${audioProgress}%` }}
          ></div>
        </div>
      </div>
    </div>
  );
};

export default AudioPlayer;
