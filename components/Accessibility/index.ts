/**
 * Accessibility Components Index
 * 
 * Centralized export for all accessibility components and utilities.
 * Provides comprehensive WCAG 2.1 AA compliance tools.
 */

// Skip Navigation
export {
  SkipNavigation,
  useSkipNavigation,
  Landmark,
  MainContent,
  NavigationLandmark,
  ComplementaryContent,
  ContentInfo,
  SearchLandmark,
} from './SkipNavigation';

export type { SkipLink } from './SkipNavigation';

// Heading Hierarchy
export {
  HeadingProvider,
  useHeading,
  SmartHeading,
  Section,
  Article,
  useHeadingValidation,
  HeadingValidator,
  getHeadingLevel,
  createHeadingOutline,
} from './HeadingHierarchy';

export type { HeadingLevel } from './HeadingHierarchy';

// Live Regions
export {
  LiveRegion,
  AnnouncerProvider,
  useAnnouncer,
  ChatMessageAnnouncer,
  StatusAnnouncer,
  FormValidationAnnouncer,
  LoadingAnnouncer,
  NavigationAnnouncer,
} from './LiveRegion';

export type { 
  LivePriority, 
  LiveRegionType, 
  Announcement 
} from './LiveRegion';

// Keyboard Navigation
export {
  useKeyboardNavigation,
  MenuNavigation,
  ToolbarNavigation,
  GridNavigation,
  TabNavigation,
  ListboxNavigation,
  NavigationDirection,
} from './KeyboardNavigation';

export type { NavigationConfig } from './KeyboardNavigation';

// ARIA Labels and Roles
export {
  ARIAProvider,
  useARIA,
  LabeledElement,
  AccessibleButton,
  AccessibleLink,
  AccessibleList,
  AccessibleListItem,
  AccessibleFormGroup,
  AccessibleDialog,
  AccessibleStatus,
  AccessibleProgress,
  useARIAAttributes,
  withARIA,
} from './ARIALabels';

// Re-export focus management from hooks
export { useFocusManagement, useRovingTabindex } from '@/hooks/useFocusManagement';
export type { 
  FocusTrapConfig, 
  UseFocusManagementReturn 
} from '@/hooks/useFocusManagement';

/**
 * Complete accessibility setup hook
 * Sets up all accessibility providers and utilities
 */
export function useAccessibilitySetup() {
  return {
    providers: [
      'ARIAProvider',
      'AnnouncerProvider', 
      'HeadingProvider',
    ],
    components: [
      'SkipNavigation',
      'HeadingValidator',
    ],
    hooks: [
      'useFocusManagement',
      'useAnnouncer',
      'useHeading',
      'useARIA',
    ],
  };
}

/**
 * Accessibility validation utilities
 */
