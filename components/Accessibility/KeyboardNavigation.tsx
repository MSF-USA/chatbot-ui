/**
 * Keyboard Navigation Components
 *
 * Enhanced keyboard navigation support with arrow keys, shortcuts,
 * and comprehensive WCAG compliance for all interactive elements.
 */
import React, { useCallback, useEffect, useRef, useState } from 'react';

import { useTranslation } from 'next-i18next';

import { useFocusManagement } from '@/hooks/useFocusManagement';

/**
 * Keyboard navigation directions
 */
export enum NavigationDirection {
  UP = 'ArrowUp',
  DOWN = 'ArrowDown',
  LEFT = 'ArrowLeft',
  RIGHT = 'ArrowRight',
  HOME = 'Home',
  END = 'End',
  PAGE_UP = 'PageUp',
  PAGE_DOWN = 'PageDown',
}

/**
 * Navigation behavior configuration
 */
export interface NavigationConfig {
  wrap?: boolean;
  orientation?: 'horizontal' | 'vertical' | 'both';
  preventDefaultScroll?: boolean;
  selector?: string;
  onNavigate?: (element: HTMLElement, direction: NavigationDirection) => void;
  onActivate?: (element: HTMLElement) => void;
}

/**
 * Keyboard Navigation Hook
 */
export function useKeyboardNavigation(
  containerRef: React.RefObject<HTMLElement>,
  config: NavigationConfig = {},
) {
  const {
    wrap = true,
    orientation = 'both',
    preventDefaultScroll = true,
    selector = '[tabindex]:not([tabindex="-1"]), button:not([disabled]), a[href], input:not([disabled]), select:not([disabled]), textarea:not([disabled])',
    onNavigate,
    onActivate,
  } = config;

  const { getFocusableElements, focusElement } = useFocusManagement();
  const [activeIndex, setActiveIndex] = useState(0);

  /**
   * Get navigable elements within container
   */
  const getNavigableElements = useCallback(() => {
    if (!containerRef.current) return [];

    const elements = Array.from(
      containerRef.current.querySelectorAll(selector),
    ) as HTMLElement[];

    return elements.filter((element) => {
      const style = window.getComputedStyle(element);
      return style.display !== 'none' && style.visibility !== 'hidden';
    });
  }, [containerRef, selector]);

  /**
   * Navigate to specific index
   */
  const navigateToIndex = useCallback(
    (index: number) => {
      const elements = getNavigableElements();
      if (elements.length === 0) return false;

      let targetIndex = index;

      if (wrap) {
        targetIndex =
          ((index % elements.length) + elements.length) % elements.length;
      } else {
        targetIndex = Math.max(0, Math.min(index, elements.length - 1));
      }

      const targetElement = elements[targetIndex];
      if (targetElement) {
        setActiveIndex(targetIndex);
        focusElement(targetElement);
        onNavigate?.(targetElement, NavigationDirection.DOWN); // Generic direction
        return true;
      }

      return false;
    },
    [getNavigableElements, wrap, focusElement, onNavigate],
  );

  /**
   * Navigate by direction
   */
  const navigate = useCallback(
    (direction: NavigationDirection) => {
      const elements = getNavigableElements();
      if (elements.length === 0) return false;

      const currentElement = document.activeElement as HTMLElement;
      const currentIndex = elements.indexOf(currentElement);

      let newIndex = currentIndex;

      switch (direction) {
        case NavigationDirection.UP:
          if (orientation === 'vertical' || orientation === 'both') {
            newIndex = currentIndex - 1;
          }
          break;

        case NavigationDirection.DOWN:
          if (orientation === 'vertical' || orientation === 'both') {
            newIndex = currentIndex + 1;
          }
          break;

        case NavigationDirection.LEFT:
          if (orientation === 'horizontal' || orientation === 'both') {
            newIndex = currentIndex - 1;
          }
          break;

        case NavigationDirection.RIGHT:
          if (orientation === 'horizontal' || orientation === 'both') {
            newIndex = currentIndex + 1;
          }
          break;

        case NavigationDirection.HOME:
          newIndex = 0;
          break;

        case NavigationDirection.END:
          newIndex = elements.length - 1;
          break;

        case NavigationDirection.PAGE_UP:
          newIndex = Math.max(0, currentIndex - 10);
          break;

        case NavigationDirection.PAGE_DOWN:
          newIndex = Math.min(elements.length - 1, currentIndex + 10);
          break;
      }

      return navigateToIndex(newIndex);
    },
    [getNavigableElements, orientation, navigateToIndex],
  );

  /**
   * Handle keyboard events
   */
  const handleKeyDown = useCallback(
    (event: KeyboardEvent) => {
      const direction = event.key as NavigationDirection;

      if (Object.values(NavigationDirection).includes(direction)) {
        if (preventDefaultScroll) {
          event.preventDefault();
        }

        navigate(direction);
      } else if (event.key === 'Enter' || event.key === ' ') {
        const activeElement = document.activeElement as HTMLElement;
        if (activeElement) {
          event.preventDefault();
          onActivate?.(activeElement);

          // Trigger click for buttons and links
          if (
            activeElement.tagName === 'BUTTON' ||
            activeElement.tagName === 'A'
          ) {
            activeElement.click();
          }
        }
      }
    },
    [navigate, preventDefaultScroll, onActivate],
  );

  /**
   * Set up keyboard event listeners
   */
  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    container.addEventListener('keydown', handleKeyDown);

    return () => {
      container.removeEventListener('keydown', handleKeyDown);
    };
  }, [containerRef, handleKeyDown]);

  return {
    navigate,
    navigateToIndex,
    activeIndex,
    getNavigableElements,
  };
}

