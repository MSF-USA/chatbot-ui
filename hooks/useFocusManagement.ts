/**
 * Focus Management Hook
 *
 * Comprehensive focus management system for accessibility compliance.
 * Handles focus trapping, restoration, and keyboard navigation patterns.
 */
import { useCallback, useEffect, useRef, useState } from 'react';

/**
 * Focusable element selectors
 */
const FOCUSABLE_SELECTORS = [
  'a[href]',
  'button:not([disabled])',
  'input:not([disabled])',
  'select:not([disabled])',
  'textarea:not([disabled])',
  '[tabindex]:not([tabindex="-1"])',
  '[contenteditable="true"]',
  'video[controls]',
  'audio[controls]',
  'details summary',
  'iframe',
].join(', ');

/**
 * Focus trap configuration
 */
export interface FocusTrapConfig {
  enabled: boolean;
  initialFocus?: HTMLElement | string;
  restoreFocus?: boolean;
  fallbackFocus?: HTMLElement | string;
  escapeDeactivates?: boolean;
  clickOutsideDeactivates?: boolean;
  onActivate?: () => void;
  onDeactivate?: () => void;
}

/**
 * Focus management hook return type
 */
export interface UseFocusManagementReturn {
  // Focus trap
  trapRef: React.RefObject<HTMLElement>;
  activateTrap: () => void;
  deactivateTrap: () => void;
  isTrapped: boolean;

  // Focus utilities
  focusElement: (element: HTMLElement | string) => boolean;
  focusFirst: (container?: HTMLElement) => boolean;
  focusLast: (container?: HTMLElement) => boolean;
  focusNext: (current?: HTMLElement) => boolean;
  focusPrevious: (current?: HTMLElement) => boolean;

  // Focus restoration
  saveFocus: () => void;
  restoreFocus: () => boolean;

  // Utilities
  getFocusableElements: (container?: HTMLElement) => HTMLElement[];
  isElementFocusable: (element: HTMLElement) => boolean;
  announceToScreenReader: (
    message: string,
    priority?: 'polite' | 'assertive',
  ) => void;
}

/**
 * Focus Management Hook
 */
