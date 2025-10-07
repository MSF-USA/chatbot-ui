import { FC, Dispatch, SetStateAction, KeyboardEvent } from 'react';

import { AssistantMessage } from '@/components/Chat/ChatMessages/AssistantMessage';
import { UserMessage } from '@/components/Chat/ChatMessages/UserMessage';
import { Message, Conversation } from '@/types/chat';

interface ChatMessageTextProps {
  message: Message;
  copyOnClick: () => void;
  isEditing: boolean;
  setIsEditing: Dispatch<SetStateAction<boolean>>;
  setIsTyping: Dispatch<SetStateAction<boolean>>;
  handleInputChange: (event: React.ChangeEvent<HTMLTextAreaElement>) => void;
  textareaRef: React.RefObject<HTMLTextAreaElement>;
  handlePressEnter: (event: KeyboardEvent<HTMLTextAreaElement>) => void;
  handleEditMessage: () => void;
  messageContent: string;
  setMessageContent: Dispatch<SetStateAction<string>>;
  toggleEditing: (event: React.MouseEvent) => void;
  handleDeleteMessage: () => void;
  messageIsStreaming: boolean;
  messageIndex: number;
  selectedConversation: Conversation;
  messageCopied: boolean;
  onEdit?: (message: Message) => void;
  onQuestionClick?: (question: string) => void;
}

export const ChatMessageText: FC<ChatMessageTextProps> = ({
  message,
  copyOnClick,
  isEditing,
  setIsEditing,
  setIsTyping,
  handleInputChange,
  textareaRef,
  handlePressEnter,
  handleEditMessage,
  messageContent,
  setMessageContent,
  toggleEditing,
  handleDeleteMessage,
  messageIsStreaming,
  messageIndex,
  selectedConversation,
  messageCopied,
  onEdit,
  onQuestionClick,
}) => {
  const { role, content } = message;

  return (
    <div
      className={`group md:px-4 ${
        role === 'assistant'
          ? 'border-b border-black/10 bg-gray-50 text-gray-800 dark:border-gray-900/50 dark:bg-[#2f2f2f] dark:text-gray-100'
          : 'border-b border-black/10 bg-white text-gray-800 dark:border-gray-900/50 dark:bg-[#212121] dark:text-gray-100'
      }`}
      style={{ overflowWrap: 'anywhere' }}
    >
      {role === 'assistant' ? (
        <AssistantMessage
          content={content}
          message={message}
          copyOnClick={copyOnClick}
          messageIsStreaming={messageIsStreaming}
          messageIndex={messageIndex}
          selectedConversation={selectedConversation}
          messageCopied={messageCopied}
        />
      ) : (
        <UserMessage
          message={message}
          messageContent={messageContent}
          isEditing={isEditing}
          textareaRef={textareaRef}
          handleInputChange={handleInputChange}
          handlePressEnter={handlePressEnter}
          setIsTyping={setIsTyping}
          setMessageContent={setMessageContent}
          setIsEditing={setIsEditing}
          toggleEditing={toggleEditing}
          handleDeleteMessage={handleDeleteMessage}
          onEdit={onEdit}
          selectedConversation={selectedConversation}
        />
      )}
    </div>
  );
};

export default ChatMessageText;