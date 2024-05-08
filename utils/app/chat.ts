import {Message} from "@/types/chat";
import {Tiktoken} from "@dqbd/tiktoken/lite/init";
import {getBase64FromImageURL} from "@/utils/app/image";

export const getMessagesToSend = async (
    messages: Message[], encoding: Tiktoken, promptLength: number,
    tokenLimit: number,
): Promise<Message[]> => {
    const { messagesToSend } = await messages.reduceRight(
        async (accPromise, message) => {
            const acc = await accPromise;
            delete message.messageType;

            let tokens: Uint32Array;
            if (typeof message.content === "string") {
                tokens = encoding.encode(message.content);
            } else if (Array.isArray(message.content)) {
                tokens = encoding.encode('');
                message.content = await Promise.all(
                    message.content.map(async (contentSection) => {
                        if (contentSection.type === "text") {
                            return contentSection;
                        } else {
                            const url = await getBase64FromImageURL(contentSection.image_url.url);
                            return {
                                ...contentSection, image_url: { url }
                            };
                        }
                    })
                );
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
    const lastMessage = messages[messages.length-1];
    if(Array.isArray(lastMessage.content)) {
        return lastMessage.content.some(contentItem => contentItem.type === 'image_url');
    }

    return false;
}