export function useFocusManagement(
  config: Partial<FocusTrapConfig> = {},
): UseFocusManagementReturn {
  const finalConfig: FocusTrapConfig = {
    enabled: true,
    restoreFocus: true,
    escapeDeactivates: true,
    clickOutsideDeactivates: true,
    ...config,
  };

  // Refs and state
  const trapRef = useRef<HTMLElement>(null);
  const [isTrapped, setIsTrapped] = useState(false);
  const [savedFocus, setSavedFocus] = useState<HTMLElement | null>(null);
  const announcementRef = useRef<HTMLElement | null>(null);

  /**
   * Get all focusable elements within a container
   */
  const getFocusableElements = useCallback(
    (container?: HTMLElement): HTMLElement[] => {
      const root = container || document;
      const elements = Array.from(
        root.querySelectorAll(FOCUSABLE_SELECTORS),
      ) as HTMLElement[];

      return elements.filter((element) => {
        // Additional checks for visibility and accessibility
        const style = window.getComputedStyle(element);

        // Skip hidden elements
        if (style.display === 'none' || style.visibility === 'hidden') {
          return false;
        }

        // Skip elements with negative tabindex (unless explicitly set to -1 for programmatic focus)
        const tabIndex = element.tabIndex;
        if (tabIndex < -1) {
          return false;
        }

        // Check if element is actually visible (not just CSS hidden)
        const rect = element.getBoundingClientRect();
        if (rect.width === 0 && rect.height === 0) {
          return false;
        }

        return true;
      });
    },
    [],
  );

  /**
   * Check if an element is focusable
   */
  const isElementFocusable = useCallback(
    (element: HTMLElement): boolean => {
      const focusableElements = getFocusableElements();
      return focusableElements.includes(element);
    },
    [getFocusableElements],
  );

  /**
   * Focus a specific element
   */
  const focusElement = useCallback(
    (element: HTMLElement | string): boolean => {
      try {
        let targetElement: HTMLElement | null = null;

        if (typeof element === 'string') {
          targetElement = document.querySelector(element);
        } else {
          targetElement = element;
        }

        if (targetElement && isElementFocusable(targetElement)) {
          targetElement.focus();
          return document.activeElement === targetElement;
        }

        return false;
      } catch (error) {
        console.warn('Failed to focus element:', error);
        return false;
      }
    },
    [isElementFocusable],
  );

  /**
   * Focus the first focusable element in a container
   */
  const focusFirst = useCallback(
    (container?: HTMLElement): boolean => {
      const elements = getFocusableElements(container);
      if (elements.length > 0) {
        return focusElement(elements[0]);
      }
      return false;
    },
    [getFocusableElements, focusElement],
  );

  /**
   * Focus the last focusable element in a container
   */
  const focusLast = useCallback(
    (container?: HTMLElement): boolean => {
      const elements = getFocusableElements(container);
      if (elements.length > 0) {
        return focusElement(elements[elements.length - 1]);
      }
      return false;
    },
    [getFocusableElements, focusElement],
  );

  /**
   * Focus the next focusable element
   */
  const focusNext = useCallback(
    (current?: HTMLElement): boolean => {
      const currentElement = current || (document.activeElement as HTMLElement);
      const elements = getFocusableElements();
      const currentIndex = elements.indexOf(currentElement);

      if (currentIndex >= 0 && currentIndex < elements.length - 1) {
        return focusElement(elements[currentIndex + 1]);
      }

      // Wrap to first element
      if (elements.length > 0) {
        return focusElement(elements[0]);
      }

      return false;
    },
    [getFocusableElements, focusElement],
  );

  /**
   * Focus the previous focusable element
   */
  const focusPrevious = useCallback(
    (current?: HTMLElement): boolean => {
      const currentElement = current || (document.activeElement as HTMLElement);
      const elements = getFocusableElements();
      const currentIndex = elements.indexOf(currentElement);

      if (currentIndex > 0) {
        return focusElement(elements[currentIndex - 1]);
      }

      // Wrap to last element
      if (elements.length > 0) {
        return focusElement(elements[elements.length - 1]);
      }

      return false;
    },
    [getFocusableElements, focusElement],
  );

  /**
   * Save current focus for later restoration
   */
  const saveFocus = useCallback(() => {
    const activeElement = document.activeElement as HTMLElement;
    if (activeElement && activeElement !== document.body) {
      setSavedFocus(activeElement);
    }
  }, []);

  /**
   * Restore previously saved focus
   */
  const restoreFocus = useCallback((): boolean => {
    if (savedFocus && isElementFocusable(savedFocus)) {
      return focusElement(savedFocus);
    }

    // Fallback to fallback focus element
    if (finalConfig.fallbackFocus) {
      return focusElement(finalConfig.fallbackFocus);
    }

    return false;
  }, [savedFocus, isElementFocusable, focusElement, finalConfig.fallbackFocus]);

  /**
   * Handle keydown events for focus trap
   */
  const handleTrapKeydown = useCallback(
    (e: KeyboardEvent) => {
      if (!isTrapped || !trapRef.current) return;

      // Handle Escape key
      if (e.key === 'Escape' && finalConfig.escapeDeactivates) {
        e.preventDefault();
        deactivateTrap();
        return;
      }

      // Handle Tab key for focus trapping
      if (e.key === 'Tab') {
        const focusableElements = getFocusableElements(trapRef.current);

        if (focusableElements.length === 0) {
          e.preventDefault();
          return;
        }

        const firstElement = focusableElements[0];
        const lastElement = focusableElements[focusableElements.length - 1];
        const activeElement = document.activeElement;

        // Shift + Tab: move to previous element or wrap to last
        if (e.shiftKey) {
          if (activeElement === firstElement) {
            e.preventDefault();
            focusElement(lastElement);
          }
        }
        // Tab: move to next element or wrap to first
        else {
          if (activeElement === lastElement) {
            e.preventDefault();
            focusElement(firstElement);
          }
        }
      }
    },
    [
      isTrapped,
      finalConfig.escapeDeactivates,
      getFocusableElements,
      focusElement,
    ],
  );

  /**
   * Handle click outside for focus trap
   */
  const handleTrapClick = useCallback(
    (e: MouseEvent) => {
      if (
        !isTrapped ||
        !trapRef.current ||
        !finalConfig.clickOutsideDeactivates
      )
        return;

      const target = e.target as HTMLElement;
      if (!trapRef.current.contains(target)) {
        e.preventDefault();
        deactivateTrap();
      }
    },
    [isTrapped, finalConfig.clickOutsideDeactivates],
  );

  /**
   * Activate focus trap
   */
  const activateTrap = useCallback(() => {
    if (!finalConfig.enabled || isTrapped) return;

    // Save current focus if restoration is enabled
    if (finalConfig.restoreFocus) {
      saveFocus();
    }

    setIsTrapped(true);

    // Focus initial element
    setTimeout(() => {
      if (finalConfig.initialFocus) {
        focusElement(finalConfig.initialFocus);
      } else if (trapRef.current) {
        focusFirst(trapRef.current);
      }
    }, 0);

    finalConfig.onActivate?.();
  }, [finalConfig, isTrapped, saveFocus, focusElement, focusFirst]);

  /**
   * Deactivate focus trap
   */
  const deactivateTrap = useCallback(() => {
    if (!isTrapped) return;

    setIsTrapped(false);

    // Restore focus if enabled
    if (finalConfig.restoreFocus) {
      setTimeout(() => {
        restoreFocus();
      }, 0);
    }

    finalConfig.onDeactivate?.();
  }, [isTrapped, finalConfig, restoreFocus]);

  /**
   * Announce message to screen readers
   */
  const announceToScreenReader = useCallback(
    (message: string, priority: 'polite' | 'assertive' = 'polite') => {
      // Create or update announcement element
      if (!announcementRef.current) {
        const announcer = document.createElement('div');
        announcer.setAttribute('aria-live', priority);
        announcer.setAttribute('aria-atomic', 'true');
        announcer.className = 'sr-only';
        announcer.style.cssText = `
        position: absolute !important;
        width: 1px !important;
        height: 1px !important;
        padding: 0 !important;
        margin: -1px !important;
        overflow: hidden !important;
        clip: rect(0, 0, 0, 0) !important;
        white-space: nowrap !important;
        border: 0 !important;
      `;
        document.body.appendChild(announcer);
        announcementRef.current = announcer;
      }

      // Clear and set message
      announcementRef.current.textContent = '';
      setTimeout(() => {
        if (announcementRef.current) {
          announcementRef.current.textContent = message;
        }
      }, 100);

      // Clear after announcement
      setTimeout(() => {
        if (announcementRef.current) {
          announcementRef.current.textContent = '';
        }
      }, 1000);
    },
    [],
  );

  // Set up event listeners for focus trap
  useEffect(() => {
    if (isTrapped) {
      document.addEventListener('keydown', handleTrapKeydown);
      document.addEventListener('click', handleTrapClick, true);

      return () => {
        document.removeEventListener('keydown', handleTrapKeydown);
        document.removeEventListener('click', handleTrapClick, true);
      };
    }
  }, [isTrapped, handleTrapKeydown, handleTrapClick]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (announcementRef.current) {
        document.body.removeChild(announcementRef.current);
      }
    };
  }, []);

  return {
    // Focus trap
    trapRef,
    activateTrap,
    deactivateTrap,
    isTrapped,

    // Focus utilities
    focusElement,
    focusFirst,
    focusLast,
    focusNext,
    focusPrevious,

    // Focus restoration
    saveFocus,
    restoreFocus,

    // Utilities
    getFocusableElements,
    isElementFocusable,
    announceToScreenReader,
  };
}

