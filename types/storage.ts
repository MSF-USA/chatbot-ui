/**
 * Type definitions for localStorage operations and migration
 */

/**
 * Enum of all localStorage keys used by the application.
 * These are the legacy keys that may need migration to Zustand stores.
 */
export enum StorageKeys {
  CONVERSATIONS = 'conversations',
  FOLDERS = 'folders',
  SELECTED_CONVERSATION_ID = 'selectedConversationId',
  TEMPERATURE = 'temperature',
  SYSTEM_PROMPT = 'systemPrompt',
  PROMPTS = 'prompts',
  THEME = 'theme',
  SHOW_CHATBAR = 'showChatbar',
  SHOW_PROMPT_BAR = 'showPromptbar',
  DEFAULT_MODEL_ID = 'defaultModelId',
  MODELS = 'models',
  CUSTOM_AGENTS = 'customAgents',
}

/**
 * Statistics about what was migrated during data migration.
 * Counts represent the number of items actually added (not replaced or skipped).
 */
export interface MigrationStats {
  conversations: number;
  folders: number;
  prompts: number;
  customAgents: number;
}

/**
 * Result of a migration operation.
 * Contains success status, any errors/warnings, and migration statistics.
 */
export interface MigrationResult {
  success: boolean;
  errors: string[];
  warnings: string[];
  skipped: boolean;
  stats: MigrationStats;
}

/**
 * Legacy conversation structure from older localStorage format.
 * Used for validation and migration purposes.
 */
export interface LegacyConversation {
  id: string;
  name: string;
  messages: unknown[];
  [key: string]: unknown;
}

/**
 * Legacy prompt structure from older localStorage format.
 * Used for validation and migration purposes.
 */
export interface LegacyPrompt {
  id: string;
  name: string;
  content: string;
  [key: string]: unknown;
}

/**
 * Legacy custom agent structure from older localStorage format.
 * Used for validation and migration purposes.
 */
export interface LegacyCustomAgent {
  id: string;
  name: string;
  agentId: string;
  [key: string]: unknown;
}
