import { Message } from '@/types/chat';

interface AzureOpenAIClientConstructorArgs {
  hostName: string;
  apiKey: string;
  deployment: string;
  whisperHostName: string | undefined | null;
  whisperApiKey: string | undefined | null;
  whisperDeployment: string | undefined | null;
  dalleHostName: string | undefined | null;
  dalleApiKey: string | undefined | null;
  dalleDeployment: string | undefined | null;
  visionHostName: string | undefined | null;
  visionApiKey: string | undefined | null;
  visionDeployment: string | undefined | null;
}

interface AzureOpenAIClientCredentials {
  host: string;
  apiKey: string;
  deployment: string;
}

enum AzureOpenAIClientCredentialsType {
  WHISPER = 'whisper',
  DALLE = 'dalle',
  VISION = 'vision',
  DEFAULT = 'default',
}

/**
 * @class AzureOpenAIClient
 * @classdesc A client for interacting with various Azure OpenAI services including Vision, DALL-E, and Whisper.
 */
export default class AzureOpenAIClient {
  private readonly hostName: string;
  private readonly apiKey: string;
  private readonly deployment: string;
  private readonly whisperHostName: string | undefined | null;
  private readonly whisperApiKey: string | undefined | null;
  private readonly whisperDeployment: string | undefined | null;
  private readonly dalleHostName: string | undefined | null;
  private readonly dalleApiKey: string | undefined | null;
  private readonly dalleDeployment: string | undefined | null;
  private readonly visionHostName: string | undefined | null;
  private readonly visionApiKey: string | undefined | null;
  private readonly visionDeployment: string | undefined | null;

  /**
   * @constructor
   * @param {AzureOpenAIClientConstructorArgs} args - The constructor arguments.
   */
  constructor(
    args: AzureOpenAIClientConstructorArgs = {
      hostName: process.env.OPENAI_API_HOST ?? '',
      apiKey: process.env.OPENAI_API_KEY ?? '',
      deployment: process.env.OPENAI_DEPLOYMENT ?? '',
      whisperHostName: process.env.AZURE_OPENAI_WHISPER_HOST_NAME,
      whisperApiKey: process.env.AZURE_OPENAI_WHISPER_API_KEY,
      whisperDeployment: process.env.AZURE_OPENAI_WHISPER_DEPLOYMENT,
      dalleHostName: process.env.AZURE_OPENAI_DALLE_HOST_NAME,
      dalleApiKey: process.env.AZURE_OPENAI_DALLE_API_KEY,
      dalleDeployment: process.env.AZURE_OPENAI_DALLE_DEPLOYMENT,
      visionHostName: process.env.AZURE_OPENAI_VISION_HOST_NAME,
      visionApiKey: process.env.AZURE_OPENAI_VISION_API_KEY,
      visionDeployment: process.env.AZURE_OPENAI_VISION_DEPLOYMENT,
    },
  ) {
    this.hostName = args.hostName;
    this.apiKey = args.apiKey;
    this.deployment = args.deployment;
    this.whisperHostName = args.whisperHostName;
    this.whisperApiKey = args.whisperApiKey;
    this.whisperDeployment = args.whisperDeployment;
    this.dalleHostName = args.dalleHostName;
    this.dalleApiKey = args.dalleApiKey;
    this.dalleDeployment = args.dalleDeployment;
    this.visionHostName = args.visionHostName;
    this.visionApiKey = args.visionApiKey;
    this.visionDeployment = args.visionDeployment;
  }

  /**
   * Retrieves the credentials for a specified service type.
   * @param {AzureOpenAIClientCredentialsType} type - The type of credentials to retrieve.
   * @returns {AzureOpenAIClientCredentials} The credentials for the specified service type.
   * @throws Will throw an error if the credentials are incomplete.
   */
  getCredentials(
    type: AzureOpenAIClientCredentialsType,
  ): AzureOpenAIClientCredentials {
    switch (type) {
      case AzureOpenAIClientCredentialsType.VISION:
        if (this.visionHostName && this.visionApiKey && this.visionDeployment)
          return {
            host: this.visionHostName,
            apiKey: this.visionApiKey,
            deployment: this.visionDeployment,
          };
        else throw new Error('VISION credentials are incomplete');
      case AzureOpenAIClientCredentialsType.DALLE:
        if (this.dalleHostName && this.dalleApiKey && this.dalleDeployment)
          return {
            host: this.dalleHostName,
            apiKey: this.dalleApiKey,
            deployment: this.dalleDeployment,
          };
        else throw new Error('DALLE credentials are incomplete');
      case AzureOpenAIClientCredentialsType.WHISPER:
        if (
          this.whisperHostName &&
          this.whisperApiKey &&
          this.whisperDeployment
        )
          return {
            host: this.whisperHostName,
            apiKey: this.whisperApiKey,
            deployment: this.whisperDeployment,
          };
        else throw new Error('WHISPER credentials are incomplete');
      case AzureOpenAIClientCredentialsType.DEFAULT:
      default:
        return {
          host: this.hostName,
          apiKey: this.apiKey,
          deployment: this.deployment,
        };
    }
  }

  /**
   * Constructs a URL from the provided credentials.
   * @param {AzureOpenAIClientCredentials} credentials - The credentials to use for constructing the URL.
   * @returns {string} The constructed URL.
   */
  constructUrlFromCredentials(credentials: AzureOpenAIClientCredentials) {
    return `https://${credentials.host}.openai.azure.com/openai/deployments/${credentials.deployment}/chat/completions?api-version=${process.env.OPENAI_API_VERSION}`;
  }

  async submit(
    messages: Message[],
    credentials: AzureOpenAIClientCredentials,
  ): Promise<any> {
    const url = this.constructUrlFromCredentials(credentials);

    const headers = {
      'Content-Type': 'application/json',
      'api-key': credentials.apiKey,
    };

    const body = {
      messages: messages,
      max_tokens: 2000,
      stream: false,
      // "model": "gpt-4"
    };

    const response = await fetch(url, {
      method: 'POST',
      headers,
      body: JSON.stringify(body),
    });

    if (response.status === 200) {
      return await response.json();
    } else {
      throw new Error(
        `Request failed with status ${response.status} ${response.statusText}`,
      );
    }
  }

  async getChatCompletion(messages: Message[]): Promise<any> {
    const credentials = this.getCredentials(
      AzureOpenAIClientCredentialsType.DEFAULT,
    );
    return this.submit(messages, credentials);
  }

  async getVisionCompletion(messages: Message[]): Promise<any> {
    let credentials: AzureOpenAIClientCredentials;
    try {
      credentials = this.getCredentials(
        AzureOpenAIClientCredentialsType.VISION,
      );
    } catch (error) {
      credentials = this.getCredentials(
        AzureOpenAIClientCredentialsType.DEFAULT,
      );
    }
    return this.submit(messages, credentials);
  }

  async getDalleCompletion(messages: Message[]): Promise<any> {
    const credentials = this.getCredentials(
      AzureOpenAIClientCredentialsType.DALLE,
    );
    return this.submit(messages, credentials);
  }

  async getWhisperResponse(messages: Message[]): Promise<any> {
    throw new Error('Whisper is not implemented');
  }
}
