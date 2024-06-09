import {ImageMessageContent, Message, TextMessageContent} from "@/types/chat";
import {Tiktoken} from "@dqbd/tiktoken/lite/init";
import {OpenAIModelID, OpenAIVisionModelID} from "@/types/openai";

/*
* Checks whether a collection of messages is an image conversation by checking the type of the last message in the conversation.
*/
export const isImageConversation = (messages: Message[]): boolean => {
    const lastMessage = messages.length === 1 ? messages[0] : messages[messages.length-1];
    if(Array.isArray(lastMessage.content)) {
        return lastMessage.content.some(contentItem => contentItem.type === 'image_url');
    }

    return false;
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
