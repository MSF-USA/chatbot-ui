import React, {
    Dispatch,
    FC,
    KeyboardEventHandler,
    SetStateAction,
    useEffect,
    useState,
} from "react";
import {
    IconDownload,
    IconEdit,
    IconRobot,
    IconTrash,
    IconUser,
} from "@tabler/icons-react";
import FileIcon from "@/components/Icons/file";
import { MemoizedReactMarkdown } from "@/components/Markdown/MemoizedReactMarkdown";
import remarkGfm from "remark-gfm";
import remarkMath from "remark-math";
import rehypeMathjax from "rehype-mathjax";
import { CodeBlock } from "@/components/Markdown/CodeBlock";
import {
    FileMessageContent,
    Message,
    TextMessageContent,
    ImageMessageContent,
} from "@/types/chat";

export interface ChatMessageFileProps {
    message: Message;
    isEditing: boolean;
    setIsEditing: Dispatch<SetStateAction<boolean>>;
    setIsTyping: Dispatch<SetStateAction<boolean>>;
    handleInputChange: (event: any) => void;
    textareaRef: any;
    handlePressEnter: KeyboardEventHandler<HTMLTextAreaElement>;
    handleEditMessage: () => void;
    toggleEditing: (event: any) => void;
    handleDeleteMessage: () => void;
    onEdit: (message: Message) => void | undefined;
}

