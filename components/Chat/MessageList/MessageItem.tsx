'use client';

import { Message } from '@/types/chat';
import { MemoizedChatMessage } from '../MemoizedChatMessage';

interface MessageItemProps {
  message: Message;
  messageIndex: number;
  onEdit?: (message: Message) => void;
}

/**
 * Individual message item
 */
export function MessageItem({ message, messageIndex, onEdit }: MessageItemProps) {
  return (
    <MemoizedChatMessage
      message={message}
      messageIndex={messageIndex}
      onEdit={onEdit || (() => {})}
      onEditMessage={() => {}}
    />
  );
}
