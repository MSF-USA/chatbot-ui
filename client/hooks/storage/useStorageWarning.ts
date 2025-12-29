import { useCallback, useEffect, useState } from 'react';

import {
  calculateSpaceFreed,
  calculateSpaceFreedByDays,
  clearConversationsOlderThan,
  clearOlderConversations,
  dismissThreshold,
  getStorageUsage,
  shouldShowStorageWarning,
} from '@/lib/utils/app/storage/storageMonitor';

/**
 * Storage usage information
 */
export interface StorageUsage {
  currentUsage: number;
  maxUsage: number;
  percentUsed: number;
  isNearingLimit: boolean;
}

/**
 * Space estimate for clearing operations
 */
export interface SpaceEstimate {
  spaceFreed: number;
  conversationsRemoved: number;
  percentFreed: number;
}

/**
 * Return type for the useStorageWarning hook
 */
export interface UseStorageWarningReturn {
  /** Whether a storage warning should be displayed */
  shouldShowWarning: boolean;
  /** Current threshold level: WARNING, CRITICAL, EMERGENCY, or null */
  currentThreshold: 'WARNING' | 'CRITICAL' | 'EMERGENCY' | null;
  /** Current storage usage statistics */
  storageUsage: StorageUsage;
  /** Dismiss the current warning (persists to localStorage) */
  dismissWarning: () => void;
  /** Calculate space that would be freed by keeping X conversations */
  calculateSpaceByCount: (keepCount: number) => SpaceEstimate;
  /** Calculate space that would be freed by clearing conversations older than X days */
  calculateSpaceByDays: (days: number) => SpaceEstimate;
  /** Clear conversations, keeping only the most recent X */
  clearByCount: (keepCount: number) => boolean;
  /** Clear conversations older than X days */
  clearByDays: (days: number) => boolean;
  /** Refresh storage usage data */
  refresh: () => void;
}

/**
 * Hook for managing storage warnings and clearing operations.
 *
 * Provides:
 * - Warning state (whether to show warning, current threshold level)
 * - Storage usage statistics
 * - Methods to calculate space estimates for clearing options
 * - Methods to perform clearing operations
 * - Dismiss functionality
 *
 * @example
 * ```tsx
 * const { shouldShowWarning, currentThreshold, dismissWarning } = useStorageWarning();
 *
 * if (shouldShowWarning) {
 *   return <StorageWarningDialog severity={currentThreshold} onDismiss={dismissWarning} />;
 * }
 * ```
 */
export function useStorageWarning(): UseStorageWarningReturn {
  const [shouldShowWarning, setShouldShowWarning] = useState(false);
  const [currentThreshold, setCurrentThreshold] = useState<
    'WARNING' | 'CRITICAL' | 'EMERGENCY' | null
  >(null);
  const [storageUsage, setStorageUsage] = useState<StorageUsage>({
    currentUsage: 0,
    maxUsage: 5 * 1024 * 1024,
    percentUsed: 0,
    isNearingLimit: false,
  });

  /**
   * Refresh all storage data
   */
  const refresh = useCallback(() => {
    try {
      // Get warning state
      const warning = shouldShowStorageWarning();
      setShouldShowWarning(warning.shouldShow);
      setCurrentThreshold(
        warning.currentThreshold as 'WARNING' | 'CRITICAL' | 'EMERGENCY' | null,
      );

      // Get storage usage
      const usage = getStorageUsage();
      setStorageUsage(usage);
    } catch (error) {
      console.error('Error refreshing storage warning state:', error);
    }
  }, []);

  // Check storage on mount
  useEffect(() => {
    // Only run in browser environment
    if (typeof window === 'undefined') return;

    // Defer state updates to avoid synchronous cascading renders
    queueMicrotask(() => {
      refresh();
    });
  }, [refresh]);

  /**
   * Dismiss the current warning threshold
   */
  const dismissWarning = useCallback(() => {
    if (currentThreshold) {
      dismissThreshold(currentThreshold);
      setShouldShowWarning(false);
    }
  }, [currentThreshold]);

  /**
   * Calculate space that would be freed by keeping X conversations
   */
  const calculateSpaceByCount = useCallback(
    (keepCount: number): SpaceEstimate => {
      try {
        return calculateSpaceFreed(keepCount);
      } catch (error) {
        console.error('Error calculating space by count:', error);
        return { spaceFreed: 0, conversationsRemoved: 0, percentFreed: 0 };
      }
    },
    [],
  );

  /**
   * Calculate space that would be freed by clearing conversations older than X days
   */
  const calculateSpaceByDays = useCallback((days: number): SpaceEstimate => {
    try {
      return calculateSpaceFreedByDays(days);
    } catch (error) {
      console.error('Error calculating space by days:', error);
      return { spaceFreed: 0, conversationsRemoved: 0, percentFreed: 0 };
    }
  }, []);

  /**
   * Clear conversations, keeping only the most recent X
   */
  const clearByCount = useCallback(
    (keepCount: number): boolean => {
      try {
        const success = clearOlderConversations(keepCount);
        if (success) {
          refresh();
        }
        return success;
      } catch (error) {
        console.error('Error clearing by count:', error);
        return false;
      }
    },
    [refresh],
  );

  /**
   * Clear conversations older than X days
   */
  const clearByDays = useCallback(
    (days: number): boolean => {
      try {
        const success = clearConversationsOlderThan(days);
        if (success) {
          refresh();
        }
        return success;
      } catch (error) {
        console.error('Error clearing by days:', error);
        return false;
      }
    },
    [refresh],
  );

  return {
    shouldShowWarning,
    currentThreshold,
    storageUsage,
    dismissWarning,
    calculateSpaceByCount,
    calculateSpaceByDays,
    clearByCount,
    clearByDays,
    refresh,
  };
}
