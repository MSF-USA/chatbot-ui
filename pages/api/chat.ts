
import { OpenAIStream, StreamingTextResponse } from "ai"
import OpenAI from "openai"

import {
  APIM_CHAT_ENDPONT,
  AZURE_DEPLOYMENT_ID,
  DEFAULT_SYSTEM_PROMPT,
  DEFAULT_TEMPERATURE,
  OPENAI_API_HOST, OPENAI_API_TYPE, OPENAI_API_VERSION
} from '@/utils/app/const';

import { ChatBody, Message } from '@/types/chat';
import { OpenAIModelID } from '@/types/openai';

// @ts-expect-error
import wasm from '../../node_modules/@dqbd/tiktoken/lite/tiktoken_bg.wasm?module';

import tiktokenModel from '@dqbd/tiktoken/encoders/cl100k_base.json';
import { Tiktoken, init } from '@dqbd/tiktoken/lite/init';
import {getToken} from "next-auth/jwt";
import {NextRequest} from "next/server";
import {JWT} from 'next-auth';


export const config = {
  runtime: 'edge',
};

const handler = async (req: NextRequest) => {
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

    const isValidModel = Object.values(OpenAIModelID).toString().split(',').includes(model.id)

    let modelToUse = model.id
    if (modelToUse == null || !isValidModel) {
      modelToUse = AZURE_DEPLOYMENT_ID;
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

      messagesToSend = [
        {
          role: 'system',
          content: promptToSend,
        },
        message,
        ...messagesToSend
      ];
    }

    //@ts-ignore
    const token: JWT = await getToken({req});

    encoding.free();

    const azureOpenai = new OpenAI({
      baseURL: `${OPENAI_API_HOST}/${APIM_CHAT_ENDPONT}/deployments/${modelToUse}`,
      defaultQuery: { "api-version": OPENAI_API_VERSION },
      defaultHeaders: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${ token.accessToken }`
      }
    })

    const response = await azureOpenai.chat.completions.create({
      model: modelToUse,
      messages: messagesToSend,
      temperature: temperatureToUse,
      max_tokens: null,
      stream: true
    })

    const stream = OpenAIStream(response)

    //Formatting changed significantly on 'ai' package > 3.0.19
    return new StreamingTextResponse(stream)

  } catch (error: any) {
    const errorMessage = error.error?.message || "An unexpected error occurred"
    const errorCode = error.status || 500
    return new Response(JSON.stringify({ message: errorMessage }), {
      status: errorCode
    })
  }
};

export default handler;