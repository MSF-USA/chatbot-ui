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
        },
        {
          id: 'gpt-4'
        },
        {
          id: 'gpt-4.1'
        },
        {
          id: 'gpt-45'
        },
        {
          id: 'gpt-5'
        },
        {
          id: 'gpt-4o-mini'
        },
        {
          id: 'agent-default'
        },
        // Reasoning models (o1, o3-mini) give the following error.
        // ErrorMessage: '400 Model {modelName} is enabled only for api versions 2024-12-01-preview and later',
        // {
        //   id: 'o3-mini'
        // },
        //
        // {
        //   id: 'gpt-o1'
        // },
        // {
        //   id: 'gpt-o1-mini'
        // }
      ]
    };

    const models: OpenAIModel[] = getModels(json, configData);
    
    // Filter out legacy models from UI
    const nonLegacyModels = models.filter(model => {
      const modelConfig = Object.values(OpenAIModels).find(m => m.id === model.id);
      return !modelConfig?.isLegacy;
    });

    return new Response(JSON.stringify(nonLegacyModels), { status: 200 });
  } catch (error) {
    console.error(error);
    return new Response('Error', { status: 500 });
  }
};

export default handler;
