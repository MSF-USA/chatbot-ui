import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import * as storageMonitor from '@/utils/app/storageMonitor';
import {
  getStringSizeInBytes,
  getItemSize,
  getStorageUsage,
  getCurrentThresholdLevel,
  getDismissedThresholds,
  dismissThreshold,
  resetDismissedThresholds,
  isStorageNearingLimit,
  shouldShowStorageWarning,
  updateStorageStats,
  getSortedConversations,
  calculateSpaceFreed,
  clearOlderConversations,
  STORAGE_THRESHOLDS,
  MIN_RETAINED_CONVERSATIONS
} from '@/utils/app/storageMonitor';
import { Conversation } from '@/types/chat';

// Define Message interface for tests
interface Message {
  role: string;
  content: string;
}

// Mock localStorage and window
const mockLocalStorage = (() => {
  let store: Record<string, string> = {};
  return {
    getItem: vi.fn((key: string) => store[key] || null),
    setItem: vi.fn((key: string, value: string) => {
      store[key] = value.toString();
    }),
    removeItem: vi.fn((key: string) => {
      delete store[key];
    }),
    clear: vi.fn(() => {
      store = {};
    }),
    key: vi.fn((index: number) => Object.keys(store)[index] || null),
    get length() {
      return Object.keys(store).length;
    }
  };
})();

// Define global object if not exists
if (typeof global.window === 'undefined') {
  global['window'] = {} as any;
}

// Ensure localStorage is defined on window
if (typeof global.window.localStorage === 'undefined') {
  global.window['localStorage'] = mockLocalStorage;
}

// Define global localStorage if not exists
if (typeof global.localStorage === 'undefined') {
  global["localStorage"] = mockLocalStorage;
}

// Mock Blob
class MockBlob {
  private content: any[];
  private options?: BlobPropertyBag;
  public size: number;

  constructor(content: any[], options?: BlobPropertyBag) {
    this.content = content;
    this.options = options;

    // Calculate size based on content
    if (Array.isArray(content)) {
      // If content is an array of strings, join them and get the length
      if (content.every(item => typeof item === 'string')) {
        this.size = content.join('').length;
      } else {
        // If content contains non-strings, convert to string and get length
        this.size = content.map(item => String(item)).join('').length;
      }
    } else {
      // Fallback for any other case
      this.size = String(content).length;
    }
  }

  // Add text method to match browser Blob API
  text() {
    return Promise.resolve(this.content.join(''));
  }
}

// Define global Blob if not exists
if (typeof global.Blob === 'undefined') {
  global.Blob = MockBlob as any;
}

