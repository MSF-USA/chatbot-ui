export const DEFAULT_SYSTEM_PROMPT =
  process.env.NEXT_PUBLIC_DEFAULT_SYSTEM_PROMPT ||
  "You are ChatGPT, a large language model trained by OpenAI. Follow the user's instructions carefully. Respond using markdown.";

export const DEFAULT_TEMPERATURE = parseFloat(
  process.env.NEXT_PUBLIC_DEFAULT_TEMPERATURE || '0.5',
);

export const DEFAULT_USE_KNOWLEDGE_BASE =
  process.env.DEFAULT_USE_KNOWLEDGE_BASE === 'true' || false;

export const OPENAI_API_VERSION =
  process.env.OPENAI_API_VERSION || '2025-04-01-preview';

export const DEFAULT_MODEL =
  process.env.DEFAULT_MODEL || 'gpt-4.1';

export const APIM_MANAGEMENT_ENDPONT =
  process.env.APIM_MANAGEMENT_ENDPONT || 'localhostmgmt';

export const FORCE_LOGOUT_ON_REFRESH_FAILURE =
  process.env.FORCE_LOGOUT_ON_REFRESH_FAILURE || 'true';
