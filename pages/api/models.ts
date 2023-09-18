import {
  findWorkingConfiguration,
  OPENAI_API_HOST,
  OPENAI_API_TYPE,
  OPENAI_API_VERSION,
  OPENAI_ORGANIZATION
} from '@/utils/app/const';

import { OpenAIModel, OpenAIModelID, OpenAIModels } from '@/types/openai';

export const config = {
  runtime: 'edge',
};

const getModels = (json: any, configData: any) => {
  return json.data
      .map((model: any) => {
        const model_name = (configData.OPENAI_API_TYPE === 'azure') ? model.model : model.id;
        for (const [key, value] of Object.entries(OpenAIModelID)) {
          if (value === model_name) {
            return {
              id: model.id,
              name: OpenAIModels[value].name,
            };
          }
        }
      })
      .filter(Boolean);
}

const getAuthHeaders = (configData: any, key: string) => {
  return {
    ...(configData.OPENAI_API_TYPE === 'openai' && {
      Authorization: `Bearer ${key || process.env.OPENAI_API_KEY}`
    }),
    ...(configData.OPENAI_API_TYPE === 'azure' && {
      'api-key': `${key || process.env.OPENAI_API_KEY}`
    }),
    ...((configData.OPENAI_API_TYPE === 'openai' && configData.OPENAI_ORGANIZATION) && {
      'OpenAI-Organization': configData.OPENAI_ORGANIZATION,
    }),
  };
}


const handler = async (req: Request): Promise<Response> => {
  try {
    const { key } = (await req.json()) as {
      key: string;
    };

    let configData;
    try {
      configData = await findWorkingConfiguration(key);
    } catch(error) {
        configData = {
            OPENAI_API_HOST: OPENAI_API_HOST,
            OPENAI_API_TYPE: OPENAI_API_TYPE,
            OPENAI_API_VERSION: OPENAI_API_VERSION,
            OPENAI_ORGANIZATION: OPENAI_ORGANIZATION,
        }
    }

    let url = `${configData.OPENAI_API_HOST}/v1/models`;
    if (configData.OPENAI_API_TYPE === 'azure') {
      url = `${configData.OPENAI_API_HOST}/openai/deployments?api-version=${configData.OPENAI_API_VERSION}`;
    }

    const response = await fetch(url, {
      headers: getAuthHeaders(configData, key),
    });

    if (response.status === 401) {
      return new Response(response.body, {
        status: 500,
        headers: response.headers,
      });
    } else if (response.status !== 200) {
      console.error(
        `OpenAI API returned an error ${
          response.status
        }: ${await response.text()}`,
      );
      throw new Error('OpenAI API returned an error');
    }

    const json = await response.json();

    const models: OpenAIModel[] = getModels(json, configData);

    return new Response(JSON.stringify(models), { status: 200 });
  } catch (error) {
    console.error(error);
    return new Response('Error', { status: 500 });
  }
};

export default handler;
