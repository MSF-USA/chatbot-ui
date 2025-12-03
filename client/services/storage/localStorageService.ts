/**
 * Type-safe localStorage wrapper with versioning and migration support
 */

/**
 * Statistics about what was migrated during data migration
 */
export interface MigrationStats {
  conversations: number;
  folders: number;
  prompts: number;
  customAgents: number;
}

/**
 * Result of a migration operation
 */
export interface MigrationResult {
  success: boolean;
  errors: string[];
  warnings: string[];
  skipped: boolean;
  stats: MigrationStats;
}

// ============================================================================
// Validation Functions
// ============================================================================

interface LegacyConversation {
  id: string;
  name: string;
  messages: unknown[];
  [key: string]: unknown;
}

interface LegacyPrompt {
  id: string;
  name: string;
  content: string;
  [key: string]: unknown;
}

interface LegacyCustomAgent {
  id: string;
  name: string;
  agentId: string;
  [key: string]: unknown;
}

/**
 * Validate legacy conversation structure.
 * Logs specific validation failures for debugging.
 */
function isValidLegacyConversation(
  obj: unknown,
  index: number,
): obj is LegacyConversation {
  if (!obj || typeof obj !== 'object') {
    console.warn(`Conversation[${index}]: not an object`);
    return false;
  }
  const c = obj as Record<string, unknown>;
  if (typeof c.id !== 'string') {
    console.warn(`Conversation[${index}]: missing or invalid id`);
    return false;
  }
  if (typeof c.name !== 'string') {
    console.warn(`Conversation[${index}]: missing or invalid name`);
    return false;
  }
  if (!Array.isArray(c.messages)) {
    console.warn(`Conversation[${index}]: missing or invalid messages array`);
    return false;
  }
  return true;
}

/**
 * Validate legacy prompt structure.
 */
function isValidLegacyPrompt(obj: unknown, index: number): obj is LegacyPrompt {
  if (!obj || typeof obj !== 'object') {
    console.warn(`Prompt[${index}]: not an object`);
    return false;
  }
  const p = obj as Record<string, unknown>;
  if (typeof p.id !== 'string') {
    console.warn(`Prompt[${index}]: missing or invalid id`);
    return false;
  }
  if (typeof p.name !== 'string') {
    console.warn(`Prompt[${index}]: missing or invalid name`);
    return false;
  }
  if (typeof p.content !== 'string') {
    console.warn(`Prompt[${index}]: missing or invalid content`);
    return false;
  }
  return true;
}

/**
 * Validate legacy custom agent structure.
 */
function isValidLegacyCustomAgent(
  obj: unknown,
  index: number,
): obj is LegacyCustomAgent {
  if (!obj || typeof obj !== 'object') {
    console.warn(`CustomAgent[${index}]: not an object`);
    return false;
  }
  const a = obj as Record<string, unknown>;
  if (typeof a.id !== 'string') {
    console.warn(`CustomAgent[${index}]: missing or invalid id`);
    return false;
  }
  if (typeof a.name !== 'string') {
    console.warn(`CustomAgent[${index}]: missing or invalid name`);
    return false;
  }
  if (typeof a.agentId !== 'string') {
    console.warn(`CustomAgent[${index}]: missing or invalid agentId`);
    return false;
  }
  return true;
}

// ============================================================================
// Merge Functions
// ============================================================================

/**
 * Check if two conversations are "the same" based on name and first few messages.
 */
function conversationsAreSame(
  a: LegacyConversation,
  b: LegacyConversation,
): boolean {
  if (a.name !== b.name) return false;
  const aMessages = a.messages as Array<{ content?: string }>;
  const bMessages = b.messages as Array<{ content?: string }>;
  const minLen = Math.min(aMessages.length, bMessages.length, 3);
  for (let i = 0; i < minLen; i++) {
    if (aMessages[i]?.content !== bMessages[i]?.content) return false;
  }
  return true;
}

