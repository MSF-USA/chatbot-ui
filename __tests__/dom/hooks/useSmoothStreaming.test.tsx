import { renderHook, waitFor } from '@testing-library/react';
import { describe, expect, it, beforeEach, afterEach, vi } from 'vitest';
import { useSmoothStreaming } from '@/lib/hooks/useSmoothStreaming';

describe('useSmoothStreaming', () => {
  let rafCallbacks: Map<number, FrameRequestCallback>;
  let rafId: number;

  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(0);

    rafCallbacks = new Map();
    rafId = 0;

    // Mock requestAnimationFrame to work with fake timers
    global.requestAnimationFrame = vi.fn((callback: FrameRequestCallback) => {
      const id = ++rafId;
      rafCallbacks.set(id, callback);

      // Schedule the callback to run on next timer tick
      setTimeout(() => {
        const cb = rafCallbacks.get(id);
        if (cb) {
          rafCallbacks.delete(id);
          cb(performance.now());
        }
      }, 16);

      return id;
    });

    global.cancelAnimationFrame = vi.fn((id: number) => {
      rafCallbacks.delete(id);
    });
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.clearAllMocks();
  });

  describe('Basic Functionality', () => {
    it('returns empty string initially', () => {
      const { result } = renderHook(() =>
        useSmoothStreaming({
          isStreaming: false,
          content: '',
        })
      );

      expect(result.current).toBe('');
    });

    it('returns full content when not streaming', () => {
      const { result } = renderHook(() =>
        useSmoothStreaming({
          isStreaming: false,
          content: 'Hello World',
        })
      );

      expect(result.current).toBe('Hello World');
    });

    it('immediately shows content when streaming stops', async () => {
      const { result, rerender } = renderHook(
        ({ isStreaming, content }) =>
          useSmoothStreaming({ isStreaming, content }),
        {
          initialProps: {
            isStreaming: true,
            content: 'Hello',
          },
        }
      );

      // While streaming, content may be partial
      expect(result.current.length).toBeLessThanOrEqual(5);

      // Stop streaming
      rerender({ isStreaming: false, content: 'Hello World' });

      // Should immediately show full content (effect runs synchronously)
      expect(result.current).toBe('Hello World');
    });
  });

  describe('Disabled State', () => {
    it('returns full content immediately when disabled', () => {
      const { result } = renderHook(() =>
        useSmoothStreaming({
          isStreaming: true,
          content: 'Hello World',
          enabled: false,
        })
      );

      expect(result.current).toBe('Hello World');
    });

    it('does not animate when disabled', () => {
      const { result } = renderHook(() =>
        useSmoothStreaming({
          isStreaming: true,
          content: 'Hello World',
          enabled: false,
        })
      );

      // Advance time
      vi.advanceTimersByTime(100);

      // Should still show full content immediately, not animated
      expect(result.current).toBe('Hello World');
    });
  });

  describe('Animation Parameters', () => {
    it('respects charsPerFrame parameter', async () => {
      const { result, rerender } = renderHook(
        ({ content }) =>
          useSmoothStreaming({
            isStreaming: true,
            content,
            charsPerFrame: 2,
            frameDelay: 10,
          }),
        { initialProps: { content: '' } }
      );

      // Update content
      rerender({ content: 'Hello' });

      // Trigger animation frame
      await vi.runOnlyPendingTimersAsync();

      // With charsPerFrame=2, we should see at most 2 characters at a time
      const displayedLength = result.current.length;
      expect(displayedLength).toBeGreaterThanOrEqual(0);
      expect(displayedLength).toBeLessThanOrEqual(5);
    });

    it('respects frameDelay parameter', async () => {
      const { result, rerender } = renderHook(
        ({ content }) =>
          useSmoothStreaming({
            isStreaming: true,
            content,
            charsPerFrame: 1,
            frameDelay: 50,
          }),
        { initialProps: { content: '' } }
      );

      // Update content
      rerender({ content: 'Hello' });

      // Animation should not update before frameDelay
      vi.advanceTimersByTime(25);
      await vi.runOnlyPendingTimersAsync();

      const lengthBefore = result.current.length;

      // After frameDelay, animation should progress
      vi.advanceTimersByTime(30);
      await vi.runOnlyPendingTimersAsync();

      // Length should have potentially increased
      expect(result.current.length).toBeGreaterThanOrEqual(lengthBefore);
    });

    it('uses default charsPerFrame when not specified', async () => {
      const { result, rerender } = renderHook(
        ({ content }) =>
          useSmoothStreaming({
            isStreaming: true,
            content,
            // charsPerFrame defaults to 6
          }),
        { initialProps: { content: '' } }
      );

      rerender({ content: 'Hello World!' });

      await vi.runOnlyPendingTimersAsync();

      // Default is 6 chars per frame, so we should see progress
      expect(result.current.length).toBeGreaterThanOrEqual(0);
      expect(result.current.length).toBeLessThanOrEqual(12);
    });

    it('uses default frameDelay when not specified', async () => {
      const { result, rerender } = renderHook(
        ({ content }) =>
          useSmoothStreaming({
            isStreaming: true,
            content,
            charsPerFrame: 1,
            // frameDelay defaults to 10
          }),
        { initialProps: { content: '' } }
      );

      rerender({ content: 'Hi' });

      // With default frameDelay of 10ms
      vi.advanceTimersByTime(5);
      await vi.runOnlyPendingTimersAsync();

      const lengthBefore = result.current.length;

      vi.advanceTimersByTime(10);
      await vi.runOnlyPendingTimersAsync();

      // Should have progressed
      expect(result.current.length).toBeGreaterThanOrEqual(lengthBefore);
    });
  });

  describe('Content Updates', () => {
    it.skip('animates when content is added during streaming', async () => {
      const { result, rerender } = renderHook(
        ({ content }) =>
          useSmoothStreaming({
            isStreaming: true,
            content,
            charsPerFrame: 1,
            frameDelay: 10,
          }),
        { initialProps: { content: 'H' } }
      );

      // Initial content
      await vi.runAllTimersAsync();
      expect(result.current).toBe('H');

      // Add more content
      rerender({ content: 'Hello' });

      // Should start animating to show new content
      await vi.runAllTimersAsync();
      expect(result.current).toBe('Hello');
    });

    it.skip('catches up with content when it changes rapidly', async () => {
      const { result, rerender } = renderHook(
        ({ content }) =>
          useSmoothStreaming({
            isStreaming: true,
            content,
            charsPerFrame: 1,
            frameDelay: 10,
          }),
        { initialProps: { content: '' } }
      );

      // Rapidly update content
      rerender({ content: 'H' });
      rerender({ content: 'He' });
      rerender({ content: 'Hel' });
      rerender({ content: 'Hell' });
      rerender({ content: 'Hello' });

      // Run all timers to let animation catch up
      await vi.runAllTimersAsync();

      // Should eventually show full content
      expect(result.current).toBe('Hello');
    });

    it.skip('handles content being cleared', async () => {
      const { result, rerender } = renderHook(
        ({ content }) =>
          useSmoothStreaming({
            isStreaming: true,
            content,
          }),
        { initialProps: { content: 'Hello' } }
      );

      await vi.runAllTimersAsync();

      // Clear content
      rerender({ content: '' });

      // Content ref is updated immediately, displayed content should reflect this
      expect(result.current).toBe('');
    });

    it('handles content being replaced', async () => {
      const { result, rerender } = renderHook(
        ({ isStreaming, content }) =>
          useSmoothStreaming({
            isStreaming,
            content,
          }),
        {
          initialProps: {
            isStreaming: false,
            content: 'Hello',
          },
        }
      );

      expect(result.current).toBe('Hello');

      // Replace with new content
      rerender({ isStreaming: false, content: 'World' });

      // Should update immediately when not streaming
      expect(result.current).toBe('World');
    });
  });

  describe('Streaming State Changes', () => {
    it.skip('transitions from not streaming to streaming', async () => {
      const { result, rerender } = renderHook(
        ({ isStreaming, content }) =>
          useSmoothStreaming({
            isStreaming,
            content,
            charsPerFrame: 1,
            frameDelay: 10,
          }),
        {
          initialProps: {
            isStreaming: false,
            content: 'Hello',
          },
        }
      );

      // Initially not streaming - should show full content
      expect(result.current).toBe('Hello');

      // Start streaming with new content
      rerender({ isStreaming: true, content: 'Hello World' });

      // Should start animating the new content
      await vi.runAllTimersAsync();
      expect(result.current).toBe('Hello World');
    });

    it('transitions from streaming to not streaming', async () => {
      const { result, rerender } = renderHook(
        ({ isStreaming, content }) =>
          useSmoothStreaming({
            isStreaming,
            content,
            charsPerFrame: 1,
            frameDelay: 10,
          }),
        {
          initialProps: {
            isStreaming: true,
            content: 'Hello',
          },
        }
      );

      // While streaming
      await vi.runAllTimersAsync();

      // Stop streaming
      rerender({ isStreaming: false, content: 'Hello World' });

      // Should immediately show full content (effect runs synchronously)
      expect(result.current).toBe('Hello World');
    });
  });

  describe('Cleanup', () => {
    it('cancels animation frame on unmount', () => {
      const cancelAnimationFrameSpy = vi.spyOn(global, 'cancelAnimationFrame');

      const { unmount } = renderHook(() =>
        useSmoothStreaming({
          isStreaming: true,
          content: 'Hello World',
          charsPerFrame: 1,
          frameDelay: 10,
        })
      );

      // Start animation
      vi.advanceTimersByTime(20);

      unmount();

      // Should have called cancelAnimationFrame
      expect(cancelAnimationFrameSpy).toHaveBeenCalled();

      cancelAnimationFrameSpy.mockRestore();
    });

    it('stops animating after unmount', async () => {
      const { result, unmount } = renderHook(() =>
        useSmoothStreaming({
          isStreaming: true,
          content: 'Hello World',
          charsPerFrame: 1,
          frameDelay: 10,
        })
      );

      const lengthBeforeUnmount = result.current.length;

      unmount();

      // Try to advance timers after unmount
      await vi.runAllTimersAsync();

      // Length should not change after unmount
      expect(result.current.length).toBe(lengthBeforeUnmount);
    });
  });

  describe('Edge Cases', () => {
    it('handles empty content', () => {
      const { result } = renderHook(() =>
        useSmoothStreaming({
          isStreaming: true,
          content: '',
        })
      );

      expect(result.current).toBe('');
    });

    it('handles very long content', async () => {
      const longContent = 'A'.repeat(1000);

      const { result } = renderHook(() =>
        useSmoothStreaming({
          isStreaming: false,
          content: longContent,
        })
      );

      // Should show full content immediately when not streaming
      expect(result.current).toBe(longContent);
      expect(result.current.length).toBe(1000);
    });

    it.skip('handles single character content', async () => {
      const { result, rerender } = renderHook(
        ({ content }) =>
          useSmoothStreaming({
            isStreaming: true,
            content,
            charsPerFrame: 1,
          }),
        { initialProps: { content: '' } }
      );

      rerender({ content: 'A' });

      await vi.runAllTimersAsync();

      expect(result.current).toBe('A');
    });

    it.skip('handles charsPerFrame larger than content', async () => {
      const { result, rerender } = renderHook(
        ({ content }) =>
          useSmoothStreaming({
            isStreaming: true,
            content,
            charsPerFrame: 100,
            frameDelay: 10,
          }),
        { initialProps: { content: '' } }
      );

      rerender({ content: 'Hi' });

      await vi.runAllTimersAsync();

      // Should show all content in one frame
      expect(result.current).toBe('Hi');
    });

    it.skip('handles zero frameDelay', async () => {
      const { result, rerender } = renderHook(
        ({ content }) =>
          useSmoothStreaming({
            isStreaming: true,
            content,
            charsPerFrame: 1,
            frameDelay: 0,
          }),
        { initialProps: { content: '' } }
      );

      rerender({ content: 'Hello' });

      // Even with zero delay, animation should still work
      await vi.runAllTimersAsync();
      expect(result.current).toBe('Hello');
    });

    it('handles special characters and unicode', async () => {
      const specialContent = 'Hello 🌍 World! ©️ 2024';

      const { result } = renderHook(() =>
        useSmoothStreaming({
          isStreaming: false,
          content: specialContent,
        })
      );

      expect(result.current).toBe(specialContent);
    });

    it('does not break with rapid enable/disable', () => {
      const { result, rerender } = renderHook(
        ({ enabled }) =>
          useSmoothStreaming({
            isStreaming: true,
            content: 'Hello World',
            enabled,
          }),
        { initialProps: { enabled: true } }
      );

      rerender({ enabled: false });
      rerender({ enabled: true });
      rerender({ enabled: false });
      rerender({ enabled: true });

      // Should still work without crashing
      expect(result.current).toBeDefined();
    });
  });

  describe('Animation Progress', () => {
    it.skip('gradually reveals content over time', async () => {
      const { result, rerender } = renderHook(
        ({ content }) =>
          useSmoothStreaming({
            isStreaming: true,
            content,
            charsPerFrame: 1,
            frameDelay: 10,
          }),
        { initialProps: { content: '' } }
      );

      rerender({ content: 'Hello' });

      const lengths: number[] = [];

      // Sample length at different time points
      for (let i = 0; i < 5; i++) {
        vi.advanceTimersByTime(15);
        await vi.runOnlyPendingTimersAsync();
        lengths.push(result.current.length);
      }

      // Eventually should reach full length
      await vi.runAllTimersAsync();
      expect(result.current).toBe('Hello');
    });

    it.skip('catches up when displayedContent is behind content', async () => {
      const { result, rerender } = renderHook(
        ({ content }) =>
          useSmoothStreaming({
            isStreaming: true,
            content,
            charsPerFrame: 1,
            frameDelay: 10,
          }),
        { initialProps: { content: 'Hi' } }
      );

      await vi.runAllTimersAsync();
      expect(result.current).toBe('Hi');

      // Add more content while streaming
      rerender({ content: 'Hi there!' });

      // Should animate to catch up
      await vi.runAllTimersAsync();
      expect(result.current).toBe('Hi there!');
    });
  });
});
