import {
  createTimer,
  withTiming,
} from '@/lib/utils/server/observability/timing';

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

describe('timing utilities', () => {
  describe('createTimer', () => {
    it('returns a timer object with elapsed method', () => {
      const timer = createTimer();
      expect(timer).toHaveProperty('elapsed');
      expect(typeof timer.elapsed).toBe('function');
    });

    it('returns increasing elapsed time', async () => {
      const timer = createTimer();
      const first = timer.elapsed();
      await new Promise((resolve) => setTimeout(resolve, 10));
      const second = timer.elapsed();
      expect(second).toBeGreaterThanOrEqual(first);
    });

    it('returns elapsed time in milliseconds', () => {
      vi.useFakeTimers();
      try {
        const timer = createTimer();
        expect(timer.elapsed()).toBe(0);
        vi.advanceTimersByTime(100);
        expect(timer.elapsed()).toBe(100);
        vi.advanceTimersByTime(50);
        expect(timer.elapsed()).toBe(150);
      } finally {
        vi.useRealTimers();
      }
    });

    it('allows multiple elapsed calls without resetting', () => {
      vi.useFakeTimers();
      try {
        const timer = createTimer();
        vi.advanceTimersByTime(50);
        timer.elapsed(); // First call
        vi.advanceTimersByTime(50);
        expect(timer.elapsed()).toBe(100); // Should be cumulative
      } finally {
        vi.useRealTimers();
      }
    });
  });

  describe('withTiming', () => {
    beforeEach(() => {
      vi.useFakeTimers();
    });

    afterEach(() => {
      vi.useRealTimers();
    });

    it('returns the result of the function', async () => {
      const promise = withTiming(async () => 'test result');
      vi.runAllTimers();
      const { result } = await promise;
      expect(result).toBe('test result');
    });

    it('returns the duration in milliseconds', async () => {
      const promise = withTiming(async () => {
        await new Promise((resolve) => setTimeout(resolve, 100));
        return 'done';
      });
      vi.advanceTimersByTime(100);
      const { duration } = await promise;
      expect(duration).toBeGreaterThanOrEqual(100);
    });

    it('handles functions that return different types', async () => {
      // Number
      const numPromise = withTiming(async () => 42);
      vi.runAllTimers();
      const numResult = await numPromise;
      expect(numResult.result).toBe(42);

      // Object
      const objPromise = withTiming(async () => ({ key: 'value' }));
      vi.runAllTimers();
      const objResult = await objPromise;
      expect(objResult.result).toEqual({ key: 'value' });

      // Array
      const arrPromise = withTiming(async () => [1, 2, 3]);
      vi.runAllTimers();
      const arrResult = await arrPromise;
      expect(arrResult.result).toEqual([1, 2, 3]);
    });

    it('propagates errors from the function', async () => {
      const promise = withTiming(async () => {
        throw new Error('test error');
      });
      vi.runAllTimers();
      await expect(promise).rejects.toThrow('test error');
    });

    it('measures duration even for quick functions', async () => {
      const promise = withTiming(async () => 'quick');
      vi.runAllTimers();
      const { result, duration } = await promise;
      expect(result).toBe('quick');
      expect(typeof duration).toBe('number');
      expect(duration).toBeGreaterThanOrEqual(0);
    });
  });
});
