/**
 * Agent Error Message Component
 *
 * User-friendly error display for agent failures with recovery options,
 * clear explanations, and accessibility support.
 */
import {
  IconAlertCircle,
  IconAlertTriangle,
  IconArrowRight,
  IconBug,
  IconClock,
  IconExclamationMark,
  IconHelp,
  IconInfoCircle,
  IconLock,
  IconRefresh,
  IconSettings,
  IconShield,
  IconWifi,
  IconX,
} from '@tabler/icons-react';
import React, { useCallback, useState } from 'react';

import { useTranslation } from 'next-i18next';

import {
  AgentError,
  AgentErrorCategory,
  ErrorRecoveryResult,
  ErrorSeverity,
  RecoveryStrategy,
} from '@/services/agentErrorHandlingService';

import { AgentType } from '@/types/agent';

/**
 * Component props
 */
interface AgentErrorMessageProps {
  error: AgentError;
  onRetry?: () => void;
  onDismiss?: () => void;
  onFallback?: (agentType: AgentType) => void;
  onUserAction?: (action: string) => void;
  showDetails?: boolean;
  compact?: boolean;
}

/**
 * Error category icon mapping
 */
const getCategoryIcon = (category: AgentErrorCategory) => {
  switch (category) {
    case AgentErrorCategory.NETWORK:
      return IconWifi;
    case AgentErrorCategory.AUTHENTICATION:
      return IconLock;
    case AgentErrorCategory.RATE_LIMIT:
    case AgentErrorCategory.QUOTA_EXCEEDED:
      return IconClock;
    case AgentErrorCategory.VALIDATION:
      return IconAlertCircle;
    case AgentErrorCategory.PROCESSING:
      return IconBug;
    case AgentErrorCategory.TIMEOUT:
      return IconClock;
    case AgentErrorCategory.SERVICE_UNAVAILABLE:
      return IconAlertTriangle;
    case AgentErrorCategory.CONFIGURATION:
      return IconSettings;
    case AgentErrorCategory.PERMISSION:
      return IconShield;
    case AgentErrorCategory.CONTENT_FILTER:
      return IconShield;
    default:
      return IconAlertTriangle;
  }
};

/**
 * Error severity styling
 */
const getSeverityStyles = (severity: ErrorSeverity) => {
  switch (severity) {
    case ErrorSeverity.LOW:
      return {
        container:
          'bg-blue-50 border-blue-200 dark:bg-blue-900/20 dark:border-blue-800',
        icon: 'text-blue-500',
        text: 'text-blue-700 dark:text-blue-300',
        button: 'bg-blue-500 hover:bg-blue-600',
      };
    case ErrorSeverity.MEDIUM:
      return {
        container:
          'bg-yellow-50 border-yellow-200 dark:bg-yellow-900/20 dark:border-yellow-800',
        icon: 'text-yellow-500',
        text: 'text-yellow-700 dark:text-yellow-300',
        button: 'bg-yellow-500 hover:bg-yellow-600',
      };
    case ErrorSeverity.HIGH:
      return {
        container:
          'bg-orange-50 border-orange-200 dark:bg-orange-900/20 dark:border-orange-800',
        icon: 'text-orange-500',
        text: 'text-orange-700 dark:text-orange-300',
        button: 'bg-orange-500 hover:bg-orange-600',
      };
    case ErrorSeverity.CRITICAL:
      return {
        container:
          'bg-red-50 border-red-200 dark:bg-red-900/20 dark:border-red-800',
        icon: 'text-red-500',
        text: 'text-red-700 dark:text-red-300',
        button: 'bg-red-500 hover:bg-red-600',
      };
    default:
      return {
        container:
          'bg-gray-50 border-gray-200 dark:bg-gray-900/20 dark:border-gray-800',
        icon: 'text-gray-500',
        text: 'text-gray-700 dark:text-gray-300',
        button: 'bg-gray-500 hover:bg-gray-600',
      };
  }
};

/**
 * Recovery action component
 */
interface RecoveryActionProps {
  strategy: RecoveryStrategy;
  onAction: () => void;
  loading?: boolean;
  disabled?: boolean;
  label?: string;
}

