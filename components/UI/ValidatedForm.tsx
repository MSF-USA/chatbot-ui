/**
 * Validated Form Component
 *
 * Enhanced form wrapper with comprehensive validation, accessibility features,
 * and progressive disclosure of validation rules.
 */
import {
  IconAlertTriangle,
  IconCheck,
  IconInfoCircle,
  IconLoader,
  IconX,
} from '@tabler/icons-react';
import React, { useCallback, useEffect, useRef, useState } from 'react';

import { useTranslation } from 'next-i18next';

import { ValidationResult } from './ValidatedInput';

/**
 * Form field configuration
 */
export interface FormField {
  name: string;
  validation?: ValidationResult;
  required?: boolean;
}

/**
 * Form validation state
 */
export interface FormValidation {
  isValid: boolean;
  errors: Record<string, string[]>;
  warnings: Record<string, string[]>;
  fieldCount: number;
  validFieldCount: number;
}

/**
 * Component props
 */
export interface ValidatedFormProps {
  children: React.ReactNode;
  onSubmit?: (
    formData: FormData,
    validation: FormValidation,
  ) => void | Promise<void>;
  onValidationChange?: (validation: FormValidation) => void;
  showProgress?: boolean;
  showSummary?: boolean;
  validateOnChange?: boolean;
  preventInvalidSubmit?: boolean;
  autoFocusFirstError?: boolean;
  className?: string;
  // Accessibility
  ariaLabel?: string;
  ariaDescribedBy?: string;
}

/**
 * Validated Form Component
 */
