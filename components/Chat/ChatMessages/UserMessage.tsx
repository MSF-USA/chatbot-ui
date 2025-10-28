import {
  IconDeviceFloppy,
  IconEdit,
  IconRefresh,
  IconTrash,
} from '@tabler/icons-react';
import {
  Dispatch,
  FC,
  KeyboardEventHandler,
  MouseEventHandler,
  ReactNode,
  SetStateAction,
  useEffect,
  useState,
} from 'react';

import { useTranslations } from 'next-intl';

import { Conversation, Message } from '@/types/chat';

import { Streamdown } from 'streamdown';

interface UserMessageProps {
  message: Message;
  messageContent: string;
  setMessageContent: Dispatch<SetStateAction<Message['content']>>;
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
  onRegenerate?: () => void;
  onSaveAsPrompt?: () => void;
  children?: ReactNode; // Allow custom content (images, files, etc.)
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
  onRegenerate,
  onSaveAsPrompt,
  children,
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
    <div className="relative flex justify-end px-4 py-1 text-base lg:px-0 w-full">
      <div className="flex flex-col items-end max-w-full">
        <div className="inline-block bg-gray-600 dark:bg-[#323537] rounded-3xl px-4 text-white text-base">
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
            <>
              {children || (
                <div className="prose prose-invert prose-p:my-2 text-white max-w-none">
                  <Streamdown
                    controls={true}
                    shikiTheme={['github-light', 'github-dark']}
                  >
                    {localMessageContent}
                  </Streamdown>
                </div>
              )}
            </>
          )}
        </div>

        {!isEditing && (
          <div className="flex gap-2 mt-1">
            {onRegenerate && (
              <button
                className="visible md:invisible md:group-hover:visible focus:visible text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-300 transition-colors"
                onClick={onRegenerate}
                aria-label="Retry message"
              >
                <IconRefresh size={18} />
              </button>
            )}
            {onSaveAsPrompt && (
              <button
                className="visible md:invisible md:group-hover:visible focus:visible text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-300 transition-colors"
                onClick={onSaveAsPrompt}
                aria-label={t('Save as prompt')}
                title={t('Save as prompt')}
              >
                <IconDeviceFloppy size={18} />
              </button>
            )}
            <button
              className="visible md:invisible md:group-hover:visible focus:visible text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-300 transition-colors"
              onClick={toggleEditing}
              aria-label="Edit message"
            >
              <IconEdit size={18} />
            </button>
            <button
              className="visible md:invisible md:group-hover:visible focus:visible text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-300 transition-colors"
              onClick={handleDeleteMessage}
              aria-label="Delete message"
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
