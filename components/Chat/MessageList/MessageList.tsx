'use client';

import { useEffect, useRef } from 'react';
import { Message } from '@/types/chat';
import { MessageItem } from './MessageItem';
import { useChat } from '@/lib/hooks/chat/useChat';
import { StreamingMessage } from './StreamingMessage';

interface MessageListProps {
  messages: Message[];
}

/**
 * Scrollable message list with auto-scroll
 */
export function MessageList({ messages }: MessageListProps) {
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const { isStreaming, streamingContent } = useChat();

  // Auto-scroll to bottom on new messages
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, streamingContent]);

  return (
    <div className="flex h-full flex-col overflow-y-auto px-4 py-4">
      <div className="mx-auto w-full max-w-3xl space-y-4">
        {messages.map((message, index) => (
          <MessageItem
            key={message.id || index}
            message={message}
            messageIndex={index}
          />
        ))}

        {isStreaming && streamingContent && (
          <StreamingMessage content={streamingContent} />
        )}

        <div ref={messagesEndRef} />
      </div>
    </div>
  );
}