/**
 * Menu Navigation Component
 */
interface MenuNavigationProps {
  children: React.ReactNode;
  orientation?: 'horizontal' | 'vertical';
  wrap?: boolean;
  className?: string;
  role?: string;
  ariaLabel?: string;
  onItemSelect?: (item: HTMLElement) => void;
}

export const MenuNavigation: React.FC<MenuNavigationProps> = ({
  children,
  orientation = 'vertical',
  wrap = true,
  className = '',
  role = 'menu',
  ariaLabel,
  onItemSelect,
}) => {
  const { t } = useTranslation('accessibility');
  const containerRef = useRef<HTMLDivElement>(null);

  const { navigate } = useKeyboardNavigation(containerRef, {
    orientation,
    wrap,
    selector:
      '[role="menuitem"], [role="menuitemcheckbox"], [role="menuitemradio"]',
    onActivate: onItemSelect,
  });

  return (
    <div
      ref={containerRef}
      className={`menu-navigation ${className}`}
      role={role}
      aria-label={
        ariaLabel ? t(ariaLabel, { defaultValue: ariaLabel }) : undefined
      }
      aria-orientation={orientation}
      tabIndex={-1}
    >
      {children}
    </div>
  );
};

/**
 * Toolbar Navigation Component
 */
interface ToolbarNavigationProps {
  children: React.ReactNode;
  orientation?: 'horizontal' | 'vertical';
  className?: string;
  ariaLabel?: string;
}

export const ToolbarNavigation: React.FC<ToolbarNavigationProps> = ({
  children,
  orientation = 'horizontal',
  className = '',
  ariaLabel,
}) => {
  const { t } = useTranslation('accessibility');
  const containerRef = useRef<HTMLDivElement>(null);

  useKeyboardNavigation(containerRef, {
    orientation,
    wrap: true,
    selector:
      'button:not([disabled]), [role="button"]:not([aria-disabled="true"])',
  });

  return (
    <div
      ref={containerRef}
      className={`toolbar-navigation ${className}`}
      role="toolbar"
      aria-label={
        ariaLabel ? t(ariaLabel, { defaultValue: ariaLabel }) : undefined
      }
      aria-orientation={orientation}
      tabIndex={-1}
    >
      {children}
    </div>
  );
};

/**
 * Grid Navigation Component
 */
interface GridNavigationProps {
  children: React.ReactNode;
  columns: number;
  className?: string;
  ariaLabel?: string;
  onCellActivate?: (cell: HTMLElement, row: number, col: number) => void;
}

