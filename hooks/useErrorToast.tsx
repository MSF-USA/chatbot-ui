/**
 * Error Toast Hook
 * 
 * React hook for managing toast notifications throughout the application.
 * Provides centralized error notification management with queue handling.
 */

import { useState, useCallback, useRef, useEffect } from 'react';
import { AgentError } from '@/services/agentErrorHandlingService';
import { ToastItem, ToastAction, ToastType, createErrorToast, createSuccessToast } from '@/components/Chat/ErrorComponents/ErrorToast';

/**
 * Toast manager configuration
 */
interface ToastConfig {
  maxToasts: number;
  defaultDuration: number;
  enableQueue: boolean;
  position: 'top-right' | 'top-left' | 'bottom-right' | 'bottom-left';
}

/**
 * Toast hook return type
 */
interface UseErrorToastReturn {
  toasts: ToastItem[];
  showErrorToast: (error: AgentError, options?: Partial<ToastItem>) => string;
  showSuccessToast: (title: string, message?: string, duration?: number) => string;
  showWarningToast: (title: string, message?: string, duration?: number) => string;
  showInfoToast: (title: string, message?: string, duration?: number) => string;
  showCustomToast: (toast: Omit<ToastItem, 'id'>) => string;
  dismissToast: (id: string) => void;
  dismissAllToasts: () => void;
  updateToast: (id: string, updates: Partial<ToastItem>) => void;
}

/**
 * Default configuration
 */
const defaultConfig: ToastConfig = {
  maxToasts: 5,
  defaultDuration: 5000,
  enableQueue: true,
  position: 'top-right',
};

/**
 * Error Toast Hook
 */
export function useErrorToast(config: Partial<ToastConfig> = {}): UseErrorToastReturn {
  const finalConfig = { ...defaultConfig, ...config };
  
  const [toasts, setToasts] = useState<ToastItem[]>([]);
  const [queue, setQueue] = useState<ToastItem[]>([]);
  const timeoutRefs = useRef<Map<string, NodeJS.Timeout>>(new Map());
  const toastCounter = useRef(0);

  // Process queue when toasts change
  useEffect(() => {
    if (finalConfig.enableQueue && toasts.length < finalConfig.maxToasts && queue.length > 0) {
      const nextToast = queue[0];
      setQueue(prev => prev.slice(1));
      addToastToDisplay(nextToast);
    }
  }, [toasts, queue, finalConfig.maxToasts, finalConfig.enableQueue]);

  // Generate unique toast ID
  const generateId = useCallback(() => {
    toastCounter.current += 1;
    return `toast-${Date.now()}-${toastCounter.current}`;
  }, []);

  // Add toast to display (respecting max limit)
  const addToastToDisplay = useCallback((toast: ToastItem) => {
    setToasts(prev => {
      const newToasts = [toast, ...prev];
      
      // Respect max toasts limit
      if (newToasts.length > finalConfig.maxToasts) {
        const removedToasts = newToasts.slice(finalConfig.maxToasts);
        removedToasts.forEach(t => {
          const timeoutId = timeoutRefs.current.get(t.id);
          if (timeoutId) {
            clearTimeout(timeoutId);
            timeoutRefs.current.delete(t.id);
          }
        });
        return newToasts.slice(0, finalConfig.maxToasts);
      }
      
      return newToasts;
    });

    // Set auto-dismiss timer if needed
    if (!toast.persistent && toast.duration && toast.duration > 0) {
      const timeoutId = setTimeout(() => {
        dismissToast(toast.id);
      }, toast.duration);
      
      timeoutRefs.current.set(toast.id, timeoutId);
    }
  }, [finalConfig.maxToasts]);

  // Add toast (with queueing if needed)
  const addToast = useCallback((toast: Omit<ToastItem, 'id'>) => {
    const id = generateId();
    const fullToast: ToastItem = { ...toast, id };

    if (finalConfig.enableQueue && toasts.length >= finalConfig.maxToasts) {
      setQueue(prev => [...prev, fullToast]);
    } else {
      addToastToDisplay(fullToast);
    }

    return id;
  }, [generateId, finalConfig.enableQueue, finalConfig.maxToasts, toasts.length, addToastToDisplay]);

  // Dismiss toast
  const dismissToast = useCallback((id: string) => {
    setToasts(prev => prev.filter(toast => toast.id !== id));
    
    // Clear timeout
    const timeoutId = timeoutRefs.current.get(id);
    if (timeoutId) {
      clearTimeout(timeoutId);
      timeoutRefs.current.delete(id);
    }

    // Remove from queue if present
    setQueue(prev => prev.filter(toast => toast.id !== id));
  }, []);

  // Dismiss all toasts
  const dismissAllToasts = useCallback(() => {
    // Clear all timeouts
    timeoutRefs.current.forEach(timeoutId => clearTimeout(timeoutId));
    timeoutRefs.current.clear();
    
    // Clear toasts and queue
    setToasts([]);
    setQueue([]);
  }, []);

  // Update existing toast
  const updateToast = useCallback((id: string, updates: Partial<ToastItem>) => {
    setToasts(prev => prev.map(toast => 
      toast.id === id ? { ...toast, ...updates } : toast
    ));
    
    setQueue(prev => prev.map(toast => 
      toast.id === id ? { ...toast, ...updates } : toast
    ));
  }, []);

  // Show error toast from AgentError
  const showErrorToast = useCallback((
    error: AgentError, 
    options: Partial<ToastItem> = {}
  ): string => {
    const errorToast = createErrorToast(error, {
      title: options.title,
      duration: options.duration,
      persistent: options.persistent,
      actions: options.actions,
    });

    // Add retry action for recoverable errors
    if (error.isRecoverable && !errorToast.actions) {
      errorToast.actions = [
        {
          label: 'Retry',
          onClick: () => {
            // This would be handled by the parent component
            console.log('Retry requested for error:', error.id);
          },
          primary: true,
        },
      ];
    }

    return addToast({ ...errorToast, ...options });
  }, [addToast]);

  // Show success toast
  const showSuccessToast = useCallback((
    title: string, 
    message?: string, 
    duration = 3000
  ): string => {
    const successToast = createSuccessToast(title, message, duration);
    return addToast(successToast);
  }, [addToast]);

  // Show warning toast
  const showWarningToast = useCallback((
    title: string, 
    message?: string, 
    duration = 5000
  ): string => {
    return addToast({
      type: ToastType.WARNING,
      title,
      message,
      duration,
      persistent: false,
    });
  }, [addToast]);

  // Show info toast
  const showInfoToast = useCallback((
    title: string, 
    message?: string, 
    duration = 4000
  ): string => {
    return addToast({
      type: ToastType.INFO,
      title,
      message,
      duration,
      persistent: false,
    });
  }, [addToast]);

  // Show custom toast
  const showCustomToast = useCallback((toast: Omit<ToastItem, 'id'>): string => {
    return addToast(toast);
  }, [addToast]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      timeoutRefs.current.forEach(timeoutId => clearTimeout(timeoutId));
      timeoutRefs.current.clear();
    };
  }, []);

  return {
    toasts,
    showErrorToast,
    showSuccessToast,
    showWarningToast,
    showInfoToast,
    showCustomToast,
    dismissToast,
    dismissAllToasts,
    updateToast,
  };
}

