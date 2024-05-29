import {ImageMessageContent, Message, TextMessageContent} from "@/types/chat";
import {Tiktoken} from "@dqbd/tiktoken/lite/init";
import {getBase64FromImageURL} from "@/utils/app/image";
import {OpenAIModelID, OpenAIVisionModelID} from "@/types/openai";

export const getMessagesToSendV2 = async (
    messages: Message[], encoding: Tiktoken, promptLength: number,
    tokenLimit: number,
): Promise<Message[]> => {
    const imageConversation: boolean = isImageConversation(messages);
    let acc = { tokenCount: promptLength, messagesToSend: [] as Message[] };

    for(let i = messages.length - 1; i >= 0; i--){
        let message = messages[i];
        delete message.messageType;
        let tokens: Uint32Array;
        if (typeof message.content === "string") {
            tokens = encoding.encode(message.content);
        } else if (Array.isArray(message.content)) {
            let allText: string = '';
            for (let contentSection of message.content) {
                if (imageConversation && contentSection.type === "text") {
                    allText += contentSection.text;
                } else if (!imageConversation && contentSection.type === "text") {
                    allText += `THE USER UPLOADED AN IMAGE\n\n${contentSection.text}`
                } else if (imageConversation && contentSection?.type === "image_url") {
                    const url: string = await getBase64FromImageURL((contentSection as ImageMessageContent).image_url.url);
                    allText += url;
                    (contentSection as ImageMessageContent).image_url = { url };
                }
            }
            message.content = message.content.map(contentSection => (contentSection.type === "image_url" && !imageConversation) ? { type: "text", text: "THE USER UPLOADED AN IMAGE" } as TextMessageContent : contentSection);
            tokens = encoding.encode(allText);
        } else if (message.content?.type === 'text') {
            tokens = encoding.encode(message.content.text);
        } else {
            throw new Error(`Unsupported message type: ${JSON.stringify(message)}`);
        }
        // if (acc.tokenCount + tokens.length + 1000 > tokenLimit) {
        //     return acc.messagesToSend;
        // }
        acc.tokenCount += tokens.length;
        if (!imageConversation && Array.isArray(message.content)) {
            // The find statement, safe access, and default makes this inherently the right type
            //   so ignore typescript's failure to understand this
            let content: string = message.content.find(
                contentItem => contentItem.type === "text"
                // @ts-ignore
            )?.text ?? '';
            message.content = content;
        }

        acc.messagesToSend = [message, ...acc.messagesToSend];
    }
    return acc.messagesToSend;
}

export const getMessagesToSend = async (
    messages: Message[], encoding: Tiktoken, promptLength: number,
    tokenLimit: number,
): Promise<Message[]> => {
    const imageConversation: boolean = isImageConversation(messages);
    const { messagesToSend } = await messages.reduceRight(
        async (accPromise, message) => {
            const acc = await accPromise;
            delete message.messageType;

            let tokens: Uint32Array;
            if (typeof message.content === "string") {
                tokens = encoding.encode(message.content);
            } else if (Array.isArray(message.content)) {
                // allText is exclusively used to calculate tokens
                let allText: string ='';
                message.content = await Promise.all(
                    message.content.map(async (contentSection) => {
                        if (contentSection.type === "text") {
                            allText += contentSection.text;
                            return contentSection;
                        } else if (imageConversation) {
                            const url: string = await getBase64FromImageURL(contentSection.image_url.url);
                            allText += url
                            return {
                                ...contentSection, image_url: { url }
                            };
                        } else {
                            return {
                                type: "text",
                                text: "THE USER UPLOADED AN IMAGE"
                            } as TextMessageContent
                        }
                    })
                );
                tokens = encoding.encode(allText);
            } else if (message.content?.type === 'text') {
                tokens = encoding.encode(message.content.text);
            } else {
                throw new Error(`Unsupported message type: ${JSON.stringify(message)}`);
            }

            if (acc.tokenCount + tokens.length + 1000 > tokenLimit) {
                return acc;
            }
            acc.tokenCount += tokens.length;
            acc.messagesToSend = [message, ...acc.messagesToSend];
            return acc;
        },
        Promise.resolve({ tokenCount: promptLength, messagesToSend: [] as Message[] })
    );
    return messagesToSend;
}
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