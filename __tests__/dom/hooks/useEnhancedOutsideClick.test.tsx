import { renderHook } from '@testing-library/react';
import { describe, expect, it, vi, beforeEach, afterEach } from 'vitest';
import { RefObject } from 'react';
import useEnhancedOutsideClick from '@/lib/hooks/useEnhancedOutsideClick';

describe('useEnhancedOutsideClick', () => {
  let onOutsideClick: ReturnType<typeof vi.fn>;
  let ref: RefObject<HTMLDivElement>;

  beforeEach(() => {
    onOutsideClick = vi.fn();
    ref = { current: document.createElement('div') };
    document.body.appendChild(ref.current!);
  });

  afterEach(() => {
    if (ref.current && document.body.contains(ref.current)) {
      document.body.removeChild(ref.current);
    }
    vi.clearAllMocks();
  });

  describe('Basic Functionality', () => {
    it('calls onOutsideClick when clicking outside the element', () => {
      renderHook(() => useEnhancedOutsideClick(ref, onOutsideClick, true));

      vi.useFakeTimers();
      vi.advanceTimersByTime(20);

      // Click outside
      const outsideElement = document.createElement('div');
      document.body.appendChild(outsideElement);

      const mouseDownEvent = new MouseEvent('mousedown', {
        bubbles: true,
        cancelable: true,
      });
      Object.defineProperty(mouseDownEvent, 'target', {
        value: outsideElement,
        enumerable: true,
      });

      document.dispatchEvent(mouseDownEvent);

      expect(onOutsideClick).toHaveBeenCalledTimes(1);

      document.body.removeChild(outsideElement);
      vi.useRealTimers();
    });

    it('does not call onOutsideClick when clicking inside the element', () => {
      renderHook(() => useEnhancedOutsideClick(ref, onOutsideClick, true));

      vi.useFakeTimers();
      vi.advanceTimersByTime(20);

      // Click inside
      const mouseDownEvent = new MouseEvent('mousedown', {
        bubbles: true,
        cancelable: true,
      });
      Object.defineProperty(mouseDownEvent, 'target', {
        value: ref.current,
        enumerable: true,
      });

      document.dispatchEvent(mouseDownEvent);

      expect(onOutsideClick).not.toHaveBeenCalled();

      vi.useRealTimers();
    });

    it('handles clicks on child elements', () => {
      const childElement = document.createElement('span');
      ref.current!.appendChild(childElement);

      renderHook(() => useEnhancedOutsideClick(ref, onOutsideClick, true));

      vi.useFakeTimers();
      vi.advanceTimersByTime(20);

      // Click on child
      const mouseDownEvent = new MouseEvent('mousedown', {
        bubbles: true,
        cancelable: true,
      });
      Object.defineProperty(mouseDownEvent, 'target', {
        value: childElement,
        enumerable: true,
      });

      document.dispatchEvent(mouseDownEvent);

      expect(onOutsideClick).not.toHaveBeenCalled();

      vi.useRealTimers();
    });
  });

  describe('isActive Parameter', () => {
    it('does not listen when isActive is false', () => {
      renderHook(() => useEnhancedOutsideClick(ref, onOutsideClick, false));

      vi.useFakeTimers();
      vi.advanceTimersByTime(20);

      // Click outside
      const outsideElement = document.createElement('div');
      document.body.appendChild(outsideElement);

      const mouseDownEvent = new MouseEvent('mousedown', {
        bubbles: true,
        cancelable: true,
      });
      Object.defineProperty(mouseDownEvent, 'target', {
        value: outsideElement,
        enumerable: true,
      });

      document.dispatchEvent(mouseDownEvent);

      expect(onOutsideClick).not.toHaveBeenCalled();

      document.body.removeChild(outsideElement);
      vi.useRealTimers();
    });

    it('starts listening when isActive becomes true', () => {
      const { rerender } = renderHook(
        ({ isActive }) => useEnhancedOutsideClick(ref, onOutsideClick, isActive),
        { initialProps: { isActive: false } }
      );

      vi.useFakeTimers();
      vi.advanceTimersByTime(20);

      // Click outside while inactive
      let outsideElement = document.createElement('div');
      document.body.appendChild(outsideElement);

      let mouseDownEvent = new MouseEvent('mousedown', {
        bubbles: true,
        cancelable: true,
      });
      Object.defineProperty(mouseDownEvent, 'target', {
        value: outsideElement,
        enumerable: true,
      });

      document.dispatchEvent(mouseDownEvent);
      expect(onOutsideClick).not.toHaveBeenCalled();

      document.body.removeChild(outsideElement);

      // Activate
      rerender({ isActive: true });
      vi.advanceTimersByTime(20);

      // Click outside while active
      outsideElement = document.createElement('div');
      document.body.appendChild(outsideElement);

      mouseDownEvent = new MouseEvent('mousedown', {
        bubbles: true,
        cancelable: true,
      });
      Object.defineProperty(mouseDownEvent, 'target', {
        value: outsideElement,
        enumerable: true,
      });

      document.dispatchEvent(mouseDownEvent);
      expect(onOutsideClick).toHaveBeenCalledTimes(1);

      document.body.removeChild(outsideElement);
      vi.useRealTimers();
    });

    it('stops listening when isActive becomes false', () => {
      const { rerender } = renderHook(
        ({ isActive }) => useEnhancedOutsideClick(ref, onOutsideClick, isActive),
        { initialProps: { isActive: true } }
      );

      vi.useFakeTimers();

      // Deactivate
      rerender({ isActive: false });
      vi.advanceTimersByTime(20);

      // Click outside while inactive
      const outsideElement = document.createElement('div');
      document.body.appendChild(outsideElement);

      const mouseDownEvent = new MouseEvent('mousedown', {
        bubbles: true,
        cancelable: true,
      });
      Object.defineProperty(mouseDownEvent, 'target', {
        value: outsideElement,
        enumerable: true,
      });

      document.dispatchEvent(mouseDownEvent);

      expect(onOutsideClick).not.toHaveBeenCalled();

      document.body.removeChild(outsideElement);
      vi.useRealTimers();
    });
  });

  describe('useCapture Parameter', () => {
    it('uses bubble phase by default (useCapture false)', () => {
      const stopPropagationSpy = vi.fn();

      renderHook(() => useEnhancedOutsideClick(ref, onOutsideClick, true, false));

      vi.useFakeTimers();
      vi.advanceTimersByTime(20);

      // Click outside
      const outsideElement = document.createElement('div');
      document.body.appendChild(outsideElement);

      const mouseDownEvent = new MouseEvent('mousedown', {
        bubbles: true,
        cancelable: true,
      });
      Object.defineProperty(mouseDownEvent, 'target', {
        value: outsideElement,
        enumerable: true,
      });
      mouseDownEvent.stopPropagation = stopPropagationSpy;

      document.dispatchEvent(mouseDownEvent);

      expect(onOutsideClick).toHaveBeenCalled();
      // stopPropagation should not be called when useCapture is false
      expect(stopPropagationSpy).not.toHaveBeenCalled();

      document.body.removeChild(outsideElement);
      vi.useRealTimers();
    });

    it('stops propagation when useCapture is true', () => {
      const stopPropagationSpy = vi.fn();

      renderHook(() => useEnhancedOutsideClick(ref, onOutsideClick, true, true));

      vi.useFakeTimers();
      vi.advanceTimersByTime(20);

      // Click outside
      const outsideElement = document.createElement('div');
      document.body.appendChild(outsideElement);

      const mouseDownEvent = new MouseEvent('mousedown', {
        bubbles: true,
        cancelable: true,
      });
      Object.defineProperty(mouseDownEvent, 'target', {
        value: outsideElement,
        enumerable: true,
      });
      mouseDownEvent.stopPropagation = stopPropagationSpy;

      document.dispatchEvent(mouseDownEvent);

      expect(onOutsideClick).toHaveBeenCalled();
      expect(stopPropagationSpy).toHaveBeenCalled();

      document.body.removeChild(outsideElement);
      vi.useRealTimers();
    });
  });

  describe('Delayed Event Listener', () => {
    it('delays adding event listener by 10ms', () => {
      renderHook(() => useEnhancedOutsideClick(ref, onOutsideClick, true));

      vi.useFakeTimers();

      // Click immediately (before timeout)
      const outsideElement = document.createElement('div');
      document.body.appendChild(outsideElement);

      const mouseDownEvent = new MouseEvent('mousedown', {
        bubbles: true,
        cancelable: true,
      });
      Object.defineProperty(mouseDownEvent, 'target', {
        value: outsideElement,
        enumerable: true,
      });

      document.dispatchEvent(mouseDownEvent);

      // Should not be called yet
      expect(onOutsideClick).not.toHaveBeenCalled();

      // Advance past the delay
      vi.advanceTimersByTime(15);

      // Click again
      document.dispatchEvent(mouseDownEvent);

      // Should be called now
      expect(onOutsideClick).toHaveBeenCalledTimes(1);

      document.body.removeChild(outsideElement);
      vi.useRealTimers();
    });

    it('prevents immediate triggering on mount', () => {
      // Simulate a click event happening right when the hook is mounted
      vi.useFakeTimers();

      renderHook(() => useEnhancedOutsideClick(ref, onOutsideClick, true));

      // Try to trigger event before delay
      const outsideElement = document.createElement('div');
      document.body.appendChild(outsideElement);

      const mouseDownEvent = new MouseEvent('mousedown', {
        bubbles: true,
        cancelable: true,
      });
      Object.defineProperty(mouseDownEvent, 'target', {
        value: outsideElement,
        enumerable: true,
      });

      document.dispatchEvent(mouseDownEvent);

      // Should not trigger because timeout hasn't completed
      expect(onOutsideClick).not.toHaveBeenCalled();

      document.body.removeChild(outsideElement);
      vi.useRealTimers();
    });
  });

  describe('Cleanup', () => {
    it('removes event listener on unmount', () => {
      const { unmount } = renderHook(() => useEnhancedOutsideClick(ref, onOutsideClick, true));

      vi.useFakeTimers();
      vi.advanceTimersByTime(20);

      unmount();

      // Click outside after unmount
      const outsideElement = document.createElement('div');
      document.body.appendChild(outsideElement);

      const mouseDownEvent = new MouseEvent('mousedown', {
        bubbles: true,
        cancelable: true,
      });
      Object.defineProperty(mouseDownEvent, 'target', {
        value: outsideElement,
        enumerable: true,
      });

      document.dispatchEvent(mouseDownEvent);

      expect(onOutsideClick).not.toHaveBeenCalled();

      document.body.removeChild(outsideElement);
      vi.useRealTimers();
    });

    it('clears timeout on unmount', () => {
      vi.useFakeTimers();

      const { unmount } = renderHook(() => useEnhancedOutsideClick(ref, onOutsideClick, true));

      unmount();

      // Try to advance timer after unmount
      vi.advanceTimersByTime(20);

      // Click should not trigger anything
      const outsideElement = document.createElement('div');
      document.body.appendChild(outsideElement);

      const mouseDownEvent = new MouseEvent('mousedown', {
        bubbles: true,
        cancelable: true,
      });
      Object.defineProperty(mouseDownEvent, 'target', {
        value: outsideElement,
        enumerable: true,
      });

      document.dispatchEvent(mouseDownEvent);

      expect(onOutsideClick).not.toHaveBeenCalled();

      document.body.removeChild(outsideElement);
      vi.useRealTimers();
    });

    it('cleans up when dependencies change', () => {
      const newCallback = vi.fn();

      const { rerender } = renderHook(
        ({ callback }) => useEnhancedOutsideClick(ref, callback, true),
        { initialProps: { callback: onOutsideClick } }
      );

      vi.useFakeTimers();
      vi.advanceTimersByTime(20);

      // Change callback
      rerender({ callback: newCallback });
      vi.advanceTimersByTime(20);

      // Click outside
      const outsideElement = document.createElement('div');
      document.body.appendChild(outsideElement);

      const mouseDownEvent = new MouseEvent('mousedown', {
        bubbles: true,
        cancelable: true,
      });
      Object.defineProperty(mouseDownEvent, 'target', {
        value: outsideElement,
        enumerable: true,
      });

      document.dispatchEvent(mouseDownEvent);

      // New callback should be called, not old one
      expect(newCallback).toHaveBeenCalled();
      expect(onOutsideClick).not.toHaveBeenCalled();

      document.body.removeChild(outsideElement);
      vi.useRealTimers();
    });
  });

  describe('Edge Cases', () => {
    it('handles null ref gracefully', () => {
      const nullRef: RefObject<HTMLDivElement> = { current: null };

      renderHook(() => useEnhancedOutsideClick(nullRef, onOutsideClick, true));

      vi.useFakeTimers();
      vi.advanceTimersByTime(20);

      // Click anywhere
      const mouseDownEvent = new MouseEvent('mousedown', {
        bubbles: true,
        cancelable: true,
      });
      Object.defineProperty(mouseDownEvent, 'target', {
        value: document.body,
        enumerable: true,
      });

      document.dispatchEvent(mouseDownEvent);

      // Should call onOutsideClick since ref is null (no element to check)
      expect(onOutsideClick).toHaveBeenCalled();

      vi.useRealTimers();
    });

    it('handles ref changing from null to element', () => {
      const dynamicRef: RefObject<HTMLDivElement | null> = { current: null };

      const { rerender } = renderHook(() => useEnhancedOutsideClick(dynamicRef, onOutsideClick, true));

      vi.useFakeTimers();

      // Set ref to actual element
      const element = document.createElement('div');
      document.body.appendChild(element);
      dynamicRef.current = element;

      rerender();
      vi.advanceTimersByTime(20);

      // Click on the element
      const mouseDownEvent = new MouseEvent('mousedown', {
        bubbles: true,
        cancelable: true,
      });
      Object.defineProperty(mouseDownEvent, 'target', {
        value: element,
        enumerable: true,
      });

      document.dispatchEvent(mouseDownEvent);

      // Should not call onOutsideClick since we clicked inside
      expect(onOutsideClick).not.toHaveBeenCalled();

      document.body.removeChild(element);
      vi.useRealTimers();
    });

    it('handles multiple rapid clicks', () => {
      renderHook(() => useEnhancedOutsideClick(ref, onOutsideClick, true));

      vi.useFakeTimers();
      vi.advanceTimersByTime(20);

      const outsideElement = document.createElement('div');
      document.body.appendChild(outsideElement);

      // Click multiple times rapidly
      for (let i = 0; i < 5; i++) {
        const mouseDownEvent = new MouseEvent('mousedown', {
          bubbles: true,
          cancelable: true,
        });
        Object.defineProperty(mouseDownEvent, 'target', {
          value: outsideElement,
          enumerable: true,
        });

        document.dispatchEvent(mouseDownEvent);
      }

      // Should be called 5 times
      expect(onOutsideClick).toHaveBeenCalledTimes(5);

      document.body.removeChild(outsideElement);
      vi.useRealTimers();
    });

    it('works with deeply nested child elements', () => {
      const level1 = document.createElement('div');
      const level2 = document.createElement('div');
      const level3 = document.createElement('span');

      ref.current!.appendChild(level1);
      level1.appendChild(level2);
      level2.appendChild(level3);

      renderHook(() => useEnhancedOutsideClick(ref, onOutsideClick, true));

      vi.useFakeTimers();
      vi.advanceTimersByTime(20);

      // Click on deeply nested child
      const mouseDownEvent = new MouseEvent('mousedown', {
        bubbles: true,
        cancelable: true,
      });
      Object.defineProperty(mouseDownEvent, 'target', {
        value: level3,
        enumerable: true,
      });

      document.dispatchEvent(mouseDownEvent);

      // Should not call onOutsideClick
      expect(onOutsideClick).not.toHaveBeenCalled();

      vi.useRealTimers();
    });
  });
});
