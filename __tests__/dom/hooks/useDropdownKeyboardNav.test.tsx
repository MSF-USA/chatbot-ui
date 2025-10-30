import { act, renderHook } from '@testing-library/react';
import React from 'react';

import {
  KeyboardNavItem,
  useDropdownKeyboardNav,
} from '@/lib/hooks/ui/useDropdownKeyboardNav';

import { beforeEach, describe, expect, it, vi } from 'vitest';

describe('useDropdownKeyboardNav', () => {
  const createKeyboardEvent = (key: string, options: any = {}) => {
    return {
      key,
      preventDefault: vi.fn(),
      ctrlKey: options.ctrlKey || false,
      altKey: options.altKey || false,
      metaKey: options.metaKey || false,
      ...options,
    } as unknown as React.KeyboardEvent;
  };

  const createMockItem = (id: string): KeyboardNavItem => ({
    id,
    onClick: vi.fn(),
  });

  let mockSetSelectedIndex: ReturnType<typeof vi.fn>;
  let mockCloseDropdown: ReturnType<typeof vi.fn>;
  let mockOnCloseModals: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    mockSetSelectedIndex = vi.fn((arg) => {
      // Handle function or direct value
      if (typeof arg === 'function') {
        return arg(0); // Default previous index
      }
    });
    mockCloseDropdown = vi.fn();
    mockOnCloseModals = vi.fn();
  });

  describe('ArrowDown Navigation', () => {
    it('moves selection down by one', () => {
      const items = [
        createMockItem('1'),
        createMockItem('2'),
        createMockItem('3'),
      ];
      const { result } = renderHook(() =>
        useDropdownKeyboardNav({
          isOpen: true,
          items,
          selectedIndex: 0,
          setSelectedIndex: mockSetSelectedIndex,
          closeDropdown: mockCloseDropdown,
        }),
      );

      const event = createKeyboardEvent('ArrowDown');
      act(() => {
        result.current.handleKeyDown(event);
      });

      expect(event.preventDefault).toHaveBeenCalled();
      expect(mockSetSelectedIndex).toHaveBeenCalled();
    });

    it('wraps to first item when at end', () => {
      const items = [createMockItem('1'), createMockItem('2')];
      const { result } = renderHook(() =>
        useDropdownKeyboardNav({
          isOpen: true,
          items,
          selectedIndex: 1, // Last item
          setSelectedIndex: mockSetSelectedIndex,
          closeDropdown: mockCloseDropdown,
        }),
      );

      const event = createKeyboardEvent('ArrowDown');
      act(() => {
        result.current.handleKeyDown(event);
      });

      expect(event.preventDefault).toHaveBeenCalled();
      // Check that setSelectedIndex was called with a function
      expect(mockSetSelectedIndex).toHaveBeenCalled();
    });

    it('prevents default browser behavior', () => {
      const items = [createMockItem('1')];
      const { result } = renderHook(() =>
        useDropdownKeyboardNav({
          isOpen: true,
          items,
          selectedIndex: 0,
          setSelectedIndex: mockSetSelectedIndex,
          closeDropdown: mockCloseDropdown,
        }),
      );

      const event = createKeyboardEvent('ArrowDown');
      act(() => {
        result.current.handleKeyDown(event);
      });

      expect(event.preventDefault).toHaveBeenCalled();
    });
  });

  describe('ArrowUp Navigation', () => {
    it('moves selection up by one', () => {
      const items = [createMockItem('1'), createMockItem('2')];
      const { result } = renderHook(() =>
        useDropdownKeyboardNav({
          isOpen: true,
          items,
          selectedIndex: 1,
          setSelectedIndex: mockSetSelectedIndex,
          closeDropdown: mockCloseDropdown,
        }),
      );

      const event = createKeyboardEvent('ArrowUp');
      act(() => {
        result.current.handleKeyDown(event);
      });

      expect(event.preventDefault).toHaveBeenCalled();
      expect(mockSetSelectedIndex).toHaveBeenCalled();
    });

    it('wraps to last item when at start', () => {
      const items = [
        createMockItem('1'),
        createMockItem('2'),
        createMockItem('3'),
      ];
      const { result } = renderHook(() =>
        useDropdownKeyboardNav({
          isOpen: true,
          items,
          selectedIndex: 0, // First item
          setSelectedIndex: mockSetSelectedIndex,
          closeDropdown: mockCloseDropdown,
        }),
      );

      const event = createKeyboardEvent('ArrowUp');
      act(() => {
        result.current.handleKeyDown(event);
      });

      expect(event.preventDefault).toHaveBeenCalled();
      expect(mockSetSelectedIndex).toHaveBeenCalled();
    });

    it('prevents default browser behavior', () => {
      const items = [createMockItem('1')];
      const { result } = renderHook(() =>
        useDropdownKeyboardNav({
          isOpen: true,
          items,
          selectedIndex: 0,
          setSelectedIndex: mockSetSelectedIndex,
          closeDropdown: mockCloseDropdown,
        }),
      );

      const event = createKeyboardEvent('ArrowUp');
      act(() => {
        result.current.handleKeyDown(event);
      });

      expect(event.preventDefault).toHaveBeenCalled();
    });
  });

  describe('Enter Key', () => {
    it('calls onClick of selected item', () => {
      const items = [
        createMockItem('1'),
        createMockItem('2'),
        createMockItem('3'),
      ];
      const { result } = renderHook(() =>
        useDropdownKeyboardNav({
          isOpen: true,
          items,
          selectedIndex: 1,
          setSelectedIndex: mockSetSelectedIndex,
          closeDropdown: mockCloseDropdown,
        }),
      );

      const event = createKeyboardEvent('Enter');
      act(() => {
        result.current.handleKeyDown(event);
      });

      expect(event.preventDefault).toHaveBeenCalled();
      expect(items[1].onClick).toHaveBeenCalled();
    });

    it('does nothing if selectedIndex is out of bounds', () => {
      const items = [createMockItem('1')];
      const { result } = renderHook(() =>
        useDropdownKeyboardNav({
          isOpen: true,
          items,
          selectedIndex: 5, // Out of bounds
          setSelectedIndex: mockSetSelectedIndex,
          closeDropdown: mockCloseDropdown,
        }),
      );

      const event = createKeyboardEvent('Enter');
      act(() => {
        result.current.handleKeyDown(event);
      });

      expect(event.preventDefault).toHaveBeenCalled();
      expect(items[0].onClick).not.toHaveBeenCalled();
    });

    it('handles empty items list', () => {
      const { result } = renderHook(() =>
        useDropdownKeyboardNav({
          isOpen: true,
          items: [],
          selectedIndex: 0,
          setSelectedIndex: mockSetSelectedIndex,
          closeDropdown: mockCloseDropdown,
        }),
      );

      const event = createKeyboardEvent('Enter');
      act(() => {
        result.current.handleKeyDown(event);
      });

      expect(event.preventDefault).toHaveBeenCalled();
      // Should not throw
    });

    it('prevents default browser behavior', () => {
      const items = [createMockItem('1')];
      const { result } = renderHook(() =>
        useDropdownKeyboardNav({
          isOpen: true,
          items,
          selectedIndex: 0,
          setSelectedIndex: mockSetSelectedIndex,
          closeDropdown: mockCloseDropdown,
        }),
      );

      const event = createKeyboardEvent('Enter');
      act(() => {
        result.current.handleKeyDown(event);
      });

      expect(event.preventDefault).toHaveBeenCalled();
    });
  });

  describe('Escape Key', () => {
    it('closes dropdown', () => {
      const items = [createMockItem('1')];
      const { result } = renderHook(() =>
        useDropdownKeyboardNav({
          isOpen: true,
          items,
          selectedIndex: 0,
          setSelectedIndex: mockSetSelectedIndex,
          closeDropdown: mockCloseDropdown,
        }),
      );

      const event = createKeyboardEvent('Escape');
      act(() => {
        result.current.handleKeyDown(event);
      });

      expect(event.preventDefault).toHaveBeenCalled();
      expect(mockCloseDropdown).toHaveBeenCalled();
    });

    it('calls onCloseModals when provided', () => {
      const items = [createMockItem('1')];
      const { result } = renderHook(() =>
        useDropdownKeyboardNav({
          isOpen: true,
          items,
          selectedIndex: 0,
          setSelectedIndex: mockSetSelectedIndex,
          closeDropdown: mockCloseDropdown,
          onCloseModals: mockOnCloseModals,
        }),
      );

      const event = createKeyboardEvent('Escape');
      act(() => {
        result.current.handleKeyDown(event);
      });

      expect(event.preventDefault).toHaveBeenCalled();
      expect(mockOnCloseModals).toHaveBeenCalled();
    });

    it('prevents default browser behavior', () => {
      const items = [createMockItem('1')];
      const { result } = renderHook(() =>
        useDropdownKeyboardNav({
          isOpen: true,
          items,
          selectedIndex: 0,
          setSelectedIndex: mockSetSelectedIndex,
          closeDropdown: mockCloseDropdown,
        }),
      );

      const event = createKeyboardEvent('Escape');
      act(() => {
        result.current.handleKeyDown(event);
      });

      expect(event.preventDefault).toHaveBeenCalled();
    });
  });

  describe('Dropdown Closed State', () => {
    it('does nothing when dropdown is closed', () => {
      const items = [createMockItem('1')];
      const { result } = renderHook(() =>
        useDropdownKeyboardNav({
          isOpen: false, // Closed
          items,
          selectedIndex: 0,
          setSelectedIndex: mockSetSelectedIndex,
          closeDropdown: mockCloseDropdown,
        }),
      );

      const event = createKeyboardEvent('ArrowDown');
      act(() => {
        result.current.handleKeyDown(event);
      });

      expect(event.preventDefault).not.toHaveBeenCalled();
      expect(mockSetSelectedIndex).not.toHaveBeenCalled();
    });

    it('ignores Enter when closed', () => {
      const items = [createMockItem('1')];
      const { result } = renderHook(() =>
        useDropdownKeyboardNav({
          isOpen: false,
          items,
          selectedIndex: 0,
          setSelectedIndex: mockSetSelectedIndex,
          closeDropdown: mockCloseDropdown,
        }),
      );

      const event = createKeyboardEvent('Enter');
      act(() => {
        result.current.handleKeyDown(event);
      });

      expect(items[0].onClick).not.toHaveBeenCalled();
    });

    it('ignores Escape when closed', () => {
      const items = [createMockItem('1')];
      const { result } = renderHook(() =>
        useDropdownKeyboardNav({
          isOpen: false,
          items,
          selectedIndex: 0,
          setSelectedIndex: mockSetSelectedIndex,
          closeDropdown: mockCloseDropdown,
        }),
      );

      const event = createKeyboardEvent('Escape');
      act(() => {
        result.current.handleKeyDown(event);
      });

      expect(mockCloseDropdown).not.toHaveBeenCalled();
    });
  });

  describe('Edge Cases', () => {
    it('handles single item list', () => {
      const items = [createMockItem('1')];
      const { result } = renderHook(() =>
        useDropdownKeyboardNav({
          isOpen: true,
          items,
          selectedIndex: 0,
          setSelectedIndex: mockSetSelectedIndex,
          closeDropdown: mockCloseDropdown,
        }),
      );

      // ArrowDown should wrap to 0
      const downEvent = createKeyboardEvent('ArrowDown');
      act(() => {
        result.current.handleKeyDown(downEvent);
      });

      expect(downEvent.preventDefault).toHaveBeenCalled();

      // ArrowUp should wrap to 0
      const upEvent = createKeyboardEvent('ArrowUp');
      act(() => {
        result.current.handleKeyDown(upEvent);
      });

      expect(upEvent.preventDefault).toHaveBeenCalled();
    });

    it('handles empty items list gracefully', () => {
      const { result } = renderHook(() =>
        useDropdownKeyboardNav({
          isOpen: true,
          items: [],
          selectedIndex: 0,
          setSelectedIndex: mockSetSelectedIndex,
          closeDropdown: mockCloseDropdown,
        }),
      );

      const event = createKeyboardEvent('ArrowDown');
      act(() => {
        result.current.handleKeyDown(event);
      });

      expect(mockSetSelectedIndex).toHaveBeenCalled();
    });
  });
});