const RecoveryAction: React.FC<RecoveryActionProps> = ({
  strategy,
  onAction,
  loading = false,
  disabled = false,
  label,
}) => {
  const { t } = useTranslation('errors');

  const getActionConfig = () => {
    switch (strategy) {
      case RecoveryStrategy.RETRY:
        return {
          icon: IconRefresh,
          label: label || t('Try Again'),
          color: 'bg-blue-500 hover:bg-blue-600',
        };
      case RecoveryStrategy.FALLBACK:
        return {
          icon: IconArrowRight,
          label: label || t('Use Fallback'),
          color: 'bg-green-500 hover:bg-green-600',
        };
      case RecoveryStrategy.ALTERNATIVE_AGENT:
        return {
          icon: IconArrowRight,
          label: label || t('Try Different Agent'),
          color: 'bg-purple-500 hover:bg-purple-600',
        };
      case RecoveryStrategy.USER_ACTION:
        return {
          icon: IconHelp,
          label: label || t('Get Help'),
          color: 'bg-yellow-500 hover:bg-yellow-600',
        };
      default:
        return {
          icon: IconRefresh,
          label: label || t('Try Again'),
          color: 'bg-gray-500 hover:bg-gray-600',
        };
    }
  };

  const config = getActionConfig();
  const Icon = config.icon;

  return (
    <button
      onClick={onAction}
      disabled={disabled || loading}
      className={`inline-flex items-center gap-2 px-4 py-2 rounded-md text-white text-sm font-medium transition-colors ${
        disabled || loading ? 'bg-gray-400 cursor-not-allowed' : config.color
      }`}
      aria-label={config.label}
    >
      {loading ? (
        <div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent" />
      ) : (
        <Icon className="h-4 w-4" />
      )}
      {config.label}
    </button>
  );
};

/**
 * Error details component
 */
interface ErrorDetailsProps {
  error: AgentError;
  expanded: boolean;
  onToggle: () => void;
}

