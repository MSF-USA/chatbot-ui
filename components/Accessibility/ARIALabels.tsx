/**
 * ARIA Labels and Roles Components
 *
 * Comprehensive ARIA implementation for enhanced screen reader support
 * and semantic web accessibility. Provides utilities for proper labeling
 * and role assignments throughout the application.
 */
import React, { useEffect, useRef, useState } from 'react';

import { useTranslation } from 'next-i18next';

/**
 * ARIA label context interface
 */
interface ARIAContextValue {
  registerLabel: (id: string, label: string) => void;
  unregisterLabel: (id: string) => void;
  getLabel: (id: string) => string | undefined;
  generateId: (prefix?: string) => string;
}

/**
 * ARIA Context
 */
const ARIAContext = React.createContext<ARIAContextValue | null>(null);

/**
 * ARIA Provider Component
 */
interface ARIAProviderProps {
  children: React.ReactNode;
}

export const ARIAProvider: React.FC<ARIAProviderProps> = ({ children }) => {
  const [labels] = useState<Map<string, string>>(new Map());
  const idCounterRef = useRef(0);

  const registerLabel = React.useCallback(
    (id: string, label: string) => {
      labels.set(id, label);
    },
    [labels],
  );

  const unregisterLabel = React.useCallback(
    (id: string) => {
      labels.delete(id);
    },
    [labels],
  );

  const getLabel = React.useCallback(
    (id: string) => {
      return labels.get(id);
    },
    [labels],
  );

  const generateId = React.useCallback((prefix: string = 'aria') => {
    idCounterRef.current += 1;
    return `${prefix}-${idCounterRef.current}`;
  }, []);

  const value: ARIAContextValue = {
    registerLabel,
    unregisterLabel,
    getLabel,
    generateId,
  };

  return <ARIAContext.Provider value={value}>{children}</ARIAContext.Provider>;
};

/**
 * Hook to use ARIA context
 */
export function useARIA() {
  const context = React.useContext(ARIAContext);
  if (!context) {
    throw new Error('useARIA must be used within an ARIAProvider');
  }
  return context;
}

/**
 * Labeled Element Component
 */
interface LabeledElementProps {
  children: React.ReactElement;
  label: string;
  description?: string;
  required?: boolean;
  invalid?: boolean;
  labelId?: string;
  descriptionId?: string;
}

export const LabeledElement: React.FC<LabeledElementProps> = ({
  children,
  label,
  description,
  required = false,
  invalid = false,
  labelId,
  descriptionId,
}) => {
  const { t } = useTranslation('accessibility');
  const { generateId } = useARIA();

  const finalLabelId = labelId || generateId('label');
  const finalDescriptionId = description
    ? descriptionId || generateId('desc')
    : undefined;

  // Build aria-describedby
  const ariaDescribedBy =
    [finalDescriptionId, children.props['aria-describedby']]
      .filter(Boolean)
      .join(' ') || undefined;

  const enhancedChild = React.cloneElement(children, {
    'aria-labelledby': children.props['aria-labelledby'] || finalLabelId,
    'aria-describedby': ariaDescribedBy,
    'aria-required': required || children.props['aria-required'],
    'aria-invalid': invalid || children.props['aria-invalid'],
  });

  return (
    <>
      <label id={finalLabelId} className="sr-only">
        {t(label, { defaultValue: label })}
        {required && <span aria-label={t('required')}> *</span>}
      </label>

      {description && (
        <div id={finalDescriptionId} className="sr-only">
          {t(description, { defaultValue: description })}
        </div>
      )}

      {enhancedChild}
    </>
  );
};

/**
 * Button with proper ARIA attributes
 */
interface AccessibleButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  children: React.ReactNode;
  ariaLabel?: string;
  ariaDescription?: string;
  pressed?: boolean;
  expanded?: boolean;
  controls?: string;
  haspopup?: boolean | 'menu' | 'listbox' | 'tree' | 'grid' | 'dialog';
  describedBy?: string;
}

export const AccessibleButton: React.FC<AccessibleButtonProps> = ({
  children,
  ariaLabel,
  ariaDescription,
  pressed,
  expanded,
  controls,
  haspopup,
  describedBy,
  className = '',
  ...props
}) => {
  const { t } = useTranslation('accessibility');
  const { generateId } = useARIA();

  const descriptionId = ariaDescription ? generateId('btn-desc') : undefined;

  return (
    <>
      <button
        {...props}
        className={`accessible-button ${className}`}
        aria-label={
          ariaLabel ? t(ariaLabel, { defaultValue: ariaLabel }) : undefined
        }
        aria-describedby={
          [describedBy, descriptionId].filter(Boolean).join(' ') || undefined
        }
        aria-pressed={pressed}
        aria-expanded={expanded}
        aria-controls={controls}
        aria-haspopup={haspopup}
      >
        {children}
      </button>

      {ariaDescription && (
        <div id={descriptionId} className="sr-only">
          {t(ariaDescription, { defaultValue: ariaDescription })}
        </div>
      )}
    </>
  );
};

