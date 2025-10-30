import {
  ChatInputSubmitTypes,
  FileFieldValue,
  FileMessageContent,
  ImageMessageContent,
  TextMessageContent,
} from '@/types/chat';

/**
 * Wraps a value in an array if it's not already an array
 */
const wrapInArray = <T>(value: T | T[]): T[] => {
  return Array.isArray(value) ? value : [value];
};

/**
 * Builds message content based on submit type and field values
 * Extracted from ChatInput to improve testability and reusability
 *
 * @param submitType - The type of message being submitted (text, image, file, multi-file)
 * @param textFieldValue - The text content of the message
 * @param imageFieldValue - Image field value (single or array)
 * @param fileFieldValue - File field value (single or array)
 * @returns The constructed message content
 * @throws Error if submitType is invalid
 */
export const buildMessageContent = (
  submitType: ChatInputSubmitTypes,
  textFieldValue: string,
  imageFieldValue: FileFieldValue,
  fileFieldValue: FileFieldValue,
):
  | string
  | TextMessageContent
  | (TextMessageContent | FileMessageContent)[]
  | (TextMessageContent | ImageMessageContent)[] => {
  if (submitType === 'text') {
    return textFieldValue;
  }

  if (submitType === 'image') {
    const imageContents = imageFieldValue
      ? [
          ...wrapInArray(imageFieldValue),
          ...(fileFieldValue ? wrapInArray(fileFieldValue) : []),
        ]
      : fileFieldValue
        ? [...wrapInArray(fileFieldValue)]
        : [];

    return [
      ...imageContents.filter(
        (item): item is ImageMessageContent => item !== null,
      ),
      { type: 'text', text: textFieldValue } as TextMessageContent,
    ] as (TextMessageContent | ImageMessageContent)[];
  }

  if (submitType === 'file' || submitType === 'multi-file') {
    const fileContents = fileFieldValue
      ? wrapInArray(fileFieldValue).filter(
          (item): item is FileMessageContent => item !== null,
        )
      : [];

    // Only include text content if text is not empty (for audio/video transcription without instructions)
    const textContent = textFieldValue.trim()
      ? [{ type: 'text', text: textFieldValue } as TextMessageContent]
      : [];

    return [...fileContents, ...textContent] as (
      | TextMessageContent
      | FileMessageContent
    )[];
  }

  throw new Error(`Invalid submit type for message: ${submitType}`);
};