const ChatMessageFile: FC<ChatMessageFileProps> = ({
                                                       message,
                                                       isEditing,
                                                       setIsEditing,
                                                       setIsTyping,
                                                       handleInputChange,
                                                       textareaRef,
                                                       handlePressEnter,
                                                       handleEditMessage,
                                                       toggleEditing,
                                                       handleDeleteMessage,
                                                       onEdit,
                                                   }) => {
    const { role, content } = message;
    const [text, setText] = useState<TextMessageContent | null>(null);
    const [files, setFiles] = useState<FileMessageContent[]>([]);
    const [images, setImages] = useState<ImageMessageContent[]>([]);
    const [localTextContent, setLocalTextContent] = useState<string>("");

    useEffect(() => {
        const filesArray: FileMessageContent[] = [];
        const imagesArray: ImageMessageContent[] = [];
        let textContent: TextMessageContent | null = null;

        (content as Array<
            TextMessageContent | FileMessageContent | ImageMessageContent
        >).forEach((contentMessage) => {
            if (contentMessage.type === "file_url") {
                filesArray.push(contentMessage as FileMessageContent);
            } else if (contentMessage.type === "image_url") {
                imagesArray.push(contentMessage as ImageMessageContent);
            } else if (contentMessage.type === "text") {
                textContent = contentMessage as TextMessageContent;
            } else {
                throw new Error(
                    `Unexpected message type for message: ${(
                        contentMessage as any
                    ).type}`
                );
            }
        });
        setFiles(filesArray);
        setImages(imagesArray);
        if (textContent) setText(textContent);
    }, [content]);

    useEffect(() => {
        if (text) {
            setLocalTextContent(text.text);
        }
    }, [text]);

    const downloadFile = (event: any, fileUrl: string) => {
        event.preventDefault();
        if (fileUrl) {
            const filename = fileUrl.split("/").pop();
            const downloadUrl = `/api/v2/file/${filename}`;
            window.open(downloadUrl, "_blank");
        }
    };

    return (
        <div
            className={`group md:px-4 ${
                role === "assistant"
                    ? "border-b border-black/10 bg-gray-50 text-gray-800 dark:border-gray-900/50 dark:bg-[#2f2f2f] dark:text-gray-100"
                    : "border-b border-black/10 bg-white text-gray-800 dark:border-gray-900/50 dark:bg-[#212121] dark:text-gray-100"
            }`}
            style={{ overflowWrap: "anywhere" }}
        >
            <div className="relative m-auto flex flex-col p-4 text-base md:max-w-2xl md:gap-4 md:py-6 lg:max-w-2xl lg:px-0 xl:max-w-3xl">
                <div className="flex items-start">
                    <div className="min-w-[40px] text-right font-bold">
                        {role === "assistant" ? (
                            <IconRobot size={30} />
                        ) : (
                            <IconUser size={30} />
                        )}
                    </div>
                    <div className="flex flex-wrap items-center w-full ml-4">
                        {/* Render Images */}
                        {images.map((image, index) => (
                            <div
                                key={`image-${index}`}
                                className="relative p-1 m-1 rounded-lg overflow-hidden border border-black dark:border-white"
                                style={{ width: "calc(50% - 0.5rem)" }}
                            >
                                <img
                                    src={image.image_url.url}
                                    alt="Image Content"
                                    className="w-full h-auto object-cover"
                                />
                            </div>
                        ))}
                        {/* Render Files */}
                        {files.map((file, index) => (
                            <div
                                key={`file-${index}`}
                                onClick={(event) => downloadFile(event, file.url)}
                                className="relative flex items-center justify-between p-3 m-1 rounded-lg border border-black dark:border-white cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
                                style={{ width: "calc(50% - 0.5rem)" }}
                            >
                                <FileIcon className="w-8 h-8 mr-2 flex-shrink-0" />
                                <div className="relative flex-grow overflow-hidden">
                  <span className="block whitespace-nowrap hover:animate-scroll-text">
                    {file.originalFilename || file.url.split("/").pop()}
                  </span>
                                </div>
                                <IconDownload className="opacity-50 group-hover:opacity-100 flex-shrink-0" />
                            </div>
                        ))}
                    </div>
                </div>
                {/* Render Text Content */}
                {text && (
                    <div className="flex items-start mt-4">
                        <div className="min-w-[40px]" />
                        <div className="prose w-full dark:prose-invert ml-4">
                            <div className="flex flex-row">
                                {isEditing ? (
                                    <div className="flex w-full flex-col">
                    <textarea
                        ref={textareaRef}
                        className="w-full resize-none whitespace-pre-wrap border border-gray-300 dark:border-gray-700 dark:bg-[#212121] p-2 rounded-md"
                        value={localTextContent}
                        onChange={(e) => setLocalTextContent(e.target.value)}
                        onKeyDown={handlePressEnter}
                        onCompositionStart={() => setIsTyping(true)}
                        onCompositionEnd={() => setIsTyping(false)}
                        style={{
                            fontFamily: "inherit",
                            fontSize: "inherit",
                            lineHeight: "inherit",
                            overflow: "hidden",
                        }}
                    />
                                        <div className="mt-4 flex justify-center space-x-4">
                                            <button
                                                className="h-[40px] rounded-md bg-blue-500 px-4 py-1 text-sm font-medium text-white hover:bg-blue-600 disabled:opacity-50"
                                                onClick={() => {
                                                    onEdit({
                                                        ...message,
                                                        content: [
                                                            {
                                                                type: "text",
                                                                text: localTextContent,
                                                            },
                                                            ...(message.content as any[]).filter(
                                                                (c) => c.type !== "text"
                                                            ),
                                                        ],
                                                    });
                                                    setIsEditing(false);
                                                }}
                                                disabled={localTextContent.trim().length <= 0}
                                            >
                                                Save & Submit
                                            </button>
                                            <button
                                                className="h-[40px] rounded-md border border-neutral-300 px-4 py-1 text-sm font-medium text-neutral-700 hover:bg-neutral-100 dark:border-neutral-700 dark:text-neutral-300 dark:hover:bg-neutral-800"
                                                onClick={() => {
                                                    setLocalTextContent(text?.text || "");
                                                    setIsEditing(false);
                                                }}
                                            >
                                                Cancel
                                            </button>
                                        </div>
                                    </div>
                                ) : (
                                    <>
                                        <MemoizedReactMarkdown
                                            className="prose dark:prose-invert flex-1"
                                            remarkPlugins={[remarkGfm, remarkMath]}
                                            rehypePlugins={[rehypeMathjax]}
                                            components={{
                                                code({
                                                         node,
                                                         inline,
                                                         className,
                                                         children,
                                                         ...props
                                                     }) {
                                                    if (children.length) {
                                                        if (children[0] == "▍") {
                                                            return (
                                                                <span className="animate-pulse cursor-default mt-1">
                                  ▍
                                </span>
                                                            );
                                                        }

                                                        children[0] = (children[0] as string).replace(
                                                            "`▍`",
                                                            "▍"
                                                        );
                                                    }

                                                    const match = /language-(\w+)/.exec(className || "");

                                                    return !inline ? (
                                                        <CodeBlock
                                                            key={Math.random()}
                                                            language={(match && match[1]) || ""}
                                                            value={String(children).replace(/\n$/, "")}
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
                                            {text.text}
                                        </MemoizedReactMarkdown>
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
                                    </>
                                )}
                            </div>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
};

export default ChatMessageFile;
