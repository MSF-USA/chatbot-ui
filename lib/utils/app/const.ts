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

// File upload count limits per message
export const FILE_COUNT_LIMITS = {
  MAX_IMAGES: 10, // OpenAI vision models support up to 10 images
  MAX_DOCUMENTS: 3, // Document summarization is expensive
  MAX_AUDIO_VIDEO: 1, // Transcription is expensive (time + cost)
  MAX_TOTAL_FILES: 10, // Total attachments (any type)
  MAX_TOTAL_SIZE: 50 * 1024 * 1024, // 50MB total per message
} as const;

// Maximum file upload size for API endpoints (in bytes)
export const MAX_API_FILE_SIZE = 50 * 1024 * 1024; // 50MB

// Default model for AI analysis operations (tone analysis, prompt revision, etc.)
// Uses 'gpt-5' - reasoning model with advanced analysis capabilities
export const DEFAULT_ANALYSIS_MODEL = 'gpt-5';

// Default max tokens for AI analysis operations
export const DEFAULT_ANALYSIS_MAX_TOKENS = 100000;

// Note: GPT-5 is a reasoning model and does not support custom temperature
// Temperature is automatically set to 1 by the model

// API route timeouts (in seconds)
export const API_TIMEOUTS = {
  DEFAULT: 60,
  CHAT: 300,
  FILE_PROCESSING: 120,
  TRANSCRIPTION: 180,
} as const;
