export interface BackendConfiguration {
    OPENAI_API_HOST: string;
    OPENAI_API_VERSION: string;
    OPENAI_API_TYPE: string;
    OPENAI_ORGANIZATION: string;
    AZURE_DEPLOYMENT_ID: string;
    DEFAULT_TEMPERATURE: number;
    DEFAULT_SYSTEM_PROMPT: string;
}

export const DEFAULT_SYSTEM_PROMPT =
  process.env.NEXT_PUBLIC_DEFAULT_SYSTEM_PROMPT ||
  "You are ChatGPT, a large language model trained by OpenAI. Follow the user's instructions carefully. Respond using markdown.";

export const OPENAI_API_HOST =
  process.env.OPENAI_API_HOST || 'https://api.openai.com';

export const DEFAULT_TEMPERATURE =
  parseFloat(process.env.NEXT_PUBLIC_DEFAULT_TEMPERATURE || "1");

export const OPENAI_API_TYPE =
  process.env.OPENAI_API_TYPE || 'azure';

export const OPENAI_API_VERSION =
  process.env.OPENAI_API_VERSION || '2023-03-15-preview';

export const OPENAI_ORGANIZATION =
  process.env.OPENAI_ORGANIZATION || '';

export const AZURE_DEPLOYMENT_ID =
  process.env.AZURE_DEPLOYMENT_ID || '';

const COMMON_CONFIGURATION: any = {
    OPENAI_API_VERSION: "2023-03-15-preview",
    OPENAI_API_TYPE: OPENAI_API_TYPE,
    OPENAI_ORGANIZATION: OPENAI_ORGANIZATION,
    AZURE_DEPLOYMENT_ID: AZURE_DEPLOYMENT_ID,
    DEFAULT_TEMPERATURE: DEFAULT_TEMPERATURE,
    DEFAULT_SYSTEM_PROMPT: DEFAULT_SYSTEM_PROMPT,
}


const API_HOST_PREFIX = process.env.API_HOST_PREFIX || '';
const API_HOST_DEV_PREFIX = process.env.API_HOST_DEV_PREFIX || '';

const configurations: BackendConfiguration[] = [
    {
        OPENAI_API_HOST: `https://${OPENAI_API_HOST}`,
        ...COMMON_CONFIGURATION
    },
    // ...[1,2,3,4,5,6,7,8,9,10,11,12,13,14,15].map((i) => ({
    //     OPENAI_API_HOST: `https://${API_HOST_DEV_PREFIX}${i}.openai.azure.com`,
    //     ...COMMON_CONFIGURATION
    // })),
];

export async function findWorkingConfiguration(key: string) {
    for (const config of configurations) {
        console.log("Trying config", config)

        let url = `${config.OPENAI_API_HOST}/v1/models`;
        if (config.OPENAI_API_TYPE === 'azure') {
            url = `${config.OPENAI_API_HOST}/openai/deployments?api-version=${config.OPENAI_API_VERSION}`;
        }
        const headers = {
            'Content-Type': 'application/json',
            ...(config.OPENAI_API_TYPE === 'openai' && {
                Authorization: `Bearer ${key}`
            }),
            ...(config.OPENAI_API_TYPE === 'azure' && {
                'api-key': `${key}`
            }),
            ...((config.OPENAI_API_TYPE === 'openai' && config.OPENAI_ORGANIZATION) && {
                'OpenAI-Organization': config.OPENAI_ORGANIZATION,
            }),
        }

        try {
            const response = await fetch(url, {
                headers,
            });
            console.log("Response", JSON.stringify(response))
            if (response.status === 200) {
                console.log("Found working config", config)
                return config;
            }
        } catch (error) {
            console.error(error)
            continue
        }
    }

    throw new Error("No valid configuration found for this key");
}

export const getAuthHeaders = (configData: any, key: string) => {
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