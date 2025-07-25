/**
 * Skip Navigation Component
 *
 * Provides skip links for keyboard users to navigate efficiently through the page.
 * Essential for WCAG 2.1 AA compliance and improved keyboard navigation experience.
 */
import React from 'react';

import { useTranslation } from 'next-i18next';

/**
 * Skip link interface
 */
export interface SkipLink {
  href: string;
  label: string;
  description?: string;
}

/**
 * Component props
 */
interface SkipNavigationProps {
  links?: SkipLink[];
  className?: string;
}

/**
 * Default skip links
 */
const defaultSkipLinks: SkipLink[] = [
  {
    href: '#main-content',
    label: 'Skip to main content',
    description: 'Jump to the primary content area',
  },
  {
    href: '#chat-input',
    label: 'Skip to chat input',
    description: 'Jump directly to the message input field',
  },
  {
    href: '#navigation',
    label: 'Skip to navigation',
    description: 'Jump to the main navigation menu',
  },
  {
    href: '#settings',
    label: 'Skip to settings',
    description: 'Jump to application settings',
  },
];

/**
 * Skip Navigation Component
 */
export const SkipNavigation: React.FC<SkipNavigationProps> = ({
  links = defaultSkipLinks,
  className = '',
}) => {
  const { t } = useTranslation('accessibility');

  if (links.length === 0) {
    return null;
  }

  return (
    <nav
      className={`skip-navigation ${className}`}
      aria-label={t('Skip navigation')}
      role="navigation"
    >
      <ul className="skip-links">
        {links.map((link, index) => (
          <li key={`skip-${index}`}>
            <a
              href={link.href}
              className="skip-link"
              onClick={(e) => {
                // Ensure the target element receives focus
                const target = document.querySelector(link.href);
                if (target) {
                  // Add tabindex if not already focusable
                  if (!target.hasAttribute('tabindex')) {
                    target.setAttribute('tabindex', '-1');
                  }
                  // Focus the target element
                  (target as HTMLElement).focus();
                  // Remove temporary tabindex after focus
                  setTimeout(() => {
                    if (target.getAttribute('tabindex') === '-1') {
                      target.removeAttribute('tabindex');
                    }
                  }, 100);
                }
              }}
              aria-describedby={
                link.description ? `skip-desc-${index}` : undefined
              }
            >
              {t(link.label, { defaultValue: link.label })}
              {link.description && (
                <span
                  id={`skip-desc-${index}`}
                  className="skip-link-description sr-only"
                >
                  {t(link.description, { defaultValue: link.description })}
                </span>
              )}
            </a>
          </li>
        ))}
      </ul>

      <style jsx>{`
        .skip-navigation {
          position: absolute;
          top: 0;
          left: 0;
          z-index: 9999;
        }

        .skip-links {
          list-style: none;
          margin: 0;
          padding: 0;
          display: flex;
          flex-direction: column;
          gap: 0;
        }

        .skip-link {
          position: absolute;
          top: -40px;
          left: 6px;
          background: #000;
          color: #fff;
          padding: 8px 12px;
          text-decoration: none;
          border-radius: 0 0 4px 4px;
          font-size: 14px;
          font-weight: 600;
          white-space: nowrap;
          transition: top 0.2s ease-in-out;
          border: 2px solid #fff;
          z-index: 10000;
        }

        .skip-link:focus {
          top: 0;
          outline: 2px solid #4f46e5;
          outline-offset: 2px;
        }

        .skip-link:hover:focus {
          background: #1f2937;
          color: #f9fafb;
        }

        .skip-link-description {
          display: block;
          font-size: 12px;
          font-weight: normal;
          opacity: 0.8;
          margin-top: 2px;
        }

        /* Dark mode support */
        @media (prefers-color-scheme: dark) {
          .skip-link {
            background: #1f2937;
            border-color: #374151;
          }

          .skip-link:hover:focus {
            background: #111827;
          }
        }

        /* High contrast mode support */
        @media (prefers-contrast: high) {
          .skip-link {
            background: #000;
            color: #fff;
            border: 3px solid #fff;
          }

          .skip-link:focus {
            outline: 3px solid #ffff00;
            outline-offset: 0;
          }
        }

        /* Reduced motion support */
        @media (prefers-reduced-motion: reduce) {
          .skip-link {
            transition: none;
          }
        }
      `}</style>
    </nav>
  );
};

