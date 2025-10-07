import { defaultModelID } from '@/types/openai';

export interface BackendConfiguration {
  OPENAI_API_HOST: string | undefined;
  OPENAI_API_VERSION: string | undefined;
  OPENAI_API_TYPE: string | undefined;
  OPENAI_ORGANIZATION: string | undefined;
  AZURE_DEPLOYMENT_ID: string | undefined;
  DEFAULT_TEMPERATURE: number | undefined;
  DEFAULT_SYSTEM_PROMPT: string | undefined;
}

export const DEFAULT_SYSTEM_PROMPT =
  process.env.NEXT_PUBLIC_DEFAULT_SYSTEM_PROMPT ||
  "You are ChatGPT, a large language model trained by OpenAI. Follow the user's instructions carefully. Respond using markdown.";

export const OPENAI_API_HOST =
  process.env.OPENAI_API_HOST || 'https://api.openai.com';

export const DEFAULT_TEMPERATURE = parseFloat(
  process.env.NEXT_PUBLIC_DEFAULT_TEMPERATURE || '0.5',
);

export const DEFAULT_USE_KNOWLEDGE_BASE =
  process.env.DEFAULT_USE_KNOWLEDGE_BASE === 'true' || false;

export const DEFAULT_MODEL_ID =
  process.env.NEXT_PUBLIC_DEFAULT_MODEL_ID || defaultModelID;

export const OPENAI_API_TYPE = process.env.OPENAI_API_TYPE || 'azure';

/**
 * Helper function to parse Azure API version dates
 * Expected format: YYYY-MM-DD or YYYY-MM-DD-preview
 */
export function parseApiVersionDate(version: string | undefined): Date | null {
  if (!version) return null;
  
  // Extract date part from version string (handles both YYYY-MM-DD and YYYY-MM-DD-preview)
  const dateMatch = version.match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (!dateMatch) return null;
  
  const [, year, month, day] = dateMatch;
  const date = new Date(`${year}-${month}-${day}`);
  
  // Check if the date is valid
  if (isNaN(date.getTime())) return null;
  
  return date;
}

/**
 * Determines the OPENAI_API_VERSION to use based on:
 * 1. If FORCE_OPENAI_API_VERSION is 'true', uses env var with fallback (original logic)
 * 2. Otherwise, compares dates and uses the more recent one
 * 3. Falls back to original logic if date parsing fails
 */
export function determineApiVersion(): string {
  const envVersion = process.env.OPENAI_API_VERSION;
  const fallbackVersion = '2025-03-01-preview';
  const forceEnvVersion = process.env.FORCE_OPENAI_API_VERSION === 'true';
  
  // If forced, use original logic
  if (forceEnvVersion) {
    return envVersion || fallbackVersion;
  }
  
  // Try to parse and compare dates
  try {
    const envDate = parseApiVersionDate(envVersion);
    const fallbackDate = parseApiVersionDate(fallbackVersion);
    
    // If both dates parsed successfully, use the more recent one
    if (envDate && fallbackDate && envVersion) {
      return envDate >= fallbackDate ? envVersion : fallbackVersion;
    }
    
    // If only one date parsed, use the one with valid date
    if (envDate && !fallbackDate && envVersion) return envVersion;
    if (!envDate && fallbackDate) return fallbackVersion;
    
    // If neither parsed, fall back to original logic
    return envVersion || fallbackVersion;
  } catch (error) {
    // On any error, fall back to original logic
    console.warn('Error parsing API version dates, using fallback logic:', error);
    return envVersion || fallbackVersion;
  }
}

export const OPENAI_API_VERSION = determineApiVersion();

export const OPENAI_ORGANIZATION = process.env.OPENAI_ORGANIZATION || '';

export const AZURE_DEPLOYMENT_ID =
  process.env.AZURE_DEPLOYMENT_ID || 'gpt-35-turbo';

export const APIM_CHAT_ENDPONT =
  process.env.APIM_CHAT_ENDPONT || 'localhostchat';

export const APIM_MANAGEMENT_ENDPONT =
  process.env.APIM_MANAGEMENT_ENDPONT || 'localhostmgmt';

export const FORCE_LOGOUT_ON_REFRESH_FAILURE =
  process.env.FORCE_LOGOUT_ON_REFRESH_FAILURE || 'true';

export const OPENAI_API_HOST_TYPE = process.env.OPEN_AI_HOST_TYPE || 'apim';

// Feature Flag Configuration
export const LAUNCHDARKLY_SDK_KEY = process.env.LAUNCHDARKLY_SDK_KEY || '';
export const LAUNCHDARKLY_CLIENT_ID = process.env.LAUNCHDARKLY_CLIENT_ID || '';

// Agent Routing Configuration
export const AGENT_ROUTING_ENABLED =
  process.env.AGENT_ROUTING_ENABLED === 'true' || false;
