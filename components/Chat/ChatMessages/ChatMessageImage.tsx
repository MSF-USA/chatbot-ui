import {FC, useEffect, useState} from "react";
import {IconRobot, IconUser} from "@tabler/icons-react";
import {ImageMessageContent, Message, TextMessageContent} from "@/types/chat";
import {getBase64FromImageURL} from "@/utils/app/image";

interface ChatMessageImageProps {
    message: Message
}

const ChatMessageImage: FC<ChatMessageImageProps> = ({message}) => {
    const {role, content} = message;

    const image_url = (
        content as Array<TextMessageContent | ImageMessageContent>
        // @ts-ignore
    )?.find?.(contentSection => contentSection.type === 'image_url')?.image_url ?? {url: ''}

    const [imageBase64, setImageBase64] = useState("");

    useEffect(() => {
        const fetchImage = async () => {
            try {
                const base64String: string = await getBase64FromImageURL(image_url.url)
                setImageBase64(base64String)

            } catch (error) {
                console.error('Error fetching the image:', error);
                setImageBase64(''); // Setting a fallback or error state
            }
        };

        fetchImage();
    }, [image_url]);

    return <div
        className={`group md:px-4 ${
            role === 'assistant'
                ? 'border-b border-black/10 bg-gray-50 text-gray-800 dark:border-gray-900/50 dark:bg-[#444654] dark:text-gray-100'
                : 'border-b border-black/10 bg-white text-gray-800 dark:border-gray-900/50 dark:bg-[#343541] dark:text-gray-100'
        }`}
        style={{overflowWrap: 'anywhere'}}
    >
        <div
            className="relative m-auto flex p-4 text-base md:max-w-2xl md:gap-6 md:py-6 lg:max-w-2xl lg:px-0 xl:max-w-3xl">
            <div className="min-w-[40px] text-right font-bold">
                {message.role === 'assistant' ? (
                    <IconRobot size={30}/>
                ) : (
                    <IconUser size={30}/>
                )}
            </div>
            <img src={imageBase64}/>
        </div>
    </div>
}

export default ChatMessageImage;