/**
 * Smart merge conversations: handles collisions by comparing content.
 * - No collision: add legacy as-is
 * - Same content: keep longer one
 * - Different content: rename legacy id with '-legacy' suffix
 */
function mergeConversations(
  existing: LegacyConversation[],
  legacy: LegacyConversation[],
): { merged: LegacyConversation[]; addedCount: number; warnings: string[] } {
  const existingMap = new Map(existing.map((c) => [c.id, c]));
  const result = [...existing];
  let addedCount = 0;
  const warnings: string[] = [];

  for (const legacyConv of legacy) {
    const existingConv = existingMap.get(legacyConv.id);

    if (!existingConv) {
      // No collision - add as-is
      result.push(legacyConv);
      addedCount++;
    } else if (conversationsAreSame(existingConv, legacyConv)) {
      // Same content - keep longer one
      const existingLen = (existingConv.messages as unknown[]).length;
      const legacyLen = (legacyConv.messages as unknown[]).length;
      if (legacyLen > existingLen) {
        const idx = result.findIndex((c) => c.id === existingConv.id);
        result[idx] = legacyConv;
        warnings.push(
          `Replaced conversation "${legacyConv.name}" with longer version (${legacyLen} vs ${existingLen} messages)`,
        );
      }
      // Not incrementing addedCount - this is a replacement, not an addition
    } else {
      // Different content - rename legacy id and add both
      const newId = `${legacyConv.id}-legacy`;
      result.push({ ...legacyConv, id: newId });
      addedCount++;
      warnings.push(
        `Conversation "${legacyConv.name}" had id collision - renamed to ${newId}`,
      );
    }
  }

  return { merged: result, addedCount, warnings };
}

/**
 * Smart merge for items with id (prompts, agents, folders).
 * Simply deduplicates by id, keeping existing.
 */
