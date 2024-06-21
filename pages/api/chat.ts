
import { OpenAIStream, StreamingTextResponse } from "ai"
import OpenAI from "openai"

import {
  APIM_CHAT_ENDPONT,
  AZURE_DEPLOYMENT_ID,
  DEFAULT_SYSTEM_PROMPT,
  DEFAULT_TEMPERATURE,
  OPENAI_API_HOST,
  OPENAI_API_VERSION
} from '@/utils/app/const';
import {OpenAIError} from '@/utils/server';

import {ChatBody, FileMessageContent, Message, TextMessageContent} from '@/types/chat';
import {OpenAIModelID, OpenAIVisionModelID} from '@/types/openai';

// @ts-expect-error
import wasm from '../../node_modules/@dqbd/tiktoken/lite/tiktoken_bg.wasm?module';

import tiktokenModel from '@dqbd/tiktoken/encoders/cl100k_base.json';
import {init, Tiktoken} from '@dqbd/tiktoken/lite/init';
import {getToken} from "next-auth/jwt";
import {NextRequest} from "next/server";
import {checkIsModelValid, isFileConversation, isImageConversation} from "@/utils/app/chat";
import {ApimChatResponseDataStructure} from "@/types/apim";
import {JWT} from 'next-auth';
import {getMessagesToSend} from "@/utils/server/chat";
 import {parseAndQueryFileLangchainOpenAI} from "@/utils/app/langchain";
import fs from "fs";
import {pipeline} from "node:stream/promises";
import {Readable} from "stream";


export const config = {
  runtime: 'nodejs',
};


const handler = async (req: NextRequest): Promise<Response> => {
  try {
    const { model, messages, prompt, temperature } = (await req.json()) as ChatBody;

    await init((imports) => WebAssembly.instantiate(wasm, imports));
    const encoding = new Tiktoken(
      tiktokenModel.bpe_ranks,
      tiktokenModel.special_tokens,
      tiktokenModel.pat_str,
    );

    let promptToSend = prompt;
    if (!promptToSend) {
      promptToSend = DEFAULT_SYSTEM_PROMPT;
    }

    let temperatureToUse = temperature;
    if (temperatureToUse == null) {
      temperatureToUse = DEFAULT_TEMPERATURE;
    }

    const needsToHandleImages: boolean = isImageConversation(messages);
    let needsToHandleFiles: boolean = false;
    if (!needsToHandleImages)
      needsToHandleFiles = isFileConversation(messages);

    const isValidModel: boolean = checkIsModelValid(model.id, OpenAIModelID)
    const isImageModel: boolean = checkIsModelValid(model.id, OpenAIVisionModelID)

    let modelToUse = model.id;
    if (isValidModel && needsToHandleImages && !isImageModel) {
      modelToUse = "gpt-4o";
    } else if (modelToUse == null || !isValidModel) {
      modelToUse = AZURE_DEPLOYMENT_ID;
    }

    const prompt_tokens = encoding.encode(promptToSend);

    const messagesToSend: Message[] = await getMessagesToSend(
        messages, encoding, prompt_tokens.length, model.tokenLimit
    );
    encoding.free();

    const token: JWT | null = await (getToken({req}) as Promise<JWT | null>);
    if (!token)
      throw new Error("Could not pull token!")

    const openAIArgs: any = {
        baseURL: `${OPENAI_API_HOST}/${APIM_CHAT_ENDPONT}/deployments/${modelToUse}`,
        defaultQuery: { "api-version": OPENAI_API_VERSION },
        defaultHeaders: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${ token.accessToken }`
        },
    }

    if (process.env.OPENAI_API_KEY)
      openAIArgs.apiKey = process.env.OPENAI_API_KEY;
    else
      openAIArgs.apiKey = '';

    if (needsToHandleFiles) {
      const lastMessage: Message = messagesToSend[messagesToSend.length - 1];
      const content = lastMessage.content as Array<TextMessageContent | FileMessageContent>;

      let prompt: string | null = null;
      let fileUrl: string | null = null;
      content.forEach(section => {
        if (section.type === 'text')
          prompt = section.text;
        else if (section.type === 'file_url')
          fileUrl = section.url;
        else
          throw new Error(`Unexpected content section type: ${JSON.stringify(section)}`);
      });

      if (!prompt)
        throw new Error("Could not find text content type!");
      if (!fileUrl)
        throw new Error('Could not find file URL!');

      const filename = (fileUrl as string).split('/').pop()
      if (!filename)
        throw new Error("Could not parse filename from URL!");
      const filePath = `/tmp/${filename}`;

      try {
        const response = await fetch(fileUrl);
        const fileStream = fs.createWriteStream(filePath);

        if (!response.body)
          throw new Error("Could not find file URL!");

        const readableStream = Readable.fromWeb(response.body as any);
        await pipeline(readableStream, fileStream);

        console.log('File downloaded successfully.');
      } catch (error) {
        console.error('Error downloading the file:', error);
        throw error;
      }

      try {
        const fileBuffer = fs.readFileSync(filePath);
        const file = new File([fileBuffer], 'file.pdf', { type: 'application/pdf' });
        const responseString: string = await parseAndQueryFileLangchainOpenAI(file, prompt);

        return new Response(JSON.stringify({
          content: responseString
        }))
        console.log('File parsed successfully.');
      } catch (error) {
        console.error('Error parsing the file:', error);
        throw error;
      } finally {
        // Delete the file after parsing
        fs.unlinkSync(filePath);
      }
    } else {
      const azureOpenai = new OpenAI(openAIArgs)
      const response = await azureOpenai.chat.completions.create({
        model: modelToUse,
        messages: messagesToSend as OpenAI.Chat.Completions.ChatCompletionMessageParam[],
        temperature: temperatureToUse,
        max_tokens: null,
        stream: true
      })

      //Formatting changed significantly on 'ai' package > 3.0.19
      const stream = OpenAIStream(response)

      return new StreamingTextResponse(stream)
    }


  } catch (error: any) {
      const errorMessage = error.error?.message || "An unexpected error occurred"
      const errorCode = error.status || 500

      console.error(error);
      return new Response(JSON.stringify({ message: errorMessage }), {
          status: errorCode
      })
  }
};

export default handler;
