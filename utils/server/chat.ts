import {ImageMessageContent, Message, TextMessageContent} from "@/types/chat";
import {isImageConversation} from "@/utils/app/chat";
import {getBase64FromImageURL} from "@/utils/app/image";

export const getMessagesToSend = async (
  messages: Message[], encoding: any, promptLength: number,
  tokenLimit: number
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
          let url: string;
          const id: string | undefined = (contentSection as ImageMessageContent).image_url.url.split('/').pop()
          if (!id || id.trim().length === 0)
            throw new Error(`Image ID ${id} is not valid`);
          if (!process.env.NEXT_PUBLIC_URL)
            throw new Error(`Required ENV Variable 'NEXT_PUBLIC_URL' is missing a value`);
          try {
            url = await getBase64FromImageURL((contentSection as ImageMessageContent).image_url.url);
          } catch (error: any) {
            throw new Error(`Failed to pull image from image url: ${contentSection}`);
          }
          allText += url;
          (contentSection as ImageMessageContent).image_url = { url };
        }
      }
      message.content = message.content.map(contentSection => (contentSection.type === "image_url" && !imageConversation) ? { type: "text", text: "THE USER UPLOADED AN IMAGE" } as TextMessageContent : contentSection);
      // tokens = encoding.encode(allText);
    } else if (message.content?.type === 'text') {
      // tokens = encoding.encode(message.content.text);
    } else {
      throw new Error(`Unsupported message type: ${JSON.stringify(message)}`);
    }
    // if (acc.tokenCount + tokens.length + 1000 > tokenLimit) {
    //     return acc.messagesToSend;
    // }
    // acc.tokenCount += tokens.length;
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
