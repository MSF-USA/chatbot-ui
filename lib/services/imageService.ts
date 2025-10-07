import {ImageMessageContent} from "@/types/chat";

export const fetchImageBase64FromMessageContent = async (image: ImageMessageContent) : Promise<string> => {
  try {
    if (image?.image_url?.url) {
      const filename = image.image_url.url.split("/")[image.image_url.url.split("/").length - 1];
      const page: Response = await fetch(`/api/file/${filename}?filetype=image`);
      const resp = await page.json();
      return resp.base64Url;
    } else {
      console.warn(`Couldn't find url in message content: ${JSON.stringify(image)}`);
      return '';
    }

  } catch (error) {
    console.error('Error fetching the image:', error);
    return '';
  }
};
