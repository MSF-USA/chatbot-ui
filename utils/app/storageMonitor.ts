/**
 * Storage Monitor Utility
 *
 * This utility provides functions to:
 * - Track localStorage usage
 * - Calculate size of stored objects
 * - Check if storage is nearing capacity
 * - Provide functions to manage conversations by recency
 * - Calculate potential space savings
 */

import {Conversation, Message} from '@/types/chat';
import { FolderInterface } from '@/types/folder';
import { Prompt } from '@/types/prompt';
import { Settings } from '@/types/settings';

// Constants
export const STORAGE_THRESHOLDS = {
  WARNING: 70,    // First warning level at 70% full
  CRITICAL: 85,   // Critical level at 85% full
  EMERGENCY: 95,  // Emergency level at 95% full
};
export const MIN_RETAINED_CONVERSATIONS = 5; // Minimum number of conversations to keep

// Local storage key for dismissed thresholds
const DISMISSED_THRESHOLDS_KEY = 'dismissedStorageThresholds';

// Storage keys used in the application
const STORAGE_KEYS = {
  CONVERSATIONS: 'conversations',
  FOLDERS: 'folders',
  PROMPTS: 'prompts',
  SETTINGS: 'settings',
  SELECTED_CONVERSATION: 'selectedConversation',
};

// Helper to check if we're in a browser environment
export const isBrowserEnv = () => typeof window !== 'undefined' && typeof window.localStorage !== 'undefined';

/**
 * Throws an error if not in a browser environment
 * Use this instead of isBrowserEnv checks when browser features are required
 */
export const requireBrowser = (): void => {
  if (!isBrowserEnv()) {
    throw new Error('Browser environment required. This operation needs localStorage or other browser APIs.');
  }
};

/**
 * Calculate the size of a string in bytes
 */
export const getStringSizeInBytes = (str: string): number => {
  if (!str) return 0;
  try {
    // This function doesn't directly use browser APIs that would fail in Node
    const blob = new Blob([str]);
    return blob.size;
  } catch (error) {
    console.error('Error calculating string size:', error);
    // Fallback to string length which is approximately the byte size for ASCII
    return str.length;
  }
};

/**
 * Get the size of an item in localStorage
 */
export const getItemSize = (key: string): number => {
  requireBrowser();

  try {
    const item = localStorage.getItem(key);
    if (!item) return 0;
    return getStringSizeInBytes(item);
  } catch (error) {
    console.error('Error getting item size:', error);
    return 0;
  }
};

/**
 * Get the total size of localStorage and its limit
 */
export const getStorageUsage = () => {
  // Check if we're in a browser environment
  requireBrowser();

  try {
    let totalSize = 0;
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key) {
        totalSize += getItemSize(key);
      }
    }

    // Estimate maximum storage (varies by browser, typically 5-10MB)
    // Using 5MB as a conservative estimate
    const maxSize = 5 * 1024 * 1024;
    const percentUsed = (totalSize / maxSize) * 100;

    return {
      currentUsage: totalSize,
      maxUsage: maxSize,
      percentUsed: percentUsed,
      isNearingLimit: percentUsed >= STORAGE_THRESHOLDS.WARNING,
    };
  } catch (error) {
    console.error('Error calculating storage usage:', error);
    return {
      currentUsage: 0,
      maxUsage: 5 * 1024 * 1024,
      percentUsed: 0,
      isNearingLimit: false,
    };
  }
};

/**
 * Get the current storage threshold level
 * @returns The current threshold level or null if below all thresholds
 */
export const getCurrentThresholdLevel = (): string | null => {
  requireBrowser();

  const { percentUsed } = getStorageUsage();

  // Check thresholds from highest to lowest
  if (percentUsed >= STORAGE_THRESHOLDS.EMERGENCY) {
    return 'EMERGENCY';
  }

  if (percentUsed >= STORAGE_THRESHOLDS.CRITICAL) {
    return 'CRITICAL';
  }

  if (percentUsed >= STORAGE_THRESHOLDS.WARNING) {
    return 'WARNING';
  }

  return null;
};

/**
 * Get dismissed thresholds from localStorage
 */
export const getDismissedThresholds = (): string[] => {
  requireBrowser();

  try {
    const dismissed = localStorage.getItem(DISMISSED_THRESHOLDS_KEY);
    return dismissed ? JSON.parse(dismissed) : [];
  } catch (error) {
    console.error('Error getting dismissed thresholds:', error);
    return [];
  }
};

/**
 * Save dismissed threshold to localStorage
 */
export const dismissThreshold = (threshold: string): void => {
  requireBrowser();

  try {
    const dismissed = getDismissedThresholds();
    if (!dismissed.includes(threshold)) {
      dismissed.push(threshold);
      localStorage.setItem(DISMISSED_THRESHOLDS_KEY, JSON.stringify(dismissed));
    }
  } catch (error) {
    console.error('Error dismissing threshold:', error);
  }
};

/**
 * Reset dismissed thresholds (called when user takes action to free space)
 */
export const resetDismissedThresholds = (): void => {
  requireBrowser();

  try {
    localStorage.removeItem(DISMISSED_THRESHOLDS_KEY);
  } catch (error) {
    console.error('Error resetting dismissed thresholds:', error);
  }
};

/**
 * Check if storage is nearing its limit
 * @deprecated Use getCurrentThresholdLevel instead
 */
export const isStorageNearingLimit = (): boolean => {
  requireBrowser();
  const { isNearingLimit } = getStorageUsage();
  return isNearingLimit === true;
};

