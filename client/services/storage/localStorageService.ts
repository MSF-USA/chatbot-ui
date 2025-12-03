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
   * SMART MIGRATION STRATEGY:
   * - Validates legacy data structure before migration
   * - Merges legacy data with existing Zustand data (deduplicates by id)
   * - For conversations with id collision: keeps both if different, keeps longer if same
   * - Creates permanent backup
   * - Reports accurate stats (only counts actually migrated items)
   * - Surfaces errors and warnings for debugging
   *
   * @returns MigrationResult with success status, errors, warnings, and stats
   */
  static migrateFromLegacy(): MigrationResult {
    const emptyStats: MigrationStats = {
      conversations: 0,
      folders: 0,
      prompts: 0,
      customAgents: 0,
    };

    const emptyResult = (
      success: boolean,
      errors: string[] = [],
      skipped = false,
    ): MigrationResult => ({
      success,
      errors,
      warnings: [],
      skipped,
      stats: emptyStats,
    });

    if (typeof window === 'undefined') {
      return emptyResult(false, ['Cannot run migration on server']);
    }

    const errors: string[] = [];
    const warnings: string[] = [];
    const stats: MigrationStats = { ...emptyStats };

    try {
      // Check if already migrated
      const migrationFlag = localStorage.getItem('data_migration_v2_complete');
      if (migrationFlag === 'true') {
        return { ...emptyResult(true, [], true) };
      }

      console.log('🔄 Starting data migration...');

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
        warnings.push(
          `Could not create backup: ${error instanceof Error ? error.message : 'Unknown'}`,
        );
      }

      // ========================================================================
      // Migrate Conversations
      // ========================================================================
      try {
        // Read existing Zustand data
        const existingConvStorage = localStorage.getItem(
          'conversation-storage',
        );
        const existingConvData = existingConvStorage
          ? JSON.parse(existingConvStorage)
          : null;
        const existingConvs: LegacyConversation[] =
          existingConvData?.state?.conversations ?? [];
        const existingFolders: Array<{ id: string }> =
          existingConvData?.state?.folders ?? [];

        // Read legacy data (try both possible keys)
        const rawLegacyConvs =
          this.get<unknown[]>('conversationHistory') ||
          this.get<unknown[]>(StorageKeys.CONVERSATIONS);
        const rawLegacyFolders = this.get<unknown[]>(StorageKeys.FOLDERS);
        const oldSelectedId = this.get<string>(
          StorageKeys.SELECTED_CONVERSATION_ID,
        );

        // Validate and filter legacy conversations
        const validLegacyConvs: LegacyConversation[] = [];
        if (rawLegacyConvs && Array.isArray(rawLegacyConvs)) {
          for (let i = 0; i < rawLegacyConvs.length; i++) {
            if (isValidLegacyConversation(rawLegacyConvs[i], i)) {
              validLegacyConvs.push(rawLegacyConvs[i] as LegacyConversation);
            } else {
              errors.push(
                `Invalid conversation at index ${i}: ${JSON.stringify(rawLegacyConvs[i]).slice(0, 100)}...`,
              );
            }
          }
        }

        // Validate legacy folders
        const validLegacyFolders: Array<{ id: string; name: string }> = [];
        if (rawLegacyFolders && Array.isArray(rawLegacyFolders)) {
          for (const folder of rawLegacyFolders) {
            if (
              folder &&
              typeof folder === 'object' &&
              typeof (folder as Record<string, unknown>).id === 'string'
            ) {
              validLegacyFolders.push(folder as { id: string; name: string });
            }
          }
        }

        // Smart merge conversations
        if (validLegacyConvs.length > 0) {
          const mergeResult = mergeConversations(
            existingConvs,
            validLegacyConvs,
          );
          stats.conversations = mergeResult.addedCount;
          warnings.push(...mergeResult.warnings);

          // Merge folders by id
          const folderMerge = mergeById(existingFolders, validLegacyFolders);
          stats.folders = folderMerge.addedCount;

          // Write merged data
          const conversationData = {
            state: {
              conversations: mergeResult.merged,
              folders: folderMerge.merged,
              selectedConversationId:
                existingConvData?.state?.selectedConversationId ??
                oldSelectedId ??
                null,
            },
            version: 1,
          };

          localStorage.setItem(
            'conversation-storage',
            JSON.stringify(conversationData),
          );
          console.log(
            `✓ Conversations: merged ${validLegacyConvs.length} legacy into ${existingConvs.length} existing (${stats.conversations} new)`,
          );
        } else if (rawLegacyConvs) {
          warnings.push(
            `Found ${rawLegacyConvs.length} legacy conversations but none were valid`,
          );
        }
      } catch (error) {
        const msg = `Conversation migration error: ${error instanceof Error ? error.message : 'Unknown'}`;
        errors.push(msg);
        console.error(msg);
      }

      // ========================================================================
      // Migrate Settings (prompts, customAgents)
      // ========================================================================
      try {
        // Read existing Zustand data
        const existingSettingsStorage =
          localStorage.getItem('settings-storage');
        const existingSettingsData = existingSettingsStorage
          ? JSON.parse(existingSettingsStorage)
          : null;
        const existingPrompts: LegacyPrompt[] =
          existingSettingsData?.state?.prompts ?? [];
        const existingAgents: LegacyCustomAgent[] =
          existingSettingsData?.state?.customAgents ?? [];

        // Read legacy data
        const oldTemperature = this.get<number>(StorageKeys.TEMPERATURE);
        const oldSystemPrompt = this.get<string>(StorageKeys.SYSTEM_PROMPT);
        const rawLegacyPrompts = this.get<unknown[]>(StorageKeys.PROMPTS);
        const oldDefaultModelId = this.get<string>(
          StorageKeys.DEFAULT_MODEL_ID,
        );
        const rawLegacyAgents = this.get<unknown[]>(StorageKeys.CUSTOM_AGENTS);

        // Validate legacy prompts
        const validLegacyPrompts: LegacyPrompt[] = [];
        if (rawLegacyPrompts && Array.isArray(rawLegacyPrompts)) {
          for (let i = 0; i < rawLegacyPrompts.length; i++) {
            if (isValidLegacyPrompt(rawLegacyPrompts[i], i)) {
              validLegacyPrompts.push(rawLegacyPrompts[i] as LegacyPrompt);
            } else {
              errors.push(
                `Invalid prompt at index ${i}: ${JSON.stringify(rawLegacyPrompts[i]).slice(0, 100)}...`,
              );
            }
          }
        }

        // Validate legacy custom agents
        const validLegacyAgents: LegacyCustomAgent[] = [];
        if (rawLegacyAgents && Array.isArray(rawLegacyAgents)) {
          for (let i = 0; i < rawLegacyAgents.length; i++) {
            if (isValidLegacyCustomAgent(rawLegacyAgents[i], i)) {
              validLegacyAgents.push(rawLegacyAgents[i] as LegacyCustomAgent);
            } else {
              errors.push(
                `Invalid custom agent at index ${i}: ${JSON.stringify(rawLegacyAgents[i]).slice(0, 100)}...`,
              );
            }
          }
        }

        // Merge prompts and agents
        const promptMerge = mergeById(existingPrompts, validLegacyPrompts);
        const agentMerge = mergeById(existingAgents, validLegacyAgents);
        stats.prompts = promptMerge.addedCount;
        stats.customAgents = agentMerge.addedCount;

        // Check if we have anything to write
        const hasLegacySettings =
          oldTemperature !== null ||
          oldSystemPrompt !== null ||
          validLegacyPrompts.length > 0 ||
          oldDefaultModelId !== null ||
          validLegacyAgents.length > 0;

        if (hasLegacySettings || existingSettingsData) {
          const baseState = existingSettingsData?.state ?? {};
          const settingsData = {
            state: {
              ...baseState,
              temperature: oldTemperature ?? baseState.temperature ?? 0.5,
              systemPrompt: oldSystemPrompt ?? baseState.systemPrompt ?? '',
              defaultModelId:
                oldDefaultModelId ?? baseState.defaultModelId ?? undefined,
              defaultSearchMode: baseState.defaultSearchMode ?? 'intelligent',
              prompts: promptMerge.merged,
              tones: baseState.tones ?? [],
              customAgents: agentMerge.merged,
            },
            version: 2,
          };

          localStorage.setItem(
            'settings-storage',
            JSON.stringify(settingsData),
          );
          console.log(
            `✓ Settings: ${stats.prompts} prompts, ${stats.customAgents} agents migrated`,
          );
        }
      } catch (error) {
        const msg = `Settings migration error: ${error instanceof Error ? error.message : 'Unknown'}`;
        errors.push(msg);
        console.error(msg);
      }

      // NOTE: UI preferences are stored in cookies via UIPreferencesProvider,
      // not in localStorage. No migration needed.

      // Mark migration as complete ONLY if no critical errors
      if (errors.length === 0) {
        localStorage.setItem('data_migration_v2_complete', 'true');
        console.log('✅ Migration complete!');
      } else {
        console.error(`❌ Migration had ${errors.length} errors:`, errors);
      }

      if (warnings.length > 0) {
        console.warn(`⚠️ Migration warnings:`, warnings);
      }

      return {
        success: errors.length === 0,
        errors,
        warnings,
        skipped: false,
        stats,
      };
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : 'Unknown error';
      errors.push(errorMessage);
      console.error('❌ Migration failed:', errorMessage);
      return { success: false, errors, warnings, skipped: false, stats };
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
