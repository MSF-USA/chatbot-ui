import {
  FC,
  useState,
  MouseEvent,
  Dispatch,
  SetStateAction,
  KeyboardEventHandler,
  MouseEventHandler,
  useEffect
} from "react";
import {IconCheck, IconCopy, IconEdit, IconRobot, IconTrash, IconUser} from "@tabler/icons-react";
import {Conversation, getChatMessageContent, Message, MessageType} from "@/types/chat";
import {MemoizedReactMarkdown} from "@/components/Markdown/MemoizedReactMarkdown";
import remarkGfm from "remark-gfm";
import remarkMath from "remark-math";
import rehypeMathjax from "rehype-mathjax";
import {CodeBlock} from "@/components/Markdown/CodeBlock";
import {useTranslation} from "next-i18next";

interface AssistantMessageProps {
    content: string;
    copyOnClick: (event: MouseEvent<any>) => void,
    messageIsStreaming: boolean;
    messageIndex: number;
    selectedConversation: Conversation;
    messageCopied: boolean;
}

const AssistantMessage: FC<AssistantMessageProps> = (
    {
        content, copyOnClick, messageIsStreaming, messageIndex, selectedConversation, messageCopied,
    }
) => {
    return (
        <div className="relative m-auto flex p-4 text-base md:max-w-2xl md:gap-6 md:py-6 lg:max-w-2xl lg:px-0 xl:max-w-3xl">
            <div className="min-w-[40px] text-right font-bold">
                <IconRobot size={30}/>
            </div>

            <div className="prose mt-[-2px] w-full dark:prose-invert">
                <div className="flex flex-row">
                    <MemoizedReactMarkdown
                        className="prose dark:prose-invert flex-1"
                        remarkPlugins={[remarkGfm, remarkMath]}
                        rehypePlugins={[rehypeMathjax]}
                        components={{
                            code({node, inline, className, children, ...props}) {
                                if (children.length) {
                                    if (children[0] == '▍') {
                                        return <span className="animate-pulse cursor-default mt-1">▍</span>
                                    }

                                    children[0] = (children[0] as string).replace("`▍`", "▍")
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
                            table({children}) {
                                return (
                                    <div className="overflow-auto">
                                        <table
                                            className="max-w-full border-collapse border border-black px-3 py-1 dark:border-white"
                                        >
                                            {children}
                                        </table>
                                    </div>
                                );
                            },
                            th({children}) {
                                return (
                                    <th className="break-words border border-black bg-gray-500 px-3 py-1 text-white dark:border-white">
                                        {children}
                                    </th>
                                );
                            },
                            td({children}) {
                                return (
                                    <td className="break-words border border-black px-3 py-1 dark:border-white">
                                        {children}
                                    </td>
                                );
                            },
                        }}
                    >
                        {`${content}${
                            messageIsStreaming && messageIndex == (selectedConversation?.messages.length ?? 0) - 1 ? '`▍`' : ''
                        }`}
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
                    </div>
                </div>
            </div>
        </div>
    )
}


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
    toggleEditing: (event: any) => void
    handleDeleteMessage: MouseEventHandler<HTMLButtonElement>;
    onEdit: (message: Message) => void;
    selectedConversation: Conversation;
}

const UserMessage: FC<UserMessageProps> = (
    {
        message, messageContent, setMessageContent, isEditing, textareaRef, handleInputChange,
        handlePressEnter, setIsTyping, selectedConversation, setIsEditing, toggleEditing,
        handleDeleteMessage, onEdit
    }
) => {
  const { t } = useTranslation('chat');
  const {role, content, messageType} = message;
  const [localMessageContent, setLocalMessageContent] = useState<string>(content as string);


  const handleEditMessage = () => {
    if (localMessageContent != content) {
      if (selectedConversation && onEdit) {
        onEdit({...message, content: localMessageContent});
        setMessageContent(localMessageContent);
      }
    }
    setIsEditing(false);
  };

  useEffect(() => {
    setLocalMessageContent(content as string);
  }, [content]);

  useEffect(() => {
    if (message.content !== messageContent && typeof message.content === "string") {
      setMessageContent(message.content);
    }
  }, [message.content, messageContent]);

    return (
        <div
            className="relative m-auto flex p-4 text-base md:max-w-2xl md:gap-6 md:py-6 lg:max-w-2xl lg:px-0 xl:max-w-3xl">
            <div className="min-w-[40px] text-right font-bold">
                <IconUser size={30}/>
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
                        <div className="prose whitespace-pre-wrap dark:prose-invert flex-1">
                            {message.content as string}
                        </div>
                    )}

                    {!isEditing && (
                        <div
                            className="md:-mr-8 ml-1 md:ml-0 flex flex-col md:flex-row gap-4 md:gap-1 items-center md:items-start justify-end md:justify-start">
                            <button
                                className="invisible group-hover:visible focus:visible text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-300"
                                onClick={toggleEditing}
                            >
                                <IconEdit size={20}/>
                            </button>
                            <button
                                className="invisible group-hover:visible focus:visible text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-300"
                                onClick={handleDeleteMessage}
                            >
                                <IconTrash size={20}/>
                            </button>
                        </div>
                    )}
                </div>

            </div>
        </div>
    );
}

const ChatMessageText: FC<any> = (
    {
        message, copyOnClick, isEditing, setIsEditing, setIsTyping, handleInputChange, textareaRef, handlePressEnter,
        handleEditMessage, messageContent, setMessageContent, toggleEditing, handleDeleteMessage, messageIsStreaming, messageIndex,
        selectedConversation, messageCopied, onEdit
    }: any
) => {
    const { role, content, messageType } = message;
    const { t } = useTranslation('chat');


    return (
        <div
            className={`group md:px-4 ${
                role === 'assistant'
                    ? 'border-b border-black/10 bg-gray-50 text-gray-800 dark:border-gray-900/50 dark:bg-[#2f2f2f] dark:text-gray-100'
                    : 'border-b border-black/10 bg-white text-gray-800 dark:border-gray-900/50 dark:bg-[#212121] dark:text-gray-100'
            }`}
            style={{overflowWrap: 'anywhere'}}
        >
            {role === 'assistant' ? <AssistantMessage
                content={content}
                copyOnClick={copyOnClick}
                messageIsStreaming={messageIsStreaming}
                messageIndex={messageIndex}
                selectedConversation={selectedConversation}
                messageCopied={messageCopied}
            /> : <UserMessage
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
                />}
        </div>
    );
}

export default ChatMessageText;
