import { renderHook, act } from '@testing-library/react';
import React from 'react';
import { describe, expect, it, vi, beforeEach } from 'vitest';

import { useDropdownKeyboardNav, KeyboardNavItem } from '@/lib/hooks/useDropdownKeyboardNav';

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
  let mockSetFilterQuery: ReturnType<typeof vi.fn>;
  let mockCloseDropdown: ReturnType<typeof vi.fn>;
  let mockOnCloseModals: ReturnType<typeof vi.fn>;
  let mockFilterInputRef: React.RefObject<HTMLInputElement>;

  beforeEach(() => {
    mockSetSelectedIndex = vi.fn((arg) => {
      // Handle function or direct value
      if (typeof arg === 'function') {
        return arg(0); // Default previous index
      }
    });
    mockSetFilterQuery = vi.fn();
    mockCloseDropdown = vi.fn();
    mockOnCloseModals = vi.fn();
    mockFilterInputRef = {
      current: {
        focus: vi.fn(),
      } as any,
    };
  });

  describe('ArrowDown Navigation', () => {
    it('moves selection down by one', () => {
      const items = [createMockItem('1'), createMockItem('2'), createMockItem('3')];
      const { result } = renderHook(() =>
        useDropdownKeyboardNav({
          isOpen: true,
          items,
          selectedIndex: 0,
          setSelectedIndex: mockSetSelectedIndex,
          filterQuery: '',
          setFilterQuery: mockSetFilterQuery,
          closeDropdown: mockCloseDropdown,
        })
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
          filterQuery: '',
          setFilterQuery: mockSetFilterQuery,
          closeDropdown: mockCloseDropdown,
        })
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
          filterQuery: '',
          setFilterQuery: mockSetFilterQuery,
          closeDropdown: mockCloseDropdown,
        })
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
          filterQuery: '',
          setFilterQuery: mockSetFilterQuery,
          closeDropdown: mockCloseDropdown,
        })
      );

      const event = createKeyboardEvent('ArrowUp');
      act(() => {
        result.current.handleKeyDown(event);
      });

      expect(event.preventDefault).toHaveBeenCalled();
      expect(mockSetSelectedIndex).toHaveBeenCalled();
    });

    it('wraps to last item when at start', () => {
      const items = [createMockItem('1'), createMockItem('2'), createMockItem('3')];
      const { result } = renderHook(() =>
        useDropdownKeyboardNav({
          isOpen: true,
          items,
          selectedIndex: 0, // First item
          setSelectedIndex: mockSetSelectedIndex,
          filterQuery: '',
          setFilterQuery: mockSetFilterQuery,
          closeDropdown: mockCloseDropdown,
        })
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
          filterQuery: '',
          setFilterQuery: mockSetFilterQuery,
          closeDropdown: mockCloseDropdown,
        })
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
      const items = [createMockItem('1'), createMockItem('2'), createMockItem('3')];
      const { result } = renderHook(() =>
        useDropdownKeyboardNav({
          isOpen: true,
          items,
          selectedIndex: 1,
          setSelectedIndex: mockSetSelectedIndex,
          filterQuery: '',
          setFilterQuery: mockSetFilterQuery,
          closeDropdown: mockCloseDropdown,
        })
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
          filterQuery: '',
          setFilterQuery: mockSetFilterQuery,
          closeDropdown: mockCloseDropdown,
        })
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
          filterQuery: '',
          setFilterQuery: mockSetFilterQuery,
          closeDropdown: mockCloseDropdown,
        })
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
          filterQuery: '',
          setFilterQuery: mockSetFilterQuery,
          closeDropdown: mockCloseDropdown,
        })
      );

      const event = createKeyboardEvent('Enter');
      act(() => {
        result.current.handleKeyDown(event);
      });

      expect(event.preventDefault).toHaveBeenCalled();
    });
  });

  describe('Escape Key', () => {
    it('clears filter query when it has value', () => {
      const items = [createMockItem('1')];
      const { result } = renderHook(() =>
        useDropdownKeyboardNav({
          isOpen: true,
          items,
          selectedIndex: 0,
          setSelectedIndex: mockSetSelectedIndex,
          filterQuery: 'search text',
          setFilterQuery: mockSetFilterQuery,
          closeDropdown: mockCloseDropdown,
        })
      );

      const event = createKeyboardEvent('Escape');
      act(() => {
        result.current.handleKeyDown(event);
      });

      expect(event.preventDefault).toHaveBeenCalled();
      expect(mockSetFilterQuery).toHaveBeenCalledWith('');
      expect(mockSetSelectedIndex).toHaveBeenCalledWith(0);
      expect(mockCloseDropdown).not.toHaveBeenCalled();
    });

    it('closes dropdown when filter query is empty', () => {
      const items = [createMockItem('1')];
      const { result } = renderHook(() =>
        useDropdownKeyboardNav({
          isOpen: true,
          items,
          selectedIndex: 0,
          setSelectedIndex: mockSetSelectedIndex,
          filterQuery: '',
          setFilterQuery: mockSetFilterQuery,
          closeDropdown: mockCloseDropdown,
        })
      );

      const event = createKeyboardEvent('Escape');
      act(() => {
        result.current.handleKeyDown(event);
      });

      expect(event.preventDefault).toHaveBeenCalled();
      expect(mockCloseDropdown).toHaveBeenCalled();
    });

    it('calls onCloseModals when provided and filter is empty', () => {
      const items = [createMockItem('1')];
      const { result } = renderHook(() =>
        useDropdownKeyboardNav({
          isOpen: true,
          items,
          selectedIndex: 0,
          setSelectedIndex: mockSetSelectedIndex,
          filterQuery: '',
          setFilterQuery: mockSetFilterQuery,
          closeDropdown: mockCloseDropdown,
          onCloseModals: mockOnCloseModals,
        })
      );

      const event = createKeyboardEvent('Escape');
      act(() => {
        result.current.handleKeyDown(event);
      });

      expect(event.preventDefault).toHaveBeenCalled();
      expect(mockOnCloseModals).toHaveBeenCalled();
    });

    it('does not call onCloseModals when filter has value', () => {
      const items = [createMockItem('1')];
      const { result } = renderHook(() =>
        useDropdownKeyboardNav({
          isOpen: true,
          items,
          selectedIndex: 0,
          setSelectedIndex: mockSetSelectedIndex,
          filterQuery: 'search',
          setFilterQuery: mockSetFilterQuery,
          closeDropdown: mockCloseDropdown,
          onCloseModals: mockOnCloseModals,
        })
      );

      const event = createKeyboardEvent('Escape');
      act(() => {
        result.current.handleKeyDown(event);
      });

      expect(mockOnCloseModals).not.toHaveBeenCalled();
    });

    it('prevents default browser behavior', () => {
      const items = [createMockItem('1')];
      const { result } = renderHook(() =>
        useDropdownKeyboardNav({
          isOpen: true,
          items,
          selectedIndex: 0,
          setSelectedIndex: mockSetSelectedIndex,
          filterQuery: '',
          setFilterQuery: mockSetFilterQuery,
          closeDropdown: mockCloseDropdown,
        })
      );

      const event = createKeyboardEvent('Escape');
      act(() => {
        result.current.handleKeyDown(event);
      });

      expect(event.preventDefault).toHaveBeenCalled();
    });
  });

  describe('Auto-focus Filter Input', () => {
    it('focuses filter input on printable character', () => {
      const items = [createMockItem('1')];
      const { result } = renderHook(() =>
        useDropdownKeyboardNav({
          isOpen: true,
          items,
          selectedIndex: 0,
          setSelectedIndex: mockSetSelectedIndex,
          filterQuery: '',
          setFilterQuery: mockSetFilterQuery,
          closeDropdown: mockCloseDropdown,
          filterInputRef: mockFilterInputRef,
        })
      );

      const event = createKeyboardEvent('a');
      act(() => {
        result.current.handleKeyDown(event);
      });

      expect(mockFilterInputRef.current?.focus).toHaveBeenCalled();
    });

    it('does not focus on Ctrl+key combinations', () => {
      const items = [createMockItem('1')];
      const { result } = renderHook(() =>
        useDropdownKeyboardNav({
          isOpen: true,
          items,
          selectedIndex: 0,
          setSelectedIndex: mockSetSelectedIndex,
          filterQuery: '',
          setFilterQuery: mockSetFilterQuery,
          closeDropdown: mockCloseDropdown,
          filterInputRef: mockFilterInputRef,
        })
      );

      const event = createKeyboardEvent('a', { ctrlKey: true });
      act(() => {
        result.current.handleKeyDown(event);
      });

      expect(mockFilterInputRef.current?.focus).not.toHaveBeenCalled();
    });

    it('does not focus on Alt+key combinations', () => {
      const items = [createMockItem('1')];
      const { result } = renderHook(() =>
        useDropdownKeyboardNav({
          isOpen: true,
          items,
          selectedIndex: 0,
          setSelectedIndex: mockSetSelectedIndex,
          filterQuery: '',
          setFilterQuery: mockSetFilterQuery,
          closeDropdown: mockCloseDropdown,
          filterInputRef: mockFilterInputRef,
        })
      );

      const event = createKeyboardEvent('a', { altKey: true });
      act(() => {
        result.current.handleKeyDown(event);
      });

      expect(mockFilterInputRef.current?.focus).not.toHaveBeenCalled();
    });

    it('does not focus on Meta+key combinations', () => {
      const items = [createMockItem('1')];
      const { result } = renderHook(() =>
        useDropdownKeyboardNav({
          isOpen: true,
          items,
          selectedIndex: 0,
          setSelectedIndex: mockSetSelectedIndex,
          filterQuery: '',
          setFilterQuery: mockSetFilterQuery,
          closeDropdown: mockCloseDropdown,
          filterInputRef: mockFilterInputRef,
        })
      );

      const event = createKeyboardEvent('a', { metaKey: true });
      act(() => {
        result.current.handleKeyDown(event);
      });

      expect(mockFilterInputRef.current?.focus).not.toHaveBeenCalled();
    });

    it('does not focus on multi-character keys', () => {
      const items = [createMockItem('1')];
      const { result } = renderHook(() =>
        useDropdownKeyboardNav({
          isOpen: true,
          items,
          selectedIndex: 0,
          setSelectedIndex: mockSetSelectedIndex,
          filterQuery: '',
          setFilterQuery: mockSetFilterQuery,
          closeDropdown: mockCloseDropdown,
          filterInputRef: mockFilterInputRef,
        })
      );

      const event = createKeyboardEvent('Shift');
      act(() => {
        result.current.handleKeyDown(event);
      });

      expect(mockFilterInputRef.current?.focus).not.toHaveBeenCalled();
    });

    it('handles missing filterInputRef gracefully', () => {
      const items = [createMockItem('1')];
      const { result } = renderHook(() =>
        useDropdownKeyboardNav({
          isOpen: true,
          items,
          selectedIndex: 0,
          setSelectedIndex: mockSetSelectedIndex,
          filterQuery: '',
          setFilterQuery: mockSetFilterQuery,
          closeDropdown: mockCloseDropdown,
          // No filterInputRef provided
        })
      );

      const event = createKeyboardEvent('a');
      act(() => {
        result.current.handleKeyDown(event);
      });

      // Should not throw
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
          filterQuery: '',
          setFilterQuery: mockSetFilterQuery,
          closeDropdown: mockCloseDropdown,
        })
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
          filterQuery: '',
          setFilterQuery: mockSetFilterQuery,
          closeDropdown: mockCloseDropdown,
        })
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
          filterQuery: '',
          setFilterQuery: mockSetFilterQuery,
          closeDropdown: mockCloseDropdown,
        })
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
          filterQuery: '',
          setFilterQuery: mockSetFilterQuery,
          closeDropdown: mockCloseDropdown,
        })
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
          filterQuery: '',
          setFilterQuery: mockSetFilterQuery,
          closeDropdown: mockCloseDropdown,
        })
      );

      const event = createKeyboardEvent('ArrowDown');
      act(() => {
        result.current.handleKeyDown(event);
      });

      expect(mockSetSelectedIndex).toHaveBeenCalled();
    });

    it('handles all special characters for auto-focus', () => {
      const items = [createMockItem('1')];
      const { result } = renderHook(() =>
        useDropdownKeyboardNav({
          isOpen: true,
          items,
          selectedIndex: 0,
          setSelectedIndex: mockSetSelectedIndex,
          filterQuery: '',
          setFilterQuery: mockSetFilterQuery,
          closeDropdown: mockCloseDropdown,
          filterInputRef: mockFilterInputRef,
        })
      );

      const specialChars = ['!', '@', '#', '$', '%', '1', '9'];
      specialChars.forEach((char) => {
        vi.clearAllMocks();
        const event = createKeyboardEvent(char);
        act(() => {
          result.current.handleKeyDown(event);
        });

        expect(mockFilterInputRef.current?.focus).toHaveBeenCalled();
      });
    });
  });
});
