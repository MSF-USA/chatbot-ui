import {FC} from "react";
import {IconRobot, IconUser} from "@tabler/icons-react";

const ChatMessageImage: FC<any> = ({message}) => {
    const {role, content: {image_url}} = message;
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
            <img src={image_url} />
        </div>
    </div>
}

export default ChatMessageImage;
