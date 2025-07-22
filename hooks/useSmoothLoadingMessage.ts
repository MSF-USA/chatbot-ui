import { useEffect, useRef, useState } from 'react';

interface SmoothLoadingMessageOptions {
  message: string | null;
  streamInSpeed?: number; // chars per frame for streaming in
  streamInDelay?: number; // ms between frames for streaming in
  backspaceSpeed?: number; // chars per frame for removal (unused but kept for compatibility)
  backspaceDelay?: number; // ms between frames for removal (unused but kept for compatibility)
  enabled?: boolean; // Whether smooth effects are enabled
  skipFirstMessage?: boolean; // Whether to skip animating the first message (useful for loading chains)
}

/**
 * Custom hook to provide smooth streaming in effects for loading messages
 * 
 * Behavior:
 * - First message: May not display (can be skipped with skipFirstMessage=true)
 * - Subsequent messages: Clear instantly, then stream in character by character
 * - Message cleared: Clear instantly
 * 
 * Note: This hook works best for message sequences where the first message
 * can be skipped and subsequent messages need smooth transitions.
 * 
 * @returns {string} The text to display with smooth animation effects
 */
export const useSmoothLoadingMessage = ({
  message,
  streamInSpeed = 1,
  streamInDelay = 40,
  backspaceSpeed = 2, // Unused but kept for compatibility
  backspaceDelay = 25, // Unused but kept for compatibility
  enabled = true,
  skipFirstMessage = false,
}: SmoothLoadingMessageOptions): string => {
  const [displayedMessage, setDisplayedMessage] = useState<string>('');
  
  // Single source of truth for what we're working towards  
  const workingTowardsRef = useRef<string | null>(null);
  
  // Simple animation state tracking
  const animationStateRef = useRef<'idle' | 'streaming'>('idle');
  
  // Animation control
  const animationFrameRef = useRef<number | null>(null);
  const lastTimestampRef = useRef<number>(0);
  const targetMessageRef = useRef<string>('');
  const isFirstMessageRef = useRef<boolean>(true);

  // Simple streaming function
  const startStreaming = (targetMessage: string) => {
    // Clear any existing animation
    if (animationFrameRef.current !== null) {
      cancelAnimationFrame(animationFrameRef.current);
      animationFrameRef.current = null;
    }
    
    // Clear display and start fresh
    setDisplayedMessage('');
    animationStateRef.current = 'streaming';
    targetMessageRef.current = targetMessage;
    lastTimestampRef.current = 0;
    
    const animate = (timestamp: number) => {
      if (timestamp - lastTimestampRef.current < streamInDelay) {
        animationFrameRef.current = requestAnimationFrame(animate);
        return;
      }
      
      lastTimestampRef.current = timestamp;
      
      setDisplayedMessage((prev) => {
        if (prev.length >= targetMessageRef.current.length) {
          // Streaming complete
          animationStateRef.current = 'idle';
          return targetMessageRef.current;
        }
        
        const nextCharsCount = Math.min(streamInSpeed, targetMessageRef.current.length - prev.length);
        const newText = targetMessageRef.current.slice(0, prev.length + nextCharsCount);
        
        // Continue animation if not complete
        if (newText.length < targetMessageRef.current.length) {
          animationFrameRef.current = requestAnimationFrame(animate);
        } else {
          // Animation will complete with this update
          animationStateRef.current = 'idle';
        }
        
        return newText;
      });
    };
    
    animationFrameRef.current = requestAnimationFrame(animate);
  };

  useEffect(() => {
    // If smooth effects are disabled, just show the message immediately
    if (!enabled) {
      setDisplayedMessage(message || '');
      workingTowardsRef.current = message;
      return;
    }

    // Only act when the target actually changes
    if (message !== workingTowardsRef.current) {
      // Cancel any ongoing animation
      if (animationFrameRef.current !== null) {
        cancelAnimationFrame(animationFrameRef.current);
        animationFrameRef.current = null;
      }
      
      // Update our commitment
      workingTowardsRef.current = message;
      
      if (message === null) {
        // Clear immediately
        setDisplayedMessage('');
        animationStateRef.current = 'idle';
        isFirstMessageRef.current = true; // Reset for next sequence
      } else {
        // Check if we should skip first message
        if (skipFirstMessage && isFirstMessageRef.current) {
          // Skip animation for first message, just show it briefly or skip entirely
          setDisplayedMessage('');
          isFirstMessageRef.current = false;
        } else {
          // Start streaming new message (clears old automatically)
          startStreaming(message);
          isFirstMessageRef.current = false;
        }
      }
    }
  }, [message, enabled, streamInSpeed, streamInDelay]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (animationFrameRef.current !== null) {
        cancelAnimationFrame(animationFrameRef.current);
        animationFrameRef.current = null;
      }
    };
  }, []);

  return displayedMessage;
};