/**
 * Toast context for global access
 */
import React, { createContext, useContext, ReactNode } from 'react';
import {AgentType} from "@/types/agent";

interface ToastContextValue extends UseErrorToastReturn {
  config: ToastConfig;
}

const ToastContext = createContext<ToastContextValue | null>(null);

/**
 * Toast provider component
 */
interface ToastProviderProps {
  children: ReactNode;
  config?: Partial<ToastConfig>;
}

export function ToastProvider({ children, config = {} }: ToastProviderProps) {
  const finalConfig = { ...defaultConfig, ...config };
  const toastMethods = useErrorToast(finalConfig);

  const contextValue: ToastContextValue = {
    ...toastMethods,
    config: finalConfig,
  };

  return (
    <ToastContext.Provider value={contextValue}>
      {children}
    </ToastContext.Provider>
  );
}

/**
 * Hook to use toast context
 */
export function useToastContext(): ToastContextValue {
  const context = useContext(ToastContext);
  
  if (!context) {
    throw new Error('useToastContext must be used within a ToastProvider');
  }
  
  return context;
}

/**
 * Global error handler that automatically shows toasts
 */
export function useGlobalErrorHandler() {
  const { showErrorToast } = useErrorToast();

  const handleError = useCallback((
    error: AgentError | Error,
    agentType?: AgentType,
    options?: {
      showToast?: boolean;
      toastOptions?: Partial<ToastItem>;
    }
  ) => {
    console.error('Global error:', error);

    if (options?.showToast !== false) {
      if ('category' in error) {
        // It's an AgentError
        showErrorToast(error as AgentError, options?.toastOptions);
      } else {
        // Convert regular Error to toast
        showErrorToast({
          id: `error-${Date.now()}`,
          agentType: agentType ?? 'unknown',
          category: 'unknown' as any,
          severity: 'medium' as any,
          code: 'GENERAL_ERROR',
          message: error.message,
          userMessage: 'An unexpected error occurred',
          timestamp: Date.now(),
          recoveryStrategy: 'retry' as any,
          isRecoverable: true,
        }, options?.toastOptions);
      }
    }
  }, [showErrorToast]);

  return { handleError };
}