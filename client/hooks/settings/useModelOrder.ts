'use client';

import { useCallback, useMemo } from 'react';

import {
  DEFAULT_MODEL_ORDER,
  OpenAIModel,
  OpenAIModelID,
  OpenAIModels,
} from '@/types/openai';

import {
  ModelOrderMode,
  useSettingsStore,
} from '@/client/stores/settingsStore';

/**
 * Result type for the useModelOrder hook
 */
export interface UseModelOrderResult {
  /** Models sorted according to the current order mode */
  orderedModels: OpenAIModel[];
  /** Current order mode */
  orderMode: ModelOrderMode;
  /** Set the order mode */
  setOrderMode: (mode: ModelOrderMode) => void;
  /** Move a model up or down in the custom order */
  moveModel: (modelId: string, direction: 'up' | 'down') => void;
  /** Increment usage count for a model */
  incrementUsage: (modelId: string) => void;
  /** Reset to default order */
  resetOrder: () => void;
  /** Check if a model can move up */
  canMoveUp: (modelId: string) => boolean;
  /** Check if a model can move down */
  canMoveDown: (modelId: string) => boolean;
  /** Get usage count for a model */
  getUsageCount: (modelId: string) => number;
}

/**
 * Hook for managing model ordering in the model selection UI.
 *
 * Supports four ordering modes:
 * - 'usage': Orders by usage frequency (most used first), with default order as tiebreaker
 * - 'name': Orders alphabetically by model name (A-Z)
 * - 'cutoff': Orders by knowledge cutoff date (newest first)
 * - 'custom': User-defined order via moveModel function
 *
 * @param models - Array of models to order
 * @returns Object with ordered models and order management functions
 *
 * @example
 * const {
 *   orderedModels,
 *   orderMode,
 *   setOrderMode,
 *   moveModel,
 *   incrementUsage
 * } = useModelOrder(baseModels);
 */
export const useModelOrder = (models: OpenAIModel[]): UseModelOrderResult => {
  const {
    modelOrderMode,
    customModelOrder,
    modelUsageStats,
    setModelOrderMode,
    moveModelInOrder,
    incrementModelUsage,
    resetModelOrder,
  } = useSettingsStore();

  /**
   * Sort models according to the current order mode
   */
  const orderedModels = useMemo(() => {
    const modelsCopy = [...models];

    switch (modelOrderMode) {
      case 'name':
        // Sort alphabetically by model name (A-Z)
        return modelsCopy.sort((a, b) => a.name.localeCompare(b.name));

      case 'cutoff': {
        // Sort by knowledge cutoff date (newest first)
        // Uses ISO format (e.g., "2025-12", "2025-01-20") which sorts correctly lexicographically
        return modelsCopy.sort((a, b) => {
          const configA = OpenAIModels[a.id as OpenAIModelID];
          const configB = OpenAIModels[b.id as OpenAIModelID];
          const cutoffA = configA?.knowledgeCutoffDate ?? '';
          const cutoffB = configB?.knowledgeCutoffDate ?? '';
          // Empty strings (special cases like real-time agents) sort last
          if (!cutoffA && cutoffB) return 1;
          if (cutoffA && !cutoffB) return -1;
          // Descending order (newest first) - ISO format sorts correctly
          return cutoffB.localeCompare(cutoffA);
        });
      }

      case 'custom': {
        // Use custom order, falling back to default for models not in custom order
        const effectiveOrder =
          customModelOrder.length > 0 ? customModelOrder : DEFAULT_MODEL_ORDER;

        return modelsCopy.sort((a, b) => {
          const indexA = effectiveOrder.indexOf(a.id);
          const indexB = effectiveOrder.indexOf(b.id);

          // Models not in custom order go to the end
          if (indexA === -1 && indexB === -1) return 0;
          if (indexA === -1) return 1;
          if (indexB === -1) return -1;

          return indexA - indexB;
        });
      }

      case 'usage':
      default:
        // Usage mode (default): Sort by usage frequency, with default order as tiebreaker
        return modelsCopy.sort((a, b) => {
          const usageA = modelUsageStats[a.id] ?? 0;
          const usageB = modelUsageStats[b.id] ?? 0;

          // Sort by usage count descending
          if (usageB !== usageA) {
            return usageB - usageA;
          }

          // Fallback to default order for ties
          const indexA = DEFAULT_MODEL_ORDER.indexOf(a.id as OpenAIModelID);
          const indexB = DEFAULT_MODEL_ORDER.indexOf(b.id as OpenAIModelID);

          // Models not in default order go to the end
          if (indexA === -1 && indexB === -1) return 0;
          if (indexA === -1) return 1;
          if (indexB === -1) return -1;

          return indexA - indexB;
        });
    }
  }, [models, modelOrderMode, customModelOrder, modelUsageStats]);

  /**
   * Check if a model can move up in the ordered list
   */
  const canMoveUp = useCallback(
    (modelId: string): boolean => {
      const index = orderedModels.findIndex((m) => m.id === modelId);
      return index > 0;
    },
    [orderedModels],
  );

  /**
   * Check if a model can move down in the ordered list
   */
  const canMoveDown = useCallback(
    (modelId: string): boolean => {
      const index = orderedModels.findIndex((m) => m.id === modelId);
      return index !== -1 && index < orderedModels.length - 1;
    },
    [orderedModels],
  );

  /**
   * Get usage count for a model
   */
  const getUsageCount = useCallback(
    (modelId: string): number => {
      return modelUsageStats[modelId] ?? 0;
    },
    [modelUsageStats],
  );

  return {
    orderedModels,
    orderMode: modelOrderMode,
    setOrderMode: setModelOrderMode,
    moveModel: moveModelInOrder,
    incrementUsage: incrementModelUsage,
    resetOrder: resetModelOrder,
    canMoveUp,
    canMoveDown,
    getUsageCount,
  };
};
