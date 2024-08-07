import {FileMessageContent, ImageMessageContent, Message, TextMessageContent} from "@/types/chat";
import {Dispatch, FC, KeyboardEventHandler, SetStateAction, useEffect, useRef, useState} from "react";
import {IconDownload, IconEdit, IconRobot, IconTrash, IconUser} from "@tabler/icons-react";
import FileIcon from "@/components/Icons/file";
import {MemoizedReactMarkdown} from "@/components/Markdown/MemoizedReactMarkdown";
import remarkGfm from "remark-gfm";
import remarkMath from "remark-math";
import rehypeMathjax from "rehype-mathjax";
import {CodeBlock} from "@/components/Markdown/CodeBlock";

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

const ChatMessageFile: FC<ChatMessageFileProps> = (
  {
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
  }
) => {
    const {role, content} = message;
    const [text, setText] = useState<TextMessageContent | null>(null);
    const [fileUrl, setFileUrl] = useState<string | null>(null);
    const [filename, setFilename] = useState<string | null>(null);
    const [downloadIconOpacity, setDownloadIconOpacity] = useState<number>(50);
    const [localTextContent, setLocalTextContent] = useState<string>("");
    const fileNameRef = useRef<HTMLSpanElement>(null);


    useEffect(() => {
        (
            content as Array<TextMessageContent | FileMessageContent>
            // @ts-ignore
        ).forEach(contentMessage => {
            if (contentMessage.type === 'file_url') {
                // TODO: Get the file type then display the file icon differently depending
                setFileUrl(contentMessage.url);
                if (contentMessage.originalFilename)
                    setFilename(contentMessage.originalFilename)
                else
                    setFilename(contentMessage.url.split('/')[contentMessage.url.split('/').length-1]);
           } else if (contentMessage.type === 'text') {
                setText(contentMessage);
            } else {
                throw new Error(`Unexpected message type for message: ${contentMessage}`)
            }
        })
    }, [content]);

    useEffect(() => {
        if (text) {
            setLocalTextContent(text.text);
        }
    }, [text]);


    const downloadFile = (event: any) => {
        event.preventDefault();
        if (fileUrl) {
            const filename = fileUrl.split('/')[fileUrl.split("/").length - 1];
            const downloadUrl = `/api/v2/file/${filename}`
            window.open(downloadUrl, '_blank');

        }
    }
    const handleMouseEnter = () => {
        if (fileNameRef.current) {
            const element = fileNameRef.current;
            if (element.offsetWidth < element.scrollWidth) {
                element.style.animation = `scroll-filename ${element.scrollWidth / 50}s linear infinite`;
            }
            setDownloadIconOpacity(100)
        }
    }

    const handleMouseLeave = () => {
        if (fileNameRef.current) {
            fileNameRef.current.style.animation = 'none';
            setDownloadIconOpacity(50)
        }
    }

    return <div
      className={`group md:px-4 ${
        message.role === 'assistant'
          ? 'border-b border-black/10 bg-gray-50 text-gray-800 dark:border-gray-900/50 dark:bg-[#2f2f2f] dark:text-gray-100'
          : 'border-b border-black/10 bg-white text-gray-800 dark:border-gray-900/50 dark:bg-[#212121] dark:text-gray-100'
      }`}
      style={{overflowWrap: 'anywhere'}}
    >
        <div
          className="relative m-auto flex p-4 text-base md:max-w-2xl md:gap-6 md:py-6 lg:max-w-2xl lg:px-0 xl:max-w-3xl">
            <div className="min-w-[40px] text-right font-bold">
                {role === 'assistant' ? (
                  <IconRobot size={30}/>
                ) : (
                  <IconUser size={30}/>
                )}
            </div>
            <div
              onClick={downloadFile}
              onMouseEnter={handleMouseEnter}
              onMouseLeave={handleMouseLeave}
              className="flex items-center justify-between w-full ml-4 p-3 rounded-lg border border-black dark:border-white cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
            >
                <FileIcon className="w-8 h-8 mr-5"/>
                {fileUrl && filename &&
                  <span
                    ref={fileNameRef}
                    className="text-left flex-grow truncate"
                  >
                        {filename}
                    </span>

                }
                <IconDownload className={`opacity-${downloadIconOpacity}`}/>
            </div>
        </div>
        <div
          className="relative m-auto flex p-4 text-base md:max-w-2xl md:gap-6 md:py-6 lg:max-w-2xl lg:px-0 xl:max-w-3xl">
            <div className="prose mt-[-2px] ml-16 w-full dark:prose-invert">
                <div className="flex flex-row">
                    {isEditing ? (
                      <div className="flex w-full flex-col">
                <textarea
                  ref={textareaRef}
                  className="w-full resize-none whitespace-pre-wrap border-none dark:bg-[#212121]"
                  value={localTextContent}
                  onChange={(e) => setLocalTextContent(e.target.value)}
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
                                onClick={() => {
                                    onEdit({
                                        ...message,
                                        content: [{
                                            type: 'text',
                                            text: localTextContent
                                        }, ...(message.content as any[]).filter(c => c.type !== 'text')]
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
                              {text?.text || ""}
                          </MemoizedReactMarkdown>
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
                      </>
                    )}
                </div>
            </div>
        </div>

    </div>
}

export default ChatMessageFile;
