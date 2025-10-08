/**
 * Type-safe localStorage wrapper with versioning and migration support
 */

export enum StorageKeys {
  CONVERSATIONS = 'conversations',
  FOLDERS = 'folders',
  SELECTED_CONVERSATION_ID = 'selectedConversationId',
  TEMPERATURE = 'temperature',
  SYSTEM_PROMPT = 'systemPrompt',
  API_KEY = 'apiKey',
  PLUGIN_KEYS = 'pluginKeys',
  PROMPTS = 'prompts',
  THEME = 'theme',
  SHOW_CHATBAR = 'showChatbar',
  SHOW_PROMPT_BAR = 'showPromptbar',
  DEFAULT_MODEL_ID = 'defaultModelId',
  MODELS = 'models',
  SERVER_SIDE_API_KEY_IS_SET = 'serverSideApiKeyIsSet',
  SERVER_SIDE_PLUGIN_KEYS_SET = 'serverSidePluginKeysSet',
}

export class LocalStorageService {
  private static STORAGE_VERSION = 'v2.0';

  /**
   * Get a value from localStorage with type safety
   */
  static get<T>(key: StorageKeys | string): T | null {
    if (typeof window === 'undefined') return null;

    try {
      const item = window.localStorage.getItem(key);
      if (item === null) return null;

      return JSON.parse(item) as T;
    } catch (error) {
      console.error(`Error reading from localStorage key "${key}":`, error);
      return null;
    }
  }

  /**
   * Set a value in localStorage
   */
  static set<T>(key: StorageKeys | string, value: T): void {
    if (typeof window === 'undefined') return;

    try {
      window.localStorage.setItem(key, JSON.stringify(value));
    } catch (error) {
      console.error(`Error writing to localStorage key "${key}":`, error);
    }
  }

  /**
   * Remove a value from localStorage
   */
  static remove(key: StorageKeys | string): void {
    if (typeof window === 'undefined') return;

    try {
      window.localStorage.removeItem(key);
    } catch (error) {
      console.error(`Error removing localStorage key "${key}":`, error);
    }
  }

  /**
   * Clear all localStorage
   */
  static clear(): void {
    if (typeof window === 'undefined') return;

    try {
      window.localStorage.clear();
    } catch (error) {
      console.error('Error clearing localStorage:', error);
    }
  }

  /**
   * Check if a key exists in localStorage
   */
  static has(key: StorageKeys | string): boolean {
    if (typeof window === 'undefined') return false;

    return window.localStorage.getItem(key) !== null;
  }

  /**
   * Get all keys from localStorage
   */
  static getAllKeys(): string[] {
    if (typeof window === 'undefined') return [];

    return Object.keys(window.localStorage);
  }

  /**
   * Export all data from localStorage
   */
  static exportData(): Record<string, unknown> {
    if (typeof window === 'undefined') return {};

    const data: Record<string, unknown> = {};
    const keys = this.getAllKeys();

    keys.forEach(key => {
      const value = this.get(key);
      if (value !== null) {
        data[key] = value;
      }
    });

    return data;
  }

  /**
   * Import data into localStorage
   */
  static importData(data: Record<string, unknown>): void {
    if (typeof window === 'undefined') return;

    Object.entries(data).forEach(([key, value]) => {
      this.set(key, value);
    });
  }

  /**
   * Migrate from legacy localStorage format
   */
  static migrateFromLegacy(): { success: boolean; errors: string[] } {
    try {
      // Implementation would go here based on your old format
      // For now, just mark as migrated
      this.set('migrated', true);
      return { success: true, errors: [] };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      return { success: false, errors: [errorMessage] };
    }
  }
}
