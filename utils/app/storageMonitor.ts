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
export const STORAGE_WARNING_THRESHOLD = 85; // Show warning when storage is 85% full
export const MIN_RETAINED_CONVERSATIONS = 5; // Minimum number of conversations to keep

// Storage keys used in the application
const STORAGE_KEYS = {
  CONVERSATIONS: 'conversations',
  FOLDERS: 'folders',
  PROMPTS: 'prompts',
  SETTINGS: 'settings',
  SELECTED_CONVERSATION: 'selectedConversation',
};

/**
 * Calculate the size of a string in bytes
 */
export const getStringSizeInBytes = (str: string): number => {
  return new Blob([str]).size;
};

/**
 * Get the size of an item in localStorage
 */
export const getItemSize = (key: string): number => {
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
      isNearingLimit: percentUsed >= STORAGE_WARNING_THRESHOLD,
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
 * Check if storage is nearing its limit
 */
export const isStorageNearingLimit = (): boolean => {
  const { isNearingLimit } = getStorageUsage();
  return isNearingLimit;
};

/**
 * Update storage statistics
 */
export const updateStorageStats = () => {
  const usageData = getStorageUsage();
  return {
    usageData,
    isNearingLimit: usageData.isNearingLimit,
  };
};


/**
 * Get conversations sorted by date (most recent first)
 */
export const getSortedConversations = (): Conversation[] => {
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
    const percentFreed = (spaceFreed / currentUsage) * 100;

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
  try {
    if (keepCount < 1) keepCount = MIN_RETAINED_CONVERSATIONS;

    const sortedConversations = getSortedConversations();
    if (sortedConversations.length <= keepCount) {
      return false; // Nothing to clear
    }

    // Keep only the most recent conversations
    const keptConversations = sortedConversations.slice(0, keepCount);

    // Save the kept conversations back to localStorage
    localStorage.setItem(
      STORAGE_KEYS.CONVERSATIONS,
      JSON.stringify(keptConversations)
    );

    // If the selected conversation was removed, update it to the most recent one
    const selectedConversationJson = localStorage.getItem(STORAGE_KEYS.SELECTED_CONVERSATION);
    if (selectedConversationJson) {
      const selectedConversation: Conversation = JSON.parse(selectedConversationJson);
      const isSelectedKept = keptConversations.some(c => c.id === selectedConversation.id);

      if (!isSelectedKept && keptConversations.length > 0) {
        localStorage.setItem(
          STORAGE_KEYS.SELECTED_CONVERSATION,
          JSON.stringify(keptConversations[0])
        );
      }
    }

    return true;
  } catch (error) {
    console.error('Error clearing older conversations:', error);
    return false;
  }
};
