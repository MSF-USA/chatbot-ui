import {FileMessageContent, ImageMessageContent, Message, TextMessageContent} from "@/types/chat";
import {isFileConversation, isImageConversation} from "@/utils/app/chat";
import {getBase64FromImageURL} from "@/utils/app/image";

type ContentType = 'text' | 'image' | 'file'

const getMessageContentType = (
  content: string | TextMessageContent | (TextMessageContent | FileMessageContent)[] | (TextMessageContent | ImageMessageContent)[]
): ContentType => {
  if (typeof content === "string") {
    return 'text'
  } else if (Array.isArray(content)) {
    if (content.some(contentItem => contentItem.type === 'file_url')) {
      return 'file'
    } else if (content.some(contentItem => contentItem.type === 'image_url')) {
      return 'image'
    } else {
      throw new Error('Invalid content type or structure: ' + content)
    }
  } else {
    throw new Error("Invalid content type " + content);
  }
}


export const getMessagesToSend = async (
  messages: Message[], encoding: any, promptLength: number, tokenLimit: number
): Promise<Message[]> => {
  const conversationType: ContentType = getMessageContentType(messages[messages.length - 1].content);
  const fileConversation: boolean = isFileConversation(messages);
  let acc = { tokenCount: promptLength, messagesToSend: [] as Message[] };

  for (let i = messages.length - 1; i >= 0; i--) {
    let message = messages[i];
    delete message.messageType;
    const isLastMessage: boolean = messages.length - 1 === i;

    if (Array.isArray(message.content)) {
      message.content = await processMessageContent(message.content, conversationType);
    } else if (typeof message.content === 'string') {
      /* pass */
    } else if (
      (message.content as (TextMessageContent | FileMessageContent | ImageMessageContent))?.type !== 'text'
    ) {
      throw new Error(`Unsupported message type: ${JSON.stringify(message)}`);
    }

    if (!(conversationType === 'image') && Array.isArray(message.content)) {
      message.content = extractTextContent(message.content);
    }
    acc.messagesToSend = [message, ...acc.messagesToSend];
  }

  return acc.messagesToSend;
};

const processMessageContent = async (
  content: (TextMessageContent | FileMessageContent)[] | (TextMessageContent | ImageMessageContent)[],
  conversationType: ContentType
): Promise<(TextMessageContent | FileMessageContent)[] | (TextMessageContent | ImageMessageContent)[]> => {
  let allText: string = '';

  for (let contentSection of content) {
    if (conversationType === 'image' && contentSection.type === "text") {
      allText += contentSection.text;
    } else if (conversationType !== 'text' && contentSection.type === "text") {
      allText += getContentTypePrefix(conversationType) + contentSection.text;
    } else if (conversationType === 'image' && contentSection?.type === "image_url") {
      allText += await processImageUrl(contentSection as ImageMessageContent);
    }
  }

  return content.map(contentSection =>
    contentSection.type === "image_url" && !(conversationType === 'image')
      ? { type: "text", text: "THE USER UPLOADED AN IMAGE" } as TextMessageContent
      : contentSection
  ) as (TextMessageContent | FileMessageContent)[] | (TextMessageContent | ImageMessageContent)[];
};

const getContentTypePrefix = (contentType: ContentType): string => {
  if (contentType === 'image') return 'THE USER UPLOADED AN IMAGE\n\n';
  if (contentType === 'file') return 'THE USER UPLOADED A FILE\n\n';
  return '';
};

const processImageUrl = async (contentSection: ImageMessageContent): Promise<string> => {
  const id: string | undefined = contentSection.image_url.url.split('/').pop();
  if (!id || id.trim().length === 0) {
    throw new Error(`Image ID ${id} is not valid`);
  }

  try {
    const url: string = await getBase64FromImageURL(contentSection.image_url.url);
    contentSection.image_url = { url };
    return url;
  } catch (error: unknown) {
    throw new Error(`Failed to pull image from image url: ${contentSection}`);
  }
};

const extractTextContent = (content: (TextMessageContent | FileMessageContent)[] | (TextMessageContent | ImageMessageContent)[]): string => {
  const textContent: TextMessageContent | undefined = (
    content as (TextMessageContent | ImageMessageContent | FileMessageContent)[]
  ).find(
    contentItem => contentItem.type === "text"
  ) as TextMessageContent;
  if (!textContent)
    throw new Error(`Couldn't find text content type in ${JSON.stringify(content)}`);

  // @ts-ignore
  return textContent.text ?? '';
};