/**
 * Hook for roving tabindex pattern
 */
export function useRovingTabindex(
  containerRef: React.RefObject<HTMLElement>,
  itemSelector: string = '[role="menuitem"], [role="option"], [role="tab"]',
) {
  const [activeIndex, setActiveIndex] = useState(0);
  const { focusElement, announceToScreenReader } = useFocusManagement();

  const items =
    (containerRef.current?.querySelectorAll(
      itemSelector,
    ) as NodeListOf<HTMLElement>) || [];

  const updateTabindices = useCallback(() => {
    items.forEach((item, index) => {
      item.tabIndex = index === activeIndex ? 0 : -1;
    });
  }, [items, activeIndex]);

  const moveToIndex = useCallback(
    (index: number) => {
      if (index >= 0 && index < items.length) {
        setActiveIndex(index);
        focusElement(items[index]);

        // Announce for screen readers
        const item = items[index];
        const text = item.textContent || item.getAttribute('aria-label') || '';
        announceToScreenReader(`${text}. ${index + 1} of ${items.length}`);
      }
    },
    [items, focusElement, announceToScreenReader],
  );

  const moveNext = useCallback(() => {
    const nextIndex = activeIndex < items.length - 1 ? activeIndex + 1 : 0;
    moveToIndex(nextIndex);
  }, [activeIndex, items.length, moveToIndex]);

  const movePrevious = useCallback(() => {
    const prevIndex = activeIndex > 0 ? activeIndex - 1 : items.length - 1;
    moveToIndex(prevIndex);
  }, [activeIndex, items.length, moveToIndex]);

  const moveFirst = useCallback(() => {
    moveToIndex(0);
  }, [moveToIndex]);

  const moveLast = useCallback(() => {
    moveToIndex(items.length - 1);
  }, [items.length, moveToIndex]);

  // Update tabindices when active index changes
  useEffect(() => {
    updateTabindices();
  }, [updateTabindices]);

  return {
    activeIndex,
    moveToIndex,
    moveNext,
    movePrevious,
    moveFirst,
    moveLast,
  };
}