export const GridNavigation: React.FC<GridNavigationProps> = ({
  children,
  columns,
  className = '',
  ariaLabel,
  onCellActivate,
}) => {
  const { t } = useTranslation('accessibility');
  const containerRef = useRef<HTMLDivElement>(null);

  const handleKeyDown = useCallback(
    (event: KeyboardEvent) => {
      const cells = Array.from(
        containerRef.current?.querySelectorAll('[role="gridcell"]') || [],
      ) as HTMLElement[];

      const activeElement = document.activeElement as HTMLElement;
      const currentIndex = cells.indexOf(activeElement);

      if (currentIndex === -1) return;

      const currentRow = Math.floor(currentIndex / columns);
      const currentCol = currentIndex % columns;
      const totalRows = Math.ceil(cells.length / columns);

      let newIndex = currentIndex;

      switch (event.key) {
        case 'ArrowUp':
          if (currentRow > 0) {
            newIndex = (currentRow - 1) * columns + currentCol;
          }
          break;

        case 'ArrowDown':
          if (currentRow < totalRows - 1) {
            newIndex = Math.min(
              (currentRow + 1) * columns + currentCol,
              cells.length - 1,
            );
          }
          break;

        case 'ArrowLeft':
          if (currentCol > 0) {
            newIndex = currentIndex - 1;
          }
          break;

        case 'ArrowRight':
          if (currentCol < columns - 1 && currentIndex < cells.length - 1) {
            newIndex = currentIndex + 1;
          }
          break;

        case 'Home':
          newIndex = currentRow * columns;
          break;

        case 'End':
          newIndex = Math.min((currentRow + 1) * columns - 1, cells.length - 1);
          break;

        case 'PageUp':
          newIndex = currentCol;
          break;

        case 'PageDown':
          newIndex = Math.min(
            (totalRows - 1) * columns + currentCol,
            cells.length - 1,
          );
          break;

        case 'Enter':
        case ' ':
          event.preventDefault();
          const row = Math.floor(currentIndex / columns);
          const col = currentIndex % columns;
          onCellActivate?.(activeElement, row, col);
          return;
      }

      if (newIndex !== currentIndex && cells[newIndex]) {
        event.preventDefault();
        cells[newIndex].focus();
      }
    },
    [columns, onCellActivate],
  );

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    container.addEventListener('keydown', handleKeyDown);

    return () => {
      container.removeEventListener('keydown', handleKeyDown);
    };
  }, [handleKeyDown]);

  return (
    <div
      ref={containerRef}
      className={`grid-navigation ${className}`}
      role="grid"
      aria-label={
        ariaLabel ? t(ariaLabel, { defaultValue: ariaLabel }) : undefined
      }
      tabIndex={-1}
    >
      {children}
    </div>
  );
};

/**
 * Tab Navigation Component
 */
interface TabNavigationProps {
  children: React.ReactNode;
  orientation?: 'horizontal' | 'vertical';
  automaticActivation?: boolean;
  className?: string;
  ariaLabel?: string;
  onTabChange?: (tab: HTMLElement, index: number) => void;
}

