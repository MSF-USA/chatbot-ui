import {
  APIM_CHAT_ENDPONT,
  AZURE_DEPLOYMENT_ID,
  DEFAULT_SYSTEM_PROMPT,
  DEFAULT_TEMPERATURE,
  OPENAI_API_HOST, OPENAI_API_TYPE, OPENAI_API_VERSION
} from '@/utils/app/const';
import { OpenAIError } from '@/utils/server';

import { ChatBody, Message } from '@/types/chat';
import { OpenAIModelID } from '@/types/openai';

// @ts-expect-error
import wasm from '../../node_modules/@dqbd/tiktoken/lite/tiktoken_bg.wasm?module';

import tiktokenModel from '@dqbd/tiktoken/encoders/cl100k_base.json';
import { Tiktoken, init } from '@dqbd/tiktoken/lite/init';
import {getToken} from "next-auth/jwt";
import {makeAPIMRequestWithRetry} from "@/utils/server/apim";
import {NextRequest} from "next/server";
import {getMessagesToSendV2, isImageConversation} from "@/utils/app/chat";
import {ApimChatResponseDataStructure} from "@/types/apim";
import AzureOpenAIClient from "@/utils/server/azure-openai";
import {JWT} from 'next-auth';


export const config = {
  runtime: 'edge',
};


const handler = async (req: NextRequest): Promise<Response> => {

  try {
    const { model, messages, key, prompt, temperature } = (await req.json()) as ChatBody;

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

    const isValidModel = Object.values(OpenAIModelID).toString().includes(model.id)

    let modelToUse = model.id
    if (modelToUse == null || !isValidModel) {
      modelToUse = AZURE_DEPLOYMENT_ID;
    }

    const prompt_tokens = encoding.encode(promptToSend);

    const messagesToSend: Message[] = await getMessagesToSendV2(
        messages, encoding, prompt_tokens.length, model.tokenLimit
    );
    encoding.free();
    // @ts-ignore
    const token: JWT | null = await getToken({req});
    if (!token)
      throw new Error("Could not pull token!")

    let resp;

    if (isImageConversation(messages)) {
      const openaiClient = new AzureOpenAIClient();
      resp = await openaiClient.getVisionCompletion(messagesToSend);
    } else {
      resp = await makeAPIMRequestWithRetry(
          `${OPENAI_API_HOST}/${APIM_CHAT_ENDPONT}/deployments/${modelToUse}/chat/completions?api-version=${OPENAI_API_VERSION}`,
          token.accessToken,
          'POST',
          {
            "messages": messagesToSend,
            "temperature": temperatureToUse,
          }
      )
    }
    return new Response((resp as  ApimChatResponseDataStructure).choices[0].message.content, {status: 200});
  } catch (error) {
    console.error(error);
    if (error instanceof OpenAIError) {
      return new Response('Error', { status: 500, statusText: error.message });
    } else {
      return new Response('Error', { status: 500 });
    }
  }
};

export default handler;
