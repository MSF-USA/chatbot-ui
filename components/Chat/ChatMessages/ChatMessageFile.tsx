import {FileMessageContent, ImageMessageContent, Message, TextMessageContent} from "@/types/chat";
import {FC, useEffect, useRef, useState} from "react";
import {IconDownload, IconRobot, IconUser} from "@tabler/icons-react";
import FileIcon from "@/components/Icons/file";

export interface ChatMessageFileProps {
    message: Message;
}

const ChatMessageFile: FC<ChatMessageFileProps> = ({message}) => {
    const {role, content} = message;
    const [text, setText] = useState<TextMessageContent | null>(null);
    const [fileUrl, setFileUrl] = useState<string | null>(null);
    const [filename, setFilename] = useState<string | null>(null);
    const [downloadIconOpacity, setDownloadIconOpacity] = useState<number>(50);
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
                <IconDownload className={`opacity-${downloadIconOpacity}`} />
            </div>
        </div>
        <div
          className="relative m-auto flex p-4 text-base md:max-w-2xl md:gap-6 md:py-6 lg:max-w-2xl lg:px-0 xl:max-w-3xl"
        >
            <div className="prose mt-[-2px] ml-16 w-full dark:prose-invert">
            <div className="flex flex-row">
                    <div>{text?.text}</div>
                </div>
            </div>
        </div>
    </div>
}

export default ChatMessageFile;
