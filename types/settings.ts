import { SearchMode } from './searchMode';

/**
 * Configuration for smooth streaming speed.
 * Controls how text is delivered to the UI during AI responses.
 */
export interface StreamingSpeedConfig {
  /** Number of characters to send per batch (default: 3) */
  charsPerBatch: number;
  /** Delay between batches in milliseconds (default: 8) */
  delayMs: number;
}

/**
 * Default streaming speed configuration (Normal preset).
 * ~375 characters per second.
 */
export const DEFAULT_STREAMING_SPEED: StreamingSpeedConfig = {
  charsPerBatch: 3,
  delayMs: 8,
};

/**
 * Options for how the user's name is displayed in the app.
 * - firstName: Use given name or first part of display name
 * - lastName: Use surname or last part of display name
 * - fullName: Use complete display name
 * - custom: Use a user-provided custom name
 * - none: Do not display any name (anonymous greeting)
 */
export type DisplayNamePreference =
  | 'firstName'
  | 'lastName'
  | 'fullName'
  | 'custom'
  | 'none';

/**
 * Reasoning effort level for reasoning models (GPT-5, o3).
 * Controls the depth of thinking/analysis the model performs.
 */
export type ReasoningEffort = 'minimal' | 'low' | 'medium' | 'high';

/**
 * Verbosity level for GPT-5 models.
 * Controls the detail level of responses.
 */
export type Verbosity = 'low' | 'medium' | 'high';

export interface Settings {
  theme: 'light' | 'dark';
  temperature: number;
  systemPrompt: string;
  advancedMode: boolean;
  defaultSearchMode: SearchMode;
  displayNamePreference: DisplayNamePreference;
  customDisplayName: string;
  streamingSpeed: StreamingSpeedConfig;
  /** Whether to include user info (name, title, email, dept) in system prompt */
  includeUserInfoInPrompt: boolean;
  /** User's preferred name (overrides displayName from profile) */
  preferredName: string;
  /** Additional context about the user for the AI */
  userContext: string;
  /** Default reasoning effort for reasoning models (GPT-5, o3) */
  reasoningEffort?: ReasoningEffort;
  /** Default verbosity for GPT-5 models */
  verbosity?: Verbosity;
}
