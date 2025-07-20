/**
 * Error Toast Component
 * 
 * Lightweight toast notifications for errors that don't require
 * full error message components. Supports auto-dismiss and actions.
 */

import React, { useEffect, useState, useCallback } from 'react';
import { useTranslation } from 'next-i18next';
import {
  IconX,
  IconAlertTriangle,
  IconInfoCircle,
  IconCheck,
  IconExclamationMark,
  IconRefresh,
} from '@tabler/icons-react';

import { AgentError, ErrorSeverity } from '@/services/agentErrorHandlingService';

/**
 * Toast types
 */
export enum ToastType {
  ERROR = 'error',
  WARNING = 'warning',
  INFO = 'info',
  SUCCESS = 'success',
}

/**
 * Toast item interface
 */
export interface ToastItem {
  id: string;
  type: ToastType;
  title: string;
  message?: string;
  duration?: number;
  persistent?: boolean;
  actions?: ToastAction[];
  error?: AgentError;
}

/**
 * Toast action interface
 */
export interface ToastAction {
  label: string;
  onClick: () => void;
  primary?: boolean;
}

/**
 * Individual toast component props
 */
interface ErrorToastProps {
  toast: ToastItem;
  onDismiss: (id: string) => void;
  onAction?: (id: string, action: ToastAction) => void;
}

/**
 * Get toast styling based on type
 */
const getToastStyles = (type: ToastType) => {
  switch (type) {
    case ToastType.ERROR:
      return {
        container: 'bg-red-50 border-red-200 dark:bg-red-900/20 dark:border-red-800',
        icon: 'text-red-500',
        title: 'text-red-800 dark:text-red-300',
        message: 'text-red-700 dark:text-red-400',
        button: 'text-red-800 hover:bg-red-100 dark:text-red-300 dark:hover:bg-red-800/30',
        action: 'bg-red-500 hover:bg-red-600 text-white',
        actionSecondary: 'border-red-300 text-red-700 hover:bg-red-50 dark:border-red-600 dark:text-red-300 dark:hover:bg-red-900/30',
      };
    case ToastType.WARNING:
      return {
        container: 'bg-yellow-50 border-yellow-200 dark:bg-yellow-900/20 dark:border-yellow-800',
        icon: 'text-yellow-500',
        title: 'text-yellow-800 dark:text-yellow-300',
        message: 'text-yellow-700 dark:text-yellow-400',
        button: 'text-yellow-800 hover:bg-yellow-100 dark:text-yellow-300 dark:hover:bg-yellow-800/30',
        action: 'bg-yellow-500 hover:bg-yellow-600 text-white',
        actionSecondary: 'border-yellow-300 text-yellow-700 hover:bg-yellow-50 dark:border-yellow-600 dark:text-yellow-300 dark:hover:bg-yellow-900/30',
      };
    case ToastType.INFO:
      return {
        container: 'bg-blue-50 border-blue-200 dark:bg-blue-900/20 dark:border-blue-800',
        icon: 'text-blue-500',
        title: 'text-blue-800 dark:text-blue-300',
        message: 'text-blue-700 dark:text-blue-400',
        button: 'text-blue-800 hover:bg-blue-100 dark:text-blue-300 dark:hover:bg-blue-800/30',
        action: 'bg-blue-500 hover:bg-blue-600 text-white',
        actionSecondary: 'border-blue-300 text-blue-700 hover:bg-blue-50 dark:border-blue-600 dark:text-blue-300 dark:hover:bg-blue-900/30',
      };
    case ToastType.SUCCESS:
      return {
        container: 'bg-green-50 border-green-200 dark:bg-green-900/20 dark:border-green-800',
        icon: 'text-green-500',
        title: 'text-green-800 dark:text-green-300',
        message: 'text-green-700 dark:text-green-400',
        button: 'text-green-800 hover:bg-green-100 dark:text-green-300 dark:hover:bg-green-800/30',
        action: 'bg-green-500 hover:bg-green-600 text-white',
        actionSecondary: 'border-green-300 text-green-700 hover:bg-green-50 dark:border-green-600 dark:text-green-300 dark:hover:bg-green-900/30',
      };
    default:
      return {
        container: 'bg-gray-50 border-gray-200 dark:bg-gray-900/20 dark:border-gray-800',
        icon: 'text-gray-500',
        title: 'text-gray-800 dark:text-gray-300',
        message: 'text-gray-700 dark:text-gray-400',
        button: 'text-gray-800 hover:bg-gray-100 dark:text-gray-300 dark:hover:bg-gray-800/30',
        action: 'bg-gray-500 hover:bg-gray-600 text-white',
        actionSecondary: 'border-gray-300 text-gray-700 hover:bg-gray-50 dark:border-gray-600 dark:text-gray-300 dark:hover:bg-gray-900/30',
      };
  }
};

/**
 * Get icon for toast type
 */
const getToastIcon = (type: ToastType) => {
  switch (type) {
    case ToastType.ERROR:
      return IconExclamationMark;
    case ToastType.WARNING:
      return IconAlertTriangle;
    case ToastType.INFO:
      return IconInfoCircle;
    case ToastType.SUCCESS:
      return IconCheck;
    default:
      return IconInfoCircle;
  }
};

/**
 * Individual toast component
 */
