import {FC, useEffect, useState} from "react";
import {IconRobot, IconUser} from "@tabler/icons-react";
import {ImageMessageContent, Message, TextMessageContent} from "@/types/chat";
import {getBase64FromImageURL} from "@/utils/app/image";

interface ChatMessageImageProps {
    message: Message
}

interface ImageStyleProps {
    maxHeight?: string;
    maxWidth?: string;
}

const ChatMessageImage: FC<ChatMessageImageProps> = ({message}) => {
    const {role, content} = message;
    const defaultImageStyleProps: ImageStyleProps = {maxHeight: '20rem', maxWidth: '30rem'}

    const [image, setImage] = useState<ImageMessageContent | null>(null)
    const [text, setText] = useState<TextMessageContent | null>(null);
    const [imageStyleProps, setImageStyleProps] = useState<ImageStyleProps>(defaultImageStyleProps);



    const [imageBase64, setImageBase64] = useState("");

    useEffect(() => {
        (
            content as Array<TextMessageContent | ImageMessageContent>
            // @ts-ignore
        ).forEach(contentMessage => {
            if (contentMessage.type === 'image_url') {
                setImage(contentMessage);
            } else if (contentMessage.type === 'text') {
                setText(contentMessage);
            } else {
                throw new Error(`Unexpected message type for message: ${contentMessage}`)
            }
        })
    }, []);

    useEffect(() => {
        const fetchImage = async () => {
            try {
                if (image?.image_url?.url) {
                    const filename = image.image_url.url.split("/")[image.image_url.url.split("/").length - 1];
                    fetch(`/api/v2/file/${filename}?filetype=image`).then(page => {
                        page.json().then(resp => {
                            setImageBase64(resp.base64Url);
                            window.scrollTo(0, document.body.scrollHeight);
                        })
                    })
                    // const base64String: string = await getBase64FromImageURL(image?.image_url?.url)
                    // setImageBase64(base64String)
                }

            } catch (error) {
                console.error('Error fetching the image:', error);
                setImageBase64(''); // Setting a fallback or error state
            }
        };

        fetchImage();
    }, [image]);

    const toggleImageStyleProps = (event: any) => {
        if (imageStyleProps?.maxHeight)
            setImageStyleProps({})
        else
            setImageStyleProps(defaultImageStyleProps);
    }

    return <div
        className={`group md:px-4 ${
            role === 'assistant'
                ? 'border-b border-black/10 bg-gray-50 text-gray-800 dark:border-gray-900/50 dark:bg-[#2f2f2f] dark:text-gray-100'
                : 'border-b border-black/10 bg-white text-gray-800 dark:border-gray-900/50 dark:bg-[#212121] dark:text-gray-100'
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
            <img onClick={toggleImageStyleProps} className={'block hover:cursor-pointer'} style={imageStyleProps} src={imageBase64}/>
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

export default ChatMessageImage;
