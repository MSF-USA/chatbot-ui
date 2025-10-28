import { Message } from '@/types/chat';
import { OpenAIModelID } from '@/types/openai';

/**
 * Checks if any message contains audio or video files that need transcription
 */
export const isAudioVideoConversation = (messages: Message[]): boolean => {
  const audioVideoExtensions = [
    '.mp3',
    '.mp4',
    '.mpeg',
    '.mpga',
    '.m4a',
    '.wav',
    '.webm',
  ];

  console.log('[isAudioVideoConversation] Checking messages:', messages.length);

  const result = messages.some((message, idx) => {
    console.log(
      `[isAudioVideoConversation] Message ${idx} content type:`,
      Array.isArray(message.content) ? 'array' : typeof message.content,
    );

    if (Array.isArray(message.content)) {
      console.log(
        `[isAudioVideoConversation] Message ${idx} content items:`,
        message.content.length,
      );

      return message.content.some((content: any, contentIdx) => {
        console.log(
          `[isAudioVideoConversation] Content ${contentIdx}:`,
          JSON.stringify(content).substring(0, 200),
        );

        if (content.type === 'file_url') {
          // Check both URL and originalFilename for extension
          const urlToCheck = content.url || '';
          const filenameToCheck = content.originalFilename || '';

          const urlExt = urlToCheck
            ? '.' + urlToCheck.split('.').pop()?.toLowerCase()
            : '';
          const filenameExt = filenameToCheck
            ? '.' + filenameToCheck.split('.').pop()?.toLowerCase()
            : '';

          const isAudioVideoByUrl = audioVideoExtensions.includes(urlExt);
          const isAudioVideoByFilename =
            audioVideoExtensions.includes(filenameExt);
          const isAudioVideo = isAudioVideoByUrl || isAudioVideoByFilename;

          console.log(
            `[isAudioVideoConversation] URL: ${urlToCheck.substring(0, 50)}...`,
          );
          console.log(
            `[isAudioVideoConversation] Filename: ${filenameToCheck}`,
          );
          console.log(
            `[isAudioVideoConversation] URL ext: ${urlExt}, Filename ext: ${filenameExt}, Result: ${isAudioVideo}`,
          );

          return isAudioVideo;
        }
        return false;
      });
    }
    return false;
  });

  console.log('[isAudioVideoConversation] Final result:', result);
  return result;
};

/**
 * Check if model uses the special Responses API (reasoning models)
 */
export function isReasoningModel(id: OpenAIModelID | string): boolean {
  return (
    id === OpenAIModelID.GPT_o3 ||
    id === OpenAIModelID.DEEPSEEK_R1 ||
    id.includes('o3') ||
    id.includes('deepseek-r1')
  );
}

/**
 * Check if conversation contains images (checks only the last message)
 */
export const isImageConversation = (messages: Message[]): boolean => {
  if (messages.length === 0) return false;

  const lastMessage = messages[messages.length - 1];
  if (Array.isArray(lastMessage.content)) {
    return lastMessage.content.some(
      (content: any) => content.type === 'image_url',
    );
  }
  return false;
};

/**
 * Check if conversation contains files (checks only the last message)
 */
export const isFileConversation = (messages: Message[]): boolean => {
  if (messages.length === 0) return false;

  const lastMessage = messages[messages.length - 1];
  if (Array.isArray(lastMessage.content)) {
    return lastMessage.content.some(
      (content: any) => content.type === 'file_url',
    );
  }
  return false;
};

/**
 * Checks if a model ID represents a custom agent
 */
export const isCustomAgentModel = (modelId: string | undefined): boolean => {
  if (!modelId) return false;
  return modelId.startsWith('custom-');
};

/**
 * Validates if a model ID exists in the allowed model IDs or is a custom agent
 */
export const checkIsModelValid = (
  modelId: string | undefined,
  allowedModelIds: Record<string, string> | typeof OpenAIModelID,
): boolean => {
  if (!modelId) return false;
  // Custom agents are always valid
  if (isCustomAgentModel(modelId)) return true;
  return Object.values(allowedModelIds).includes(modelId);
};
