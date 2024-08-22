import {
  IconBlockquote,
  IconCheck,
  IconCopy,
  IconEdit,
  IconRobot,
  IconTrash,
  IconUser,
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
import Link from 'next/link';

import { Conversation, Message } from '@/types/chat';

import { CodeBlock } from '@/components/Markdown/CodeBlock';
import { MemoizedReactMarkdown } from '@/components/Markdown/MemoizedReactMarkdown';

import rehypeMathjax from 'rehype-mathjax';
import remarkGfm from 'remark-gfm';
import remarkMath from 'remark-math';

interface Citation {
  number: string;
  title: string;
  url: string;
  date: string;
}

const extractCitations = (
  content: string,
): { mainContent: string; citations: Citation[] } => {
  const citationRegex = /\s*CITATIONS:\s*(\[[\s\S]*\])\s*$/;
  const match = content.match(citationRegex);
  let mainContent = content;
  let citations: Citation[] = [];

  if (match) {
    mainContent = content.replace(citationRegex, '').trim();
    try {
      citations = JSON.parse(match[1]);
    } catch (error) {
      console.error('Failed to parse citations:', error);
    }
  }

  return { mainContent, citations };
};

const CitationList: FC<{ citations: Citation[] }> = ({ citations }) => {
  const [isVisible, setIsVisible] = useState(false);
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const [scrollDirection, setScrollDirection] = useState<
    'left' | 'right' | null
  >(null);
  const scrollIntervalRef = useRef<number | null>(null);

  useEffect(() => {
    const timer = setTimeout(() => setIsVisible(true), 100);
    return () => clearTimeout(timer);
  }, []);

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (!scrollContainerRef.current) return;

      const container = scrollContainerRef.current;
      const containerRect = container.getBoundingClientRect();
      const mouseX = e.clientX - containerRect.left;
      const containerWidth = containerRect.width;

      if (mouseX > containerWidth * 0.9) {
        setScrollDirection('right');
      } else if (mouseX < containerWidth * 0.1) {
        setScrollDirection('left');
      } else {
        setScrollDirection(null);
      }
    };

    const handleMouseLeave = () => {
      setScrollDirection(null);
    };

    const container = scrollContainerRef.current;
    if (container) {
      container.addEventListener(
        'mousemove',
        handleMouseMove as unknown as EventListener,
      );
      container.addEventListener('mouseleave', handleMouseLeave);
    }

    return () => {
      if (container) {
        container.removeEventListener(
          'mousemove',
          handleMouseMove as unknown as EventListener,
        );
        container.removeEventListener('mouseleave', handleMouseLeave);
      }
    };
  }, []);

  useEffect(() => {
    const SCROLL_SPEED = 5; // Pixels per frame

    if (scrollDirection) {
      scrollIntervalRef.current = window.setInterval(() => {
        if (scrollContainerRef.current) {
          const container = scrollContainerRef.current;
          if (scrollDirection === 'right') {
            container.scrollLeft += SCROLL_SPEED;
          } else {
            container.scrollLeft -= SCROLL_SPEED;
          }
        }
      }, 16); // ~60fps
    } else {
      if (scrollIntervalRef.current !== null) {
        clearInterval(scrollIntervalRef.current);
        scrollIntervalRef.current = null;
      }
    }

    return () => {
      if (scrollIntervalRef.current !== null) {
        clearInterval(scrollIntervalRef.current);
      }
    };
  }, [scrollDirection]);

  const handleReactMouseMove = (e: MouseEvent<HTMLDivElement>) => {
    const container = scrollContainerRef.current;
    if (!container) return;

    const containerRect = container.getBoundingClientRect();
    const mouseX = e.clientX - containerRect.left;
    const containerWidth = containerRect.width;

    if (mouseX > containerWidth * 0.9) {
      setScrollDirection('right');
    } else if (mouseX < containerWidth * 0.1) {
      setScrollDirection('left');
    } else {
      setScrollDirection(null);
    }
  };

  const handleReactMouseLeave = () => {
    setScrollDirection(null);
  };

  if (citations.length === 0) return null;

  return (
    <div
      className={`my-2 w-full transition-opacity duration-500 ease-in-out ${
        isVisible ? 'opacity-100' : 'opacity-0'
      }`}
    >
      <div className="flex items-center mb-2">
        <IconBlockquote size={20} className="inline-block" />
        <h3 className="text-lg font-semibold ml-2 mt-3">
          Sources and Relevant Links
        </h3>
      </div>
      <div
        ref={scrollContainerRef}
        className="flex w-full overflow-x-auto gap-4 no-scrollbar"
        style={{ scrollBehavior: 'auto' }}
        onMouseMove={handleReactMouseMove}
        onMouseLeave={handleReactMouseLeave}
      >
        {citations.map((citation) => (
          <div key={citation.number} className="flex-shrink-0">
            <CitationItem citation={citation} />
          </div>
        ))}
      </div>
    </div>
  );
};

