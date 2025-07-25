import { ApimChatResponseDataStructure } from '@/types/apim';

export class APIMError extends Error {
  type: string;
  param: string;
  code: string;

  constructor(message: string, type: string, param: string, code: string) {
    super(message);
    this.name = 'APIMError';
    this.type = type;
    this.param = param;
    this.code = code;
  }
}

interface ErrorResponseStructure {
  status: number;
  headers: Headers; // Assuming headers is of type Headers
  body: any; // type can be more specific if you know the structure
}

export const config = {
  runtime: 'edge',
};

const MAX_RETRIES = 3;
const INITIAL_DELAY = 1000; // 1 second

export const makeAPIMRequest = async (
  url: string,
  accessToken: string,
  method: string,
  body: any,
): Promise<ApimChatResponseDataStructure | ErrorResponseStructure> => {
  const res = await fetch(url, {
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${accessToken}`,
    },
    method,
    body: JSON.stringify(body),
  });

  if (res.status === 401) {
    return new Response(res.body, {
      status: 500,
      headers: res.headers,
    });
  } else if (res.status === 400) {
    const json = await res.json();
    const { message, type, param, code } = json;
    if (code == 'content_length_exceeded') {
      return new Response(res.body, {
        status: 400,
        headers: res.headers,
      });
    }
    throw new APIMError(message, type, param, code);
  } else if (res.status !== 200) {
    console.error(
      `APIM API returned an error ${res.status}: ${await res.text()}`,
    );
    throw new Error(
      `APIM API returned an error: ${res.text()} (${res.status})`,
    );
  }

  const json = await res.json();

  // const string = JSON.stringify(json.message);
  return json as ApimChatResponseDataStructure;
};

export const makeAPIMRequestWithRetry = async (
  url: string,
  token: string,
  method: string,
  data: any,
  maxRetries: number = MAX_RETRIES,
  initialDelay: number = INITIAL_DELAY,
): Promise<ApimChatResponseDataStructure> => {
  let retries = 0;
  let delay = initialDelay;

  while (retries < maxRetries) {
    try {
      const response: ApimChatResponseDataStructure | ErrorResponseStructure =
        await makeAPIMRequest(url, token, method, data);
      if ((response as ErrorResponseStructure)?.status)
        throw new Error(
          `APIM API returned an error ${JSON.stringify(response)}`,
        );

      // casting here is stupid, b/c above we are handling the error structure above, but
      //   typescript seems unable to conceive of this.
      return response as ApimChatResponseDataStructure;
    } catch (error) {
      retries += 1;
      if (retries >= maxRetries) {
        throw error;
      }

      await new Promise((resolve) => setTimeout(resolve, delay));
      delay *= 2; // Exponential backoff
    }
  }

  throw new Error('Max retries exceeded');
};
