import { useEffect, useState, useRef } from 'react';

interface SmoothStreamingOptions {
  isStreaming: boolean;      // Whether the actual data is streaming
  content: string;           // The full content to display
  charsPerFrame?: number;    // How many characters to add per animation frame
  frameDelay?: number;       // Milliseconds between frames
  enabled?: boolean;         // Whether smooth streaming is enabled
}

/**
 * Custom hook to provide a smooth text streaming animation between actual content chunks
 *
 * @returns {string} The text to display with the smooth animation effect
 */
export const useSmoothStreaming = ({
  isStreaming,
  content,
  charsPerFrame = 6,
  frameDelay = 10,
  enabled = true,
}: SmoothStreamingOptions): string => {
  const [displayedContent, setDisplayedContent] = useState<string>('');
  const contentRef = useRef<string>('');
  const animationFrameRef = useRef<number | null>(null);
  const lastTimestampRef = useRef<number>(0);



  useEffect(() => {
    // If not streaming, immediately show full content
    if (!isStreaming) {
      setDisplayedContent(content);
      contentRef.current = content;
      if (animationFrameRef.current !== null) {
        cancelAnimationFrame(animationFrameRef.current);
        animationFrameRef.current = null;
      }
      return;
    }

    // Content ref stores the latest content from the props
    contentRef.current = content;

    // Start or continue animation
    const animateText = (timestamp: number) => {
      // Only update based on frameDelay
      if (timestamp - lastTimestampRef.current < frameDelay) {
        animationFrameRef.current = requestAnimationFrame(animateText);
        return;
      }

      // Update the timestamp reference
      lastTimestampRef.current = timestamp;

      setDisplayedContent(prev => {
        // If the animation has caught up, stop
        if (prev.length >= contentRef.current.length) {
          if (animationFrameRef.current !== null) {
            cancelAnimationFrame(animationFrameRef.current);
            animationFrameRef.current = null;
          }
          return contentRef.current;
        }

        // Calculate how many characters to add in this frame
        const nextCharsCount = Math.min(
          charsPerFrame,
          contentRef.current.length - prev.length
        );

        // Add the next set of characters from the content
        const newContent = prev + contentRef.current.slice(prev.length, prev.length + nextCharsCount);

        // Continue animation if not caught up
        if (newContent.length < contentRef.current.length) {
          animationFrameRef.current = requestAnimationFrame(animateText);
        } else {
          if (animationFrameRef.current !== null) {
            cancelAnimationFrame(animationFrameRef.current);
            animationFrameRef.current = null;
          }
        }

        return newContent;
      });
    };

    // Start the animation if not already running
    if (animationFrameRef.current === null) {
      animationFrameRef.current = requestAnimationFrame(animateText);
    }

    // Clean up animation frame on unmount or when streaming stops
    return () => {
      if (animationFrameRef.current !== null) {
        cancelAnimationFrame(animationFrameRef.current);
        animationFrameRef.current = null;
      }
    };
  }, [content, isStreaming, frameDelay, charsPerFrame]);

  // If smooth streaming is disabled, simply return the full content
  if (!enabled) {
    return content;
  }

  return displayedContent;
};
