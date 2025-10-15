import { useCallback } from 'react';

export interface KeyboardNavItem {
  id: string;
  onClick: () => void;
}

export interface UseDropdownKeyboardNavParams {
  isOpen: boolean;
  items: KeyboardNavItem[];
  selectedIndex: number;
  setSelectedIndex: (index: number | ((prev: number) => number)) => void;
  filterQuery: string;
  setFilterQuery: (query: string) => void;
  closeDropdown: () => void;
  filterInputRef?: React.RefObject<HTMLInputElement>;
  onCloseModals?: () => void;
}

/**
 * Custom hook for managing keyboard navigation in dropdown menus
 * Handles ArrowUp, ArrowDown, Enter, Escape, and auto-focus on typing
 */
export const useDropdownKeyboardNav = ({
  isOpen,
  items,
  selectedIndex,
  setSelectedIndex,
  filterQuery,
  setFilterQuery,
  closeDropdown,
  filterInputRef,
  onCloseModals,
}: UseDropdownKeyboardNavParams) => {
  const handleKeyDown = useCallback(
    (event: React.KeyboardEvent) => {
      if (!isOpen) return;

      switch (event.key) {
        case 'ArrowDown':
          event.preventDefault();
          setSelectedIndex((prevIndex) =>
            prevIndex < items.length - 1 ? prevIndex + 1 : 0,
          );
          break;

        case 'ArrowUp':
          event.preventDefault();
          setSelectedIndex((prevIndex) =>
            prevIndex > 0 ? prevIndex - 1 : items.length - 1,
          );
          break;

        case 'Enter':
          event.preventDefault();
          if (items[selectedIndex]) {
            items[selectedIndex].onClick();
          }
          break;

        case 'Escape':
          event.preventDefault();
          if (filterQuery) {
            // Clear filter first
            setFilterQuery('');
            setSelectedIndex(0);
          } else {
            // Close dropdown and all modals
            closeDropdown();
            onCloseModals?.();
          }
          break;

        default:
          // Auto-focus filter input on any printable character
          if (
            event.key.length === 1 &&
            !event.ctrlKey &&
            !event.altKey &&
            !event.metaKey
          ) {
            filterInputRef?.current?.focus();
          }
          break;
      }
    },
    [
      isOpen,
      items,
      selectedIndex,
      setSelectedIndex,
      filterQuery,
      setFilterQuery,
      closeDropdown,
      onCloseModals,
      filterInputRef,
    ],
  );

  return { handleKeyDown };
};