/**
 * Hook to manage skip navigation dynamically
 */
export function useSkipNavigation(customLinks?: SkipLink[]) {
  const [skipLinks, setSkipLinks] = React.useState<SkipLink[]>(
    customLinks || defaultSkipLinks,
  );

  const addSkipLink = React.useCallback((link: SkipLink) => {
    setSkipLinks((prev) => [...prev, link]);
  }, []);

  const removeSkipLink = React.useCallback((href: string) => {
    setSkipLinks((prev) => prev.filter((link) => link.href !== href));
  }, []);

  const updateSkipLink = React.useCallback(
    (href: string, updates: Partial<SkipLink>) => {
      setSkipLinks((prev) =>
        prev.map((link) =>
          link.href === href ? { ...link, ...updates } : link,
        ),
      );
    },
    [],
  );

  return {
    skipLinks,
    addSkipLink,
    removeSkipLink,
    updateSkipLink,
    setSkipLinks,
  };
}

/**
 * Landmark component to mark main content areas
 */
interface LandmarkProps {
  as?: keyof JSX.IntrinsicElements;
  role?: string;
  ariaLabel?: string;
  ariaLabelledBy?: string;
  id?: string;
  children: React.ReactNode;
  className?: string;
}

export const Landmark: React.FC<LandmarkProps> = ({
  as: Component = 'div',
  role,
  ariaLabel,
  ariaLabelledBy,
  id,
  children,
  className = '',
}) => {
  const { t } = useTranslation('accessibility');

  return React.createElement(
    Component,
    {
      id,
      role,
      'aria-label': ariaLabel
        ? t(ariaLabel, { defaultValue: ariaLabel })
        : undefined,
      'aria-labelledby': ariaLabelledBy,
      className,
    },
    children,
  );
};

/**
 * Main content landmark
 */
export const MainContent: React.FC<{
  children: React.ReactNode;
  className?: string;
  id?: string;
}> = ({ children, className = '', id = 'main-content' }) => {
  return (
    <Landmark as="main" id={id} ariaLabel="Main content" className={className}>
      {children}
    </Landmark>
  );
};

/**
 * Navigation landmark
 */
export const NavigationLandmark: React.FC<{
  children: React.ReactNode;
  ariaLabel?: string;
  className?: string;
  id?: string;
}> = ({
  children,
  ariaLabel = 'Main navigation',
  className = '',
  id = 'navigation',
}) => {
  return (
    <Landmark as="nav" id={id} ariaLabel={ariaLabel} className={className}>
      {children}
    </Landmark>
  );
};

/**
 * Complementary content landmark (sidebar)
 */
export const ComplementaryContent: React.FC<{
  children: React.ReactNode;
  ariaLabel?: string;
  className?: string;
  id?: string;
}> = ({ children, ariaLabel = 'Sidebar', className = '', id }) => {
  return (
    <Landmark as="aside" id={id} ariaLabel={ariaLabel} className={className}>
      {children}
    </Landmark>
  );
};

/**
 * Content info landmark (footer)
 */
export const ContentInfo: React.FC<{
  children: React.ReactNode;
  className?: string;
  id?: string;
}> = ({ children, className = '', id }) => {
  return (
    <Landmark
      as="footer"
      id={id}
      role="contentinfo"
      ariaLabel="Page footer"
      className={className}
    >
      {children}
    </Landmark>
  );
};

/**
 * Search landmark
 */
export const SearchLandmark: React.FC<{
  children: React.ReactNode;
  ariaLabel?: string;
  className?: string;
  id?: string;
}> = ({ children, ariaLabel = 'Search', className = '', id }) => {
  return (
    <Landmark id={id} role="search" ariaLabel={ariaLabel} className={className}>
      {children}
    </Landmark>
  );
};
