'use client';

import { useVirtualizer } from '@tanstack/react-virtual';
import { useEffect, useRef } from 'react';

import { useChat } from '@/lib/hooks/chat/useChat';

import { Message } from '@/types/chat';

import { MessageItem } from './MessageItem';
import { StreamingMessage } from './StreamingMessage';

interface MessageListProps {
  messages: Message[];
}

// Use virtual scrolling for conversations with 30+ messages
const VIRTUAL_SCROLL_THRESHOLD = 30;

/**
 * Scrollable message list with auto-scroll and virtual scrolling for performance
 */
export function MessageList({ messages }: MessageListProps) {
  const parentRef = useRef<HTMLDivElement>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const { isStreaming, streamingContent } = useChat();

  // Use virtual scrolling for long conversations
  const useVirtualScroll = messages.length >= VIRTUAL_SCROLL_THRESHOLD;

  const virtualizer = useVirtualizer({
    count: messages.length,
    getScrollElement: () => parentRef.current,
    estimateSize: () => 150, // Estimated message height
    enabled: useVirtualScroll,
    overscan: 5, // Render 5 extra items above/below viewport
  });

  // Auto-scroll to bottom on new messages
  useEffect(() => {
    if (useVirtualScroll) {
      virtualizer.scrollToIndex(messages.length - 1, {
        align: 'end',
        behavior: 'smooth',
      });
    } else {
      messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages.length, streamingContent, useVirtualScroll, virtualizer]);

  // Render with virtual scrolling for long conversations
  if (useVirtualScroll) {
    return (
      <div
        ref={parentRef}
        className="flex h-full flex-col overflow-y-auto px-4 py-4"
      >
        <div
          style={{
            height: `${virtualizer.getTotalSize()}px`,
            width: '100%',
            position: 'relative',
          }}
          className="mx-auto max-w-3xl"
        >
          {virtualizer.getVirtualItems().map((virtualItem) => (
            <div
              key={virtualItem.key}
              style={{
                position: 'absolute',
                top: 0,
                left: 0,
                width: '100%',
                transform: `translateY(${virtualItem.start}px)`,
              }}
            >
              <div className="mb-4">
                <MessageItem
                  message={messages[virtualItem.index]}
                  messageIndex={virtualItem.index}
                />
              </div>
            </div>
          ))}

          {isStreaming && streamingContent && (
            <div
              style={{
                position: 'absolute',
                top: `${virtualizer.getTotalSize()}px`,
                width: '100%',
              }}
              className="mb-4"
            >
              <StreamingMessage content={streamingContent} />
            </div>
          )}
        </div>
      </div>
    );
  }

  // Regular rendering for short conversations
  return (
    <div className="flex h-full flex-col overflow-y-auto px-4 py-4">
      <div className="mx-auto w-full max-w-3xl space-y-4">
        {messages.map((message, index) => (
          <MessageItem key={index} message={message} messageIndex={index} />
        ))}

        {isStreaming && streamingContent && (
          <StreamingMessage content={streamingContent} />
        )}

        <div ref={messagesEndRef} />
      </div>
    </div>
  );
}
