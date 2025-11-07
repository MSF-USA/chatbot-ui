import { Session } from 'next-auth';

import { isFileConversation, isImageConversation } from '@/lib/utils/app/chat';
import { getBase64FromImageURL } from '@/lib/utils/app/image';
import { getBlobBase64String } from '@/lib/utils/server/blob';

import {
  FileMessageContent,
  ImageMessageContent,
  Message,
  TextMessageContent,
} from '@/types/chat';

import { Tiktoken } from '@dqbd/tiktoken/lite/init';

type ContentType = 'text' | 'image' | 'file';

type ContentItem =
  | TextMessageContent
  | FileMessageContent
  | ImageMessageContent;

/**
 * Detects ALL content types present in a message.
 * Returns a Set to properly handle mixed content (e.g., file + image).
 *
 * Use this for routing decisions where you need to know about multiple content types.
 * Use getMessageContentType() for backwards-compatible single-type detection.
 */
export const getMessageContentTypes = (
  content:
    | string
    | TextMessageContent
    | (TextMessageContent | FileMessageContent)[]
    | (TextMessageContent | ImageMessageContent)[]
    | (TextMessageContent | FileMessageContent | ImageMessageContent)[],
): Set<ContentType> => {
  const types = new Set<ContentType>();

  if (typeof content === 'string') {
    types.add('text');
  } else if (Array.isArray(content)) {
    content.forEach((contentItem) => {
      if (contentItem.type === 'file_url') {
        types.add('file');
      } else if (contentItem.type === 'image_url') {
        types.add('image');
      } else if (contentItem.type === 'text') {
        types.add('text');
      }
    });
  } else if ('type' in content) {
    if (content.type === 'text') types.add('text');
    else if (content.type === 'file_url') types.add('file');
    else if (content.type === 'image_url') types.add('image');
  }

  return types;
};

/**
 * Legacy function that returns a single content type.
 * For mixed content, returns the first type found (priority: file > image > text).
 *
 * @deprecated Use getMessageContentTypes() for mixed content detection.
 */
export const getMessageContentType = (
  content:
    | string
    | TextMessageContent
    | (TextMessageContent | FileMessageContent)[]
    | (TextMessageContent | ImageMessageContent)[]
    | (TextMessageContent | FileMessageContent | ImageMessageContent)[],
): ContentType => {
  if (typeof content === 'string') {
    return 'text';
  } else if (Array.isArray(content)) {
    if (content.some((contentItem) => contentItem.type === 'file_url')) {
      return 'file';
    } else if (
      content.some((contentItem) => contentItem.type === 'image_url')
    ) {
      return 'image';
    } else if (content.length === 1) {
      switch (content[0].type) {
        case 'file_url':
          return 'file';
        case 'image_url':
          return 'image';
        case 'text':
          return 'text';
        default: {
          const invalidItem = content[0] as { type: string };
          throw new Error(`Invalid content type: ${invalidItem.type}`);
        }
      }
    } else {
      throw new Error(
        'Invalid content type or structure: ' + JSON.stringify(content),
      );
    }
  } else {
    throw new Error('Invalid content type ' + JSON.stringify(content));
  }
};

export const getMessagesToSend = async (
  messages: Message[],
  encoding: Tiktoken,
  promptLength: number,
  tokenLimit: number,
  user: Session['user'],
): Promise<Message[]> => {
  const conversationType: ContentType = getMessageContentType(
    messages[messages.length - 1].content,
  );
  const fileConversation: boolean = isFileConversation(messages);
  let acc = { tokenCount: promptLength, messagesToSend: [] as Message[] };

  for (let i = messages.length - 1; i >= 0; i--) {
    let message = messages[i];
    delete message.messageType;
    const isLastMessage: boolean = messages.length - 1 === i;

    if (Array.isArray(message.content)) {
      message.content = await processMessageContent(
        message.content,
        conversationType,
        isLastMessage,
        user,
      );
    } else if (typeof message.content === 'string') {
      /* pass */
    } else if (
      (
        message.content as
          | TextMessageContent
          | FileMessageContent
          | ImageMessageContent
      )?.type !== 'text'
    ) {
      throw new Error(`Unsupported message type: ${JSON.stringify(message)}`);
    }

    if (
      !isLastMessage &&
      conversationType !== 'image' &&
      Array.isArray(message.content)
    ) {
      message.content = extractTextContent(message.content);
    }
    acc.messagesToSend = [message, ...acc.messagesToSend];
  }

  return acc.messagesToSend;
};

