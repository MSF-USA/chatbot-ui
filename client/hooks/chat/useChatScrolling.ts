import { useEffect, useRef, useState } from 'react';

import { scrollToBottom } from '@/lib/utils/app/scrolling';

import { UI_CONSTANTS } from '@/lib/constants/ui';

interface UseChatScrollingProps {
  selectedConversationId?: string;
  messageCount: number;
  isStreaming: boolean;
  streamingContent?: string;
}

/**
 * Custom hook to manage all chat scrolling behavior
 * Handles auto-scroll, manual scroll detection, scroll button, and refs
 */
export function useChatScrolling({
  selectedConversationId,
  messageCount,
  isStreaming,
  streamingContent,
}: UseChatScrollingProps) {
  // Scroll-related state
  const [showScrollDownButton, setShowScrollDownButton] = useState(false);

  // DOM refs
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const chatContainerRef = useRef<HTMLDivElement>(null);
  const lastMessageRef = useRef<HTMLDivElement>(null);

  // Tracking refs
  const previousMessageCountRef = useRef<number>(0);
  const wasStreamingRef = useRef(false);
  const isInitialRenderRef = useRef(true);
  const shouldAutoScrollRef = useRef(true);

  // Reset scroll state when conversation changes
  useEffect(() => {
    isInitialRenderRef.current = true;
    previousMessageCountRef.current = 0;
    wasStreamingRef.current = false;
  }, [selectedConversationId]);

  // Smooth scroll to bottom on new messages (NOT during or after streaming)
  useEffect(() => {
    const currentMessageCount = messageCount;
    const previousCount = previousMessageCountRef.current;

    const streamingJustCompleted =
      wasStreamingRef.current === true && !isStreaming;

    // Only scroll to bottom for new messages when:
    // 1. Message count increased (new message added)
    // 2. Not currently streaming
    // 3. Streaming didn't just complete (let it stay where it is)
    // 4. Should auto scroll (user hasn't manually scrolled away)
    if (
      currentMessageCount > previousCount &&
      !isStreaming &&
      !streamingJustCompleted &&
      shouldAutoScrollRef.current &&
      chatContainerRef.current
    ) {
      setTimeout(() => {
        if (chatContainerRef.current) {
          chatContainerRef.current.scrollTo({
            top: chatContainerRef.current.scrollHeight,
            behavior: 'smooth',
          });
        }
      }, 0);
    }

    previousMessageCountRef.current = currentMessageCount;
    wasStreamingRef.current = isStreaming;
    isInitialRenderRef.current = false;
  }, [messageCount, isStreaming]);

  // When streaming starts, assume we want to follow it
  useEffect(() => {
    if (isStreaming) {
      shouldAutoScrollRef.current = true;
    }
  }, [isStreaming]);

  // Detect manual scroll during streaming
  useEffect(() => {
    const handleScrollDuringStream = () => {
      if (isStreaming && chatContainerRef.current) {
        const container = chatContainerRef.current;
        const distanceFromBottom =
          container.scrollHeight - container.scrollTop - container.clientHeight;

        if (distanceFromBottom > UI_CONSTANTS.SCROLL.AUTO_SCROLL_THRESHOLD) {
          shouldAutoScrollRef.current = false;
          setShowScrollDownButton(true);
        }
      }
    };

    const container = chatContainerRef.current;
    if (container) {
      container.addEventListener('wheel', handleScrollDuringStream, {
        passive: true,
      });
      container.addEventListener('touchmove', handleScrollDuringStream, {
        passive: true,
      });
      return () => {
        container.removeEventListener('wheel', handleScrollDuringStream);
        container.removeEventListener('touchmove', handleScrollDuringStream);
      };
    }
  }, [isStreaming]);

  // Smooth auto-scroll during streaming - stops when streaming ends
  useEffect(() => {
    if (!isStreaming || !shouldAutoScrollRef.current) {
      return;
    }

    let animationFrameId: number;

    const smoothScroll = () => {
      const container = chatContainerRef.current;
      if (!container || !shouldAutoScrollRef.current || !isStreaming) return;

      const targetScroll = container.scrollHeight - container.clientHeight;
      const currentScroll = container.scrollTop;
      const diff = targetScroll - currentScroll;

      if (Math.abs(diff) > 0.5) {
        container.scrollTop = currentScroll + diff * 0.2;
      } else {
        container.scrollTop = targetScroll;
      }

      animationFrameId = requestAnimationFrame(smoothScroll);
    };

    animationFrameId = requestAnimationFrame(smoothScroll);

    return () => {
      if (animationFrameId) {
        cancelAnimationFrame(animationFrameId);
      }
    };
  }, [isStreaming]);

  // Handle scroll detection for scroll-down button
  useEffect(() => {
    const handleScroll = () => {
      const container = chatContainerRef.current;
      if (!container) return;

      const isAtBottom =
        container.scrollHeight - container.scrollTop - container.clientHeight <
        100;

      const hasContent = messageCount > 0 || !!streamingContent;
      setShowScrollDownButton(!isAtBottom && hasContent);
    };

    const container = chatContainerRef.current;
    if (container) {
      container.addEventListener('scroll', handleScroll);
      return () => container.removeEventListener('scroll', handleScroll);
    }
  }, [messageCount, streamingContent]);

  const handleScrollDown = () => {
    scrollToBottom(messagesEndRef, 'smooth');
  };

  return {
    // Refs for DOM
    messagesEndRef,
    chatContainerRef,
    lastMessageRef,
    // State
    showScrollDownButton,
    // Handlers
    handleScrollDown,
  };
}
