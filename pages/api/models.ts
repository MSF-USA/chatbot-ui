import {
  findWorkingConfiguration,
  OPENAI_API_HOST,
  OPENAI_API_TYPE,
  OPENAI_API_VERSION,
  OPENAI_ORGANIZATION,
  getAuthHeaders, AZURE_DEPLOYMENT_ID, APIM_MANAGEMENT_ENDPONT
} from '@/utils/app/const';

import { OpenAIModel, OpenAIModelID, OpenAIModels } from '@/types/openai';
import {getToken} from "next-auth/jwt";
import {refreshAccessToken} from "@/utils/server/azure";
import {NextRequest} from "next/server";
import {CustomJWT} from "@/types/jwt";

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

const handler = async (req: NextRequest): Promise<Response> => {
  try {
    const { key } = (await req.json()) as {
      key: string;
    };
    // @ts-ignore
    const token: CustomJWT = await getToken({ req });
    if (token == null) {
        return new Response('Unauthorized: Please login again or check with your administrator', { status: 401 });
    }


    let configData;
    configData = {
      OPENAI_API_HOST: OPENAI_API_HOST,
      OPENAI_API_TYPE: OPENAI_API_TYPE,
      OPENAI_API_VERSION: OPENAI_API_VERSION,
      OPENAI_ORGANIZATION: OPENAI_ORGANIZATION,
    }

    const headers = getAuthHeaders(configData, key);

    let url = `${configData.OPENAI_API_HOST}/v1/models`;
    if (configData.OPENAI_API_TYPE === 'azure') {
      url = `${configData.OPENAI_API_HOST}/${APIM_MANAGEMENT_ENDPONT}/deployments?api-version=${configData.OPENAI_API_VERSION}`;
      headers["Authorization"] = `Bearer ${token?.accessToken}`;
      headers['Content-Type'] = 'application/json';
      delete headers['api-key'];
    }

    try {
      refreshAccessToken(token)
    } catch (err) {
      console.error(`Failed to refresh access token: ${err}`);
    }
    const response = await fetch(url, {
      headers,
    });


    if (response.status === 401) {
      return new Response(response.body, {
        status: 500,
        headers: response.headers,
        statusText: "Backend authorization failed",
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
