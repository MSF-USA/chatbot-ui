import {
  APIM_CHAT_ENDPONT,
  AZURE_DEPLOYMENT_ID,
  DEFAULT_SYSTEM_PROMPT,
  DEFAULT_TEMPERATURE,
  OPENAI_API_HOST, OPENAI_API_TYPE, OPENAI_API_VERSION
} from '@/utils/app/const';
import { OpenAIError } from '@/utils/server';

import { ChatBody, Message } from '@/types/chat';

// @ts-expect-error
import wasm from '../../node_modules/@dqbd/tiktoken/lite/tiktoken_bg.wasm?module';

import tiktokenModel from '@dqbd/tiktoken/encoders/cl100k_base.json';
import { Tiktoken, init } from '@dqbd/tiktoken/lite/init';
import {getToken, JWT} from "next-auth/jwt";
import {makeAPIMRequest} from "@/utils/server/apim";
import {refreshAccessToken} from "@/utils/server/azure";
import {NextRequest} from "next/server";
import {CustomJWT} from "@/types/jwt";
import {getMessagesToSend} from "@/utils/app/chat";

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

    const prompt_tokens = encoding.encode(promptToSend);

    const messagesToSend: Message[] = await getMessagesToSend(
        messages, encoding, prompt_tokens.length, model.tokenLimit
    );


    encoding.free();
    const token = (await getToken({req}) as CustomJWT);
    let resp;
    try {
      resp = await makeAPIMRequest(
          `${OPENAI_API_HOST}/${APIM_CHAT_ENDPONT}/deployments/${AZURE_DEPLOYMENT_ID}/chat/completions?api-version=${OPENAI_API_VERSION}`,
          token?.accessToken,
          'POST',
          {
            "model": model.id,
            "messages": messagesToSend,
          }
      )
    } catch (err) {
      // TODO: implement this in a way that isn't idiotic
      refreshAccessToken(token)
      resp = await makeAPIMRequest(
          `${OPENAI_API_HOST}/${APIM_CHAT_ENDPONT}/deployments/${AZURE_DEPLOYMENT_ID}/chat/completions?api-version=${OPENAI_API_VERSION}`,
          token.accessToken,
          'POST',
          {
            "model": model.id,
            "messages": messagesToSend,
          }
      )
    }
    return new Response(resp.choices[0].message.content, {status: 200});
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
