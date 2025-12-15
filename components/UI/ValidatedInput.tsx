/**
 * Validated Input Component
 *
 * Enhanced input component with real-time validation, accessibility features,
 * and user-friendly error messaging. Supports various validation types and patterns.
 */
import {
  IconAlertTriangle,
  IconCheck,
  IconEye,
  IconEyeOff,
  IconInfoCircle,
  IconLoader,
  IconX,
} from '@tabler/icons-react';
import React, {
  forwardRef,
  useCallback,
  useEffect,
  useRef,
  useState,
} from 'react';

import { useTranslation } from 'next-i18next';

/**
 * Validation rule interface
 */
export interface ValidationRule {
  type:
    | 'required'
    | 'minLength'
    | 'maxLength'
    | 'pattern'
    | 'email'
    | 'url'
    | 'custom';
  value?: any;
  message?: string;
  validator?: (value: string) => boolean | string | Promise<boolean | string>;
}

/**
 * Validation result
 */
export interface ValidationResult {
  isValid: boolean;
  errors: string[];
  warnings: string[];
}

/**
 * Component props
 */
export interface ValidatedInputProps
  extends Omit<React.InputHTMLAttributes<HTMLInputElement>, 'onChange'> {
  label?: string;
  description?: string;
  rules?: ValidationRule[];
  validateOnChange?: boolean;
  validateOnBlur?: boolean;
  validateOnMount?: boolean;
  showValidIcon?: boolean;
  showErrorIcon?: boolean;
  showWarningIcon?: boolean;
  debounceMs?: number;
  asyncValidation?: boolean;
  helperText?: string;
  onChange?: (value: string, validation: ValidationResult) => void;
  onValidationChange?: (validation: ValidationResult) => void;
  // Accessibility
  ariaDescribedBy?: string;
  errorId?: string;
  helperId?: string;
}

/**
 * Validated Input Component
 */
