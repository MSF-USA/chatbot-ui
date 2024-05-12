import {
  APIM_CHAT_ENDPONT,
  AZURE_DEPLOYMENT_ID,
  DEFAULT_SYSTEM_PROMPT,
  DEFAULT_TEMPERATURE,
  OPENAI_API_HOST, OPENAI_API_TYPE, OPENAI_API_VERSION
} from '@/utils/app/const';
import { OpenAIError, OpenAIStream } from '@/utils/server';

import { ChatBody, Message } from '@/types/chat';

// @ts-expect-error
import wasm from '../../node_modules/@dqbd/tiktoken/lite/tiktoken_bg.wasm?module';

import tiktokenModel from '@dqbd/tiktoken/encoders/cl100k_base.json';
import { Tiktoken, init } from '@dqbd/tiktoken/lite/init';
import {getToken} from "next-auth/jwt";
import {makeAPIMRequest} from "@/utils/server/apim";
import {NextRequest} from "next/server";
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

    const prompt_tokens = encoding.encode(promptToSend);

    let tokenCount = prompt_tokens.length;
    let messagesToSend: Message[] = [];

    for (let i = messages.length - 1; i >= 0; i--) {
      const message = messages[i];
      const tokens = encoding.encode(message.content);

      if (tokenCount + tokens.length + 1000 > model.tokenLimit) {
        break;
      }
      tokenCount += tokens.length;
      messagesToSend = [message, ...messagesToSend];
    }

    encoding.free();
    if (OPENAI_API_TYPE === 'azure') {
      // @ts-ignore
      const token: JWT = await getToken({req});
      let resp;
      try {
        resp = await makeAPIMRequest(
            `${OPENAI_API_HOST}/${APIM_CHAT_ENDPONT}/deployments/${AZURE_DEPLOYMENT_ID}/chat/completions?api-version=${OPENAI_API_VERSION}`,
            token.accessToken,
            'POST',
            {
              "model": model.id,
              "messages": messagesToSend,
            }
        )
      } catch (err) {
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
    } else {
      const stream = await OpenAIStream(model, promptToSend, temperatureToUse, key, messagesToSend);

      return new Response(stream);
    }
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