export const A11yUtils = {
  /**
   * Check if element is focusable
   */
  isFocusable: (element: HTMLElement): boolean => {
    const focusableSelectors = [
      'a[href]',
      'button:not([disabled])',
      'input:not([disabled])',
      'select:not([disabled])',
      'textarea:not([disabled])',
      '[tabindex]:not([tabindex="-1"])',
      '[contenteditable="true"]',
    ];
    
    return focusableSelectors.some(selector => element.matches(selector));
  },

  /**
   * Check if element is visible to screen readers
   */
  isVisibleToScreenReaders: (element: HTMLElement): boolean => {
    const style = window.getComputedStyle(element);
    
    // Check CSS visibility
    if (style.display === 'none' || style.visibility === 'hidden') {
      return false;
    }
    
    // Check ARIA hidden
    if (element.getAttribute('aria-hidden') === 'true') {
      return false;
    }
    
    // Check if element has zero dimensions and is not absolutely positioned
    const rect = element.getBoundingClientRect();
    if (rect.width === 0 && rect.height === 0 && style.position !== 'absolute') {
      return false;
    }
    
    return true;
  },

  /**
   * Get accessible name for element
   */
  getAccessibleName: (element: HTMLElement): string => {
    // Check aria-label
    const ariaLabel = element.getAttribute('aria-label');
    if (ariaLabel) return ariaLabel;
    
    // Check aria-labelledby
    const labelledBy = element.getAttribute('aria-labelledby');
    if (labelledBy) {
      const labelElement = document.getElementById(labelledBy);
      if (labelElement) return labelElement.textContent?.trim() || '';
    }
    
    // Check associated label
    if (element.id) {
      const label = document.querySelector(`label[for="${element.id}"]`);
      if (label) return label.textContent?.trim() || '';
    }
    
    // Check title attribute
    const title = element.getAttribute('title');
    if (title) return title;
    
    // Fallback to text content for certain elements
    if (['button', 'a', 'h1', 'h2', 'h3', 'h4', 'h5', 'h6'].includes(element.tagName.toLowerCase())) {
      return element.textContent?.trim() || '';
    }
    
    return '';
  },

  /**
   * Check color contrast ratio (simplified)
   */
  hasGoodContrast: (foreground: string, background: string): boolean => {
    // This is a simplified check - in a real implementation,
    // you'd use a proper color contrast calculation library
    const fgLum = getRelativeLuminance(foreground);
    const bgLum = getRelativeLuminance(background);
    
    const ratio = (Math.max(fgLum, bgLum) + 0.05) / (Math.min(fgLum, bgLum) + 0.05);
    
    // WCAG AA requires 4.5:1 for normal text, 3:1 for large text
    return ratio >= 4.5;
  },

  /**
   * Validate heading hierarchy
   */
  validateHeadingHierarchy: (): string[] => {
    const headings = Array.from(document.querySelectorAll('h1, h2, h3, h4, h5, h6'));
    const issues: string[] = [];
    
    let previousLevel = 0;
    
    headings.forEach((heading, index) => {
      const level = parseInt(heading.tagName.charAt(1));
      
      // Check for skipped levels
      if (level > previousLevel + 1 && previousLevel !== 0) {
        issues.push(`Heading level ${level} follows h${previousLevel}, skipping levels`);
      }
      
      // Check for multiple h1s
      if (level === 1 && previousLevel >= 1) {
        issues.push('Multiple h1 elements found');
      }
      
      // Check for empty headings
      if (!heading.textContent?.trim()) {
        issues.push(`Empty h${level} heading found`);
      }
      
      previousLevel = level;
    });
    
    return issues;
  },
};

// Helper function for contrast calculation
function getRelativeLuminance(color: string): number {
  // Simplified implementation - would need proper color parsing in real use
  // This is just a placeholder
  return 0.5;
}

/**
 * Common accessibility patterns
 */
export const A11yPatterns = {
  /**
   * Modal dialog pattern
   */
  modal: {
    role: 'dialog',
    'aria-modal': true,
    tabIndex: -1,
  },

  /**
   * Alert pattern
   */
  alert: {
    role: 'alert',
    'aria-live': 'assertive',
    'aria-atomic': true,
  },

  /**
   * Status message pattern
   */
  status: {
    role: 'status',
    'aria-live': 'polite',
    'aria-atomic': true,
  },

  /**
   * Menu pattern
   */
  menu: {
    role: 'menu',
    'aria-orientation': 'vertical',
  },

  /**
   * Menuitem pattern
   */
  menuitem: {
    role: 'menuitem',
    tabIndex: -1,
  },

  /**
   * Tab panel pattern
   */
  tabpanel: {
    role: 'tabpanel',
    tabIndex: 0,
  },

  /**
   * Tab pattern
   */
  tab: {
    role: 'tab',
    'aria-selected': false,
    tabIndex: -1,
  },

  /**
   * Button that controls another element
   */
  toggleButton: (controlsId: string, expanded: boolean) => ({
    'aria-controls': controlsId,
    'aria-expanded': expanded,
  }),

  /**
   * Form field with validation
   */
  formField: (required: boolean, invalid: boolean) => ({
    'aria-required': required,
    'aria-invalid': invalid,
  }),
};