const processMessageContent = async (
  content:
    | (TextMessageContent | FileMessageContent)[]
    | (TextMessageContent | ImageMessageContent)[]
    | (TextMessageContent | FileMessageContent | ImageMessageContent)[],
  conversationType: ContentType,
  isLastMessageInConversation: boolean,
  user: Session['user'],
): Promise<
  | (TextMessageContent | FileMessageContent)[]
  | (TextMessageContent | ImageMessageContent)[]
  | (TextMessageContent | FileMessageContent | ImageMessageContent)[]
> => {
  let allText: string = '';

  let processedContent:
    | (TextMessageContent | FileMessageContent)[]
    | (TextMessageContent | ImageMessageContent)[]
    | (TextMessageContent | FileMessageContent | ImageMessageContent)[] = (
    content as ContentItem[]
  ).filter((contentSection) => {
    if (!isLastMessageInConversation && contentSection.type === 'file_url') {
      return false; // Remove file_url content sections for non-last messages
    }
    return true;
  });

  for (let contentSection of processedContent) {
    if (conversationType === 'image' && contentSection.type === 'text') {
      allText += contentSection.text;
    } else if (
      conversationType !== 'text' &&
      contentSection.type === 'text' &&
      !isLastMessageInConversation
    ) {
      const contentTypePrefix: string =
        getContentTypePrefix(conversationType) + contentSection.text;
      contentSection.text = contentTypePrefix;
      allText += contentTypePrefix;
    } else if (
      conversationType === 'image' &&
      contentSection?.type === 'image_url'
    ) {
      const imageUrl: string = await processImageUrl(
        contentSection as ImageMessageContent,
        user,
      );
      allText += imageUrl;
      contentSection.image_url.url = imageUrl;
    }
  }

  return processedContent.map((contentSection) =>
    contentSection.type === 'image_url' &&
    !(conversationType === 'image') &&
    !(conversationType === 'file') // Don't convert images to text for file conversations
      ? ({
          type: 'text',
          text: 'THE USER UPLOADED AN IMAGE',
        } as TextMessageContent)
      : contentSection,
  ) as
    | (TextMessageContent | FileMessageContent)[]
    | (TextMessageContent | ImageMessageContent)[];
};

const getContentTypePrefix = (contentType: ContentType): string => {
  if (contentType === 'image') return 'THE USER UPLOADED AN IMAGE\n\n';
  if (contentType === 'file') return 'THE USER UPLOADED A FILE\n\n';
  return '';
};

const processImageUrl = async (
  contentSection: ImageMessageContent,
  user: Session['user'],
): Promise<string> => {
  const id: string | undefined = contentSection.image_url.url.split('/').pop();
  if (!id || id.trim().length === 0) {
    throw new Error(`Image ID ${id} is not valid`);
  }

  let url: string;
  try {
    url = await getBlobBase64String(
      user?.id ?? 'anonymous',
      contentSection.image_url.url.split('/')[
        contentSection.image_url.url.split('/').length - 1
      ],
      'images',
      user,
    );
    contentSection.image_url = {
      url,
      detail: 'auto',
    };
    return url;
  } catch (error: unknown) {
    url = await getBase64FromImageURL(contentSection.image_url.url);
    contentSection.image_url = {
      url,
      detail: 'auto',
    };
    return url;
  }
};

const extractTextContent = (
  content:
    | (TextMessageContent | FileMessageContent)[]
    | (TextMessageContent | ImageMessageContent)[]
    | (TextMessageContent | FileMessageContent | ImageMessageContent)[],
): string => {
  const textContent: TextMessageContent | undefined = (
    content as ContentItem[]
  ).find((contentItem) => contentItem.type === 'text') as
    | TextMessageContent
    | undefined;

  if (!textContent) {
    throw new Error(
      `Couldn't find text content type in ${JSON.stringify(content)}`,
    );
  }

  return textContent.text ?? '';
};
