import { act } from '@testing-library/react';

import { SETTINGS_CONSTANTS } from '@/lib/constants/settings';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';

// Get the threshold constant
const THRESHOLD = SETTINGS_CONSTANTS.MODEL_ORDER.CONSECUTIVE_USAGE_THRESHOLD;

// We need to import the store after setting up localStorage mock
let useSettingsStore: typeof import('@/client/stores/settingsStore').useSettingsStore;

describe('settingsStore.recordSuccessfulModelUsage', () => {
  beforeEach(async () => {
    // Clear localStorage before each test
    localStorage.clear();

    // Reset module cache to get fresh store
    const settingsModule = await import('@/client/stores/settingsStore');
    useSettingsStore = settingsModule.useSettingsStore;

    // Reset store to initial state
    act(() => {
      useSettingsStore.setState({
        modelUsageStats: {},
        consecutiveModelUsage: { modelId: null, count: 0 },
      });
    });
  });

  afterEach(() => {
    localStorage.clear();
  });

  describe('consecutive usage tracking', () => {
    it('should start tracking consecutive usage on first call', () => {
      const { recordSuccessfulModelUsage, consecutiveModelUsage } =
        useSettingsStore.getState();

      act(() => {
        recordSuccessfulModelUsage('model-a');
      });

      const state = useSettingsStore.getState();
      expect(state.consecutiveModelUsage.modelId).toBe('model-a');
      expect(state.consecutiveModelUsage.count).toBe(1);
      expect(state.modelUsageStats['model-a']).toBeUndefined();
    });

    it('should increment consecutive count for same model', () => {
      act(() => {
        useSettingsStore.getState().recordSuccessfulModelUsage('model-a');
      });

      act(() => {
        useSettingsStore.getState().recordSuccessfulModelUsage('model-a');
      });

      const state = useSettingsStore.getState();
      expect(state.consecutiveModelUsage.modelId).toBe('model-a');
      expect(state.consecutiveModelUsage.count).toBe(2);
      expect(state.modelUsageStats['model-a']).toBeUndefined();
    });

    it('should reset consecutive count when switching models', () => {
      // Use model A twice
      act(() => {
        useSettingsStore.getState().recordSuccessfulModelUsage('model-a');
      });
      act(() => {
        useSettingsStore.getState().recordSuccessfulModelUsage('model-a');
      });

      // Switch to model B
      act(() => {
        useSettingsStore.getState().recordSuccessfulModelUsage('model-b');
      });

      const state = useSettingsStore.getState();
      expect(state.consecutiveModelUsage.modelId).toBe('model-b');
      expect(state.consecutiveModelUsage.count).toBe(1);
      // model-a should not have been incremented (only 2 uses, threshold is 3)
      expect(state.modelUsageStats['model-a']).toBeUndefined();
    });

    it(`should increment usage stats after ${THRESHOLD} consecutive uses`, () => {
      // Use the model THRESHOLD times
      for (let i = 0; i < THRESHOLD; i++) {
        act(() => {
          useSettingsStore.getState().recordSuccessfulModelUsage('model-a');
        });
      }

      const state = useSettingsStore.getState();
      // Usage stats should be incremented
      expect(state.modelUsageStats['model-a']).toBe(1);
      // Consecutive count should reset to 0
      expect(state.consecutiveModelUsage.modelId).toBe('model-a');
      expect(state.consecutiveModelUsage.count).toBe(0);
    });

    it(`should increment usage stats multiple times for ${THRESHOLD * 2} consecutive uses`, () => {
      // Use the model THRESHOLD * 2 times
      for (let i = 0; i < THRESHOLD * 2; i++) {
        act(() => {
          useSettingsStore.getState().recordSuccessfulModelUsage('model-a');
        });
      }

      const state = useSettingsStore.getState();
      // Usage stats should be incremented twice
      expect(state.modelUsageStats['model-a']).toBe(2);
      // Consecutive count should reset to 0
      expect(state.consecutiveModelUsage.count).toBe(0);
    });

    it('should not increment usage stats if user switches before threshold', () => {
      // Use model A twice (below threshold)
      act(() => {
        useSettingsStore.getState().recordSuccessfulModelUsage('model-a');
      });
      act(() => {
        useSettingsStore.getState().recordSuccessfulModelUsage('model-a');
      });

      // Switch to model B twice
      act(() => {
        useSettingsStore.getState().recordSuccessfulModelUsage('model-b');
      });
      act(() => {
        useSettingsStore.getState().recordSuccessfulModelUsage('model-b');
      });

      // Switch back to model A
      act(() => {
        useSettingsStore.getState().recordSuccessfulModelUsage('model-a');
      });

      const state = useSettingsStore.getState();
      // Neither model should have usage stats (all were below threshold)
      expect(state.modelUsageStats['model-a']).toBeUndefined();
      expect(state.modelUsageStats['model-b']).toBeUndefined();
      // Current tracking should be model A with count 1
      expect(state.consecutiveModelUsage.modelId).toBe('model-a');
      expect(state.consecutiveModelUsage.count).toBe(1);
    });

    it('should handle interleaved usage correctly', () => {
      // Use model A to reach threshold
      for (let i = 0; i < THRESHOLD; i++) {
        act(() => {
          useSettingsStore.getState().recordSuccessfulModelUsage('model-a');
        });
      }

      // Use model B to reach threshold
      for (let i = 0; i < THRESHOLD; i++) {
        act(() => {
          useSettingsStore.getState().recordSuccessfulModelUsage('model-b');
        });
      }

      const state = useSettingsStore.getState();
      expect(state.modelUsageStats['model-a']).toBe(1);
      expect(state.modelUsageStats['model-b']).toBe(1);
    });
  });

  describe('persistence', () => {
    it('should preserve consecutive usage state in store', () => {
      act(() => {
        useSettingsStore.getState().recordSuccessfulModelUsage('model-a');
      });
      act(() => {
        useSettingsStore.getState().recordSuccessfulModelUsage('model-a');
      });

      // Get fresh reference to state
      const state = useSettingsStore.getState();
      expect(state.consecutiveModelUsage).toEqual({
        modelId: 'model-a',
        count: 2,
      });
    });
  });
});
