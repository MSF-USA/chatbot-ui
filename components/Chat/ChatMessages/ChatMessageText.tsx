import {
  IconBlockquote,
  IconCheck,
  IconCopy,
  IconEdit,
  IconLoader2,
  IconRobot,
  IconTrash,
  IconUser,
  IconVolume,
} from '@tabler/icons-react';
import {
  Dispatch,
  FC,
  KeyboardEventHandler,
  MouseEvent,
  MouseEventHandler,
  ReactElement,
  SetStateAction,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';

import { useTranslation } from 'next-i18next';

import { extractCitationsAndQuestions } from '@/utils/app/citations';

import { Conversation, Message } from '@/types/chat';
import { Citation } from '@/types/citation';

import { CitationList } from '@/components/Chat/Citations/CitationList';
import { QuestionList } from '@/components/Chat/Citations/QuestionList';
import { CodeBlock } from '@/components/Markdown/CodeBlock';
import { MemoizedReactMarkdown } from '@/components/Markdown/MemoizedReactMarkdown';

import rehypeMathjax from 'rehype-mathjax';
import remarkGfm from 'remark-gfm';
import remarkMath from 'remark-math';

interface Question {
  question: string;
}

interface AssistantMessageProps {
  content: string;
  copyOnClick: (event: MouseEvent<any>) => void;
  messageIsStreaming: boolean;
  messageIndex: number;
  selectedConversation: Conversation;
  messageCopied: boolean;
  onQuestionClick: (question: string) => void;
}

export const AssistantMessage: FC<AssistantMessageProps> = ({
  content,
  copyOnClick,
  messageIsStreaming,
  messageIndex,
  selectedConversation,
  messageCopied,
  onQuestionClick,
}) => {
  const [displayContent, setDisplayContent] = useState('');
  const [citations, setCitations] = useState<Citation[]>([]);
  const [questions, setQuestions] = useState<Question[]>([]);
  const [isGeneratingAudio, setIsGeneratingAudio] = useState<boolean>(false)
  const [isPlaying, setIsPlaying] = useState<boolean>(false);
  const [audioUrl, setAudioUrl] = useState<string | null>(null);
  const [loadingMessage, setLoadingMessage] = useState<string | null>(null);

  const previousCitations = useRef<Citation[]>([]);
  const previousQuestions = useRef<Question[]>([]);
  const citationsProcessed = useRef(false);

  useEffect(() => {
    const processContent = () => {
      const { mainContent, citations, questions } =
        extractCitationsAndQuestions(content);
      setDisplayContent(mainContent);
      setCitations(citations);
      setQuestions(questions);
      previousCitations.current = citations;
      previousQuestions.current = questions;
      citationsProcessed.current = true;
    };

    processContent();
  }, [content]);

  const displayContentWithoutCitations = messageIsStreaming
    ? content.split('[[CITATIONS_START]]')[0]
    : displayContent;

  const citationsToShow = citationsProcessed.current
    ? citations
    : previousCitations.current;

  const questionsToShow = citationsProcessed.current
    ? questions
    : previousQuestions.current;

  const handleTTS = async () => {
    try {
      setIsGeneratingAudio(true);
      setLoadingMessage("Generating audio...");
      const response = await fetch('/api/v2/tts', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ text: displayContentWithoutCitations }),
      });

      if (!response.ok) {
        throw new Error('TTS conversion failed');
      }

      setLoadingMessage("Processing audio...");
      const blob = await response.blob();
      const url = URL.createObjectURL(blob);
      setAudioUrl(url);
      setIsGeneratingAudio(false);
      setLoadingMessage(null);
    } catch (error) {
      console.error('Error in TTS:', error);
      setIsGeneratingAudio(false);
      setLoadingMessage("Error generating audio. Please try again.");
      setTimeout(() => setLoadingMessage(null), 3000); // Clear error message after 3 seconds
    }
  };

  return (
    <div className="relative m-auto flex p-4 text-base md:max-w-2xl md:gap-6 md:py-6 lg:max-w-2xl lg:px-0 xl:max-w-3xl">
      <div className="min-w-[40px] text-right font-bold">
        <IconRobot size={30} />
      </div>

      <div className="prose mt-[-2px] w-full dark:prose-invert">
        {loadingMessage && (
          <div className="text-sm text-gray-500 dark:text-gray-400 mb-2 animate-pulse">
            {loadingMessage}
          </div>
        )}
        {audioUrl && (
          <div className={'flex flex-row'}>
            <audio
              src={audioUrl}
              controls
              onPlay={() => setIsPlaying(true)}
              onPause={() => setIsPlaying(false)}
              onEnded={() => {
                setIsPlaying(false);
                URL.revokeObjectURL(audioUrl);
                setAudioUrl(null);
              }}
            />
          </div>
        )}
        <div className="flex flex-row">
          <MemoizedReactMarkdown
            className="prose dark:prose-invert flex-1"
            remarkPlugins={[remarkGfm, remarkMath]}
            rehypePlugins={[rehypeMathjax]}
            components={{
              code({ node, inline, className, children, ...props }) {
                if (children.length) {
                  if (children[0] == '▍') {
                    return (
                      <span className="animate-pulse cursor-default mt-1">
                        ▍
                      </span>
                    );
                  }

                  children[0] = (children[0] as string).replace('▍', '▍');
                }

                const match = /language-(\w+)/.exec(className || '');

                return !inline ? (
                  <CodeBlock
                    key={Math.random()}
                    language={(match && match[1]) || ''}
                    value={String(children).replace(/\n$/, '')}
                    {...props}
                  />
                ) : (
                  <code className={className} {...props}>
                    {children}
                  </code>
                );
              },
              table({ children }) {
                return (
                  <div className="overflow-auto">
                    <table className="border-collapse border border-black px-3 py-1 dark:border-white">
                      {children}
                    </table>
                  </div>
                );
              },
              th({ children }) {
                return (
                  <th className="break-words border border-black bg-gray-500 px-3 py-1 text-white dark:border-white">
                    {children}
                  </th>
                );
              },
              td({ children }) {
                return (
                  <td className="break-words border border-black px-3 py-1 dark:border-white">
                    {children}
                  </td>
                );
              },
            }}
          >
            {displayContentWithoutCitations}
          </MemoizedReactMarkdown>

          <div
            className="md:-mr-8 ml-1 md:ml-0 flex flex-col md:flex-row gap-4 md:gap-1 items-center md:items-start justify-end md:justify-start">
            {messageCopied ? (
              <IconCheck
                size={20}
                className="text-green-500 dark:text-green-400"
              />
            ) : (
              <button
                className="invisible group-hover:visible focus:visible text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-300"
                onClick={copyOnClick}
              >
                <IconCopy size={20}/>
              </button>
            )}
            {!audioUrl && (
              <button
                className="invisible group-hover:visible focus:visible text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-300"
                onClick={handleTTS}
                disabled={isGeneratingAudio}
              >
                {isGeneratingAudio ? (
                  <div className="flex items-center">
                    <IconLoader2 size={20} className="animate-spin mr-2" />
                    <span className="text-xs">{loadingMessage}</span>
                  </div>
                ) : (
                  <IconVolume size={20} />
                )}
              </button>
            )}

          </div>
        </div>
        {citationsToShow.length > 0 && (
          <CitationList citations={citationsToShow}/>
        )}

        {questionsToShow.length > 0 && (
          <QuestionList
            questions={questionsToShow}
            onQuestionClick={onQuestionClick}
          />
        )}
      </div>
    </div>
  );
};