const CitationItem: React.FC<{ citation: Citation }> = ({ citation }) => {
  const [useDefaultLogo, setUseDefaultLogo] = useState(false);
  const { hostname } = new URL(citation.url);

  const cleanDomain = hostname.replace(/^www\.|https?:\/\/|\.[^.]+$/g, '');

  const handleImageError = () => {
    setUseDefaultLogo(true);
  };

  return (
    <div className="relative bg-gray-200 dark:bg-[#171717] rounded-lg transition-all duration-300 overflow-hidden text-xs border-2 border-transparent hover:border-blue-500 hover:shadow-lg h-[132px] w-48 p-2 mb-5">
      <Link
        href={citation.url}
        target="_blank"
        rel="noopener noreferrer"
        title={citation.title}
        className="flex flex-col h-full no-underline justify-between"
      >
        <div className="flex-grow">
          <div className="text-[12.5px] line-clamp-3 text-gray-800 dark:text-white mb-2">
            {citation.title}
          </div>
        </div>
        <div className="text-[11px] text-gray-600 dark:text-gray-400 mb-6">
          {citation.date}
        </div>
        <div className="absolute bottom-0 left-0 right-0 dark:bg-[#1f1f1f] bg-gray-100 px-2 py-1 flex items-center dark:text-white text-gray-500 text-[11.5px] space-x-1">
          <div className="flex items-center">
            <img
              src={`https://www.google.com/s2/favicons?domain=${hostname}&size=16`}
              alt={`${hostname} favicon`}
              width={12}
              height={12}
              onError={handleImageError}
              className="mr-1 my-0 p-0 align-middle"
            />
          </div>
          <span className="truncate">{cleanDomain}</span>
          <span>|</span>
          <span>{citation.number}</span>
        </div>
      </Link>
    </div>
  );
};

interface AssistantMessageProps {
  content: string;
  copyOnClick: (event: MouseEvent<any>) => void;
  messageIsStreaming: boolean;
  messageIndex: number;
  selectedConversation: Conversation;
  messageCopied: boolean;
}

const AssistantMessage: FC<AssistantMessageProps> = ({
  content,
  copyOnClick,
  messageIsStreaming,
  messageIndex,
  selectedConversation,
  messageCopied,
}) => {
  const [displayContent, setDisplayContent] = useState('');
  const [citations, setCitations] = useState<Citation[]>([]);
  const previousCitations = useRef<Citation[]>([]);
  const citationsProcessed = useRef(false);

  useEffect(() => {
    const processContent = () => {
      if (content.includes('CITATIONS:')) {
        const { mainContent, citations } = extractCitations(content);
        setDisplayContent(mainContent);
        setCitations(citations);
        previousCitations.current = citations;
        citationsProcessed.current = true;
      } else {
        setDisplayContent(content);
        citationsProcessed.current = false;
      }
    };

    processContent();
  }, [content]);

  const displayContentWithoutCitations = messageIsStreaming
    ? content.split('CITATIONS:')[0]
    : displayContent;

  const citationsToShow = citationsProcessed.current
    ? citations
    : previousCitations.current;

  return (
    <div className="relative m-auto flex p-4 text-base md:max-w-2xl md:gap-6 md:py-6 lg:max-w-2xl lg:px-0 xl:max-w-3xl">
      <div className="min-w-[40px] text-right font-bold">
        <IconRobot size={30} />
      </div>

      <div className="prose mt-[-2px] w-full dark:prose-invert">
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

          <div className="md:-mr-8 ml-1 md:ml-0 flex flex-col md:flex-row gap-4 md:gap-1 items-center md:items-start justify-end md:justify-start">
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
                <IconCopy size={20} />
              </button>
            )}
          </div>
        </div>
        {citationsToShow.length > 0 && (
          <CitationList citations={citationsToShow} />
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

const UserMessage: FC<UserMessageProps> = ({
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

const ChatMessageText: FC<any> = ({
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
