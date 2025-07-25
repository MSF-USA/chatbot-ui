import {
  IconChevronDown,
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
  const [showSpeedDropdown, setShowSpeedDropdown] = useState<boolean>(false);

  const audioRef = useRef<HTMLAudioElement | null>(null);
  const animationFrameRef = useRef<number | null>(null);
  const speedDropdownRef = useRef<HTMLDivElement>(null);

  // Available playback speeds
  const speeds = [0.75, 1, 1.25, 1.5, 1.75, 2];

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
      // Set up initial animation loop regardless of auto-play status
      // This ensures UI updates even if autoplay is blocked
      startAnimationLoop();

      audioRef.current
        .play()
        .then(() => {
          setIsPlaying(true);
        })
        .catch((err) => {
          console.error('Failed to autoplay audio:', err);
        });
    }

    // Add click event listener to close dropdown when clicking outside
    const handleClickOutside = (event: MouseEvent) => {
      if (
        speedDropdownRef.current &&
        !speedDropdownRef.current.contains(event.target as Node)
      ) {
        setShowSpeedDropdown(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);

    return () => {
      stopAnimationLoop();
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  // Start animation loop for progress updates
  const startAnimationLoop = () => {
    // First ensure any existing loop is stopped to prevent multiple loops
    stopAnimationLoop();

    // Check if audio element exists
    if (!audioRef.current) return;

    // Define animation function
    const animate = () => {
      // Safety check for audio element
      if (!audioRef.current) {
        stopAnimationLoop();
        return;
      }

      // Update the progress state - only if playing
      if (audioRef.current && !audioRef.current.paused) {
        updateProgress();
      }

      // Schedule the next frame - always continue the loop
      animationFrameRef.current = requestAnimationFrame(animate);
    };

    // Start the animation loop immediately
    animationFrameRef.current = requestAnimationFrame(animate);

    // console.log("Animation loop started", new Date().toISOString());
  };

  // Stop animation loop
  const stopAnimationLoop = () => {
    if (animationFrameRef.current !== null) {
      cancelAnimationFrame(animationFrameRef.current);
      animationFrameRef.current = null;
    }
  };

  // Update progress bar during playback
  const updateProgress = () => {
    if (!audioRef.current) return;

    // Get current time and duration
    const currentTime = audioRef.current.currentTime;
    const duration = audioRef.current.duration;

    if (isNaN(duration) || duration === 0) return; // Check if duration is valid

    // Calculate progress percentage
    const progress = (currentTime / duration) * 100;

    // Always update during playback - optimizing this too much can cause visual glitches
    setAudioProgress(progress);
  };

  // Toggle play/pause
  const togglePlayback = () => {
    if (!audioRef.current) return;

    if (isPlaying) {
      audioRef.current.pause();
    } else {
      audioRef.current
        .play()
        .then(() => {
          // Explicit restart of animation loop on play
          startAnimationLoop();
        })
        .catch((err) => {
          console.error('Failed to play audio:', err);
        });
    }
  };

  // Seek to position in audio when progress bar is clicked
  const handleSeek = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!audioRef.current) return;

    const progressBar = e.currentTarget;
    const rect = progressBar.getBoundingClientRect();
    const clickPosition = (e.clientX - rect.left) / rect.width;

    // Calculate the new time position
    const newTime = clickPosition * audioRef.current.duration;

    // Set the new time
    audioRef.current.currentTime = newTime;

    // Update progress immediately for better UX
    setAudioProgress(clickPosition * 100);

    // Restart the animation loop if the audio is playing
    if (isPlaying) {
      stopAnimationLoop();
      startAnimationLoop();
    } else {
      // If paused and we seek, we still want to update the UI once
      updateProgress();
    }
  };

  // Handle audio end
  const handleAudioEnd = () => {
    setIsPlaying(false);
    setAudioProgress(0);
    stopAnimationLoop();
  };

  // Setup audio metadata when loaded
  const handleAudioLoad = () => {
    if (!audioRef.current) return;
    setAudioDuration(audioRef.current.duration);
  };

  // Effect to force time display updates even if progress isn't changing
  // This ensures the time display updates even when progress calculation has small differences
  useEffect(() => {
    let animationFrameId: number;
    const updateProgress = () => {
      if (audioRef.current) {
        setAudioProgress((prev) => {
          const currentTime = audioRef.current?.currentTime || 0;
          const duration = audioRef.current?.duration || 1;
          const exactProgress = (currentTime / duration) * 100;
          // Only update if the difference is significant
          if (Math.abs(exactProgress - prev) > 0.5) {
            return exactProgress;
          }
          return prev;
        });
      }
      animationFrameId = requestAnimationFrame(updateProgress);
    };
    if (isPlaying) {
      animationFrameId = requestAnimationFrame(updateProgress);
    }
    return () => cancelAnimationFrame(animationFrameId);
  }, [isPlaying]);

  // Toggle speed dropdown visibility
  const toggleSpeedDropdown = () => {
    setShowSpeedDropdown(!showSpeedDropdown);
  };

  // Change playback speed
  const changePlaybackSpeed = (speed: number) => {
    if (!audioRef.current) return;

    // Update playback speed
    setPlaybackSpeed(speed);
    audioRef.current.playbackRate = speed;

    // If currently playing, restart the animation loop to adapt to the new speed
    if (isPlaying) {
      stopAnimationLoop();
      startAnimationLoop();
    }

    setShowSpeedDropdown(false);
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
          startAnimationLoop();
        }}
        onPause={() => {
          setIsPlaying(false);
          stopAnimationLoop();
        }}
        onEnded={handleAudioEnd}
        onLoadedMetadata={handleAudioLoad}
        onSeeked={() => {
          // Ensure animation continues after seeking
          if (isPlaying) {
            stopAnimationLoop();
            startAnimationLoop();
          }
        }}
        className="hidden"
      />

      {/* Custom audio player UI */}
      <div className="flex flex-col">
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center">
            <button
              onClick={togglePlayback}
              className="mr-2 p-1 rounded-full hover:bg-gray-200 dark:hover:bg-gray-700 focus:outline-none"
              aria-label={isPlaying ? 'Pause' : 'Play'}
            >
              {isPlaying ? (
                <IconPlayerPause size={20} />
              ) : (
                <IconPlayerPlay size={20} />
              )}
            </button>
            <div className="text-xs text-gray-600 dark:text-gray-300">
              {formatTime(audioRef.current?.currentTime || 0)} /{' '}
              {formatTime(audioDuration)}
              {playbackSpeed !== 1 && (
                <span className="ml-1 text-xs text-gray-500 dark:text-gray-400">
                  ({playbackSpeed}x)
                </span>
              )}
            </div>
          </div>

          <div className="flex items-center">
            {/* Playback speed dropdown */}
            <div className="relative" ref={speedDropdownRef}>
              <button
                onClick={toggleSpeedDropdown}
                className="mx-1 px-2 py-1 text-xs rounded flex items-center bg-gray-200 hover:bg-gray-300 dark:bg-gray-700 dark:hover:bg-gray-600 focus:outline-none"
                aria-label="Change playback speed"
                title="Change playback speed"
              >
                {playbackSpeed}x <IconChevronDown size={14} className="ml-1" />
              </button>

              {/* Speed dropdown menu - now appears above the button */}
              {showSpeedDropdown && (
                <div className="absolute right-0 bottom-full mb-1 w-20 bg-white dark:bg-gray-800 rounded shadow-lg border border-gray-200 dark:border-gray-700 z-10">
                  {speeds.map((speed) => (
                    <button
                      key={speed}
                      onClick={() => changePlaybackSpeed(speed)}
                      className={`block w-full text-left px-3 py-1.5 text-xs hover:bg-gray-100 dark:hover:bg-gray-700 ${
                        speed === playbackSpeed
                          ? 'bg-gray-100 dark:bg-gray-700 font-semibold'
                          : ''
                      }`}
                    >
                      {speed}x
                    </button>
                  ))}
                </div>
              )}
            </div>

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
