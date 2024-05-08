import FileIcon from "@/components/Icons/file";
import React, {MutableRefObject, useRef} from "react";

interface ChatInputFileProps {
    onFileUpload: (event: React.ChangeEvent<any>) => void
    setSubmitType: (type: string) => void,
    setContent: (content: any) => void,
}

const ChatInputFile = ({onFileUpload, setSubmitType}: ChatInputFileProps) => {
    const fileInputRef: MutableRefObject<any> = useRef(null)
    return <>
        <input
            type="file"
            ref={fileInputRef}
            style={{display: "none"}}
            onChange={(event) => {
                event.preventDefault()
                setSubmitType("file");
                onFileUpload(event)
            }}
        />
        <button onClick={(event) => {
            event.preventDefault();
            fileInputRef.current?.click();
        }}>
            <FileIcon className="bg-[#343541] rounded h-5 w-5"/>
            <span className="sr-only">Add document</span>
        </button>
    </>
}

export default ChatInputFile;