export const ValidatedInput = forwardRef<HTMLInputElement, ValidatedInputProps>(
  (
    {
      label,
      description,
      rules = [],
      validateOnChange = true,
      validateOnBlur = true,
      validateOnMount = false,
      showValidIcon = true,
      showErrorIcon = true,
      showWarningIcon = true,
      debounceMs = 300,
      asyncValidation = false,
      helperText,
      onChange,
      onValidationChange,
      className = '',
      type = 'text',
      ariaDescribedBy,
      errorId,
      helperId,
      ...inputProps
    },
    ref,
  ) => {
    const { t } = useTranslation('validation');

    // State
    const [value, setValue] = useState(
      inputProps.defaultValue?.toString() || '',
    );
    const [validation, setValidation] = useState<ValidationResult>({
      isValid: true,
      errors: [],
      warnings: [],
    });
    const [isValidating, setIsValidating] = useState(false);
    const [isFocused, setIsFocused] = useState(false);
    const [showPassword, setShowPassword] = useState(false);
    const [hasInteracted, setHasInteracted] = useState(false);

    // Refs
    const validationTimeoutRef = useRef<NodeJS.Timeout | null>(null);
    const inputRef = useRef<HTMLInputElement>(null);

    // Generate IDs for accessibility
    const inputId =
      inputProps.id || `input-${Math.random().toString(36).substr(2, 9)}`;
    const finalErrorId = errorId || `${inputId}-error`;
    const finalHelperId = helperId || `${inputId}-helper`;
    const descriptionId = `${inputId}-description`;

    /**
     * Validate input value
     */
    const validateValue = useCallback(
      async (inputValue: string): Promise<ValidationResult> => {
        const errors: string[] = [];
        const warnings: string[] = [];

        for (const rule of rules) {
          switch (rule.type) {
            case 'required':
              if (!inputValue.trim()) {
                errors.push(rule.message || t('This field is required'));
              }
              break;

            case 'minLength':
              if (inputValue.length < (rule.value || 0)) {
                errors.push(
                  rule.message ||
                    t('Must be at least {{min}} characters', {
                      min: rule.value,
                    }),
                );
              }
              break;

            case 'maxLength':
              if (inputValue.length > (rule.value || Infinity)) {
                if (inputValue.length > (rule.value || 0) * 1.1) {
                  errors.push(
                    rule.message ||
                      t('Must be no more than {{max}} characters', {
                        max: rule.value,
                      }),
                  );
                } else {
                  warnings.push(
                    t('Approaching character limit ({{current}}/{{max}})', {
                      current: inputValue.length,
                      max: rule.value,
                    }),
                  );
                }
              }
              break;

            case 'pattern':
              if (rule.value && !new RegExp(rule.value).test(inputValue)) {
                errors.push(rule.message || t('Invalid format'));
              }
              break;

            case 'email':
              if (
                inputValue &&
                !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(inputValue)
              ) {
                errors.push(
                  rule.message || t('Please enter a valid email address'),
                );
              }
              break;

            case 'url':
              if (inputValue) {
                try {
                  new URL(inputValue);
                } catch {
                  errors.push(rule.message || t('Please enter a valid URL'));
                }
              }
              break;

            case 'custom':
              if (rule.validator) {
                try {
                  const result = await rule.validator(inputValue);
                  if (typeof result === 'string') {
                    errors.push(result);
                  } else if (!result) {
                    errors.push(rule.message || t('Invalid value'));
                  }
                } catch (error) {
                  errors.push(rule.message || t('Validation error'));
                }
              }
              break;
          }
        }

        return {
          isValid: errors.length === 0,
          errors,
          warnings,
        };
      },
      [rules, t],
    );

    /**
     * Debounced validation
     */
    const debouncedValidate = useCallback(
      async (inputValue: string) => {
        if (validationTimeoutRef.current) {
          clearTimeout(validationTimeoutRef.current);
        }

        if (asyncValidation) {
          setIsValidating(true);
        }

        validationTimeoutRef.current = setTimeout(async () => {
          const result = await validateValue(inputValue);
          setValidation(result);
          setIsValidating(false);
          onValidationChange?.(result);
        }, debounceMs);
      },
      [validateValue, debounceMs, asyncValidation, onValidationChange],
    );

    /**
     * Handle input change
     */
    const handleChange = useCallback(
      (e: React.ChangeEvent<HTMLInputElement>) => {
        const newValue = e.target.value;
        setValue(newValue);
        setHasInteracted(true);

        onChange?.(newValue, validation);

        if (validateOnChange && hasInteracted) {
          debouncedValidate(newValue);
        }
      },
      [
        onChange,
        validation,
        validateOnChange,
        hasInteracted,
        debouncedValidate,
      ],
    );

    /**
     * Handle input blur
     */
    const handleBlur = useCallback(
      async (e: React.FocusEvent<HTMLInputElement>) => {
        setIsFocused(false);
        setHasInteracted(true);

        if (validateOnBlur) {
          const result = await validateValue(e.target.value);
          setValidation(result);
          onValidationChange?.(result);
        }

        inputProps.onBlur?.(e);
      },
      [validateOnBlur, validateValue, onValidationChange, inputProps],
    );

    /**
     * Handle input focus
     */
    const handleFocus = useCallback(
      (e: React.FocusEvent<HTMLInputElement>) => {
        setIsFocused(true);
        inputProps.onFocus?.(e);
      },
      [inputProps],
    );

    /**
     * Get input styling based on validation state
     */
    const getInputStyling = () => {
      const baseClasses = `
      block w-full px-3 py-2 border rounded-md shadow-sm
      placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-offset-0
      transition-colors duration-200
      dark:bg-gray-700 dark:border-gray-600 dark:text-gray-100
      dark:placeholder-gray-500
    `;

      if (!hasInteracted || isValidating) {
        return `${baseClasses} border-gray-300 focus:border-blue-500 focus:ring-blue-500`;
      }

      if (validation.errors.length > 0) {
        return `${baseClasses} border-red-300 focus:border-red-500 focus:ring-red-500
              dark:border-red-600 dark:focus:border-red-400`;
      }

      if (validation.warnings.length > 0) {
        return `${baseClasses} border-yellow-300 focus:border-yellow-500 focus:ring-yellow-500
              dark:border-yellow-600 dark:focus:border-yellow-400`;
      }

      if (validation.isValid && value) {
        return `${baseClasses} border-green-300 focus:border-green-500 focus:ring-green-500
              dark:border-green-600 dark:focus:border-green-400`;
      }

      return `${baseClasses} border-gray-300 focus:border-blue-500 focus:ring-blue-500`;
    };

    /**
     * Get validation icon
     */
    const getValidationIcon = () => {
      if (isValidating) {
        return <IconLoader className="h-4 w-4 animate-spin text-gray-400" />;
      }

      if (!hasInteracted) {
        return null;
      }

      if (validation.errors.length > 0 && showErrorIcon) {
        return <IconX className="h-4 w-4 text-red-500" />;
      }

      if (validation.warnings.length > 0 && showWarningIcon) {
        return <IconAlertTriangle className="h-4 w-4 text-yellow-500" />;
      }

      if (validation.isValid && value && showValidIcon) {
        return <IconCheck className="h-4 w-4 text-green-500" />;
      }

      return null;
    };

    /**
     * Get ARIA described by
     */
    const getAriaDescribedBy = () => {
      const ids = [];

      if (description) ids.push(descriptionId);
      if (helperText) ids.push(finalHelperId);
      if (validation.errors.length > 0) ids.push(finalErrorId);
      if (ariaDescribedBy) ids.push(ariaDescribedBy);

      return ids.length > 0 ? ids.join(' ') : undefined;
    };

    // Validate on mount if requested
    useEffect(() => {
      if (validateOnMount && value) {
        debouncedValidate(value);
      }
    }, [validateOnMount, value, debouncedValidate]);

    // Cleanup timeout on unmount
    useEffect(() => {
      return () => {
        if (validationTimeoutRef.current) {
          clearTimeout(validationTimeoutRef.current);
        }
      };
    }, []);

    // Merge refs
    useEffect(() => {
      if (ref) {
        if (typeof ref === 'function') {
          ref(inputRef.current);
        } else {
          ref.current = inputRef.current;
        }
      }
    }, [ref]);

    return (
      <div className={`space-y-1 ${className}`}>
        {/* Label */}
        {label && (
          <label
            htmlFor={inputId}
            className="block text-sm font-medium text-gray-700 dark:text-gray-300"
          >
            {label}
            {rules.some((rule) => rule.type === 'required') && (
              <span className="text-red-500 ml-1" aria-label="required">
                *
              </span>
            )}
          </label>
        )}

        {/* Description */}
        {description && (
          <p
            id={descriptionId}
            className="text-sm text-gray-600 dark:text-gray-400"
          >
            {description}
          </p>
        )}

        {/* Input container */}
        <div className="relative">
          <input
            {...inputProps}
            ref={inputRef}
            id={inputId}
            type={type === 'password' && showPassword ? 'text' : type}
            value={value}
            onChange={handleChange}
            onBlur={handleBlur}
            onFocus={handleFocus}
            className={`${getInputStyling()} ${
              type === 'password' ? 'pr-20' : 'pr-10'
            }`}
            aria-invalid={validation.errors.length > 0}
            aria-describedby={getAriaDescribedBy()}
          />

          {/* Icons container */}
          <div className="absolute inset-y-0 right-0 flex items-center space-x-1 pr-3">
            {/* Password toggle */}
            {type === 'password' && (
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors"
                aria-label={
                  showPassword ? t('Hide password') : t('Show password')
                }
              >
                {showPassword ? (
                  <IconEyeOff className="h-4 w-4" />
                ) : (
                  <IconEye className="h-4 w-4" />
                )}
              </button>
            )}

            {/* Validation icon */}
            {getValidationIcon()}
          </div>
        </div>

        {/* Helper text */}
        {helperText &&
          !validation.errors.length &&
          !validation.warnings.length && (
            <p
              id={finalHelperId}
              className="text-sm text-gray-600 dark:text-gray-400"
            >
              {helperText}
            </p>
          )}

        {/* Validation messages */}
        {hasInteracted && (
          <div className="space-y-1">
            {/* Errors */}
            {validation.errors.length > 0 && (
              <div id={finalErrorId} role="alert" aria-live="polite">
                {validation.errors.map((error, index) => (
                  <p
                    key={index}
                    className="text-sm text-red-600 dark:text-red-400 flex items-start gap-1"
                  >
                    <IconX className="h-3 w-3 mt-0.5 flex-shrink-0" />
                    {error}
                  </p>
                ))}
              </div>
            )}

            {/* Warnings */}
            {validation.warnings.length > 0 &&
              validation.errors.length === 0 && (
                <div role="status" aria-live="polite">
                  {validation.warnings.map((warning, index) => (
                    <p
                      key={index}
                      className="text-sm text-yellow-600 dark:text-yellow-400 flex items-start gap-1"
                    >
                      <IconAlertTriangle className="h-3 w-3 mt-0.5 flex-shrink-0" />
                      {warning}
                    </p>
                  ))}
                </div>
              )}
          </div>
        )}
      </div>
    );
  },
);

ValidatedInput.displayName = 'ValidatedInput';
