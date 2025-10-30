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

export const DEFAULT_MODEL = process.env.DEFAULT_MODEL || 'gpt-4.1';

export const APIM_MANAGEMENT_ENDPONT =
  process.env.APIM_MANAGEMENT_ENDPONT || 'localhostmgmt';

export const FORCE_LOGOUT_ON_REFRESH_FAILURE =
  process.env.FORCE_LOGOUT_ON_REFRESH_FAILURE || 'true';

// File upload size limits (in bytes)
export const FILE_SIZE_LIMITS = {
  IMAGE_MAX_BYTES: 5 * 1024 * 1024, // 5MB
  AUDIO_VIDEO_MAX_BYTES: 25 * 1024 * 1024, // 25MB
  FILE_MAX_BYTES: 10 * 1024 * 1024, // 10MB
  UPLOAD_CHUNK_BYTES: 5 * 1024 * 1024, // 5MB chunks
} as const;

// File upload size limits (in MB for display)
export const FILE_SIZE_LIMITS_MB = {
  IMAGE: 5,
  AUDIO_VIDEO: 25,
  FILE: 10,
} as const;
