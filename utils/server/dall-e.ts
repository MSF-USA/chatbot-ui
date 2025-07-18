interface DallEAPIClientConfig {
  dalleHostName: string;
  dalleApiKey: string;
}

interface DallEGenerationOptions {
  deploymentName: string;
  n: number;
  prompt: string;
  size: '1024x1024' | '1792x1024' | '1024x1792';
}

class OpenAIError extends Error {
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

export default class DallEAPIClient {
  private endpoint: string;
  private apiKey: string;

  constructor({ dalleHostName, dalleApiKey }: DallEAPIClientConfig) {
    this.endpoint = `https://${dalleHostName}.openai.azure.com/`;
    this.apiKey = dalleApiKey;
  }

  private handleError = (error: any) => {
    if (error instanceof OpenAIError) {
      console.error('An OpenAIError error occurred: ', error.message);
    } else {
      console.error('An unexpected error occurred: ', error);
    }
  };

  public generateImages = async ({
    prompt,
    n = 1,
    size = '1024x1024',
    deploymentName = 'dall-e',
  }: DallEGenerationOptions) => {
    try {
      const url: string = `${this.endpoint}/openai/deployments/${deploymentName}/images/generations?api-version=2024-02-01`;
      const headers = {
        'api-key': this.apiKey,
        'Content-Type': 'application/json',
      };
      const body = {
        prompt,
        size,
        n,
      };

      const response = await fetch(url, {
        method: 'POST',
        headers,
        body: JSON.stringify(body),
      });

      if (!response.ok) throw new Error(response.statusText);

      const result = await response.json();
      const images = result.data;

      for (const image of images) {
        // TODO: need to handle output of images
        console.log(`Image generation result URL: ${image.url}`);
      }
    } catch (error) {
      this.handleError(error);
    }
  };
}
