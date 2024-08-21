import {
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
  useState,
} from 'react';

import { useTranslation } from 'next-i18next';

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
}

const extractCitations = (
  content: string,
): { mainContent: string; citations: Citation[] } => {
  const parts = content.split('CITATIONS:');
  const mainContent = parts[0].trim();
  console.log('Main Content:', mainContent);

  let citations: Citation[] = [];

  if (parts[1]) {
    let citationsPart = parts[1].trim();
    console.log('Raw Citations JSON:', citationsPart);

    citationsPart = citationsPart.replace(
      /"([^"]*)"/g,
      (match, p1) => `"${p1.replace(/"/g, '\\"')}"`,
    );

    try {
      citations = JSON.parse(citationsPart);
    } catch (error) {
      console.error('Failed to parse citations:', error);
      console.error('Problematic JSON:', citationsPart);
    }
  }

  return { mainContent, citations };
};

const formatMessageWithCitations = (
  content: any,
  citations: Citation[],
): React.ReactNode => {
  if (typeof content !== 'string') {
    return content;
  }
  return content.split(/(\[\d+\])/).map((part, index) => {
    if (index % 2 === 1) {
      const citationNumber = part.replace('[', '').replace(']', '');
      const citation = citations.find((c) => c.number === citationNumber);
      if (citation) {
        return (
          <sup key={index}>
            <a
              href={citation.url}
              title={citation.title}
              target="_blank"
              rel="noopener noreferrer"
              className="text-blue-500 hover:underline"
            >
              {part}
            </a>
          </sup>
        );
      }
    }
    return part;
  });
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
  const { mainContent, citations } = useMemo(
    () => extractCitations(content),
    [content],
  );

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
                    <table className="max-w-full border-collapse border border-black px-3 py-1 dark:border-white">
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
            {content}
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

  const { mainContent, citations } = useMemo(
    () => extractCitations(localMessageContent),
    [localMessageContent],
  );

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
                p: ({ children }) => (
                  <p>
                    {formatMessageWithCitations(children as string, citations)}
                  </p>
                ),
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
                      <table className="max-w-full border-collapse border border-black px-3 py-1 dark:border-white">
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
              {mainContent}
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
  const { role, content, messageType } = message;
  const { t } = useTranslation('chat');

  const [mainContent, setMainContent] = useState<string>('');
  const [citations, setCitations] = useState<Citation[]>([]);

  useEffect(() => {
    if (!messageIsStreaming) {
      const { mainContent, citations } = extractCitations(content);
      setMainContent(mainContent);
      setCitations(citations);
    }
  }, [content, messageIsStreaming]);

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
