import {FileMessageContent, ImageMessageContent, Message, TextMessageContent} from "@/types/chat";
import {FC, useEffect, useState} from "react";
import {IconRobot, IconUser} from "@tabler/icons-react";
import FileIcon from "@/components/Icons/file";

export interface ChatMessageFileProps {
    message: Message;
}

const ChatMessageFile: FC<ChatMessageFileProps> = ({message}) => {
    const {role, content} = message;
    const [text, setText] = useState<TextMessageContent | null>(null);

    useEffect(() => {
        (
            content as Array<TextMessageContent | FileMessageContent>
            // @ts-ignore
        ).forEach(contentMessage => {
            if (contentMessage.type === 'file_url') {
                // TODO: Get the file type then display the file icon differently depending
           } else if (contentMessage.type === 'text') {
                setText(contentMessage);
            } else {
                throw new Error(`Unexpected message type for message: ${contentMessage}`)
            }
        })
    }, [content]);

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
            <img src={FileIcon.toString()}/>
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