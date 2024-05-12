import {XIcon} from "@/components/Icons/cancel";
import {Dispatch, FC, SetStateAction, MouseEvent} from "react";
import Image from "next/image";
import {ChatInputSubmitTypes} from "@/types/chat";

interface ChatFileUploadPreviewsProps {
    filePreviews: string[],
    setFilePreviews: Dispatch<SetStateAction<string[]>>,
    setSubmitType: Dispatch<SetStateAction<ChatInputSubmitTypes>>,
}
interface ChatFileUploadPreviewProps {
    filePreview: string,
    setFilePreviews: Dispatch<SetStateAction<string[]>>,
    setSubmitType: Dispatch<SetStateAction<ChatInputSubmitTypes>>,
}

const ChatFileUploadPreview: FC<ChatFileUploadPreviewProps> = ({filePreview, setFilePreviews, setSubmitType}) => {
    const removeFilePreview = (event: MouseEvent<HTMLButtonElement>, filePreview: string) => {
        event.preventDefault();
        setFilePreviews(prevPreviews => {
            const newPreviews = prevPreviews.filter(prevPreview => prevPreview !== filePreview)
            if (newPreviews.length === 0)
                setSubmitType("text")
            return newPreviews
        })

    }

    return (
        <>
            <img
                alt="Preview"
                className="object-cover"
                height="150"
                src={filePreview}
                style={{
                    aspectRatio: "200/150",
                    objectFit: "cover",

                }}
                width="200"
            />
            <button
                className="absolute top-1 right-1 rounded-full"
                onClick={(event: React.MouseEvent<HTMLButtonElement>) => removeFilePreview(event, filePreview)}
            >
                <XIcon className="bg-[#343541] rounded w-4 h-4"/>
                <span className="sr-only">Remove</span>
            </button>
        </>
    )
}

const ChatFileUploadPreviews: FC<ChatFileUploadPreviewsProps> = ({filePreviews, setFilePreviews, setSubmitType}) => {
    if (filePreviews.length === 0) {
        return null;
    }

    return (
        <div className="grid grid-cols-2 gap-2">
            <div
                className="relative left-1.5 p-0 py-2 pr-8 pl-8 aspect-video rounded-md overflow-hidden border border-gray-200 dark:border-gray-800"
                style={{
                    maxHeight: '150px',
                    maxWidth: "150px"
                }}
            >
                {filePreviews.map(
                    (filePreview, index) => <ChatFileUploadPreview
                        filePreview={filePreview}
                        key={`${filePreview}-${index}`}
                        setFilePreviews={setFilePreviews}
                        setSubmitType={setSubmitType}
                    />
                )}
            </div>
        </div>
    )
}

export default ChatFileUploadPreviews;