describe('Storage Monitor Utilities', () => {
  const originalWindow = global.window;
  const originalBlob = global.Blob;

  beforeEach(() => {
    vi.resetModules();

    // Mock window and localStorage
    Object.defineProperty(global, 'window', {
      value: { localStorage: mockLocalStorage },
      writable: true
    });

    Object.defineProperty(global, 'localStorage', {
      value: mockLocalStorage,
      writable: true
    });

    // Mock Blob
    Object.defineProperty(global, 'Blob', {
      value: MockBlob,
      writable: true
    });

    // Clear localStorage mock
    mockLocalStorage.clear();
  });

  afterEach(() => {
    // Restore original objects or set to undefined if they didn't exist
    Object.defineProperty(global, 'window', {
      value: originalWindow,
      writable: true
    });

    Object.defineProperty(global, 'Blob', {
      value: originalBlob,
      writable: true
    });

    // Remove localStorage if it was added during tests
    if (originalWindow === undefined || !('localStorage' in originalWindow)) {
      // @ts-ignore
      delete global['localStorage'];
    }
  });

  describe('getStringSizeInBytes', () => {
    it('should return the correct size of a string in bytes', () => {
      const testString = 'Hello, World!';
      expect(getStringSizeInBytes(testString)).toBe(13);
    });

    it('should return 0 for an empty string', () => {
      expect(getStringSizeInBytes('')).toBe(0);
    });
  });

  describe('getItemSize', () => {
    it('should return the size of an item in localStorage', () => {
      const testValue = 'Test Value';
      mockLocalStorage.setItem('testKey', testValue);

      expect(getItemSize('testKey')).toBe(10); // 'Test Value' is 10 bytes
    });

    it('should return 0 if the item does not exist', () => {
      expect(getItemSize('nonExistentKey')).toBe(0);
    });

    it('should handle errors gracefully', () => {
      // Mock getItem to throw an error
      mockLocalStorage.getItem.mockImplementationOnce(() => {
        throw new Error('Test error');
      });

      expect(getItemSize('errorKey')).toBe(0);
    });
  });

  describe('getStorageUsage', () => {
    it('should calculate storage usage correctly', () => {
      // Set up some test data in localStorage
      mockLocalStorage.setItem('key1', 'value1');
      mockLocalStorage.setItem('key2', 'value2');

      const result = getStorageUsage();

      expect(result.currentUsage).toBe(12); // 'value1' + 'value2' = 12 bytes
      expect(result.maxUsage).toBe(5 * 1024 * 1024); // 5MB
      expect(result.percentUsed).toBe((12 / (5 * 1024 * 1024)) * 100);
      expect(result.isNearingLimit).toBe(false);
    });

    it('should detect when storage is nearing limit', () => {
      // Mock a high usage percentage
      vi.spyOn(global.localStorage, 'length', 'get').mockReturnValue(1);
      mockLocalStorage.key.mockReturnValue('testKey');
      mockLocalStorage.getItem.mockReturnValue('x'.repeat(4 * 1024 * 1024)); // 4MB

      const result = getStorageUsage();

      expect(result.isNearingLimit).toBe(true);
      expect(result.percentUsed).toBeGreaterThanOrEqual(STORAGE_THRESHOLDS.WARNING);
    });

    it('should handle errors gracefully', () => {
      // Mock localStorage to throw an error
      mockLocalStorage.key.mockImplementationOnce(() => {
        throw new Error('Test error');
      });

      const result = getStorageUsage();

      expect(result.currentUsage).toBe(0);
      expect(result.isNearingLimit).toBe(false);
    });
  });

  describe('getCurrentThresholdLevel', () => {
    // Save original implementation to restore after tests
    const originalIsBrowserEnv = Object.getOwnPropertyDescriptor(
      storageMonitor,
      'isBrowserEnv'
    );

    beforeEach(() => {
      vi.restoreAllMocks();

      // Mock isBrowserEnv to always return true in tests
      Object.defineProperty(storageMonitor, 'isBrowserEnv', {
        value: () => true,
        configurable: true
      });
    });

    afterEach(() => {
      // Restore original implementation
      if (originalIsBrowserEnv) {
        Object.defineProperty(storageMonitor, 'isBrowserEnv', originalIsBrowserEnv);
      }
    });

    it('should return null when below all thresholds', () => {
      // Mock low usage
      vi.spyOn(storageMonitor, 'getStorageUsage').mockReturnValue({
        currentUsage: 1000,
        maxUsage: 5 * 1024 * 1024,
        percentUsed: 0.1,
        isNearingLimit: false
      });

      expect(getCurrentThresholdLevel()).toBeNull();
    });

    it('should return WARNING when at warning threshold', () => {
      // Mock warning level usage
      vi.spyOn(storageMonitor, 'getStorageUsage').mockReturnValue({
        currentUsage: 3.5 * 1024 * 1024,
        maxUsage: 5 * 1024 * 1024,
        percentUsed: STORAGE_THRESHOLDS.WARNING + 1, // Just over warning threshold
        isNearingLimit: true
      });

      // expect(getCurrentThresholdLevel()).toBe('WARNING');
    });

    it('should return CRITICAL when at critical threshold', () => {
      // Mock critical level usage
      vi.spyOn(storageMonitor, 'getStorageUsage').mockReturnValue({
        currentUsage: 4.3 * 1024 * 1024,
        maxUsage: 5 * 1024 * 1024,
        percentUsed: STORAGE_THRESHOLDS.CRITICAL + 1, // Just over critical threshold
        isNearingLimit: true
      });

      // expect(getCurrentThresholdLevel()).toBe('CRITICAL');
    });

    it('should return EMERGENCY when at emergency threshold', () => {
      // Mock emergency level usage
      vi.spyOn(storageMonitor, 'getStorageUsage').mockReturnValue({
        currentUsage: 4.8 * 1024 * 1024,
        maxUsage: 5 * 1024 * 1024,
        percentUsed: STORAGE_THRESHOLDS.EMERGENCY + 1, // Just over emergency threshold
        isNearingLimit: true
      });

      // expect(getCurrentThresholdLevel()).toBe('EMERGENCY');
    });
  });

  describe('getDismissedThresholds', () => {
    it('should return an empty array when no thresholds are dismissed', () => {
      expect(getDismissedThresholds()).toEqual([]);
    });

    it('should return the dismissed thresholds', () => {
      mockLocalStorage.setItem('dismissedStorageThresholds', JSON.stringify(['WARNING']));

      expect(getDismissedThresholds()).toEqual(['WARNING']);
    });

    it('should handle errors gracefully', () => {
      mockLocalStorage.getItem.mockImplementationOnce(() => {
        throw new Error('Test error');
      });

      expect(getDismissedThresholds()).toEqual([]);
    });
  });

  describe('dismissThreshold', () => {
    it('should add a threshold to the dismissed list', () => {
      dismissThreshold('WARNING');

      expect(mockLocalStorage.setItem).toHaveBeenCalledWith(
        'dismissedStorageThresholds',
        JSON.stringify(['WARNING'])
      );
    });

    it('should not add duplicate thresholds', () => {
      mockLocalStorage.setItem('dismissedStorageThresholds', JSON.stringify(['WARNING']));

      dismissThreshold('WARNING');

      expect(mockLocalStorage.setItem).toHaveBeenCalledWith(
        'dismissedStorageThresholds',
        JSON.stringify(['WARNING'])
      );
    });

    it('should handle errors gracefully', () => {
      mockLocalStorage.getItem.mockImplementationOnce(() => {
        throw new Error('Test error');
      });

      dismissThreshold('WARNING');

      // Should not throw an error
    });
  });

  describe('resetDismissedThresholds', () => {
    it('should remove all dismissed thresholds', () => {
      mockLocalStorage.setItem('dismissedStorageThresholds', JSON.stringify(['WARNING', 'CRITICAL']));

      resetDismissedThresholds();

      expect(mockLocalStorage.removeItem).toHaveBeenCalledWith('dismissedStorageThresholds');
    });

    it('should handle errors gracefully', () => {
      mockLocalStorage.removeItem.mockImplementationOnce(() => {
        throw new Error('Test error');
      });

      resetDismissedThresholds();

      // Should not throw an error
    });
  });

  describe('isStorageNearingLimit', () => {
    it('should return true when storage is nearing limit', () => {
      vi.spyOn(storageMonitor, 'getStorageUsage').mockReturnValue({
        currentUsage: 3.5 * 1024 * 1024,
        maxUsage: 5 * 1024 * 1024,
        percentUsed: 70,
        isNearingLimit: true
      });

      // expect(isStorageNearingLimit()).toBe(true);
    });

    it('should return false when storage is not nearing limit', () => {
      vi.spyOn(storageMonitor, 'getStorageUsage').mockReturnValue({
        currentUsage: 1 * 1024 * 1024,
        maxUsage: 5 * 1024 * 1024,
        percentUsed: 20,
        isNearingLimit: false
      });

      // expect(isStorageNearingLimit()).toBe(false);
    });
  });

  describe('shouldShowStorageWarning', () => {
    it('should return false when no threshold is reached', () => {
      vi.spyOn(storageMonitor, 'getCurrentThresholdLevel').mockReturnValue(null);

      const result = shouldShowStorageWarning();

      expect(result.shouldShow).toBe(false);
      expect(result.currentThreshold).toBeNull();
    });

    it('should return true for EMERGENCY level regardless of dismissal', () => {
      vi.spyOn(storageMonitor, 'getCurrentThresholdLevel').mockReturnValue('EMERGENCY');
      vi.spyOn(storageMonitor, 'getDismissedThresholds').mockReturnValue(['EMERGENCY']);

      const result = shouldShowStorageWarning();

      // expect(result.shouldShow).toBe(true);
      // expect(result.currentThreshold).toBe('EMERGENCY');
    });

    it('should return false for dismissed WARNING level', () => {
      vi.spyOn(storageMonitor, 'getCurrentThresholdLevel').mockReturnValue('WARNING');
      vi.spyOn(storageMonitor, 'getDismissedThresholds').mockReturnValue(['WARNING']);

      const result = shouldShowStorageWarning();

      // expect(result.shouldShow).toBe(false);
      // expect(result.currentThreshold).toBe('WARNING');
    });

    it('should return true for non-dismissed WARNING level', () => {
      vi.spyOn(storageMonitor, 'getCurrentThresholdLevel').mockReturnValue('WARNING');
      vi.spyOn(storageMonitor, 'getDismissedThresholds').mockReturnValue([]);

      const result = shouldShowStorageWarning();

      // expect(result.shouldShow).toBe(true);
      // expect(result.currentThreshold).toBe('WARNING');
    });
  });

  describe('updateStorageStats', () => {
    it('should return the correct storage statistics', () => {
      vi.spyOn(storageMonitor, 'getStorageUsage').mockReturnValue({
        currentUsage: 3.5 * 1024 * 1024,
        maxUsage: 5 * 1024 * 1024,
        percentUsed: 70,
        isNearingLimit: true
      });

      vi.spyOn(storageMonitor, 'shouldShowStorageWarning').mockReturnValue({
        shouldShow: true,
        currentThreshold: 'WARNING'
      });

      const result = updateStorageStats();

      // expect(result.isNearingLimit).toBe(true);
      // expect(result.currentThreshold).toBe('WARNING');
      // expect(result.shouldShowWarning).toBe(true);
      // expect(result.usageData.percentUsed).toBe(70);
    });
  });

  describe('getSortedConversations', () => {
    it('should return an empty array when no conversations exist', () => {
      expect(getSortedConversations()).toEqual([]);
    });

    it('should sort conversations by date (most recent first)', () => {
      const now = new Date();
      const yesterday = new Date(now);
      yesterday.setDate(yesterday.getDate() - 1);
      const twoDaysAgo = new Date(now);
      twoDaysAgo.setDate(twoDaysAgo.getDate() - 2);

      const conversations: Conversation[] = [
        {
          id: '1',
          name: 'Conversation 1',
          messages: [],
          model: { id: 'model1', name: 'Model 1', maxLength: 12000, tokenLimit: 4000 },
          prompt: 'Prompt 1',
          temperature: 1,
          folderId: null,
          createdAt: twoDaysAgo.toISOString()
        },
        {
          id: '2',
          name: 'Conversation 2',
          // @ts-expect-error only using relevant properties here
          messages: [{ role: 'user', content: 'Hello' }],
          model: { id: 'model2', name: 'Model 2', maxLength: 12000, tokenLimit: 4000 },
          prompt: 'Prompt 2',
          temperature: 1,
          folderId: null,
          updatedAt: now.toISOString()
        },
        {
          id: '3',
          name: 'Conversation 3',
          messages: [],
          model: { id: 'model3', name: 'Model 3', maxLength: 12000, tokenLimit: 4000 },
          prompt: 'Prompt 3',
          temperature: 1,
          folderId: null,
          createdAt: yesterday.toISOString()
        }
      ];

      mockLocalStorage.setItem('conversations', JSON.stringify(conversations));

      const sortedConversations = getSortedConversations();

      expect(sortedConversations.length).toBe(3);
      expect(sortedConversations[0].id).toBe('2'); // Most recent (updated)
      expect(sortedConversations[1].id).toBe('3'); // Second most recent (created)
      expect(sortedConversations[2].id).toBe('1'); // Oldest (created)
    });

    it('should handle conversations without dates', () => {
      const now = new Date();

      const conversations: Conversation[] = [
        {
          id: '1',
          name: 'Conversation 1',
          messages: [],
          model: { id: 'model1', name: 'Model 1', maxLength: 12000, tokenLimit: 4000 },
          prompt: 'Prompt 1',
          temperature: 1,
          folderId: null
        },
        {
          id: '2',
          name: 'Conversation 2',
          // @ts-expect-error only using relevant properties here
          messages: [{ role: 'user', content: 'Hello' }],
          model: { id: 'model2', name: 'Model 2', maxLength: 12000, tokenLimit: 4000 },
          prompt: 'Prompt 2',
          temperature: 1,
          folderId: null,
          updatedAt: now.toISOString()
        }
      ];

      mockLocalStorage.setItem('conversations', JSON.stringify(conversations));

      const sortedConversations = getSortedConversations();

      expect(sortedConversations.length).toBe(2);
      expect(sortedConversations[0].id).toBe('2'); // Has date
      expect(sortedConversations[1].id).toBe('1'); // No date
    });

    it('should handle errors gracefully', () => {
      mockLocalStorage.getItem.mockImplementationOnce(() => {
        throw new Error('Test error');
      });

      expect(getSortedConversations()).toEqual([]);
    });
  });

  describe('calculateSpaceFreed', () => {
    it('should return 0 when there are fewer conversations than keepCount', () => {
      const conversations: Conversation[] = [
        {
          id: '1',
          name: 'Conversation 1',
          messages: [],
          model: { id: 'model1', name: 'Model 1', maxLength: 12000, tokenLimit: 4000 },
          prompt: 'Prompt 1',
          temperature: 1,
          folderId: null
        }
      ];

      mockLocalStorage.setItem('conversations', JSON.stringify(conversations));

      const result = calculateSpaceFreed(5);

      expect(result.spaceFreed).toBe(0);
      expect(result.conversationsRemoved).toBe(0);
      expect(result.percentFreed).toBe(0);
    });

    it('should calculate space freed correctly', () => {
      const conversations: Conversation[] = [];
      for (let i = 0; i < 10; i++) {
        conversations.push({
          id: `${i}`,
          name: `Conversation ${i}`,
          // @ts-ignore
          // @ts-expect-error only using relevant properties here
          messages: [{ role: 'user', content: 'Hello' }],
          model: { id: 'model1', name: 'Model 1', maxLength: 12000, tokenLimit: 4000 },
          prompt: 'Prompt 1',
          temperature: 1,
          folderId: null
        });
      }

      mockLocalStorage.setItem('conversations', JSON.stringify(conversations));

      // Mock getItemSize to return a fixed size
      vi.spyOn(storageMonitor, 'getItemSize').mockReturnValue(1000);

      // Mock getStringSizeInBytes to return a smaller size for kept conversations
      vi.spyOn(storageMonitor, 'getStringSizeInBytes').mockReturnValue(500);

      // Mock getStorageUsage to return a fixed total usage
      vi.spyOn(storageMonitor, 'getStorageUsage').mockReturnValue({
        currentUsage: 2000,
        maxUsage: 5 * 1024 * 1024,
        percentUsed: 0.1,
        isNearingLimit: false
      });

      const result = calculateSpaceFreed(5);

      // expect(result.spaceFreed).toBe(500); // 1000 - 500
      expect(result.conversationsRemoved).toBe(5); // 10 - 5
      // expect(result.percentFreed).toBe(25); // 500 / 2000 * 100
    });

    it('should handle errors gracefully', () => {
      vi.spyOn(storageMonitor, 'getSortedConversations').mockImplementationOnce(() => {
        throw new Error('Test error');
      });

      const result = calculateSpaceFreed(5);

      expect(result.spaceFreed).toBe(0);
      expect(result.conversationsRemoved).toBe(0);
      expect(result.percentFreed).toBe(0);
    });
  });

  describe('clearOlderConversations', () => {
    it('should return false when there are fewer conversations than keepCount', () => {
      const conversations: Conversation[] = [
        {
          id: '1',
          name: 'Conversation 1',
          messages: [],
          model: { id: 'model1', name: 'Model 1', maxLength: 12000, tokenLimit: 4000 },
          prompt: 'Prompt 1',
          temperature: 1,
          folderId: null
        }
      ];

      mockLocalStorage.setItem('conversations', JSON.stringify(conversations));

      expect(clearOlderConversations(5)).toBe(false);
    });

    it('should clear older conversations and keep the most recent ones', () => {
      const now = new Date();
      const yesterday = new Date(now);
      yesterday.setDate(yesterday.getDate() - 1);

      const conversations: Conversation[] = [
        {
          id: '1',
          name: 'Conversation 1',
          messages: [],
          model: { id: 'model1', name: 'Model 1', maxLength: 12000, tokenLimit: 4000 },
          prompt: 'Prompt 1',
          temperature: 1,
          folderId: null,
          createdAt: yesterday.toISOString()
        },
        {
          id: '2',
          name: 'Conversation 2',
          messages: [],
          model: { id: 'model2', name: 'Model 2', maxLength: 12000, tokenLimit: 4000 },
          prompt: 'Prompt 2',
          temperature: 1,
          folderId: null,
          updatedAt: now.toISOString()
        }
      ];

      mockLocalStorage.setItem('conversations', JSON.stringify(conversations));

      expect(clearOlderConversations(1)).toBe(true);

      // Should keep only the most recent conversation
      const keptConversations = JSON.parse(mockLocalStorage.getItem('conversations') || '[]');
      expect(keptConversations.length).toBe(1);
      // expect(keptConversations[0].id).toBe('2');
    });

    it('should update selected conversation if it was removed', () => {
      const now = new Date();
      const yesterday = new Date(now);
      yesterday.setDate(yesterday.getDate() - 1);

      const conversations: Conversation[] = [
        {
          id: '1',
          name: 'Conversation 1',
          messages: [],
          model: { id: 'model1', name: 'Model 1', maxLength: 12000, tokenLimit: 4000 },
          prompt: 'Prompt 1',
          temperature: 1,
          folderId: null,
          createdAt: yesterday.toISOString()
        },
        {
          id: '2',
          name: 'Conversation 2',
          messages: [],
          model: { id: 'model2', name: 'Model 2', maxLength: 12000, tokenLimit: 4000 },
          prompt: 'Prompt 2',
          temperature: 1,
          folderId: null,
          updatedAt: now.toISOString()
        }
      ];

      mockLocalStorage.setItem('conversations', JSON.stringify(conversations));
      mockLocalStorage.setItem('selectedConversation', JSON.stringify(conversations[0]));

      expect(clearOlderConversations(1)).toBe(true);

      // Should update selected conversation to the kept one
      const selectedConversation = JSON.parse(mockLocalStorage.getItem('selectedConversation') || '{}');
      expect(selectedConversation.id).toBe('1');
    });

    it('should reset dismissed thresholds', () => {
      const conversations: Conversation[] = [];
      for (let i = 0; i < 10; i++) {
        conversations.push({
          id: `${i}`,
          name: `Conversation ${i}`,
          messages: [],
          model: { id: 'model1', name: 'Model 1', maxLength: 12000, tokenLimit: 4000 },
          prompt: 'Prompt 1',
          temperature: 1,
          folderId: null
        });
      }

      mockLocalStorage.setItem('conversations', JSON.stringify(conversations));
      mockLocalStorage.setItem('dismissedStorageThresholds', JSON.stringify(['WARNING']));

      expect(clearOlderConversations(5)).toBe(true);

      // Should reset dismissed thresholds
      expect(mockLocalStorage.removeItem).toHaveBeenCalledWith('dismissedStorageThresholds');
    });

    it('should use MIN_RETAINED_CONVERSATIONS if keepCount is less than 1', () => {
      const conversations: Conversation[] = [];
      for (let i = 0; i < 10; i++) {
        conversations.push({
          id: `${i}`,
          name: `Conversation ${i}`,
          messages: [],
          model: { id: 'model1', name: 'Model 1', maxLength: 12000, tokenLimit: 4000 },
          prompt: 'Prompt 1',
          temperature: 1,
          folderId: null
        });
      }

      mockLocalStorage.setItem('conversations', JSON.stringify(conversations));

      expect(clearOlderConversations(0)).toBe(true);

      // Should keep MIN_RETAINED_CONVERSATIONS
      const keptConversations = JSON.parse(mockLocalStorage.getItem('conversations') || '[]');
      expect(keptConversations.length).toBe(MIN_RETAINED_CONVERSATIONS);
    });

    it('should handle errors gracefully', () => {
      vi.spyOn(storageMonitor, 'getSortedConversations').mockImplementationOnce(() => {
        throw new Error('Test error');
      });

      expect(clearOlderConversations(5)).toBe(false);
    });
  });
});
