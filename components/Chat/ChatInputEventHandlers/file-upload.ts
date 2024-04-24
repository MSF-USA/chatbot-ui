import React from "react";

export function onFileUpload (event: React.ChangeEvent<any>) {
    event.preventDefault();
    const file = event.target.files[0];

    const formData = new FormData();
    formData.append("file", file);

    console.log(file)
}