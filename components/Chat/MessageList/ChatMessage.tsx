import { FC } from 'react';
import { Message } from '@/types/chat';

export interface Props {
  message: Message;
  messageIndex: number;
  onEdit?: (editedMessage: Message) => void;
  onEditMessage?: () => void;
}

export const ChatMessage: FC<Props> = ({ message }) => {
  return (
    <div className="p-4">
      <strong>{message.role}:</strong> {JSON.stringify(message.content)}
    </div>
  );
};
