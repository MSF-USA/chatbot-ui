import { renderHook } from '@testing-library/react';
import { describe, expect, it, vi, beforeEach, afterEach } from 'vitest';
import useModal from '@/lib/hooks/useModal';

describe('useModal', () => {
  let onClose: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    onClose = vi.fn();
    // Reset body overflow style
    document.body.style.overflow = '';
  });

  afterEach(() => {
    // Clean up body overflow style
    document.body.style.overflow = '';
    vi.clearAllMocks();
  });

  describe('Modal Ref', () => {
    it('returns a ref object', () => {
      const { result } = renderHook(() => useModal(true, onClose));

      expect(result.current).toBeDefined();
      expect(result.current).toHaveProperty('current');
    });

    it('ref starts as null', () => {
      const { result } = renderHook(() => useModal(true, onClose));

      expect(result.current.current).toBeNull();
    });
  });

  describe('Outside Click Behavior', () => {
    it('calls onClose when clicking outside modal', () => {
      vi.useFakeTimers();
      const { result } = renderHook(() => useModal(true, onClose));

      // Create a mock modal element
      const modalElement = document.createElement('div');
      document.body.appendChild(modalElement);
      result.current.current = modalElement;

      // Wait for the timeout in useModal
      vi.advanceTimersByTime(20);

      // Click outside the modal
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

      expect(onClose).toHaveBeenCalled();

      document.body.removeChild(outsideElement);
      vi.useRealTimers();
    });

    it('does not call onClose when clicking inside modal', () => {
      vi.useFakeTimers();
      const { result } = renderHook(() => useModal(true, onClose));

      // Create a mock modal element
      const modalElement = document.createElement('div');
      document.body.appendChild(modalElement);
      result.current.current = modalElement;

      vi.advanceTimersByTime(20);

      // Click inside the modal
      const mouseDownEvent = new MouseEvent('mousedown', {
        bubbles: true,
        cancelable: true,
      });
      Object.defineProperty(mouseDownEvent, 'target', {
        value: modalElement,
        enumerable: true,
      });

      document.dispatchEvent(mouseDownEvent);

      expect(onClose).not.toHaveBeenCalled();

      vi.useRealTimers();
    });

    it('respects preventOutsideClick option', () => {
      vi.useFakeTimers();
      const { result } = renderHook(() => useModal(true, onClose, true));

      // Create a mock modal element
      const modalElement = document.createElement('div');
      document.body.appendChild(modalElement);
      result.current.current = modalElement;

      vi.advanceTimersByTime(20);

      // Click outside the modal
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

      expect(onClose).not.toHaveBeenCalled();

      document.body.removeChild(outsideElement);
      vi.useRealTimers();
    });

    it('does not listen for clicks when modal is closed', () => {
      vi.useFakeTimers();
      renderHook(() => useModal(false, onClose));

      vi.advanceTimersByTime(20);

      // Click anywhere
      const mouseDownEvent = new MouseEvent('mousedown', {
        bubbles: true,
        cancelable: true,
      });

      document.dispatchEvent(mouseDownEvent);

      expect(onClose).not.toHaveBeenCalled();

      vi.useRealTimers();
    });
  });

  describe('Escape Key Behavior', () => {
    it('calls onClose when Escape key is pressed', () => {
      renderHook(() => useModal(true, onClose));

      const escapeEvent = new KeyboardEvent('keydown', {
        key: 'Escape',
        bubbles: true,
        cancelable: true,
      });

      document.dispatchEvent(escapeEvent);

      expect(onClose).toHaveBeenCalled();
    });

    it('does not call onClose for other keys', () => {
      renderHook(() => useModal(true, onClose));

      const enterEvent = new KeyboardEvent('keydown', {
        key: 'Enter',
        bubbles: true,
        cancelable: true,
      });

      document.dispatchEvent(enterEvent);

      expect(onClose).not.toHaveBeenCalled();
    });

    it('respects preventEscapeKey option', () => {
      renderHook(() => useModal(true, onClose, false, true));

      const escapeEvent = new KeyboardEvent('keydown', {
        key: 'Escape',
        bubbles: true,
        cancelable: true,
      });

      document.dispatchEvent(escapeEvent);

      expect(onClose).not.toHaveBeenCalled();
    });

    it('does not listen for Escape when modal is closed', () => {
      renderHook(() => useModal(false, onClose));

      const escapeEvent = new KeyboardEvent('keydown', {
        key: 'Escape',
        bubbles: true,
        cancelable: true,
      });

      document.dispatchEvent(escapeEvent);

      expect(onClose).not.toHaveBeenCalled();
    });
  });

  describe('Body Scroll Prevention', () => {
    it('sets body overflow to hidden when modal opens', () => {
      document.body.style.overflow = 'auto';

      renderHook(() => useModal(true, onClose));

      expect(document.body.style.overflow).toBe('hidden');
    });

    it('restores original overflow style when modal closes', () => {
      document.body.style.overflow = 'scroll';

      const { rerender, unmount } = renderHook(
        ({ isOpen }) => useModal(isOpen, onClose),
        { initialProps: { isOpen: true } }
      );

      expect(document.body.style.overflow).toBe('hidden');

      unmount();

      expect(document.body.style.overflow).toBe('scroll');
    });

    it('does not modify body overflow when modal is not open', () => {
      document.body.style.overflow = 'auto';

      renderHook(() => useModal(false, onClose));

      expect(document.body.style.overflow).toBe('auto');
    });

    it('handles empty initial overflow style', () => {
      document.body.style.overflow = '';

      const { unmount } = renderHook(() => useModal(true, onClose));

      expect(document.body.style.overflow).toBe('hidden');

      unmount();

      // Should restore to original (empty string gets interpreted as visible/empty)
      expect(document.body.style.overflow).toBeTruthy();
    });
  });

  describe('Cleanup', () => {
    it('removes event listeners on unmount', () => {
      const { unmount } = renderHook(() => useModal(true, onClose));

      unmount();

      // Try to trigger events after unmount
      const escapeEvent = new KeyboardEvent('keydown', {
        key: 'Escape',
        bubbles: true,
        cancelable: true,
      });

      document.dispatchEvent(escapeEvent);

      expect(onClose).not.toHaveBeenCalled();
    });

    it('clears timeout on unmount', () => {
      vi.useFakeTimers();

      const { unmount } = renderHook(() => useModal(true, onClose));

      unmount();

      // Advance timers to ensure timeout would have fired
      vi.advanceTimersByTime(20);

      // Click outside should not trigger anything
      const mouseDownEvent = new MouseEvent('mousedown', {
        bubbles: true,
        cancelable: true,
      });

      document.dispatchEvent(mouseDownEvent);

      expect(onClose).not.toHaveBeenCalled();

      vi.useRealTimers();
    });
  });

  describe('Dynamic Props', () => {
    it('updates behavior when isOpen changes', () => {
      const { rerender } = renderHook(
        ({ isOpen }) => useModal(isOpen, onClose),
        { initialProps: { isOpen: false } }
      );

      // Initially closed, Escape should not work
      let escapeEvent = new KeyboardEvent('keydown', {
        key: 'Escape',
        bubbles: true,
        cancelable: true,
      });
      document.dispatchEvent(escapeEvent);
      expect(onClose).not.toHaveBeenCalled();

      // Open the modal
      rerender({ isOpen: true });

      // Now Escape should work
      escapeEvent = new KeyboardEvent('keydown', {
        key: 'Escape',
        bubbles: true,
        cancelable: true,
      });
      document.dispatchEvent(escapeEvent);
      expect(onClose).toHaveBeenCalled();
    });

    it('calls new onClose callback when it changes', () => {
      const newOnClose = vi.fn();

      const { rerender } = renderHook(
        ({ callback }) => useModal(true, callback),
        { initialProps: { callback: onClose } }
      );

      // Update the callback
      rerender({ callback: newOnClose });

      const escapeEvent = new KeyboardEvent('keydown', {
        key: 'Escape',
        bubbles: true,
        cancelable: true,
      });
      document.dispatchEvent(escapeEvent);

      expect(newOnClose).toHaveBeenCalled();
      expect(onClose).not.toHaveBeenCalled();
    });
  });

  describe('Edge Cases', () => {
    it('handles rapid open/close cycles', () => {
      const { rerender } = renderHook(
        ({ isOpen }) => useModal(isOpen, onClose),
        { initialProps: { isOpen: true } }
      );

      rerender({ isOpen: false });
      rerender({ isOpen: true });
      rerender({ isOpen: false });
      rerender({ isOpen: true });

      const escapeEvent = new KeyboardEvent('keydown', {
        key: 'Escape',
        bubbles: true,
        cancelable: true,
      });
      document.dispatchEvent(escapeEvent);

      expect(onClose).toHaveBeenCalled();
    });

    it('works with both prevention options enabled', () => {
      vi.useFakeTimers();
      renderHook(() => useModal(true, onClose, true, true));

      // Try Escape
      const escapeEvent = new KeyboardEvent('keydown', {
        key: 'Escape',
        bubbles: true,
        cancelable: true,
      });
      document.dispatchEvent(escapeEvent);

      // Try outside click
      vi.advanceTimersByTime(20);

      const mouseDownEvent = new MouseEvent('mousedown', {
        bubbles: true,
        cancelable: true,
      });
      document.dispatchEvent(mouseDownEvent);

      expect(onClose).not.toHaveBeenCalled();

      vi.useRealTimers();
    });

    it('handles null ref gracefully', () => {
      vi.useFakeTimers();
      const { result } = renderHook(() => useModal(true, onClose));

      // Ref is null by default
      expect(result.current.current).toBeNull();

      // Should not crash when events are triggered
      vi.advanceTimersByTime(20);

      const mouseDownEvent = new MouseEvent('mousedown', {
        bubbles: true,
        cancelable: true,
      });
      document.dispatchEvent(mouseDownEvent);

      // onClose might be called since there's no element to check
      vi.useRealTimers();
    });
  });
});
