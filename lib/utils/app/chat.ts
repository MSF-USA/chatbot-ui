import {ImageMessageContent, Message, TextMessageContent} from "@/types/chat";
import {Tiktoken} from "@dqbd/tiktoken/lite/init";
import {OpenAIModelID, OpenAIVisionModelID} from "@/types/openai";

/**
 * Checks if a collection of messages is of a specific conversation type by checking the type of the last message in the conversation.
 *
 * @param {Message[]} messages - The array of messages representing the conversation.
 * @param {string} type - The desired conversation type to check for.
 * @returns {boolean} - Returns true if the last message in the conversation has content of the specified type, false otherwise.
 */
const isConversationType = (messages: Message[], type: string): boolean => {
    if (messages.length === 0) {
        return false;
    }
    const lastMessage = messages.length === 1 ? messages[0] : messages[messages.length-1];
    if(Array.isArray(lastMessage.content)) {
        return lastMessage.content.some(contentItem => contentItem.type === type);
    }
    return false;
}

/**
 * Checks whether a collection of messages is an image conversation by checking the type of the last message in the conversation.
 *
 * @param {Message[]} messages - The array of messages representing the conversation.
 * @returns {boolean} - Returns true if the last message in the conversation has content of type 'image_url', false otherwise.
 * @example
 * const messages = [
 *   { content: [{ type: 'text', text: 'Hello' }] },
 *   { content: [{ type: 'image_url', url: 'https://example.com/image.jpg' }] }
 * ];
 * const isImageConvo = isImageConversation(messages);
 * console.log(isImageConvo); // Output: true
 */
export const isImageConversation = (messages: Message[]): boolean => {
    return isConversationType(messages, 'image_url');
}

/**
 * Checks whether a collection of messages is a file conversation by checking the type of the last message in the conversation.
 *
 * @param {Message[]} messages - The array of messages representing the conversation.
 * @returns {boolean} - Returns true if the last message in the conversation has content of type 'file_url', false otherwise.
 * @example
 * const messages = [
 *   { content: [{ type: 'text', text: 'Here is the file' }] },
 *   { content: [{ type: 'file_url', url: 'https://example.com/file.pdf' }] }
 * ];
 * const isFileConvo = isFileConversation(messages);
 * console.log(isFileConvo); // Output: true
 */
export const isFileConversation = (messages: Message[]): boolean => {
    return isConversationType(messages, 'file_url');
}


/**
 * Checks if a given model ID is valid based on a set of valid model IDs.
 *
 * @param {string} modelId - The model ID to check for validity.
 * @param {OpenAIModelID | OpenAIVisionModelID} validModelIDs - An object containing valid model IDs.
 * @returns {boolean} - Returns true if the model ID is valid, false otherwise.
 *
 * @example
 * const isValid = checkIsModelValid('gpt-35-turbo', OpenAIModelID);
 * console.log(isValid); // Output: true
 *
 * @example
 * const isValid = checkIsModelValid('gpt-4-vision-preview', OpenAIVisionModelID);
 * console.log(isValid); // Output: true
 *
 * @example
 * const isValid = checkIsModelValid('invalid-model', OpenAIModelID);
 * console.log(isValid); // Output: false
 *
 * @remarks
 * This function takes a model ID and an object containing valid model IDs as parameters.
 * It converts the valid model IDs object to an array of strings using `Object.values()` and `toString()`.
 * It then checks if the given model ID is included in the array of valid model IDs using the `includes()` method.
 * The function returns true if the model ID is found in the array of valid model IDs, indicating that it is a valid model.
 * Otherwise, it returns false, indicating that the model ID is not valid.
 */
export const checkIsModelValid = (
    modelId: string,
    validModelIDs: object
): boolean => {
    if (
        validModelIDs !== OpenAIModelID &&
        validModelIDs !== OpenAIVisionModelID
    ) {
        throw new Error('Invalid enum provided for validModelIDs');
    }

    return Object.values(validModelIDs).toString().split(',').includes(modelId);
}
