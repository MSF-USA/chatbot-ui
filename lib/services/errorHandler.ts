/**
 * Error Handling Service
 *
 * Centralized error handling with consistent user feedback
 */
import toast from 'react-hot-toast';

/**
 * Standard error types
 */
export enum ErrorType {
  VALIDATION = 'validation',
  NETWORK = 'network',
  AUTHENTICATION = 'authentication',
  AUTHORIZATION = 'authorization',
  NOT_FOUND = 'not_found',
  SERVER = 'server',
  CLIENT = 'client',
  UNKNOWN = 'unknown',
}

/**
 * Application error class
 */
export class AppError extends Error {
  constructor(
    message: string,
    public type: ErrorType = ErrorType.UNKNOWN,
    public statusCode: number = 500,
    public details?: unknown,
  ) {
    super(message);
    this.name = 'AppError';
  }
}

/**
 * Error Handler Service
 * Provides consistent error handling and user feedback
 */
export class ErrorHandler {
  /**
   * Display an error message to the user via toast
   */
  static showError(
    error: Error | AppError | string,
    options?: {
      duration?: number;
      position?:
        | 'top-left'
        | 'top-center'
        | 'top-right'
        | 'bottom-left'
        | 'bottom-center'
        | 'bottom-right';
    },
  ): void {
    const message = typeof error === 'string' ? error : error.message;

    toast.error(message, {
      duration: options?.duration || 5000,
      position: options?.position || 'top-center',
      style: {
        background: '#EF4444',
        color: '#FFFFFF',
      },
    });
  }

  /**
   * Display a success message to the user via toast
   */
  static showSuccess(
    message: string,
    options?: {
      duration?: number;
      position?:
        | 'top-left'
        | 'top-center'
        | 'top-right'
        | 'bottom-left'
        | 'bottom-center'
        | 'bottom-right';
    },
  ): void {
    toast.success(message, {
      duration: options?.duration || 3000,
      position: options?.position || 'top-center',
      style: {
        background: '#10B981',
        color: '#FFFFFF',
      },
    });
  }

  /**
   * Display a warning message to the user via toast
   */
  static showWarning(
    message: string,
    options?: {
      duration?: number;
      position?:
        | 'top-left'
        | 'top-center'
        | 'top-right'
        | 'bottom-left'
        | 'bottom-center'
        | 'bottom-right';
    },
  ): void {
    toast(message, {
      duration: options?.duration || 4000,
      position: options?.position || 'top-center',
      icon: '⚠️',
      style: {
        background: '#F59E0B',
        color: '#FFFFFF',
      },
    });
  }

  /**
   * Display an info message to the user via toast
   */
  static showInfo(
    message: string,
    options?: {
      duration?: number;
      position?:
        | 'top-left'
        | 'top-center'
        | 'top-right'
        | 'bottom-left'
        | 'bottom-center'
        | 'bottom-right';
    },
  ): void {
    toast(message, {
      duration: options?.duration || 4000,
      position: options?.position || 'top-center',
      icon: 'ℹ️',
      style: {
        background: '#3B82F6',
        color: '#FFFFFF',
      },
    });
  }

  /**
   * Handle API errors with proper status code mapping
   */
  static handleApiError(error: unknown): Response {
    if (error instanceof AppError) {
      return new Response(
        JSON.stringify({
          error: error.type,
          message: error.message,
          details: error.details,
        }),
        {
          status: error.statusCode,
          headers: { 'Content-Type': 'application/json' },
        },
      );
    }

    if (error instanceof Error) {
      return new Response(
        JSON.stringify({
          error: ErrorType.SERVER,
          message: error.message,
        }),
        {
          status: 500,
          headers: { 'Content-Type': 'application/json' },
        },
      );
    }

    return new Response(
      JSON.stringify({
        error: ErrorType.UNKNOWN,
        message: 'An unknown error occurred',
      }),
      {
        status: 500,
        headers: { 'Content-Type': 'application/json' },
      },
    );
  }

  /**
   * Parse and handle fetch errors
   */
  static async handleFetchError(response: Response): Promise<never> {
    let errorMessage = `Request failed with status ${response.status}`;

    try {
      const errorData = await response.json();
      errorMessage = errorData.message || errorData.error || errorMessage;
    } catch {
      // If response is not JSON, use status text
      errorMessage = response.statusText || errorMessage;
    }

    throw new AppError(
      errorMessage,
      this.mapStatusToErrorType(response.status),
      response.status,
    );
  }

  /**
   * Map HTTP status codes to error types
   */
  private static mapStatusToErrorType(status: number): ErrorType {
    if (status >= 400 && status < 500) {
      switch (status) {
        case 400:
          return ErrorType.VALIDATION;
        case 401:
          return ErrorType.AUTHENTICATION;
        case 403:
          return ErrorType.AUTHORIZATION;
        case 404:
          return ErrorType.NOT_FOUND;
        default:
          return ErrorType.CLIENT;
      }
    }

    if (status >= 500) {
      return ErrorType.SERVER;
    }

    return ErrorType.UNKNOWN;
  }

  /**
   * Log error for debugging (can be extended to send to monitoring service)
   */
  static logError(
    error: Error | AppError | unknown,
    context?: Record<string, unknown>,
  ): void {
    if (process.env.NODE_ENV === 'development') {
      console.error('[ErrorHandler]', error, context);
    }

    // TODO: Send to error monitoring service (e.g., Sentry, LogRocket)
    // Example: Sentry.captureException(error, { extra: context });
  }

  /**
   * Wrap async function with error handling
   */
  static async wrapAsync<T>(
    fn: () => Promise<T>,
    errorMessage?: string,
  ): Promise<T | null> {
    try {
      return await fn();
    } catch (error) {
      const message = errorMessage || 'An error occurred';
      this.showError(error instanceof Error ? error : new Error(message));
      this.logError(error);
      return null;
    }
  }
}

/**
 * React hook for error handling
 */
export function useErrorHandler() {
  const handleError = (
    error: Error | AppError | string,
    options?: {
      showToast?: boolean;
      logError?: boolean;
    },
  ) => {
    const { showToast = true, logError = true } = options || {};

    if (showToast) {
      ErrorHandler.showError(error);
    }

    if (logError) {
      ErrorHandler.logError(error);
    }
  };

  return {
    handleError,
    showError: ErrorHandler.showError,
    showSuccess: ErrorHandler.showSuccess,
    showWarning: ErrorHandler.showWarning,
    showInfo: ErrorHandler.showInfo,
  };
}
