import { describe, expect, it, beforeEach, afterEach, vi } from 'vitest';
import { LocalStorageService, StorageKeys } from '@/lib/services/storage/localStorageService';

describe('LocalStorageService', () => {
  // Mock localStorage
  let mockStorage: Record<string, string> = {};

  beforeEach(() => {
    mockStorage = {};

    // Mock localStorage methods
    global.window = {
      localStorage: {
        getItem: vi.fn((key: string) => mockStorage[key] || null),
        setItem: vi.fn((key: string, value: string) => {
          mockStorage[key] = value;
        }),
        removeItem: vi.fn((key: string) => {
          delete mockStorage[key];
        }),
        clear: vi.fn(() => {
          mockStorage = {};
        }),
        get length() {
          return Object.keys(mockStorage).length;
        },
        key: vi.fn((index: number) => {
          const keys = Object.keys(mockStorage);
          return keys[index] || null;
        }),
      },
    } as any;
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe('Basic Operations', () => {
    describe('get', () => {
      it('returns null for non-existent key', () => {
        const result = LocalStorageService.get('nonexistent');
        expect(result).toBeNull();
      });

      it('retrieves and parses stored value', () => {
        const testData = { name: 'John', age: 30 };
        mockStorage['testKey'] = JSON.stringify(testData);

        const result = LocalStorageService.get<typeof testData>('testKey');
        expect(result).toEqual(testData);
      });

      it('handles primitive values', () => {
        mockStorage['stringKey'] = JSON.stringify('hello');
        mockStorage['numberKey'] = JSON.stringify(42);
        mockStorage['booleanKey'] = JSON.stringify(true);

        expect(LocalStorageService.get<string>('stringKey')).toBe('hello');
        expect(LocalStorageService.get<number>('numberKey')).toBe(42);
        expect(LocalStorageService.get<boolean>('booleanKey')).toBe(true);
      });

      it('handles arrays', () => {
        const testArray = [1, 2, 3, 4, 5];
        mockStorage['arrayKey'] = JSON.stringify(testArray);

        const result = LocalStorageService.get<number[]>('arrayKey');
        expect(result).toEqual(testArray);
      });

      it('handles nested objects', () => {
        const testData = {
          user: {
            name: 'Jane',
            details: {
              age: 25,
              city: 'NYC',
            },
          },
        };
        mockStorage['nestedKey'] = JSON.stringify(testData);

        const result = LocalStorageService.get<typeof testData>('nestedKey');
        expect(result).toEqual(testData);
      });

      it('returns null and removes corrupted data', () => {
        mockStorage['corruptedKey'] = 'not valid JSON {{{';

        const result = LocalStorageService.get('corruptedKey');

        expect(result).toBeNull();
        expect(window.localStorage.removeItem).toHaveBeenCalledWith('corruptedKey');
      });

      it('handles null values', () => {
        mockStorage['nullKey'] = JSON.stringify(null);

        const result = LocalStorageService.get('nullKey');
        expect(result).toBeNull();
      });

      it('works with StorageKeys enum', () => {
        const testData = { theme: 'dark' };
        mockStorage[StorageKeys.THEME] = JSON.stringify(testData);

        const result = LocalStorageService.get(StorageKeys.THEME);
        expect(result).toEqual(testData);
      });
    });

    describe('set', () => {
      it('stores primitive values', () => {
        LocalStorageService.set('stringKey', 'hello');
        LocalStorageService.set('numberKey', 42);
        LocalStorageService.set('booleanKey', true);

        expect(mockStorage['stringKey']).toBe(JSON.stringify('hello'));
        expect(mockStorage['numberKey']).toBe(JSON.stringify(42));
        expect(mockStorage['booleanKey']).toBe(JSON.stringify(true));
      });

      it('stores objects', () => {
        const testData = { name: 'John', age: 30 };
        LocalStorageService.set('testKey', testData);

        expect(mockStorage['testKey']).toBe(JSON.stringify(testData));
      });

      it('stores arrays', () => {
        const testArray = [1, 2, 3];
        LocalStorageService.set('arrayKey', testArray);

        expect(mockStorage['arrayKey']).toBe(JSON.stringify(testArray));
      });

      it('stores nested objects', () => {
        const complexData = {
          level1: {
            level2: {
              value: 'deep',
            },
          },
        };
        LocalStorageService.set('complexKey', complexData);

        expect(mockStorage['complexKey']).toBe(JSON.stringify(complexData));
      });

      it('overwrites existing values', () => {
        LocalStorageService.set('key', 'first');
        expect(mockStorage['key']).toBe(JSON.stringify('first'));

        LocalStorageService.set('key', 'second');
        expect(mockStorage['key']).toBe(JSON.stringify('second'));
      });

      it('stores null values', () => {
        LocalStorageService.set('nullKey', null);
        expect(mockStorage['nullKey']).toBe(JSON.stringify(null));
      });

      it('works with StorageKeys enum', () => {
        LocalStorageService.set(StorageKeys.THEME, 'dark');
        expect(mockStorage[StorageKeys.THEME]).toBe(JSON.stringify('dark'));
      });
    });

    describe('remove', () => {
      it('removes existing key', () => {
        mockStorage['testKey'] = JSON.stringify('value');

        LocalStorageService.remove('testKey');

        expect(mockStorage['testKey']).toBeUndefined();
        expect(window.localStorage.removeItem).toHaveBeenCalledWith('testKey');
      });

      it('handles removing non-existent key', () => {
        LocalStorageService.remove('nonexistent');
        expect(window.localStorage.removeItem).toHaveBeenCalledWith('nonexistent');
      });

      it('works with StorageKeys enum', () => {
        mockStorage[StorageKeys.THEME] = JSON.stringify('dark');

        LocalStorageService.remove(StorageKeys.THEME);

        expect(mockStorage[StorageKeys.THEME]).toBeUndefined();
      });
    });

    describe('clear', () => {
      it('removes all items from localStorage', () => {
        mockStorage['key1'] = 'value1';
        mockStorage['key2'] = 'value2';
        mockStorage['key3'] = 'value3';

        LocalStorageService.clear();

        expect(Object.keys(mockStorage).length).toBe(0);
        expect(window.localStorage.clear).toHaveBeenCalled();
      });

      it('can be called on empty storage', () => {
        LocalStorageService.clear();
        expect(window.localStorage.clear).toHaveBeenCalled();
      });
    });

    describe('has', () => {
      it('returns true for existing key', () => {
        mockStorage['testKey'] = 'value';

        expect(LocalStorageService.has('testKey')).toBe(true);
      });

      it('returns false for non-existent key', () => {
        expect(LocalStorageService.has('nonexistent')).toBe(false);
      });

      it('works with StorageKeys enum', () => {
        mockStorage[StorageKeys.THEME] = JSON.stringify('dark');

        expect(LocalStorageService.has(StorageKeys.THEME)).toBe(true);
      });
    });
  });

  describe('Advanced Operations', () => {
    describe('getAllKeys', () => {
      it('returns empty array when storage is empty', () => {
        const keys = LocalStorageService.getAllKeys();
        expect(keys).toEqual([]);
      });

      it('returns all keys in storage', () => {
        mockStorage['key1'] = 'value1';
        mockStorage['key2'] = 'value2';
        mockStorage['key3'] = 'value3';

        const keys = LocalStorageService.getAllKeys();
        expect(keys).toHaveLength(3);
        expect(keys).toContain('key1');
        expect(keys).toContain('key2');
        expect(keys).toContain('key3');
      });
    });

    describe('exportData', () => {
      it('exports all data from localStorage', () => {
        mockStorage['key1'] = JSON.stringify({ value: 'data1' });
        mockStorage['key2'] = JSON.stringify({ value: 'data2' });

        const exported = LocalStorageService.exportData();

        expect(exported).toEqual({
          key1: { value: 'data1' },
          key2: { value: 'data2' },
        });
      });

      it('returns empty object when storage is empty', () => {
        const exported = LocalStorageService.exportData();
        expect(exported).toEqual({});
      });

      it('skips corrupted data', () => {
        mockStorage['validKey'] = JSON.stringify({ value: 'valid' });
        mockStorage['corruptedKey'] = 'not valid JSON';

        const exported = LocalStorageService.exportData();

        expect(exported.validKey).toEqual({ value: 'valid' });
        expect(exported.corruptedKey).toBeUndefined();
      });
    });

    describe('importData', () => {
      it('imports data into localStorage', () => {
        const dataToImport = {
          key1: { value: 'data1' },
          key2: { value: 'data2' },
          key3: 'string value',
        };

        LocalStorageService.importData(dataToImport);

        expect(mockStorage['key1']).toBe(JSON.stringify({ value: 'data1' }));
        expect(mockStorage['key2']).toBe(JSON.stringify({ value: 'data2' }));
        expect(mockStorage['key3']).toBe(JSON.stringify('string value'));
      });

      it('overwrites existing data', () => {
        mockStorage['existingKey'] = JSON.stringify('old value');

        LocalStorageService.importData({ existingKey: 'new value' });

        expect(mockStorage['existingKey']).toBe(JSON.stringify('new value'));
      });

      it('handles empty import', () => {
        LocalStorageService.importData({});
        // Should not error
      });
    });
  });

  describe('Migration', () => {
    describe('hasLegacyData', () => {
      it('returns false when migration is complete', () => {
        mockStorage['data_migration_v2_complete'] = 'true';

        expect(LocalStorageService.hasLegacyData()).toBe(false);
      });

      it('returns true when old conversation data exists', () => {
        mockStorage[StorageKeys.CONVERSATIONS] = JSON.stringify([]);

        expect(LocalStorageService.hasLegacyData()).toBe(true);
      });

      it('returns true when old conversationHistory exists', () => {
        mockStorage['conversationHistory'] = JSON.stringify([]);

        expect(LocalStorageService.hasLegacyData()).toBe(true);
      });

      it('returns true when old settings exist', () => {
        mockStorage[StorageKeys.TEMPERATURE] = JSON.stringify(0.7);

        expect(LocalStorageService.hasLegacyData()).toBe(true);
      });

      it('returns false when no legacy data exists', () => {
        expect(LocalStorageService.hasLegacyData()).toBe(false);
      });
    });

    describe('migrateFromLegacy', () => {
      it('skips if already migrated', () => {
        mockStorage['data_migration_v2_complete'] = 'true';

        const result = LocalStorageService.migrateFromLegacy();

        expect(result.success).toBe(true);
        expect(result.skipped).toBe(true);
        expect(result.errors).toEqual([]);
      });

      it('creates backup before migration', () => {
        mockStorage[StorageKeys.TEMPERATURE] = JSON.stringify(0.8);

        LocalStorageService.migrateFromLegacy();

        expect(mockStorage['data_migration_backup']).toBeDefined();
        const backup = JSON.parse(mockStorage['data_migration_backup']);
        expect(backup.timestamp).toBeDefined();
        expect(backup.date).toBeDefined();
        expect(backup.data).toBeDefined();
      });

      it('migrates settings to new format', () => {
        mockStorage[StorageKeys.TEMPERATURE] = JSON.stringify(0.7);
        mockStorage[StorageKeys.SYSTEM_PROMPT] = JSON.stringify('Test prompt');
        mockStorage[StorageKeys.DEFAULT_MODEL_ID] = JSON.stringify('gpt-4');

        LocalStorageService.migrateFromLegacy();

        expect(mockStorage['settings-storage']).toBeDefined();
        const settings = JSON.parse(mockStorage['settings-storage']);
        expect(settings.state.temperature).toBe(0.7);
        expect(settings.state.systemPrompt).toBe('Test prompt');
        expect(settings.state.defaultModelId).toBe('gpt-4');
        expect(settings.version).toBe(1);
      });

      it('migrates conversations to new format', () => {
        const conversations = [
          { id: '1', name: 'Test', messages: [] },
          { id: '2', name: 'Test 2', messages: [] },
        ];
        mockStorage[StorageKeys.CONVERSATIONS] = JSON.stringify(conversations);
        mockStorage[StorageKeys.SELECTED_CONVERSATION_ID] = JSON.stringify('1');

        LocalStorageService.migrateFromLegacy();

        expect(mockStorage['conversation-storage']).toBeDefined();
        const conversationData = JSON.parse(mockStorage['conversation-storage']);
        expect(conversationData.state.conversations).toEqual(conversations);
        expect(conversationData.state.selectedConversationId).toBe('1');
        expect(conversationData.version).toBe(1);
      });

      it('migrates UI settings to new format', () => {
        mockStorage[StorageKeys.THEME] = JSON.stringify('light');
        mockStorage[StorageKeys.SHOW_CHATBAR] = JSON.stringify(true);
        mockStorage[StorageKeys.SHOW_PROMPT_BAR] = JSON.stringify(false);

        LocalStorageService.migrateFromLegacy();

        expect(mockStorage['ui-storage']).toBeDefined();
        const uiData = JSON.parse(mockStorage['ui-storage']);
        expect(uiData.state.theme).toBe('light');
        expect(uiData.state.showChatbar).toBe(true);
        expect(uiData.state.showPromptbar).toBe(false);
        expect(uiData.version).toBe(1);
      });

      it('uses default values when old data is null', () => {
        // No old data set

        LocalStorageService.migrateFromLegacy();

        // Should create empty/default structures if they don't exist
        expect(mockStorage['data_migration_v2_complete']).toBe('true');
      });

      it('skips if new format already exists', () => {
        mockStorage['settings-storage'] = JSON.stringify({ state: {}, version: 1 });
        mockStorage[StorageKeys.TEMPERATURE] = JSON.stringify(0.9);

        LocalStorageService.migrateFromLegacy();

        const settings = JSON.parse(mockStorage['settings-storage']);
        // Should not have overwritten existing data
        expect(settings.state.temperature).toBeUndefined();
      });

      it('marks migration as complete on success', () => {
        mockStorage[StorageKeys.TEMPERATURE] = JSON.stringify(0.5);

        const result = LocalStorageService.migrateFromLegacy();

        expect(result.success).toBe(true);
        expect(mockStorage['data_migration_v2_complete']).toBe('true');
      });

      it('preserves old data after migration', () => {
        mockStorage[StorageKeys.TEMPERATURE] = JSON.stringify(0.7);
        const oldTemp = mockStorage[StorageKeys.TEMPERATURE];

        LocalStorageService.migrateFromLegacy();

        // Old data should still exist
        expect(mockStorage[StorageKeys.TEMPERATURE]).toBe(oldTemp);
      });

      it('handles migration with no old data gracefully', () => {
        const result = LocalStorageService.migrateFromLegacy();

        expect(result.success).toBe(true);
        expect(result.errors.length).toBe(0);
      });

      it('migrates custom agents', () => {
        const customAgents = [
          { id: '1', name: 'Agent 1', agentId: 'agent-1' },
        ];
        mockStorage[StorageKeys.CUSTOM_AGENTS] = JSON.stringify(customAgents);

        LocalStorageService.migrateFromLegacy();

        const settings = JSON.parse(mockStorage['settings-storage']);
        expect(settings.state.customAgents).toEqual(customAgents);
      });

      it('migrates folders', () => {
        const folders = [
          { id: '1', name: 'Work', type: 'chat' },
        ];
        mockStorage[StorageKeys.FOLDERS] = JSON.stringify(folders);

        LocalStorageService.migrateFromLegacy();

        const conversationData = JSON.parse(mockStorage['conversation-storage']);
        expect(conversationData.state.folders).toEqual(folders);
      });
    });
  });

  describe('Error Handling', () => {
    it('handles errors in get gracefully', () => {
      const mockGetItem = vi.fn(() => {
        throw new Error('Storage error');
      });
      (window.localStorage as any).getItem = mockGetItem;

      const result = LocalStorageService.get('errorKey');

      expect(result).toBeNull();
    });

    it('handles errors in set gracefully', () => {
      const mockSetItem = vi.fn(() => {
        throw new Error('Storage error');
      });
      (window.localStorage as any).setItem = mockSetItem;

      // Should not throw
      LocalStorageService.set('errorKey', 'value');
    });

    it('handles errors in remove gracefully', () => {
      const mockRemoveItem = vi.fn(() => {
        throw new Error('Storage error');
      });
      (window.localStorage as any).removeItem = mockRemoveItem;

      // Should not throw
      LocalStorageService.remove('errorKey');
    });

    it('handles errors in clear gracefully', () => {
      const mockClear = vi.fn(() => {
        throw new Error('Storage error');
      });
      (window.localStorage as any).clear = mockClear;

      // Should not throw
      LocalStorageService.clear();
    });
  });

  describe('Server-Side Rendering', () => {
    it('handles SSR gracefully (window undefined)', () => {
      const originalWindow = global.window;
      (global as any).window = undefined;

      expect(LocalStorageService.get('key')).toBeNull();
      expect(LocalStorageService.has('key')).toBe(false);
      expect(LocalStorageService.getAllKeys()).toEqual([]);
      expect(LocalStorageService.exportData()).toEqual({});
      expect(LocalStorageService.hasLegacyData()).toBe(false);

      // Should not throw
      LocalStorageService.set('key', 'value');
      LocalStorageService.remove('key');
      LocalStorageService.clear();
      LocalStorageService.importData({});

      global.window = originalWindow;
    });
  });
});
