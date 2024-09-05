import { IconRobot, IconUser } from '@tabler/icons-react';
import { FC, memo, useContext, useEffect, useRef, useState } from 'react';

import { useTranslation } from 'next-i18next';

import { updateConversation } from '@/utils/app/conversation';

import { Message, MessageType, getChatMessageContent } from '@/types/chat';

import ChatMessageFile from '@/components/Chat/ChatMessages/ChatMessageFile';
import ChatMessageImage from '@/components/Chat/ChatMessages/ChatMessageImage';
import ChatMessageText from '@/components/Chat/ChatMessages/ChatMessageText';

import HomeContext from '@/app/home.context';

export interface Props {
  message: Message;
  messageIndex: number;
  onEdit?: (editedMessage: Message) => void;
  onQuestionClick?: (question: string) => void;
}

export const ChatMessage: FC<Props> = memo(
  ({ message, messageIndex, onEdit, onQuestionClick }) => {
    const { t } = useTranslation('chat');

    const {
      state: {
        selectedConversation,
        conversations,
        currentMessage,
        messageIsStreaming,
      },
      dispatch: homeDispatch,
    } = useContext(HomeContext);

    const [isEditing, setIsEditing] = useState<boolean>(false);
    const [isTyping, setIsTyping] = useState<boolean>(false);
    const [messageContent, setMessageContent] = useState(message.content);
    const [messagedCopied, setMessageCopied] = useState(false);

    const textareaRef = useRef<HTMLTextAreaElement>(null);

    const toggleEditing = () => {
      setIsEditing(!isEditing);
    };

    const handleInputChange = (
      event: React.ChangeEvent<HTMLTextAreaElement>,
    ) => {
      setMessageContent(event.target.value);
      if (textareaRef.current) {
        textareaRef.current.style.height = 'inherit';
        textareaRef.current.style.height = `${textareaRef.current.scrollHeight}px`;
      }
    };

    const handleEditMessage = () => {
      if (message.content != messageContent) {
        if (selectedConversation && onEdit) {
          onEdit({ ...message, content: messageContent });
        }
      }
      setIsEditing(false);
    };

    const handleDeleteMessage = () => {
      if (!selectedConversation) return;

      const { messages } = selectedConversation;
      const findIndex = messages.findIndex((elm) => elm === message);

      if (findIndex < 0) return;

      if (
        findIndex < messages.length - 1 &&
        messages[findIndex + 1].role === 'assistant'
      ) {
        messages.splice(findIndex, 2);
      } else {
        messages.splice(findIndex, 1);
      }
      const updatedConversation = {
        ...selectedConversation,
        messages,
      };

      const { single, all } = updateConversation(
        updatedConversation,
        conversations,
      );
      homeDispatch({ field: 'selectedConversation', value: single });
      homeDispatch({ field: 'conversations', value: all });
    };

    const handlePressEnter = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
      if (e.key === 'Enter' && !isTyping && !e.shiftKey) {
        e.preventDefault();
        handleEditMessage();
      }
    };

    const copyOnClick = () => {
      if (!navigator.clipboard) return;

      const content = getChatMessageContent(message);
      navigator.clipboard.writeText(content).then(() => {
        setMessageCopied(true);
        setTimeout(() => {
          setMessageCopied(false);
        }, 2000);
      });
    };

    useEffect(() => {
      setMessageContent(message.content);
    }, [message.content]);

    useEffect(() => {
      if (textareaRef.current) {
        textareaRef.current.style.height = 'inherit';
        textareaRef.current.style.height = `${textareaRef.current.scrollHeight}px`;
      }
    }, [isEditing]);

    const isImageMessage =
      message.messageType === MessageType.IMAGE ||
      (Array.isArray(message.content) &&
        message.content.some((content) => content.type === 'image_url'));
    const isFileMessage =
      !isImageMessage &&
      (message.messageType === MessageType.FILE ||
        (Array.isArray(message.content) &&
          message.content.some((content) => content.type === 'file_url')));

    if (isImageMessage) {
      return (
        <ChatMessageImage
          message={message}
          handleDeleteMessage={handleDeleteMessage}
          onEdit={onEdit as any}
          handleEditMessage={handleEditMessage}
          handleInputChange={handleInputChange}
          handlePressEnter={handlePressEnter}
          setIsTyping={setIsTyping}
          isEditing={isEditing}
          setIsEditing={setIsEditing}
          toggleEditing={toggleEditing}
          textareaRef={textareaRef}
        />
      );
    } else if (isFileMessage) {
      return (
        <ChatMessageFile
          message={message}
          handleDeleteMessage={handleDeleteMessage}
          onEdit={onEdit as any}
          handleEditMessage={handleEditMessage}
          handleInputChange={handleInputChange}
          handlePressEnter={handlePressEnter}
          setIsTyping={setIsTyping}
          isEditing={isEditing}
          setIsEditing={setIsEditing}
          toggleEditing={toggleEditing}
          textareaRef={textareaRef}
        />
      );
    } else if (
      (message.messageType === MessageType.TEXT ||
        message.messageType === undefined) &&
      typeof message.content === 'string'
    ) {
      return (
        <ChatMessageText
          message={message}
          copyOnClick={copyOnClick}
          isEditing={isEditing}
          setIsEditing={setIsEditing}
          setIsTyping={setIsTyping}
          handleInputChange={handleInputChange}
          textareaRef={textareaRef}
          handlePressEnter={handlePressEnter}
          handleEditMessage={handleEditMessage}
          messageContent={messageContent as string}
          setMessageContent={setMessageContent}
          toggleEditing={toggleEditing}
          handleDeleteMessage={handleDeleteMessage}
          messageIsStreaming={messageIsStreaming}
          messageIndex={messageIndex}
          selectedConversation={selectedConversation}
          messageCopied={messagedCopied}
          onEdit={onEdit}
          onQuestionClick={onQuestionClick}
        />
      );
    } else {
      return (
        <div
          className={`group md:px-4 ${
            message.role === 'assistant'
              ? 'border-b border-black/10 bg-gray-50 text-gray-800 dark:border-gray-900/50 dark:bg-[#2f2f2f] dark:text-gray-100'
              : 'border-b border-black/10 bg-white text-gray-800 dark:border-gray-900/50 dark:bg-[#212121] dark:text-gray-100'
          }`}
          style={{ overflowWrap: 'anywhere' }}
        >
          <div className="relative m-auto flex p-4 text-base md:max-w-2xl md:gap-6 md:py-6 lg:max-w-2xl lg:px-0 xl:max-w-3xl">
            <div className="min-w-[40px] text-right font-bold">
              {message.role === 'assistant' ? (
                <IconRobot size={30} />
              ) : (
                <IconUser size={30} />
              )}
            </div>
            <div>Error displaying message...</div>
          </div>
        </div>
      );
    }
  },
);
ChatMessage.displayName = 'ChatMessage';