interface UserMessageProps {
  message: Message;
  messageContent: string;
  setMessageContent: Dispatch<SetStateAction<string>>;
  isEditing: boolean;
  textareaRef: any;
  handleInputChange: (event: any) => void;
  handlePressEnter: KeyboardEventHandler<HTMLTextAreaElement>;
  setIsTyping: Dispatch<SetStateAction<boolean>>;
  setIsEditing: Dispatch<SetStateAction<boolean>>;
  toggleEditing: (event: any) => void;
  handleDeleteMessage: MouseEventHandler<HTMLButtonElement>;
  onEdit: (message: Message) => void;
  selectedConversation: Conversation;
}

export const UserMessage: FC<UserMessageProps> = ({
  message,
  messageContent,
  setMessageContent,
  isEditing,
  textareaRef,
  handleInputChange,
  handlePressEnter,
  setIsTyping,
  selectedConversation,
  setIsEditing,
  toggleEditing,
  handleDeleteMessage,
  onEdit,
}) => {
  const { t } = useTranslation('chat');
  const { role, content, messageType } = message;
  const [localMessageContent, setLocalMessageContent] = useState<string>(
    content as string,
  );

  const handleEditMessage = () => {
    if (localMessageContent != content) {
      if (selectedConversation && onEdit) {
        onEdit({ ...message, content: localMessageContent });
        setMessageContent(localMessageContent);
      }
    }
    setIsEditing(false);
  };

  useEffect(() => {
    setLocalMessageContent(content as string);
  }, [content]);

  useEffect(() => {
    if (
      message.content !== messageContent &&
      typeof message.content === 'string'
    ) {
      setMessageContent(message.content);
    }
  }, [message.content, messageContent]);

  return (
    <div className="relative m-auto flex p-4 text-base md:max-w-2xl md:gap-6 md:py-6 lg:max-w-2xl lg:px-0 xl:max-w-3xl">
      <div className="min-w-[40px] text-right font-bold">
        <IconUser size={30} />
      </div>

      <div className="prose mt-[-2px] w-full dark:prose-invert">
        <div className="flex w-full">
          {isEditing ? (
            <div className="flex w-full flex-col">
              <textarea
                ref={textareaRef}
                className="w-full resize-none whitespace-pre-wrap border-none dark:bg-[#212121]"
                value={localMessageContent}
                onChange={(event) => setLocalMessageContent(event.target.value)}
                onKeyDown={handlePressEnter}
                onCompositionStart={() => setIsTyping(true)}
                onCompositionEnd={() => setIsTyping(false)}
                style={{
                  fontFamily: 'inherit',
                  fontSize: 'inherit',
                  lineHeight: 'inherit',
                  padding: '0',
                  margin: '0',
                  overflow: 'hidden',
                }}
              />

              <div className="mt-10 flex justify-center space-x-4">
                <button
                  className="h-[40px] rounded-md bg-blue-500 px-4 py-1 text-sm font-medium text-white enabled:hover:bg-blue-600 disabled:opacity-50"
                  onClick={handleEditMessage}
                  disabled={localMessageContent.trim().length <= 0}
                >
                  {t('Save & Submit')}
                </button>
                <button
                  className="h-[40px] rounded-md border border-neutral-300 px-4 py-1 text-sm font-medium text-neutral-700 hover:bg-neutral-100 dark:border-neutral-700 dark:text-neutral-300 dark:hover:bg-neutral-800"
                  onClick={() => {
                    setLocalMessageContent(content as string);
                    setIsEditing(false);
                  }}
                >
                  {t('Cancel')}
                </button>
              </div>
            </div>
          ) : (
            <MemoizedReactMarkdown
              className="prose dark:prose-invert flex-1"
              remarkPlugins={[remarkGfm, remarkMath]}
              rehypePlugins={[rehypeMathjax]}
              components={{
                code({ node, inline, className, children, ...props }) {
                  const match = /language-(\w+)/.exec(className || '');
                  return !inline ? (
                    <CodeBlock
                      key={Math.random()}
                      language={(match && match[1]) || ''}
                      value={String(children).replace(/\n$/, '')}
                      {...props}
                    />
                  ) : (
                    <code className={className} {...props}>
                      {children}
                    </code>
                  );
                },
                table({ children }) {
                  return (
                    <div className="overflow-auto">
                      <table className="border-collapse border border-black px-3 py-1 dark:border-white">
                        {children}
                      </table>
                    </div>
                  );
                },
                th({ children }) {
                  return (
                    <th className="break-words border border-black bg-gray-500 px-3 py-1 text-white dark:border-white">
                      {children}
                    </th>
                  );
                },
                td({ children }) {
                  return (
                    <td className="break-words border border-black px-3 py-1 dark:border-white">
                      {children}
                    </td>
                  );
                },
              }}
            >
              {localMessageContent}
            </MemoizedReactMarkdown>
          )}

          {!isEditing && (
            <div className="md:-mr-8 ml-1 md:ml-0 flex flex-col md:flex-row gap-4 md:gap-1 items-center md:items-start justify-end md:justify-start">
              <button
                className="invisible group-hover:visible focus:visible text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-300"
                onClick={toggleEditing}
              >
                <IconEdit size={20} />
              </button>
              <button
                className="invisible group-hover:visible focus:visible text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-300"
                onClick={handleDeleteMessage}
              >
                <IconTrash size={20} />
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export const ChatMessageText: FC<any> = ({
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
}: any) => {
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
          copyOnClick={copyOnClick}
          messageIsStreaming={messageIsStreaming}
          messageIndex={messageIndex}
          selectedConversation={selectedConversation}
          messageCopied={messageCopied}
          onQuestionClick={onQuestionClick}
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