export const ErrorToast: React.FC<ErrorToastProps> = ({
  toast,
  onDismiss,
  onAction,
}) => {
  const { t } = useTranslation('errors');
  const [isVisible, setIsVisible] = useState(false);
  const [isLeaving, setIsLeaving] = useState(false);

  const styles = getToastStyles(toast.type);
  const Icon = getToastIcon(toast.type);

  // Auto-dismiss timer
  useEffect(() => {
    if (!toast.persistent && toast.duration && toast.duration > 0) {
      const timer = setTimeout(() => {
        handleDismiss();
      }, toast.duration);

      return () => clearTimeout(timer);
    }
  }, [toast.duration, toast.persistent]);

  // Animation effects
  useEffect(() => {
    const timer = setTimeout(() => setIsVisible(true), 50);
    return () => clearTimeout(timer);
  }, []);

  const handleDismiss = useCallback(() => {
    setIsLeaving(true);
    setTimeout(() => {
      onDismiss(toast.id);
    }, 200);
  }, [toast.id, onDismiss]);

  const handleAction = useCallback((action: ToastAction) => {
    action.onClick();
    onAction?.(toast.id, action);
    if (!toast.persistent) {
      handleDismiss();
    }
  }, [toast.id, toast.persistent, onAction, handleDismiss]);

  return (
    <div
      className={`
        transform transition-all duration-200 ease-out
        ${isVisible && !isLeaving ? 'translate-x-0 opacity-100' : 'translate-x-full opacity-0'}
        max-w-sm w-full border rounded-lg shadow-lg pointer-events-auto
        ${styles.container}
      `}
      role="alert"
      aria-live="polite"
    >
      <div className="p-4">
        <div className="flex items-start">
          <div className="flex-shrink-0">
            <Icon className={`h-5 w-5 ${styles.icon}`} aria-hidden="true" />
          </div>
          
          <div className="ml-3 w-0 flex-1">
            <p className={`text-sm font-medium ${styles.title}`}>
              {toast.title}
            </p>
            
            {toast.message && (
              <p className={`mt-1 text-sm ${styles.message}`}>
                {toast.message}
              </p>
            )}

            {/* Error details for error toasts */}
            {toast.error && (
              <div className="mt-2 text-xs opacity-75">
                <span className={styles.message}>
                  {toast.error.agentType} • {toast.error.code}
                </span>
              </div>
            )}

            {/* Actions */}
            {toast.actions && toast.actions.length > 0 && (
              <div className="mt-3 flex flex-wrap gap-2">
                {toast.actions.map((action, index) => (
                  <button
                    key={index}
                    onClick={() => handleAction(action)}
                    className={`
                      inline-flex items-center px-3 py-1.5 rounded-md text-xs font-medium
                      transition-colors focus:outline-none focus:ring-2 focus:ring-offset-2
                      ${action.primary 
                        ? styles.action 
                        : `border ${styles.actionSecondary}`
                      }
                    `}
                  >
                    {action.label}
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Dismiss button */}
          <div className="ml-4 flex-shrink-0 flex">
            <button
              onClick={handleDismiss}
              className={`
                inline-flex rounded-md p-1.5 transition-colors
                focus:outline-none focus:ring-2 focus:ring-offset-2
                ${styles.button}
              `}
              aria-label={t('Dismiss')}
            >
              <IconX className="h-4 w-4" aria-hidden="true" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

/**
 * Toast container component
 */
interface ToastContainerProps {
  toasts: ToastItem[];
  position?: 'top-right' | 'top-left' | 'bottom-right' | 'bottom-left';
  onDismiss: (id: string) => void;
  onAction?: (id: string, action: ToastAction) => void;
}

export const ToastContainer: React.FC<ToastContainerProps> = ({
  toasts,
  position = 'top-right',
  onDismiss,
  onAction,
}) => {
  const getPositionStyles = () => {
    switch (position) {
      case 'top-right':
        return 'top-4 right-4';
      case 'top-left':
        return 'top-4 left-4';
      case 'bottom-right':
        return 'bottom-4 right-4';
      case 'bottom-left':
        return 'bottom-4 left-4';
      default:
        return 'top-4 right-4';
    }
  };

  if (toasts.length === 0) {
    return null;
  }

  return (
    <div
      className={`fixed z-50 flex flex-col gap-2 ${getPositionStyles()}`}
      aria-live="polite"
      aria-label="Error notifications"
    >
      {toasts.map((toast) => (
        <ErrorToast
          key={toast.id}
          toast={toast}
          onDismiss={onDismiss}
          onAction={onAction}
        />
      ))}
    </div>
  );
};

/**
 * Utility function to create error toasts from AgentError
 */
export function createErrorToast(
  error: AgentError,
  options: {
    title?: string;
    duration?: number;
    persistent?: boolean;
    actions?: ToastAction[];
  } = {}
): ToastItem {
  const severity = error.severity;
  
  let type: ToastType;
  switch (severity) {
    case ErrorSeverity.LOW:
      type = ToastType.INFO;
      break;
    case ErrorSeverity.MEDIUM:
      type = ToastType.WARNING;
      break;
    case ErrorSeverity.HIGH:
    case ErrorSeverity.CRITICAL:
      type = ToastType.ERROR;
      break;
    default:
      type = ToastType.ERROR;
  }

  return {
    id: error.id,
    type,
    title: options.title || `${error.agentType} Error`,
    message: error.userMessage,
    duration: options.duration || (type === ToastType.ERROR ? 10000 : 5000),
    persistent: options.persistent || false,
    actions: options.actions,
    error,
  };
}

/**
 * Utility function to create success toasts
 */
export function createSuccessToast(
  title: string,
  message?: string,
  duration = 3000
): ToastItem {
  return {
    id: `success-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
    type: ToastType.SUCCESS,
    title,
    message,
    duration,
    persistent: false,
  };
}