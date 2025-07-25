/**
 * Heading Hierarchy Component
 *
 * Ensures proper heading structure for screen readers and WCAG compliance.
 * Provides utilities to maintain semantic heading levels throughout the application.
 */
import React, { createContext, useCallback, useContext, useState } from 'react';

import { useTranslation } from 'next-i18next';

/**
 * Heading level type
 */
export type HeadingLevel = 1 | 2 | 3 | 4 | 5 | 6;

/**
 * Heading context interface
 */
interface HeadingContextValue {
  currentLevel: HeadingLevel;
  setLevel: (level: HeadingLevel) => void;
  incrementLevel: () => HeadingLevel;
  decrementLevel: () => HeadingLevel;
  resetLevel: (level?: HeadingLevel) => void;
}

/**
 * Heading context
 */
const HeadingContext = createContext<HeadingContextValue | null>(null);

/**
 * Heading Provider Component
 */
interface HeadingProviderProps {
  children: React.ReactNode;
  initialLevel?: HeadingLevel;
}

export const HeadingProvider: React.FC<HeadingProviderProps> = ({
  children,
  initialLevel = 1,
}) => {
  const [currentLevel, setCurrentLevel] = useState<HeadingLevel>(initialLevel);

  const setLevel = useCallback((level: HeadingLevel) => {
    setCurrentLevel(Math.max(1, Math.min(6, level)) as HeadingLevel);
  }, []);

  const incrementLevel = useCallback((): HeadingLevel => {
    const newLevel = Math.min(6, currentLevel + 1) as HeadingLevel;
    setCurrentLevel(newLevel);
    return newLevel;
  }, [currentLevel]);

  const decrementLevel = useCallback((): HeadingLevel => {
    const newLevel = Math.max(1, currentLevel - 1) as HeadingLevel;
    setCurrentLevel(newLevel);
    return newLevel;
  }, [currentLevel]);

  const resetLevel = useCallback((level: HeadingLevel = 1) => {
    setCurrentLevel(level);
  }, []);

  const value: HeadingContextValue = {
    currentLevel,
    setLevel,
    incrementLevel,
    decrementLevel,
    resetLevel,
  };

  return (
    <HeadingContext.Provider value={value}>{children}</HeadingContext.Provider>
  );
};

/**
 * Hook to use heading context
 */
export function useHeading() {
  const context = useContext(HeadingContext);
  if (!context) {
    throw new Error('useHeading must be used within a HeadingProvider');
  }
  return context;
}

/**
 * Smart Heading Component Props
 */
interface SmartHeadingProps {
  children: React.ReactNode;
  level?: HeadingLevel;
  increment?: boolean;
  className?: string;
  id?: string;
  tabIndex?: number;
  // ARIA
  ariaLabel?: string;
  ariaDescribedBy?: string;
}

/**
 * Smart Heading Component
 * Automatically uses the correct heading level from context
 */
export const SmartHeading: React.FC<SmartHeadingProps> = ({
  children,
  level,
  increment = true,
  className = '',
  id,
  tabIndex,
  ariaLabel,
  ariaDescribedBy,
}) => {
  const { t } = useTranslation('accessibility');
  const heading = useHeading();

  // Determine the heading level to use
  const headingLevel = level || heading.currentLevel;

  // Increment level for next heading if requested
  React.useEffect(() => {
    if (increment && !level) {
      heading.incrementLevel();
    }
  }, [increment, level, heading]);

  // Create heading element
  const HeadingTag = `h${headingLevel}` as keyof JSX.IntrinsicElements;

  return React.createElement(
    HeadingTag,
    {
      className: `heading-${headingLevel} ${className}`,
      id,
      tabIndex,
      'aria-label': ariaLabel
        ? t(ariaLabel, { defaultValue: ariaLabel })
        : undefined,
      'aria-describedby': ariaDescribedBy,
    },
    children,
  );
};

/**
 * Section Component with automatic heading management
 */
interface SectionProps {
  children: React.ReactNode;
  heading?: string;
  headingLevel?: HeadingLevel;
  className?: string;
  id?: string;
  ariaLabel?: string;
  ariaLabelledBy?: string;
  role?: string;
}

export const Section: React.FC<SectionProps> = ({
  children,
  heading,
  headingLevel,
  className = '',
  id,
  ariaLabel,
  ariaLabelledBy,
  role = 'region',
}) => {
  const { t } = useTranslation('accessibility');
  const headingContext = useHeading();

  // Generate heading ID if section has a heading
  const headingId = heading && id ? `${id}-heading` : undefined;

  return (
    <section
      className={className}
      id={id}
      role={role}
      aria-label={
        ariaLabel ? t(ariaLabel, { defaultValue: ariaLabel }) : undefined
      }
      aria-labelledby={ariaLabelledBy || headingId}
    >
      {heading && (
        <SmartHeading
          level={headingLevel}
          id={headingId}
          className="section-heading"
        >
          {t(heading, { defaultValue: heading })}
        </SmartHeading>
      )}
      <HeadingProvider
        initialLevel={
          Math.min(
            6,
            (headingLevel || headingContext.currentLevel) + 1,
          ) as HeadingLevel
        }
      >
        {children}
      </HeadingProvider>
    </section>
  );
};

