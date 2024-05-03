import {Message, MessageType, TextMessageContent} from "@/types/chat";
import {Tiktoken} from "@dqbd/tiktoken/lite/init";

export const getMessagesToSend = (
    messages: Message[], encoding: Tiktoken, promptLength: number,
    tokenLimit: number,
): Message[] => {
    const { messagesToSend } = messages.reduceRight(
        (acc, message) => {
            delete message.messageType;

            let tokens: Uint32Array;
            if (typeof message.content === "string")
                tokens = encoding.encode(message.content);
            else if (message.content?.type === 'text')
                tokens = encoding.encode(message.content.text);
            else if (message.content?.type === 'image_url')
                tokens = encoding.encode('')
            else
                throw new Error(`Unsupported message type: ${message}`)

            if (acc.tokenCount + tokens.length + 1000 > tokenLimit) {
                return acc;
            }
            acc.tokenCount += tokens.length;
            acc.messagesToSend = [message, ...acc.messagesToSend];
            return acc;
        },
        { tokenCount: promptLength, messagesToSend: [] as Message[] }
    );
    return messagesToSend;
}
