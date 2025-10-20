import { IconEdit, IconTrash } from '@tabler/icons-react';
import {
  Dispatch,
  FC,
  KeyboardEventHandler,
  MouseEventHandler,
  SetStateAction,
  useEffect,
  useState,
} from 'react';

import { useTranslations } from 'next-intl';

import { Conversation, Message } from '@/types/chat';

import { CodeBlock } from '@/components/Markdown/CodeBlock';
import { MemoizedReactMarkdown } from '@/components/Markdown/MemoizedReactMarkdown';

import rehypeKatex from 'rehype-katex';
import remarkGfm from 'remark-gfm';
import remarkMath from 'remark-math';

interface UserMessageProps {
  message: Message;
  messageContent: string;
  setMessageContent: Dispatch<SetStateAction<string>>;
  isEditing: boolean;
  textareaRef: React.RefObject<HTMLTextAreaElement | null>;
  handleInputChange: (event: React.ChangeEvent<HTMLTextAreaElement>) => void;
  handlePressEnter: KeyboardEventHandler<HTMLTextAreaElement>;
  setIsTyping: Dispatch<SetStateAction<boolean>>;
  setIsEditing: Dispatch<SetStateAction<boolean>>;
  toggleEditing: (event: React.MouseEvent) => void;
  handleDeleteMessage: MouseEventHandler<HTMLButtonElement>;
  onEdit: (message: Message) => void;
  selectedConversation: Conversation | null;
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
  const t = useTranslations();
  const { role, content, messageType } = message;
  const [localMessageContent, setLocalMessageContent] = useState<string>(
    content as string,
  );

  const handleEditMessage = () => {
    if (localMessageContent !== content) {
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
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [message.content, messageContent]);

  return (
    <div className="relative flex justify-end px-4 py-3 text-base lg:px-0 w-full">
      <div className="flex flex-col items-end max-w-full">
        <div className="inline-block bg-gray-600 dark:bg-gray-600 rounded-2xl px-4 py-2.5 text-white text-sm">
          {isEditing ? (
            <div className="flex flex-col">
              <textarea
                ref={textareaRef}
                className="w-full resize-none whitespace-pre-wrap border-none bg-transparent text-white"
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
            <div className="prose prose-sm prose-invert text-white max-w-none">
              <MemoizedReactMarkdown
                remarkPlugins={[remarkGfm, remarkMath]}
                rehypePlugins={[rehypeKatex]}
                components={{
                  code({ node, inline, className, children, ...props }: any) {
                    const match = /language-(\w+)/.exec(className || '');
                    return !inline ? (
                      <CodeBlock
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
                  table({ children }: any) {
                    return (
                      <div className="overflow-auto">
                        <table className="border-collapse border border-black px-3 py-1 dark:border-white">
                          {children}
                        </table>
                      </div>
                    );
                  },
                  th({ children }: any) {
                    return (
                      <th className="break-words border border-black bg-gray-500 px-3 py-1 text-white dark:border-white">
                        {children}
                      </th>
                    );
                  },
                  td({ children }: any) {
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
            </div>
          )}
        </div>

        {!isEditing && (
          <div className="flex gap-2 mt-1">
            <button
              className="invisible group-hover:visible focus:visible text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-300 transition-colors"
              onClick={toggleEditing}
            >
              <IconEdit size={18} />
            </button>
            <button
              className="invisible group-hover:visible focus:visible text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-300 transition-colors"
              onClick={handleDeleteMessage}
            >
              <IconTrash size={18} />
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

export default UserMessage;
