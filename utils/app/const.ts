export const DEFAULT_SYSTEM_PROMPT =
  process.env.NEXT_PUBLIC_DEFAULT_SYSTEM_PROMPT ||
  "You are ChatGPT, a large language model trained by OpenAI. Follow the user's instructions carefully. Respond using markdown.";

export const OPENAI_API_HOST =
  process.env.OPENAI_API_HOST || 'https://api.openai.com';

export const DEFAULT_TEMPERATURE =
  parseFloat(process.env.NEXT_PUBLIC_DEFAULT_TEMPERATURE || "1");

export const OPENAI_API_TYPE =
  process.env.OPENAI_API_TYPE || 'openai';

export const OPENAI_API_VERSION =
  process.env.OPENAI_API_VERSION || '2023-03-15-preview';

export const OPENAI_ORGANIZATION =
  process.env.OPENAI_ORGANIZATION || '';

export const AZURE_DEPLOYMENT_ID =
  process.env.AZURE_DEPLOYMENT_ID || '';

const COMMON_CONFIGURATION = {
    OPENAI_API_VERSION: "2023-03-15-preview",
    OPENAI_API_TYPE: OPENAI_API_TYPE,
    OPENAI_ORGANIZATION: OPENAI_ORGANIZATION,
    AZURE_DEPLOYMENT_ID: AZURE_DEPLOYMENT_ID,
    DEFAULT_TEMPERATURE: DEFAULT_TEMPERATURE,
    DEFAULT_SYSTEM_PROMPT: DEFAULT_SYSTEM_PROMPT,
}


const API_HOST_PREFIX = process.env.API_HOST_PREFIX || '';
const API_HOST_DEV_PREFIX = process.env.API_HOST_DEV_PREFIX || '';

// Assuming this is your array of configurations.
const configurations = [
    {
        OPENAI_API_HOST: `https://${API_HOST_PREFIX}-sbx-openai-cs.openai.azure.com`,
        ...COMMON_CONFIGURATION
    },
    {
        OPENAI_API_HOST: `https://${API_HOST_PREFIX}-ai-sbx-ca-estus2.openai.azure.com`,
        ...COMMON_CONFIGURATION
    },
    ...[1,2,3,4,5,6,7,8,9,10,11,12,13,14,15].map((i) => ({
        OPENAI_API_HOST: `https://${API_HOST_DEV_PREFIX}${i}.openai.azure.com`,
        ...COMMON_CONFIGURATION
    })),
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