/**
 * Article Component with automatic heading management
 */
interface ArticleProps {
  children: React.ReactNode;
  heading?: string;
  headingLevel?: HeadingLevel;
  className?: string;
  id?: string;
  ariaLabel?: string;
  ariaLabelledBy?: string;
}

export const Article: React.FC<ArticleProps> = ({
  children,
  heading,
  headingLevel,
  className = '',
  id,
  ariaLabel,
  ariaLabelledBy,
}) => {
  const { t } = useTranslation('accessibility');
  const headingContext = useHeading();

  // Generate heading ID if article has a heading
  const headingId = heading && id ? `${id}-heading` : undefined;

  return (
    <article
      className={className}
      id={id}
      aria-label={
        ariaLabel ? t(ariaLabel, { defaultValue: ariaLabel }) : undefined
      }
      aria-labelledby={ariaLabelledBy || headingId}
    >
      {heading && (
        <SmartHeading
          level={headingLevel}
          id={headingId}
          className="article-heading"
        >
          {t(heading, { defaultValue: heading })}
        </SmartHeading>
      )}
      <HeadingProvider
        initialLevel={
          Math.min(
            6,
            (headingLevel || headingContext.currentLevel) + 1,
          ) as HeadingLevel
        }
      >
        {children}
      </HeadingProvider>
    </article>
  );
};

/**
 * Hook to validate heading hierarchy
 */
export function useHeadingValidation() {
  const [issues, setIssues] = useState<string[]>([]);

  const validateHeadings = useCallback(() => {
    const headings = Array.from(
      document.querySelectorAll('h1, h2, h3, h4, h5, h6'),
    );
    const foundIssues: string[] = [];

    let previousLevel = 0;

    headings.forEach((heading, index) => {
      const level = parseInt(heading.tagName.charAt(1));

      // Check for skipped levels
      if (level > previousLevel + 1 && previousLevel !== 0) {
        foundIssues.push(
          `Heading level ${level} follows h${previousLevel}, skipping h${
            previousLevel + 1
          } (element ${index + 1})`,
        );
      }

      // Check for multiple h1s
      if (level === 1 && previousLevel >= 1) {
        foundIssues.push(`Multiple h1 elements found (element ${index + 1})`);
      }

      // Check for empty headings
      if (!heading.textContent?.trim()) {
        foundIssues.push(
          `Empty h${level} heading found (element ${index + 1})`,
        );
      }

      previousLevel = level;
    });

    setIssues(foundIssues);
    return foundIssues;
  }, []);

  return {
    issues,
    validateHeadings,
    hasIssues: issues.length > 0,
  };
}

/**
 * Heading Hierarchy Validator Component (Development only)
 */
export const HeadingValidator: React.FC = () => {
  const { issues, validateHeadings, hasIssues } = useHeadingValidation();

  React.useEffect(() => {
    // Only run in development
    if (process.env.NODE_ENV === 'development') {
      const timer = setTimeout(validateHeadings, 1000);
      return () => clearTimeout(timer);
    }
  }, [validateHeadings]);

  // Only render in development
  if (process.env.NODE_ENV !== 'development' || !hasIssues) {
    return null;
  }

  return (
    <div
      className="fixed bottom-4 left-4 z-50 max-w-md p-4 bg-yellow-50 border border-yellow-200 rounded-lg shadow-lg dark:bg-yellow-900/20 dark:border-yellow-800"
      role="alert"
    >
      <h3 className="text-sm font-medium text-yellow-800 dark:text-yellow-300 mb-2">
        Heading Hierarchy Issues
      </h3>
      <ul className="text-xs text-yellow-700 dark:text-yellow-400 space-y-1">
        {issues.map((issue, index) => (
          <li key={index}>• {issue}</li>
        ))}
      </ul>
    </div>
  );
};

/**
 * Utility function to get heading level from element
 */
export function getHeadingLevel(element: HTMLElement): HeadingLevel | null {
  const match = element.tagName.match(/^H([1-6])$/);
  return match ? (parseInt(match[1]) as HeadingLevel) : null;
}

/**
 * Utility function to create heading outline
 */
export function createHeadingOutline(): Array<{
  level: HeadingLevel;
  text: string;
  id?: string;
  element: HTMLElement;
}> {
  const headings = Array.from(
    document.querySelectorAll('h1, h2, h3, h4, h5, h6'),
  );

  return headings.map((heading) => ({
    level: parseInt(heading.tagName.charAt(1)) as HeadingLevel,
    text: heading.textContent?.trim() || '',
    id: heading.id || undefined,
    element: heading as HTMLElement,
  }));
}