/**
 * Link with proper ARIA attributes
 */
interface AccessibleLinkProps
  extends React.AnchorHTMLAttributes<HTMLAnchorElement> {
  children: React.ReactNode;
  ariaLabel?: string;
  ariaDescription?: string;
  external?: boolean;
  current?: boolean | 'page' | 'step' | 'location' | 'date' | 'time';
  describedBy?: string;
}

export const AccessibleLink: React.FC<AccessibleLinkProps> = ({
  children,
  ariaLabel,
  ariaDescription,
  external = false,
  current,
  describedBy,
  className = '',
  target,
  rel,
  ...props
}) => {
  const { t } = useTranslation('accessibility');
  const { generateId } = useARIA();

  const descriptionId = ariaDescription ? generateId('link-desc') : undefined;
  const externalDescId = external ? generateId('external-desc') : undefined;

  // Auto-detect external links
  const isExternal =
    external ||
    (props.href &&
      (props.href.startsWith('http') ||
        props.href.startsWith('mailto:') ||
        props.href.startsWith('tel:')));

  const finalTarget = target || (isExternal ? '_blank' : undefined);
  const finalRel = rel || (isExternal ? 'noopener noreferrer' : undefined);

  const allDescribedBy =
    [describedBy, descriptionId, isExternal ? externalDescId : undefined]
      .filter(Boolean)
      .join(' ') || undefined;

  return (
    <>
      <a
        {...props}
        className={`accessible-link ${className}`}
        target={finalTarget}
        rel={finalRel}
        aria-label={
          ariaLabel ? t(ariaLabel, { defaultValue: ariaLabel }) : undefined
        }
        aria-describedby={allDescribedBy}
        aria-current={current}
      >
        {children}
      </a>

      {ariaDescription && (
        <div id={descriptionId} className="sr-only">
          {t(ariaDescription, { defaultValue: ariaDescription })}
        </div>
      )}

      {isExternal && (
        <div id={externalDescId} className="sr-only">
          {t('Opens in new window')}
        </div>
      )}
    </>
  );
};

/**
 * List with proper ARIA attributes
 */
interface AccessibleListProps {
  children: React.ReactNode;
  ordered?: boolean;
  role?: 'list' | 'menu' | 'menubar' | 'tablist' | 'tree' | 'grid';
  ariaLabel?: string;
  ariaDescription?: string;
  className?: string;
}

export const AccessibleList: React.FC<AccessibleListProps> = ({
  children,
  ordered = false,
  role = 'list',
  ariaLabel,
  ariaDescription,
  className = '',
}) => {
  const { t } = useTranslation('accessibility');
  const { generateId } = useARIA();

  const descriptionId = ariaDescription ? generateId('list-desc') : undefined;
  const ListTag = ordered ? 'ol' : 'ul';

  return (
    <>
      <ListTag
        className={`accessible-list ${className}`}
        role={role}
        aria-label={
          ariaLabel ? t(ariaLabel, { defaultValue: ariaLabel }) : undefined
        }
        aria-describedby={descriptionId}
      >
        {children}
      </ListTag>

      {ariaDescription && (
        <div id={descriptionId} className="sr-only">
          {t(ariaDescription, { defaultValue: ariaDescription })}
        </div>
      )}
    </>
  );
};

/**
 * List Item with proper ARIA attributes
 */
interface AccessibleListItemProps {
  children: React.ReactNode;
  role?: 'listitem' | 'menuitem' | 'tab' | 'treeitem' | 'gridcell' | 'option';
  selected?: boolean;
  current?: boolean;
  expanded?: boolean;
  level?: number;
  setSize?: number;
  posInSet?: number;
  className?: string;
}

export const AccessibleListItem: React.FC<AccessibleListItemProps> = ({
  children,
  role = 'listitem',
  selected,
  current,
  expanded,
  level,
  setSize,
  posInSet,
  className = '',
}) => {
  return (
    <li
      className={`accessible-list-item ${className}`}
      role={role}
      aria-selected={selected}
      aria-current={current}
      aria-expanded={expanded}
      aria-level={level}
      aria-setsize={setSize}
      aria-posinset={posInSet}
      tabIndex={
        role === 'menuitem' || role === 'tab' || role === 'option'
          ? -1
          : undefined
      }
    >
      {children}
    </li>
  );
};

/**
 * Form Group with proper ARIA attributes
 */
interface AccessibleFormGroupProps {
  children: React.ReactNode;
  legend: string;
  description?: string;
  required?: boolean;
  invalid?: boolean;
  className?: string;
}

export const AccessibleFormGroup: React.FC<AccessibleFormGroupProps> = ({
  children,
  legend,
  description,
  required = false,
  invalid = false,
  className = '',
}) => {
  const { t } = useTranslation('accessibility');
  const { generateId } = useARIA();

  const descriptionId = description ? generateId('group-desc') : undefined;

  return (
    <fieldset
      className={`accessible-form-group ${className}`}
      aria-required={required}
      aria-invalid={invalid}
      aria-describedby={descriptionId}
    >
      <legend className="accessible-legend">
        {t(legend, { defaultValue: legend })}
        {required && <span aria-label={t('required')}> *</span>}
      </legend>

      {description && (
        <div id={descriptionId} className="accessible-description">
          {t(description, { defaultValue: description })}
        </div>
      )}

      {children}
    </fieldset>
  );
};

