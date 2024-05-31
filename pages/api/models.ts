import {
  OPENAI_API_HOST,
  OPENAI_API_TYPE,
  OPENAI_API_VERSION,
  OPENAI_ORGANIZATION,
} from '@/utils/app/const';
import { OpenAIModel, OpenAIModelID, OpenAIModels } from '@/types/openai';
import { getToken } from "next-auth/jwt";
import { NextRequest } from "next/server";
import { JWT } from 'next-auth';

export const config = {
  runtime: 'edge',
};

const getModels = (json: any, configData: any) => {
  return json.data
      .map((model: any) => {
        const modelName = model.model ?? model.id;
        for (const [key, value] of Object.entries(OpenAIModelID)) {
          if (value === modelName) {
            const mappedData = {
              id: model.id,
              name: OpenAIModels?.[value]?.name ?? modelName,
              status: model.status,
              createdAt: model.created_at,
              object: model.object
            };
            return mappedData;
          }
        }
      })
      .filter(Boolean);
};

const handler = async (req: NextRequest): Promise<Response> => {
  try {
    // @ts-ignore
    const token: JWT = await getToken({ req });
    if (token == null) {
      return new Response('Unauthorized: Please login again or check with your administrator', { status: 401 });
    }

    let configData = {
      OPENAI_API_HOST: OPENAI_API_HOST,
      OPENAI_API_TYPE: OPENAI_API_TYPE,
      OPENAI_API_VERSION: OPENAI_API_VERSION,
      OPENAI_ORGANIZATION: OPENAI_ORGANIZATION,
    };

    // Hardcoded JSON data until the logic for retrieving deployments is fixed
    const json = {
      data: [
        {
          id: 'gpt-35-turbo',
        },
        {
          id: 'gpt-4o'
        }
      ]
    };

    const models: OpenAIModel[] = getModels(json, configData);

    return new Response(JSON.stringify(models), { status: 200 });
  } catch (error) {
    console.error(error);
    return new Response('Error', { status: 500 });
  }
};

export default handler;
