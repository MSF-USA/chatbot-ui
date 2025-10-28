import { FC, useEffect, useRef, useState } from 'react';

import { useTranslations } from 'next-intl';

import { useChat } from '@/lib/hooks/chat/useChat';
import { useConversations } from '@/lib/hooks/conversation/useConversations';

import {
  FileMessageContent,
  ImageMessageContent,
  Message,
  MessageType,
  TextMessageContent,
  getChatMessageContent,
} from '@/types/chat';

import { AssistantMessage } from '@/components/Chat/ChatMessages/AssistantMessage';
import ChatMessageText from '@/components/Chat/ChatMessages/ChatMessageText';
import { FileContent } from '@/components/Chat/ChatMessages/FileContent';
import { ImageContent } from '@/components/Chat/ChatMessages/ImageContent';
import { UserMessage } from '@/components/Chat/ChatMessages/UserMessage';
import { TranscriptViewer } from '@/components/Chat/TranscriptViewer';

export interface Props {
  message: Message;
  messageIndex: number;
  onEdit?: (editedMessage: Message) => void;
  onEditMessage?: () => void;
  onQuestionClick?: (question: string) => void;
  onRegenerate?: () => void;
  onSaveAsPrompt?: (content: string) => void;
}

export const ChatMessage: FC<Props> = ({
  message,
  messageIndex,
  onEdit,
  onQuestionClick,
  onRegenerate,
  onSaveAsPrompt,
}) => {
  const t = useTranslations();
  const { selectedConversation, updateConversation, conversations } =
    useConversations();
  const { isStreaming: messageIsStreaming } = useChat();

  const [isEditing, setIsEditing] = useState<boolean>(false);
  const [isTyping, setIsTyping] = useState<boolean>(false);
  const [messageContent, setMessageContent] = useState(message.content);
  const [messagedCopied, setMessageCopied] = useState(false);

  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const toggleEditing = () => {
    setIsEditing(!isEditing);
  };

  const handleInputChange = (event: React.ChangeEvent<HTMLTextAreaElement>) => {
    setMessageContent(event.target.value);
    if (textareaRef.current) {
      textareaRef.current.style.height = 'inherit';
      textareaRef.current.style.height = `${textareaRef.current.scrollHeight}px`;
    }
  };

  const handleEditMessage = () => {
    if (message.content !== messageContent) {
      if (selectedConversation && onEdit) {
        onEdit({ ...message, content: messageContent });
      }
    }
    setIsEditing(false);
  };

  const handleDeleteMessage = () => {
    if (!selectedConversation) return;

    const messages = [...selectedConversation.messages];
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

    updateConversation(selectedConversation.id, {
      ...selectedConversation,
      messages,
    });
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

  const handleSaveAsPromptClick = () => {
    const content = getChatMessageContent(message);
    if (onSaveAsPrompt) {
      onSaveAsPrompt(content);
    }
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

  // Check if message has images or files
  const hasImages =
    Array.isArray(message.content) &&
    message.content.some((content) => content.type === 'image_url');
  const hasFiles =
    Array.isArray(message.content) &&
    message.content.some((content) => content.type === 'file_url');

  // Extract content by type
  const getContentByType = () => {
    if (!Array.isArray(message.content))
      return { images: [], files: [], text: null };

    const images = message.content.filter(
      (c) => c.type === 'image_url',
    ) as ImageMessageContent[];
    const files = message.content.filter(
      (c) => c.type === 'file_url',
    ) as FileMessageContent[];
    const text = message.content.find((c) => c.type === 'text') as
      | TextMessageContent
      | undefined;

    return { images, files, text };
  };

  // Handle translate action - sends a new message to translate the transcript
  const handleTranslate = (transcript: string, targetLanguage: string) => {
    if (!onQuestionClick) return;

    // Language names for better readability in the prompt
    const languageNames: Record<string, string> = {
      en: 'English',
      es: 'Spanish',
      fr: 'French',
      de: 'German',
      nl: 'Dutch',
      it: 'Italian',
      pt: 'Portuguese',
      ru: 'Russian',
      zh: 'Chinese',
      ja: 'Japanese',
      ko: 'Korean',
      ar: 'Arabic',
      hi: 'Hindi',
    };

    const languageName = languageNames[targetLanguage] || targetLanguage;

    // Send the translation request immediately
    onQuestionClick(
      `Please translate the following transcript to ${languageName}:\n\n${transcript}`,
    );
  };

  // Render transcript viewer for transcription messages
  if (message.transcript && message.role === 'assistant') {
    return (
      <div className="group text-gray-800 dark:text-gray-100">
        <AssistantMessage
          content={typeof message.content === 'string' ? message.content : ''}
          message={message}
          copyOnClick={copyOnClick}
          messageIsStreaming={messageIsStreaming}
          messageIndex={messageIndex}
          selectedConversation={selectedConversation}
          messageCopied={messagedCopied}
          onRegenerate={onRegenerate}
        >
          {message.transcript.processedContent && (
            <div className="prose dark:prose-invert max-w-none mb-4">
              {message.transcript.processedContent}
            </div>
          )}
          <TranscriptViewer
            filename={message.transcript.filename}
            transcript={message.transcript.transcript}
            processedContent={message.transcript.processedContent}
            onTranslate={handleTranslate}
          />
        </AssistantMessage>
      </div>
    );
  }

  // Render image messages with composition
  if (hasImages) {
    const { images, text } = getContentByType();
    const textContent = text?.text || '';

    if (message.role === 'user') {
      return (
        <UserMessage
          message={message}
          messageContent={textContent}
          setMessageContent={setMessageContent}
          isEditing={isEditing}
          textareaRef={textareaRef}
          handleInputChange={handleInputChange}
          handlePressEnter={handlePressEnter}
          setIsTyping={setIsTyping}
          setIsEditing={setIsEditing}
          toggleEditing={toggleEditing}
          handleDeleteMessage={handleDeleteMessage}
          onEdit={onEdit || (() => {})}
          selectedConversation={selectedConversation}
          onRegenerate={onRegenerate}
          onSaveAsPrompt={handleSaveAsPromptClick}
        >
          <ImageContent images={images} />
          {text && (
            <div className="prose prose-invert prose-p:my-2 text-white max-w-none mt-2">
              {text.text}
            </div>
          )}
        </UserMessage>
      );
    } else {
      return (
        <div className="group text-gray-800 dark:text-gray-100">
          <AssistantMessage
            content={textContent}
            message={message}
            copyOnClick={copyOnClick}
            messageIsStreaming={messageIsStreaming}
            messageIndex={messageIndex}
            selectedConversation={selectedConversation}
            messageCopied={messagedCopied}
            onRegenerate={onRegenerate}
          >
            <div className="mb-3">
              <ImageContent images={images} />
            </div>
            {text && <div className="prose dark:prose-invert">{text.text}</div>}
          </AssistantMessage>
        </div>
      );
    }
  }

  // Render file messages with composition
  if (hasFiles) {
    const { images, files, text } = getContentByType();
    const textContent = text?.text || '';

    if (message.role === 'user') {
      return (
        <UserMessage
          message={message}
          messageContent={textContent}
          setMessageContent={setMessageContent}
          isEditing={isEditing}
          textareaRef={textareaRef}
          handleInputChange={handleInputChange}
          handlePressEnter={handlePressEnter}
          setIsTyping={setIsTyping}
          setIsEditing={setIsEditing}
          toggleEditing={toggleEditing}
          handleDeleteMessage={handleDeleteMessage}
          onEdit={onEdit || (() => {})}
          selectedConversation={selectedConversation}
          onRegenerate={onRegenerate}
          onSaveAsPrompt={handleSaveAsPromptClick}
        >
          <FileContent files={files} images={images} />
          {text && (
            <div className="prose prose-invert prose-p:my-2 text-white max-w-none mt-2">
              {text.text}
            </div>
          )}
        </UserMessage>
      );
    } else {
      return (
        <div className="group text-gray-800 dark:text-gray-100">
          <AssistantMessage
            content={textContent}
            message={message}
            copyOnClick={copyOnClick}
            messageIsStreaming={messageIsStreaming}
            messageIndex={messageIndex}
            selectedConversation={selectedConversation}
            messageCopied={messagedCopied}
            onRegenerate={onRegenerate}
          >
            <div className="mb-3">
              <FileContent files={files} images={images} />
            </div>
            {text && <div className="prose dark:prose-invert">{text.text}</div>}
          </AssistantMessage>
        </div>
      );
    }
  }

  // Render text-only messages
  if (
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
        onRegenerate={onRegenerate}
        onSaveAsPrompt={handleSaveAsPromptClick}
      />
    );
  } else {
    return (
      <div
        className={`group md:px-4 ${
          message.role === 'assistant'
            ? 'border-b border-black/10 bg-gray-50 text-gray-800 dark:border-gray-900/50 dark:bg-[#2f2f2f] dark:text-gray-100'
            : 'border-b border-black/10 bg-white text-gray-800 dark:border-gray-900/50 dark:bg-[#2f2f2f] dark:text-gray-100'
        }`}
      >
        <div className="relative m-auto flex p-4 text-base md:max-w-2xl md:gap-6 md:py-6 lg:max-w-2xl lg:px-0 xl:max-w-3xl">
          <div className="prose mt-[-2px] w-full dark:prose-invert">
            Error rendering message: Unsupported message type
          </div>
        </div>
      </div>
    );
  }
};
