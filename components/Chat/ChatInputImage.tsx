import ImageIcon from "@/components/Icons/image";
import React, {MutableRefObject, useRef} from "react";


const onImageUpload = (event: React.ChangeEvent<any>) => {
    event.preventDefault();
    const file = event.target.files[0];

    const formData = new FormData();
    formData.append("file", file);

    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onloadend = () => {
        const base64String = reader.result as string;
        fetch(`/api/image?filename=${encodeURI(file.name)}`, {
            method: 'POST',
            body: base64String,
        })

    };

    console.log(file)

}

const onImageUploadButtonClick = (event: React.ChangeEvent<any>, fileInputRef: MutableRefObject<any>) => {
    event.preventDefault();
    fileInputRef.current.click();
}

const ChatInputImage = ({}: any) => {
    const imageInputRef: MutableRefObject<any> = useRef(null);


    return <>
        <input
            type="file"
            ref={imageInputRef}
            style={{display: "none"}}
            onChange={onImageUpload}
            accept={"image/*"}
        />
        <button onClick={(e) => onImageUploadButtonClick(e, imageInputRef)}>
            <ImageIcon className="h-5 w-5"/>
            <span className="sr-only">Add image</span>
        </button>
    </>
}

export default ChatInputImage