export const DEFAULT_AGENT_TIMEOUT = parseInt(
  process.env.DEFAULT_AGENT_TIMEOUT || '30000',
);
export const AGENT_POOL_SIZE = parseInt(process.env.AGENT_POOL_SIZE || '10');

// Azure Bing Grounding Configuration
export const AZURE_GROUNDING_CONNECTION_ID =
  process.env.AZURE_GROUNDING_CONNECTION_ID || '';
export const BING_CONNECTION_NAME = process.env.BING_CONNECTION_NAME || '';
export const PROJECT_ENDPOINT =
  process.env.AZURE_AI_FOUNDRY_ENDPOINT || process.env.PROJECT_ENDPOINT || '';
export const MODEL_DEPLOYMENT_NAME =
  process.env.MODEL_DEPLOYMENT_NAME ||
  process.env.AZURE_DEPLOYMENT_ID ||
  'gpt-4o';

const COMMON_CONFIGURATION: any = {
  OPENAI_API_VERSION: OPENAI_API_VERSION,
  OPENAI_API_TYPE: OPENAI_API_TYPE,
  OPENAI_ORGANIZATION: OPENAI_ORGANIZATION,
  AZURE_DEPLOYMENT_ID: AZURE_DEPLOYMENT_ID,
  DEFAULT_TEMPERATURE: DEFAULT_TEMPERATURE,
  DEFAULT_SYSTEM_PROMPT: DEFAULT_SYSTEM_PROMPT,
};

const API_HOST_PREFIX = process.env.API_HOST_PREFIX || '';
const API_HOST_DEV_PREFIX = process.env.API_HOST_DEV_PREFIX || '';

const configurations: BackendConfiguration[] = [
  {
    OPENAI_API_HOST: `${OPENAI_API_HOST}`,
    ...COMMON_CONFIGURATION,
  },
  // ...[1,2,3,4,5,6,7,8,9,10,11,12,13,14,15].map((i) => ({
  //     OPENAI_API_HOST: `https://${API_HOST_DEV_PREFIX}${i}.openai.azure.com`,
  //     ...COMMON_CONFIGURATION
  // })),
];

export async function findWorkingConfiguration(
  key: string,
): Promise<BackendConfiguration> {
  if (process.env.OPENAI_API_KEY) {
    return {
      OPENAI_API_HOST: process.env.OPENAI_API_HOST,
      OPENAI_API_VERSION: process.env.OPENAI_API_VERSION,
      OPENAI_API_TYPE: process.env.OPENAI_API_TYPE,
      OPENAI_ORGANIZATION: process.env.OPENAI_ORGANIZATION,
      AZURE_DEPLOYMENT_ID: process.env.AZURE_DEPLOYMENT_ID,
      DEFAULT_TEMPERATURE: parseFloat(process.env.DEFAULT_TEMPERATURE || '0.5'),
      DEFAULT_SYSTEM_PROMPT: process.env.DEFAULT_SYSTEM_PROMPT,
    };
  }
  for (const config of configurations) {
    console.log('Trying config', config);

    let url = `${config.OPENAI_API_HOST}/v1/models`;
    if (config.OPENAI_API_TYPE === 'azure') {
      url = `${config.OPENAI_API_HOST}/openai/deployments?api-version=${config.OPENAI_API_VERSION}`;
    }
    const headers = {
      'Content-Type': 'application/json',
      ...(config.OPENAI_API_TYPE === 'openai' && {
        Authorization: `Bearer ${key}`,
      }),
      ...(config.OPENAI_API_TYPE === 'azure' && {
        'api-key': `${key}`,
      }),
      ...(config.OPENAI_API_TYPE === 'openai' &&
        config.OPENAI_ORGANIZATION && {
          'OpenAI-Organization': config.OPENAI_ORGANIZATION,
        }),
    };

    try {
      const response = await fetch(url, {
        headers,
      });
      console.log('Response', JSON.stringify(response));
      if (response.status === 200) {
        console.log('Found working config', config);
        return config;
      }
    } catch (error) {
      console.error(error);
      continue;
    }
  }

  throw new Error('No valid configuration found for this key');
}

export const getAuthHeaders = (configData: any, key: string) => {
  return {
    ...(configData.OPENAI_API_TYPE === 'openai' && {
      Authorization: `Bearer ${key || process.env.OPENAI_API_KEY}`,
    }),
    ...(configData.OPENAI_API_TYPE === 'azure' && {
      'api-key': `${key || process.env.OPENAI_API_KEY}`,
    }),
    ...(configData.OPENAI_API_TYPE === 'openai' &&
      configData.OPENAI_ORGANIZATION && {
        'OpenAI-Organization': configData.OPENAI_ORGANIZATION,
      }),
  };
};