function mergeById<T extends { id: string }>(
  existing: T[],
  legacy: T[],
): { merged: T[]; addedCount: number } {
  const existingIds = new Set(existing.map((item) => item.id));
  const newItems = legacy.filter((item) => !existingIds.has(item.id));
  return {
    merged: [...existing, ...newItems],
    addedCount: newItems.length,
  };
}

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
      console.error(`Raw value: "${window.localStorage.getItem(key)}"`);
      console.warn(`Removing corrupted localStorage key "${key}"`);
      window.localStorage.removeItem(key);
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

    const keys: string[] = [];
    for (let i = 0; i < window.localStorage.length; i++) {
      const key = window.localStorage.key(i);
      if (key !== null) {
        keys.push(key);
      }
    }
    return keys;
  }

  /**
   * Export all data from localStorage
   */
  static exportData(): Record<string, unknown> {
    if (typeof window === 'undefined') return {};

    const data: Record<string, unknown> = {};
    const keys = this.getAllKeys();

    keys.forEach((key) => {
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
   * Migrate from legacy localStorage format to Zustand persist stores
   *
   * SAFE MIGRATION STRATEGY:
   * - Copies old data to new format (never deletes old data)
   * - Creates permanent backup
   * - Skips if already migrated
   * - Skips if target already has data (don't overwrite)
   * - Old data remains forever (zero risk of data loss)
   *
   * @returns MigrationResult with success status, errors, and stats of migrated items
   */
  static migrateFromLegacy(): MigrationResult {
    const emptyStats: MigrationStats = {
      conversations: 0,
      folders: 0,
      prompts: 0,
      customAgents: 0,
    };

    if (typeof window === 'undefined') {
      return {
        success: false,
        errors: ['Cannot run migration on server'],
        skipped: false,
        stats: emptyStats,
      };
    }

    const errors: string[] = [];
    const stats: MigrationStats = { ...emptyStats };

    try {
      // Check if already migrated
      const migrationFlag = localStorage.getItem('data_migration_v2_complete');
      if (migrationFlag === 'true') {
        return { success: true, errors: [], skipped: true, stats: emptyStats };
      }

      console.log('🔄 Starting automatic data migration...');

      // Create permanent backup before migration
      try {
        const backupData = {
          timestamp: Date.now(),
          date: new Date().toISOString(),
          data: this.exportData(),
        };
        localStorage.setItem(
          'data_migration_backup',
          JSON.stringify(backupData),
        );
        console.log('✓ Backup created');
      } catch (error) {
        console.warn('Could not create backup:', error);
        // Continue anyway - old data will remain untouched
      }

      // Migrate Settings Store
      try {
        const existingSettings = localStorage.getItem('settings-storage');
        const existingSettingsData = existingSettings
          ? JSON.parse(existingSettings)
          : null;

        // Check if Zustand store has actual content (not just empty arrays)
        const existingPromptsCount =
          existingSettingsData?.state?.prompts?.length ?? 0;
        const existingAgentsCount =
          existingSettingsData?.state?.customAgents?.length ?? 0;
        const hasExistingContent =
          existingPromptsCount > 0 || existingAgentsCount > 0;

        if (hasExistingContent) {
          console.log(
            `✓ Settings already have content (${existingPromptsCount} prompts, ${existingAgentsCount} agents), skipping`,
          );
        } else {
          // Read old format
          const oldTemperature = this.get<number>(StorageKeys.TEMPERATURE);
          const oldSystemPrompt = this.get<string>(StorageKeys.SYSTEM_PROMPT);
          const oldPrompts = this.get<any[]>(StorageKeys.PROMPTS);
          const oldDefaultModelId = this.get<string>(
            StorageKeys.DEFAULT_MODEL_ID,
          );
          const oldCustomAgents = this.get<any[]>(StorageKeys.CUSTOM_AGENTS);

          // Check if there's anything to migrate
          const hasOldData =
            oldTemperature !== null ||
            oldSystemPrompt !== null ||
            oldPrompts !== null ||
            oldDefaultModelId !== null ||
            oldCustomAgents !== null;

          if (hasOldData) {
            stats.prompts = oldPrompts?.length ?? 0;
            stats.customAgents = oldCustomAgents?.length ?? 0;

            // Merge with existing Zustand data if it exists (preserves any other fields)
            const baseState = existingSettingsData?.state ?? {};

            // Create new Zustand format with CORRECT version
            // IMPORTANT: Include ALL fields from settingsStore partialize
            // NOTE: models is NOT persisted - it's populated dynamically in AppInitializer
            const settingsData = {
              state: {
                ...baseState,
                temperature: oldTemperature ?? baseState.temperature ?? 0.5,
                systemPrompt: oldSystemPrompt ?? baseState.systemPrompt ?? '',
                defaultModelId:
                  oldDefaultModelId ?? baseState.defaultModelId ?? undefined,
                defaultSearchMode: baseState.defaultSearchMode ?? 'intelligent',
                prompts: oldPrompts ?? baseState.prompts ?? [],
                tones: baseState.tones ?? [],
                customAgents: oldCustomAgents ?? baseState.customAgents ?? [],
              },
              version: 2, // Match settingsStore persist version
            };

            localStorage.setItem(
              'settings-storage',
              JSON.stringify(settingsData),
            );
            console.log('✓ Settings migrated');
          } else {
            console.log('✓ No old settings data to migrate');
          }
        }
      } catch (error) {
        const msg = `Settings migration error: ${error instanceof Error ? error.message : 'Unknown'}`;
        errors.push(msg);
        console.error(msg);
      }

      // Migrate Conversation Store
      try {
        const existingConversations = localStorage.getItem(
          'conversation-storage',
        );
        const existingConvData = existingConversations
          ? JSON.parse(existingConversations)
          : null;

        // Check if Zustand store has actual content (not just empty arrays)
        const existingConvCount =
          existingConvData?.state?.conversations?.length ?? 0;
        const existingFoldersCount =
          existingConvData?.state?.folders?.length ?? 0;
        const hasExistingContent =
          existingConvCount > 0 || existingFoldersCount > 0;

        if (hasExistingContent) {
          console.log(
            `✓ Conversations already have content (${existingConvCount} conversations, ${existingFoldersCount} folders), skipping`,
          );
        } else {
          // Read old format (try both possible keys)
          const oldConversations =
            this.get<any[]>(StorageKeys.CONVERSATIONS) ||
            this.get<any[]>('conversationHistory');
          const oldFolders = this.get<any[]>(StorageKeys.FOLDERS);
          const oldSelectedId = this.get<string>(
            StorageKeys.SELECTED_CONVERSATION_ID,
          );

          const hasOldData =
            oldConversations !== null ||
            oldFolders !== null ||
            oldSelectedId !== null;

          if (hasOldData) {
            stats.conversations = oldConversations?.length ?? 0;
            stats.folders = oldFolders?.length ?? 0;

            // Merge with existing Zustand data if it exists (preserves any other fields)
            const baseState = existingConvData?.state ?? {};

            // Create new Zustand format with CORRECT version
            // IMPORTANT: Only include fields in partialize (conversations, folders, selectedConversationId)
            const conversationData = {
              state: {
                ...baseState,
                conversations:
                  oldConversations ?? baseState.conversations ?? [],
                folders: oldFolders ?? baseState.folders ?? [],
                selectedConversationId:
                  oldSelectedId ?? baseState.selectedConversationId ?? null,
              },
              version: 1, // CORRECT: Match Zustand persist version
            };

            localStorage.setItem(
              'conversation-storage',
              JSON.stringify(conversationData),
            );

            if (oldConversations && oldConversations.length > 0) {
              console.log(
                `✓ Migrated ${oldConversations.length} conversations`,
              );
            } else {
              console.log('✓ Conversations migrated');
            }
          } else {
            console.log('✓ No old conversation data to migrate');
          }
        }
      } catch (error) {
        const msg = `Conversation migration error: ${error instanceof Error ? error.message : 'Unknown'}`;
        errors.push(msg);
        console.error(msg);
      }

      // NOTE: UI preferences (theme, showChatbar, showPromptbar) are stored in cookies
      // via UIPreferencesProvider, NOT in localStorage. The useUIStore has no persist
      // middleware - it's ephemeral. No migration needed for UI settings.

      // Mark migration as complete ONLY if successful
      if (errors.length === 0) {
        localStorage.setItem('data_migration_v2_complete', 'true');
        console.log(
          '✅ Migration complete! Old data preserved in localStorage.',
        );
        console.log(
          '💡 Tip: Old data will remain for safety. You can manually clear it in Settings if desired.',
        );
      } else {
        console.error('❌ Migration had errors. Will retry on next load.');
      }

      return { success: errors.length === 0, errors, skipped: false, stats };
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : 'Unknown error';
      errors.push(errorMessage);
      console.error('❌ Migration failed:', errorMessage);
      return { success: false, errors, skipped: false, stats };
    }
  }

  /**
   * Check if old localStorage data exists that needs migration
   */
  static hasLegacyData(): boolean {
    if (typeof window === 'undefined') return false;

    const migrationFlag = localStorage.getItem('data_migration_v2_complete');
    if (migrationFlag === 'true') return false;

    // Check for any old keys that need migration
    // NOTE: THEME is not included because UI prefs are stored in cookies, not localStorage
    const oldKeys = [
      StorageKeys.CONVERSATIONS,
      'conversationHistory',
      StorageKeys.TEMPERATURE,
      StorageKeys.SYSTEM_PROMPT,
      StorageKeys.PROMPTS,
      StorageKeys.CUSTOM_AGENTS,
    ];

    return oldKeys.some((key) => this.has(key));
  }
}