export const ValidatedForm: React.FC<ValidatedFormProps> = ({
  children,
  onSubmit,
  onValidationChange,
  showProgress = true,
  showSummary = true,
  validateOnChange = true,
  preventInvalidSubmit = true,
  autoFocusFirstError = true,
  className = '',
  ariaLabel,
  ariaDescribedBy,
}) => {
  const { t } = useTranslation('validation');

  // State
  const [fields, setFields] = useState<Map<string, FormField>>(new Map());
  const [formValidation, setFormValidation] = useState<FormValidation>({
    isValid: true,
    errors: {},
    warnings: {},
    fieldCount: 0,
    validFieldCount: 0,
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [hasSubmitted, setHasSubmitted] = useState(false);

  // Refs
  const formRef = useRef<HTMLFormElement>(null);
  const formId = `form-${Math.random().toString(36).substr(2, 9)}`;
  const summaryId = `${formId}-summary`;
  const progressId = `${formId}-progress`;

  /**
   * Register a form field
   */
  const registerField = useCallback(
    (name: string, field: Partial<FormField>) => {
      setFields((prev) => {
        const newFields = new Map(prev);
        newFields.set(name, {
          name,
          required: false,
          ...prev.get(name),
          ...field,
        });
        return newFields;
      });
    },
    [],
  );

  /**
   * Update field validation
   */
  const updateFieldValidation = useCallback(
    (name: string, validation: ValidationResult) => {
      setFields((prev) => {
        const newFields = new Map(prev);
        const field = newFields.get(name);
        if (field) {
          newFields.set(name, { ...field, validation });
        }
        return newFields;
      });
    },
    [],
  );

  /**
   * Calculate form validation state
   */
  const calculateFormValidation = useCallback(() => {
    const errors: Record<string, string[]> = {};
    const warnings: Record<string, string[]> = {};
    let validFieldCount = 0;
    const fieldCount = fields.size;

    for (const [name, field] of fields.entries()) {
      if (field.validation) {
        if (field.validation.errors.length > 0) {
          errors[name] = field.validation.errors;
        } else {
          validFieldCount++;
        }

        if (field.validation.warnings.length > 0) {
          warnings[name] = field.validation.warnings;
        }
      } else if (!field.required) {
        validFieldCount++;
      }
    }

    const newValidation: FormValidation = {
      isValid: Object.keys(errors).length === 0,
      errors,
      warnings,
      fieldCount,
      validFieldCount,
    };

    setFormValidation(newValidation);
    onValidationChange?.(newValidation);

    return newValidation;
  }, [fields, onValidationChange]);

  /**
   * Handle form submission
   */
  const handleSubmit = useCallback(
    async (e: React.FormEvent<HTMLFormElement>) => {
      e.preventDefault();
      setHasSubmitted(true);

      const validation = calculateFormValidation();

      if (preventInvalidSubmit && !validation.isValid) {
        // Focus first error field
        if (autoFocusFirstError) {
          const firstErrorField = Object.keys(validation.errors)[0];
          if (firstErrorField) {
            const fieldElement = formRef.current?.querySelector(
              `[name="${firstErrorField}"]`,
            ) as HTMLElement;
            fieldElement?.focus();
          }
        }
        return;
      }

      if (!onSubmit) return;

      setIsSubmitting(true);
      try {
        const formData = new FormData(e.currentTarget);
        await onSubmit(formData, validation);
      } catch (error) {
        console.error('Form submission error:', error);
      } finally {
        setIsSubmitting(false);
      }
    },
    [
      calculateFormValidation,
      preventInvalidSubmit,
      autoFocusFirstError,
      onSubmit,
    ],
  );

  /**
   * Get progress percentage
   */
  const getProgressPercentage = () => {
    if (formValidation.fieldCount === 0) return 0;
    return Math.round(
      (formValidation.validFieldCount / formValidation.fieldCount) * 100,
    );
  };

  /**
   * Get progress color
   */
  const getProgressColor = () => {
    const percentage = getProgressPercentage();
    if (percentage === 100) return 'bg-green-500';
    if (percentage >= 75) return 'bg-blue-500';
    if (percentage >= 50) return 'bg-yellow-500';
    return 'bg-red-500';
  };

  // Recalculate validation when fields change
  useEffect(() => {
    if (validateOnChange) {
      calculateFormValidation();
    }
  }, [fields, validateOnChange, calculateFormValidation]);

  // Provide context to child components
  const formContext = React.useMemo(
    () => ({
      registerField,
      updateFieldValidation,
      formValidation,
      hasSubmitted,
    }),
    [registerField, updateFieldValidation, formValidation, hasSubmitted],
  );

  return (
    <div className={className}>
      {/* Form progress */}
      {showProgress && formValidation.fieldCount > 0 && (
        <div
          id={progressId}
          className="mb-4"
          role="progressbar"
          aria-valuenow={getProgressPercentage()}
          aria-valuemin={0}
          aria-valuemax={100}
          aria-label={t('Form completion progress')}
        >
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
              {t('Progress')}
            </span>
            <span className="text-sm text-gray-600 dark:text-gray-400">
              {formValidation.validFieldCount}/{formValidation.fieldCount}{' '}
              {t('fields completed')}
            </span>
          </div>

          <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2">
            <div
              className={`h-2 rounded-full transition-all duration-300 ${getProgressColor()}`}
              style={{ width: `${getProgressPercentage()}%` }}
              aria-hidden="true"
            />
          </div>
        </div>
      )}

      {/* Form validation summary */}
      {showSummary && hasSubmitted && !formValidation.isValid && (
        <div
          id={summaryId}
          role="alert"
          aria-live="polite"
          className="mb-4 p-4 bg-red-50 border border-red-200 rounded-md dark:bg-red-900/20 dark:border-red-800"
        >
          <div className="flex items-start gap-3">
            <IconAlertTriangle className="h-5 w-5 text-red-500 mt-0.5 flex-shrink-0" />
            <div>
              <h3 className="text-sm font-medium text-red-800 dark:text-red-300 mb-2">
                {t('Please correct the following errors:')}
              </h3>
              <ul className="text-sm text-red-700 dark:text-red-400 space-y-1">
                {Object.entries(formValidation.errors).map(
                  ([fieldName, fieldErrors]) => (
                    <li key={fieldName}>
                      <button
                        type="button"
                        onClick={() => {
                          const fieldElement = formRef.current?.querySelector(
                            `[name="${fieldName}"]`,
                          ) as HTMLElement;
                          fieldElement?.focus();
                        }}
                        className="text-left hover:underline focus:underline focus:outline-none"
                      >
                        <strong>{fieldName}:</strong> {fieldErrors.join(', ')}
                      </button>
                    </li>
                  ),
                )}
              </ul>
            </div>
          </div>
        </div>
      )}

      {/* Success summary */}
      {showSummary && hasSubmitted && formValidation.isValid && (
        <div className="mb-4 p-4 bg-green-50 border border-green-200 rounded-md dark:bg-green-900/20 dark:border-green-800">
          <div className="flex items-center gap-3">
            <IconCheck className="h-5 w-5 text-green-500" />
            <p className="text-sm text-green-800 dark:text-green-300">
              {t('All fields are valid and ready for submission.')}
            </p>
          </div>
        </div>
      )}

      {/* Form */}
      <form
        ref={formRef}
        onSubmit={handleSubmit}
        aria-label={ariaLabel}
        aria-describedby={ariaDescribedBy}
        noValidate
      >
        <FormContextProvider value={formContext}>
          {children}
        </FormContextProvider>
      </form>
    </div>
  );
};

/**
 * Form Context
 */
const FormContext = React.createContext<{
  registerField: (name: string, field: Partial<FormField>) => void;
  updateFieldValidation: (name: string, validation: ValidationResult) => void;
  formValidation: FormValidation;
  hasSubmitted: boolean;
} | null>(null);

const FormContextProvider = FormContext.Provider;

/**
 * Hook to use form context
 */
export function useFormContext() {
  const context = React.useContext(FormContext);
  if (!context) {
    throw new Error('useFormContext must be used within a ValidatedForm');
  }
  return context;
}

/**
 * Enhanced ValidatedInput that integrates with form context
 */
export const FormValidatedInput: React.FC<
  React.ComponentProps<typeof import('./ValidatedInput').ValidatedInput>
> = (props) => {
  const { ValidatedInput } = require('./ValidatedInput');
  const formContext = React.useContext(FormContext);

  const handleValidationChange = React.useCallback(
    (validation: ValidationResult) => {
      if (formContext && props.name) {
        formContext.updateFieldValidation(props.name, validation);
      }
      props.onValidationChange?.(validation);
    },
    [formContext, props],
  );

  React.useEffect(() => {
    if (formContext && props.name) {
      formContext.registerField(props.name, {
        name: props.name,
        required: props.rules?.some((rule) => rule.type === 'required'),
      });
    }
  }, [formContext, props.name, props.rules]);

  return (
    <ValidatedInput {...props} onValidationChange={handleValidationChange} />
  );
};
