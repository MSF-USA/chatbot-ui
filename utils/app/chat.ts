import {Message, MessageType} from "@/types/chat";
import {Tiktoken} from "@dqbd/tiktoken/lite/init";

export const getMessagesToSend = (
    messages: Message[], encoding: Tiktoken, promptLength: number,
    tokenLimit: number,
): Message[] => {
    const { messagesToSend } = messages.reduceRight(
        (acc, message) => {
            if (message.messageType === MessageType.IMAGE)
                console.log(message)
            delete message.messageType;
            const tokens = encoding.encode(message.content);
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