const ErrorDetails: React.FC<ErrorDetailsProps> = ({
  error,
  expanded,
  onToggle,
}) => {
  const { t } = useTranslation('errors');

  return (
    <div className="mt-3">
      <button
        onClick={onToggle}
        className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400 hover:text-gray-800 dark:hover:text-gray-200 transition-colors"
        aria-expanded={expanded}
        aria-controls="error-details"
      >
        <IconInfoCircle className="h-4 w-4" />
        {expanded ? t('Hide Details') : t('Show Details')}
      </button>

      {expanded && (
        <div
          id="error-details"
          className="mt-2 p-3 bg-gray-100 dark:bg-gray-800 rounded-md text-sm"
        >
          <div className="space-y-2">
            <div>
              <span className="font-medium text-gray-700 dark:text-gray-300">
                Error ID:
              </span>
              <span className="ml-2 font-mono text-gray-600 dark:text-gray-400">
                {error.id}
              </span>
            </div>
            <div>
              <span className="font-medium text-gray-700 dark:text-gray-300">
                Agent Type:
              </span>
              <span className="ml-2 text-gray-600 dark:text-gray-400">
                {error.agentType}
              </span>
            </div>
            <div>
              <span className="font-medium text-gray-700 dark:text-gray-300">
                Category:
              </span>
              <span className="ml-2 text-gray-600 dark:text-gray-400">
                {error.category}
              </span>
            </div>
            <div>
              <span className="font-medium text-gray-700 dark:text-gray-300">
                Code:
              </span>
              <span className="ml-2 font-mono text-gray-600 dark:text-gray-400">
                {error.code}
              </span>
            </div>
            <div>
              <span className="font-medium text-gray-700 dark:text-gray-300">
                Time:
              </span>
              <span className="ml-2 text-gray-600 dark:text-gray-400">
                {new Date(error.timestamp).toLocaleString()}
              </span>
            </div>
            {error.retryCount !== undefined && (
              <div>
                <span className="font-medium text-gray-700 dark:text-gray-300">
                  Retry Count:
                </span>
                <span className="ml-2 text-gray-600 dark:text-gray-400">
                  {error.retryCount}
                </span>
              </div>
            )}
            {error.details && (
              <div>
                <span className="font-medium text-gray-700 dark:text-gray-300">
                  Details:
                </span>
                <pre className="ml-2 mt-1 text-xs text-gray-600 dark:text-gray-400 whitespace-pre-wrap">
                  {JSON.stringify(error.details, null, 2)}
                </pre>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

/**
 * Main Agent Error Message Component
 */
export const AgentErrorMessage: React.FC<AgentErrorMessageProps> = ({
  error,
  onRetry,
  onDismiss,
  onFallback,
  onUserAction,
  showDetails = false,
  compact = false,
}) => {
  const { t } = useTranslation('errors');
  const [showDetailsExpanded, setShowDetailsExpanded] = useState(false);
  const [actionLoading, setActionLoading] = useState(false);

  const styles = getSeverityStyles(error.severity);
  const CategoryIcon = getCategoryIcon(error.category);

  // Handle recovery actions
  const handleRetry = useCallback(async () => {
    if (!onRetry) return;

    setActionLoading(true);
    try {
      await onRetry();
    } finally {
      setActionLoading(false);
    }
  }, [onRetry]);

  const handleFallback = useCallback(async () => {
    if (!onFallback || error.agentType === 'unknown') return;

    setActionLoading(true);
    try {
      await onFallback(error.agentType);
    } finally {
      setActionLoading(false);
    }
  }, [onFallback, error.agentType]);

  const handleUserAction = useCallback(async () => {
    if (!onUserAction) return;

    setActionLoading(true);
    try {
      await onUserAction(error.code);
    } finally {
      setActionLoading(false);
    }
  }, [onUserAction, error.code]);

  // Get contextual help message
  const getHelpMessage = () => {
    const helpMessages: Record<string, string> = {
      [AgentErrorCategory.NETWORK]: t(
        'Check your internet connection and try again.',
      ),
      [AgentErrorCategory.AUTHENTICATION]: t(
        'Please check your API keys in settings.',
      ),
      [AgentErrorCategory.RATE_LIMIT]: t(
        "You've reached the usage limit. Please wait and try again.",
      ),
      [AgentErrorCategory.VALIDATION]: t(
        'Please check your input and try again.',
      ),
      [AgentErrorCategory.TIMEOUT]: t(
        'The operation took too long. Try with a simpler request.',
      ),
      [AgentErrorCategory.SERVICE_UNAVAILABLE]: t(
        'The service is temporarily unavailable.',
      ),
    };

    return (
      helpMessages[error.category] ||
      t('Please try again or contact support if the problem persists.')
    );
  };

  if (compact) {
    return (
      <div
        className={`inline-flex items-center gap-2 px-3 py-2 rounded-md border ${styles.container}`}
        role="alert"
        aria-live="polite"
      >
        <CategoryIcon className={`h-4 w-4 ${styles.icon}`} />
        <span className={`text-sm ${styles.text}`}>{error.userMessage}</span>
        {error.isRecoverable && onRetry && (
          <button
            onClick={handleRetry}
            disabled={actionLoading}
            className="ml-2 p-1 rounded hover:bg-black/10 dark:hover:bg-white/10 transition-colors"
            aria-label={t('Retry')}
          >
            <IconRefresh
              className={`h-4 w-4 ${actionLoading ? 'animate-spin' : ''} ${
                styles.icon
              }`}
            />
          </button>
        )}
        {onDismiss && (
          <button
            onClick={onDismiss}
            className="ml-1 p-1 rounded hover:bg-black/10 dark:hover:bg-white/10 transition-colors"
            aria-label={t('Dismiss')}
          >
            <IconX className={`h-4 w-4 ${styles.icon}`} />
          </button>
        )}
      </div>
    );
  }

  return (
    <div
      className={`rounded-lg border p-4 ${styles.container}`}
      role="alert"
      aria-live="polite"
    >
      {/* Header */}
      <div className="flex items-start gap-3">
        <CategoryIcon
          className={`h-5 w-5 mt-0.5 flex-shrink-0 ${styles.icon}`}
        />

        <div className="flex-1 min-w-0">
          <div className="flex items-start justify-between">
            <div>
              <h3 className={`text-sm font-medium ${styles.text}`}>
                {t(`errorCategories.${error.category}`, {
                  defaultValue: error.category,
                })}
              </h3>
              <p className={`mt-1 text-sm ${styles.text}`}>
                {error.userMessage}
              </p>
            </div>

            {onDismiss && (
              <button
                onClick={onDismiss}
                className="ml-2 p-1 rounded hover:bg-black/10 dark:hover:bg-white/10 transition-colors"
                aria-label={t('Dismiss')}
              >
                <IconX className={`h-4 w-4 ${styles.icon}`} />
              </button>
            )}
          </div>

          {/* Help message */}
          <p className={`mt-2 text-xs ${styles.text} opacity-80`}>
            {getHelpMessage()}
          </p>

          {/* Actions */}
          <div className="mt-4 flex flex-wrap gap-2">
            {error.isRecoverable &&
              error.recoveryStrategy === RecoveryStrategy.RETRY &&
              onRetry && (
                <RecoveryAction
                  strategy={RecoveryStrategy.RETRY}
                  onAction={handleRetry}
                  loading={actionLoading}
                />
              )}

            {error.recoveryStrategy === RecoveryStrategy.FALLBACK &&
              onFallback && (
                <RecoveryAction
                  strategy={RecoveryStrategy.FALLBACK}
                  onAction={handleFallback}
                  loading={actionLoading}
                />
              )}

            {error.recoveryStrategy === RecoveryStrategy.ALTERNATIVE_AGENT &&
              onFallback && (
                <RecoveryAction
                  strategy={RecoveryStrategy.ALTERNATIVE_AGENT}
                  onAction={handleFallback}
                  loading={actionLoading}
                />
              )}

            {error.recoveryStrategy === RecoveryStrategy.USER_ACTION &&
              onUserAction && (
                <RecoveryAction
                  strategy={RecoveryStrategy.USER_ACTION}
                  onAction={handleUserAction}
                  loading={actionLoading}
                />
              )}
          </div>

          {/* Details */}
          {showDetails && (
            <ErrorDetails
              error={error}
              expanded={showDetailsExpanded}
              onToggle={() => setShowDetailsExpanded(!showDetailsExpanded)}
            />
          )}
        </div>
      </div>
    </div>
  );
};