export const TabNavigation: React.FC<TabNavigationProps> = ({
  children,
  orientation = 'horizontal',
  automaticActivation = false,
  className = '',
  ariaLabel,
  onTabChange,
}) => {
  const { t } = useTranslation('accessibility');
  const containerRef = useRef<HTMLDivElement>(null);

  const handleKeyDown = useCallback(
    (event: KeyboardEvent) => {
      const tabs = Array.from(
        containerRef.current?.querySelectorAll('[role="tab"]') || [],
      ) as HTMLElement[];

      const activeElement = document.activeElement as HTMLElement;
      const currentIndex = tabs.indexOf(activeElement);

      if (currentIndex === -1) return;

      let newIndex = currentIndex;

      switch (event.key) {
        case orientation === 'horizontal' ? 'ArrowLeft' : 'ArrowUp':
          newIndex = currentIndex > 0 ? currentIndex - 1 : tabs.length - 1;
          break;

        case orientation === 'horizontal' ? 'ArrowRight' : 'ArrowDown':
          newIndex = currentIndex < tabs.length - 1 ? currentIndex + 1 : 0;
          break;

        case 'Home':
          newIndex = 0;
          break;

        case 'End':
          newIndex = tabs.length - 1;
          break;

        case 'Enter':
        case ' ':
          event.preventDefault();
          onTabChange?.(activeElement, currentIndex);
          return;
      }

      if (newIndex !== currentIndex && tabs[newIndex]) {
        event.preventDefault();
        tabs[newIndex].focus();

        if (automaticActivation) {
          onTabChange?.(tabs[newIndex], newIndex);
        }
      }
    },
    [orientation, automaticActivation, onTabChange],
  );

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    container.addEventListener('keydown', handleKeyDown);

    return () => {
      container.removeEventListener('keydown', handleKeyDown);
    };
  }, [handleKeyDown]);

  return (
    <div
      ref={containerRef}
      className={`tab-navigation ${className}`}
      role="tablist"
      aria-label={
        ariaLabel ? t(ariaLabel, { defaultValue: ariaLabel }) : undefined
      }
      aria-orientation={orientation}
      tabIndex={-1}
    >
      {children}
    </div>
  );
};

/**
 * Listbox Navigation Component
 */
interface ListboxNavigationProps {
  children: React.ReactNode;
  multiselectable?: boolean;
  className?: string;
  ariaLabel?: string;
  onSelectionChange?: (selected: HTMLElement[]) => void;
}

export const ListboxNavigation: React.FC<ListboxNavigationProps> = ({
  children,
  multiselectable = false,
  className = '',
  ariaLabel,
  onSelectionChange,
}) => {
  const { t } = useTranslation('accessibility');
  const containerRef = useRef<HTMLDivElement>(null);
  const [selectedItems, setSelectedItems] = useState<Set<HTMLElement>>(
    new Set(),
  );

  const handleKeyDown = useCallback(
    (event: KeyboardEvent) => {
      const options = Array.from(
        containerRef.current?.querySelectorAll('[role="option"]') || [],
      ) as HTMLElement[];

      const activeElement = document.activeElement as HTMLElement;
      const currentIndex = options.indexOf(activeElement);

      if (currentIndex === -1) return;

      let newIndex = currentIndex;

      switch (event.key) {
        case 'ArrowUp':
          newIndex = currentIndex > 0 ? currentIndex - 1 : options.length - 1;
          break;

        case 'ArrowDown':
          newIndex = currentIndex < options.length - 1 ? currentIndex + 1 : 0;
          break;

        case 'Home':
          newIndex = 0;
          break;

        case 'End':
          newIndex = options.length - 1;
          break;

        case 'Enter':
        case ' ':
          event.preventDefault();
          if (multiselectable) {
            setSelectedItems((prev) => {
              const newSet = new Set(prev);
              if (newSet.has(activeElement)) {
                newSet.delete(activeElement);
                activeElement.setAttribute('aria-selected', 'false');
              } else {
                newSet.add(activeElement);
                activeElement.setAttribute('aria-selected', 'true');
              }
              onSelectionChange?.(Array.from(newSet));
              return newSet;
            });
          } else {
            selectedItems.forEach((item) =>
              item.setAttribute('aria-selected', 'false'),
            );
            activeElement.setAttribute('aria-selected', 'true');
            setSelectedItems(new Set([activeElement]));
            onSelectionChange?.([activeElement]);
          }
          return;
      }

      if (newIndex !== currentIndex && options[newIndex]) {
        event.preventDefault();
        options[newIndex].focus();
      }
    },
    [multiselectable, selectedItems, onSelectionChange],
  );

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    container.addEventListener('keydown', handleKeyDown);

    return () => {
      container.removeEventListener('keydown', handleKeyDown);
    };
  }, [handleKeyDown]);

  return (
    <div
      ref={containerRef}
      className={`listbox-navigation ${className}`}
      role="listbox"
      aria-label={
        ariaLabel ? t(ariaLabel, { defaultValue: ariaLabel }) : undefined
      }
      aria-multiselectable={multiselectable}
      tabIndex={-1}
    >
      {children}
    </div>
  );
};
