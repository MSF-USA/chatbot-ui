import React from "react";
import toast from "react-hot-toast";

export function onFileUpload(event: React.ChangeEvent<any>) {
    event.preventDefault();
    const file = event.target.files[0];

    if (file.size > 10485760) {
        toast.error("Image upload must be <10mb");
        return;
    }

    const formData = new FormData();
    formData.append("file", file);

    fetch("/api/file/upload", {
        method: "POST",
        body: formData,
    })
      .then((response: Response) => {
          if (response.ok) {
              toast.success("File uploaded successfully");
          } else {
              toast.error("File upload failed");
          }
      })
      .catch(() => {
          toast.error("File upload failed");
      });
}