/**
 * Dialog/Modal with proper ARIA attributes
 */
interface AccessibleDialogProps {
  children: React.ReactNode;
  title: string;
  description?: string;
  open: boolean;
  modal?: boolean;
  labelledBy?: string;
  describedBy?: string;
  className?: string;
  onClose?: () => void;
}

export const AccessibleDialog: React.FC<AccessibleDialogProps> = ({
  children,
  title,
  description,
  open,
  modal = true,
  labelledBy,
  describedBy,
  className = '',
  onClose,
}) => {
  const { t } = useTranslation('accessibility');
  const { generateId } = useARIA();

  const titleId = labelledBy || generateId('dialog-title');
  const descriptionId = description
    ? describedBy || generateId('dialog-desc')
    : undefined;

  const finalDescribedBy =
    [describedBy, descriptionId].filter(Boolean).join(' ') || undefined;

  if (!open) return null;

  return (
    <div
      className={`accessible-dialog ${className}`}
      role="dialog"
      aria-modal={modal}
      aria-labelledby={titleId}
      aria-describedby={finalDescribedBy}
      tabIndex={-1}
    >
      {!labelledBy && (
        <h2 id={titleId} className="accessible-dialog-title">
          {t(title, { defaultValue: title })}
        </h2>
      )}

      {description && !describedBy && (
        <div id={descriptionId} className="accessible-dialog-description">
          {t(description, { defaultValue: description })}
        </div>
      )}

      {children}
    </div>
  );
};

/**
 * Status/Alert Component
 */
interface AccessibleStatusProps {
  children: React.ReactNode;
  type?: 'status' | 'alert' | 'log';
  live?: 'polite' | 'assertive' | 'off';
  atomic?: boolean;
  className?: string;
}

export const AccessibleStatus: React.FC<AccessibleStatusProps> = ({
  children,
  type = 'status',
  live = 'polite',
  atomic = true,
  className = '',
}) => {
  return (
    <div
      className={`accessible-status ${className}`}
      role={type}
      aria-live={live}
      aria-atomic={atomic}
    >
      {children}
    </div>
  );
};

/**
 * Progress Component
 */
interface AccessibleProgressProps {
  value: number;
  max?: number;
  label?: string;
  description?: string;
  className?: string;
}

export const AccessibleProgress: React.FC<AccessibleProgressProps> = ({
  value,
  max = 100,
  label,
  description,
  className = '',
}) => {
  const { t } = useTranslation('accessibility');
  const { generateId } = useARIA();

  const labelId = label ? generateId('progress-label') : undefined;
  const descriptionId = description ? generateId('progress-desc') : undefined;

  const percentage = Math.round((value / max) * 100);

  return (
    <>
      {label && (
        <div id={labelId} className="accessible-progress-label">
          {t(label, { defaultValue: label })}
        </div>
      )}

      {description && (
        <div id={descriptionId} className="accessible-progress-description">
          {t(description, { defaultValue: description })}
        </div>
      )}

      <div
        className={`accessible-progress ${className}`}
        role="progressbar"
        aria-valuenow={value}
        aria-valuemin={0}
        aria-valuemax={max}
        aria-valuetext={t('{{percentage}} percent complete', { percentage })}
        aria-labelledby={labelId}
        aria-describedby={descriptionId}
      >
        <div
          className="accessible-progress-bar"
          style={{ width: `${percentage}%` }}
          aria-hidden="true"
        />
      </div>
    </>
  );
};

/**
 * Utility hook for managing ARIA attributes
 */
export function useARIAAttributes(
  elementRef: React.RefObject<HTMLElement>,
  attributes: Record<string, any>,
) {
  useEffect(() => {
    const element = elementRef.current;
    if (!element) return;

    // Set ARIA attributes
    Object.entries(attributes).forEach(([key, value]) => {
      if (value !== null && value !== undefined) {
        element.setAttribute(key, String(value));
      } else {
        element.removeAttribute(key);
      }
    });

    // Cleanup
    return () => {
      Object.keys(attributes).forEach((key) => {
        element.removeAttribute(key);
      });
    };
  }, [elementRef, attributes]);
}

/**
 * Higher-order component for adding ARIA attributes
 */
export function withARIA<P extends Record<string, any>>(
  Component: React.ComponentType<P>,
  ariaProps: Record<string, any>,
) {
  const WithARIAComponent = React.forwardRef<any, P>((props, ref) => {
    const mergedProps = { ...props, ...ariaProps };
    return <Component {...mergedProps} ref={ref} />;
  });

  WithARIAComponent.displayName = `withARIA(${
    Component.displayName || Component.name || 'Component'
  })`;

  return WithARIAComponent;
}
