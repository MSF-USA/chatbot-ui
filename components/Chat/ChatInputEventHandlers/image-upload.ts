import React, {MutableRefObject} from "react";

export function onImageUpload (event: React.ChangeEvent<any>) {
    event.preventDefault();
    const file = event.target.files[0];

    const formData = new FormData();
    formData.append("file", file);

    console.log(file)
}

export function onImageUploadButtonClick(event: React.ChangeEvent<any>, fileInputRef: MutableRefObject<any>) {
    event.preventDefault();
    fileInputRef.current.click();
}