/**
 * Check if a storage warning should be shown
 * @returns Object with shouldShow flag and current threshold level
 */
export const shouldShowStorageWarning = () => {
  const currentThreshold = getCurrentThresholdLevel();

  // If no threshold is reached, don't show warning
  if (!currentThreshold) {
    return { shouldShow: false, currentThreshold: null };
  }

  // For EMERGENCY level, always show warning regardless of dismissals
  if (currentThreshold === 'EMERGENCY') {
    return { shouldShow: true, currentThreshold };
  }

  // Check if this threshold has been dismissed
  const dismissedThresholds = getDismissedThresholds();
  const isDismissed = dismissedThresholds.includes(currentThreshold);

  return {
    shouldShow: !isDismissed,
    currentThreshold
  };
};

/**
 * Update storage statistics
 */
export const updateStorageStats = () => {
  const usageData = getStorageUsage();
  const { shouldShow, currentThreshold } = shouldShowStorageWarning();

  return {
    usageData,
    isNearingLimit: usageData.isNearingLimit, // For backward compatibility
    currentThreshold,
    shouldShowWarning: shouldShow,
  };
};

/**
 * Get conversations sorted by date (most recent first)
 */
export const getSortedConversations = (): Conversation[] => {
  requireBrowser();

  try {
    const conversationsJson = localStorage.getItem(STORAGE_KEYS.CONVERSATIONS);
    if (!conversationsJson) return [];

    const conversations: Conversation[] = JSON.parse(conversationsJson);

    // Separate conversations with and without dates
    const conversationsWithDates: Conversation[] = [];
    const conversationsWithoutDates: Conversation[] = [];

    for (const conversation of conversations) {
      const hasDate = conversation.updatedAt || conversation.createdAt;
      if (hasDate) {
        conversationsWithDates.push(conversation);
      } else {
        conversationsWithoutDates.push(conversation);
      }
    }

    // Sort conversations with dates (most recent first)
    conversationsWithDates.sort((a, b) => {
      const dateA = a.messages.length > 0 && a.updatedAt
          ? new Date(a.updatedAt).getTime()
          : a.createdAt
              ? new Date(a.createdAt).getTime()
              : 0;

      const dateB = b.messages.length > 0 && b.updatedAt
          ? new Date(b.updatedAt).getTime()
          : b.createdAt
              ? new Date(b.createdAt).getTime()
              : 0;

      return dateB - dateA;
    });

    // Return dated conversations first (sorted), followed by legacy conversations (in original order)
    return [...conversationsWithDates, ...conversationsWithoutDates];
  } catch (error) {
    console.error('Error getting sorted conversations:', error);
    return [];
  }
};

/**
 * Calculate space that would be freed by removing older conversations
 */
export const calculateSpaceFreed = (keepCount: number): {
  spaceFreed: number;
  conversationsRemoved: number;
  percentFreed: number;
} => {
  requireBrowser();

  try {
    const sortedConversations = getSortedConversations();
    if (sortedConversations.length <= keepCount) {
      return { spaceFreed: 0, conversationsRemoved: 0, percentFreed: 0 };
    }

    // Get the current size of all conversations
    const currentSize = getItemSize(STORAGE_KEYS.CONVERSATIONS);

    // Calculate what would be kept
    const keptConversations = sortedConversations.slice(0, keepCount);
    const keptSize = getStringSizeInBytes(JSON.stringify(keptConversations));

    // Calculate space freed
    const spaceFreed = currentSize - keptSize;
    const conversationsRemoved = sortedConversations.length - keepCount;

    // Calculate percentage of total storage freed
    const { currentUsage } = getStorageUsage();
    const percentFreed = currentUsage > 0 ? (spaceFreed / currentUsage) * 100 : 0;

    return { spaceFreed, conversationsRemoved, percentFreed };
  } catch (error) {
    console.error('Error calculating space freed:', error);
    return { spaceFreed: 0, conversationsRemoved: 0, percentFreed: 0 };
  }
};

/**
 * Clear older conversations while keeping the most recent ones
 */
export const clearOlderConversations = (keepCount: number): boolean => {
  requireBrowser();

  try {
    if (keepCount < 1) keepCount = MIN_RETAINED_CONVERSATIONS;

    const sortedConversations = getSortedConversations();
    if (sortedConversations.length <= keepCount) {
      return false; // Nothing to clear
    }

    // Get original length to verify if something was cleared
    const originalLength = sortedConversations.length;

    // Keep only the most recent conversations
    const keptConversations = sortedConversations.slice(0, keepCount);

    // Save the kept conversations back to localStorage
    localStorage.setItem(
        STORAGE_KEYS.CONVERSATIONS,
        JSON.stringify(keptConversations)
    );

    // Reset dismissed thresholds since user has taken action
    resetDismissedThresholds();

    // If the selected conversation was removed, update it to the most recent one
    const selectedConversationJson = localStorage.getItem(STORAGE_KEYS.SELECTED_CONVERSATION);
    if (selectedConversationJson) {
      const selectedConversation: Conversation = JSON.parse(selectedConversationJson);
      const isSelectedKept = keptConversations.some(c => c.id === selectedConversation.id);

      if (!isSelectedKept && keptConversations.length > 0) {
        // Always use the first (most recent) conversation as the new selected one
        localStorage.setItem(
          STORAGE_KEYS.SELECTED_CONVERSATION,
          JSON.stringify(keptConversations[0])
        );
      }
    }

    // Verify that conversations were actually removed
    return originalLength > keptConversations.length;
  } catch (error) {
    console.error('Error clearing older conversations:', error);
    return false;
  }
};
