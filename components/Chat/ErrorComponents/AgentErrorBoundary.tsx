/**
 * Agent Error Boundary Component
 * 
 * React error boundary specifically designed for agent operations,
 * with fallback UI and error recovery mechanisms.
 */

import React, { Component, ErrorInfo, ReactNode } from 'react';
import { AgentType } from '@/types/agent';
import { 
  AgentError, 
  AgentErrorCategory, 
  ErrorSeverity, 
  RecoveryStrategy,
  getAgentErrorHandlingService 
} from '@/services/agentErrorHandlingService';
import { AgentErrorMessage } from './AgentErrorMessage';

/**
 * Error boundary props
 */
interface AgentErrorBoundaryProps {
  agentType: AgentType;
  fallbackComponent?: ReactNode;
  onError?: (error: AgentError, errorInfo: ErrorInfo) => void;
  enableRecovery?: boolean;
  children: ReactNode;
}

/**
 * Error boundary state
 */
interface AgentErrorBoundaryState {
  hasError: boolean;
  error: AgentError | null;
  errorInfo: ErrorInfo | null;
  retryCount: number;
}

/**
 * Agent Error Boundary Component
 */
export class AgentErrorBoundary extends Component<
  AgentErrorBoundaryProps,
  AgentErrorBoundaryState
> {
  private errorHandlingService = getAgentErrorHandlingService();
  private maxRetries = 3;

  constructor(props: AgentErrorBoundaryProps) {
    super(props);
    
    this.state = {
      hasError: false,
      error: null,
      errorInfo: null,
      retryCount: 0,
    };
  }

  /**
   * Static method to derive state from error
   */
  static getDerivedStateFromError(error: Error): Partial<AgentErrorBoundaryState> {
    return {
      hasError: true,
    };
  }

  /**
   * Handle component errors
   */
  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    const agentError: AgentError = {
      id: `boundary-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      agentType: this.props.agentType,
      category: AgentErrorCategory.PROCESSING,
      severity: ErrorSeverity.HIGH,
      code: 'COMPONENT_ERROR',
      message: error.message,
      userMessage: 'A component error occurred while processing your request.',
      timestamp: Date.now(),
      recoveryStrategy: RecoveryStrategy.RETRY,
      isRecoverable: true,
      retryCount: this.state.retryCount,
      details: {
        stack: error.stack,
        componentStack: errorInfo.componentStack,
        props: this.props,
      },
      context: {
        operation: 'component_render',
        parameters: {
          agentType: this.props.agentType,
        },
      },
    };

    this.setState({
      error: agentError,
      errorInfo,
    });

    // Call error handler
    this.props.onError?.(agentError, errorInfo);

    // Handle error through service
    this.errorHandlingService.handleError(
      agentError,
      this.props.agentType,
      agentError.context
    ).catch(console.error);
  }

  /**
   * Retry the failed operation
   */
  private handleRetry = () => {
    const { retryCount } = this.state;
    
    if (retryCount < this.maxRetries) {
      this.setState({
        hasError: false,
        error: null,
        errorInfo: null,
        retryCount: retryCount + 1,
      });
    }
  };

  /**
   * Reset error state
   */
  private handleReset = () => {
    this.setState({
      hasError: false,
      error: null,
      errorInfo: null,
      retryCount: 0,
    });
  };

  /**
   * Handle fallback to different agent
   */
  private handleFallback = (agentType: AgentType) => {
    // This would typically be handled by parent component
    console.log(`Fallback to agent: ${agentType}`);
    this.handleReset();
  };

  /**
   * Render error UI or children
   */
  render() {
    const { hasError, error, retryCount } = this.state;
    const { children, fallbackComponent, enableRecovery = true } = this.props;

    if (hasError && error) {
      // Use custom fallback component if provided
      if (fallbackComponent) {
        return fallbackComponent;
      }

      // Default error UI
      return (
        <div className="p-4">
          <AgentErrorMessage
            error={{
              ...error,
              retryCount,
              isRecoverable: enableRecovery && retryCount < this.maxRetries,
            }}
            onRetry={enableRecovery ? this.handleRetry : undefined}
            onFallback={enableRecovery ? this.handleFallback : undefined}
            onDismiss={this.handleReset}
            showDetails={true}
          />
          
          {retryCount >= this.maxRetries && (
            <div className="mt-4 p-3 bg-red-50 border border-red-200 rounded-md dark:bg-red-900/20 dark:border-red-800">
              <p className="text-sm text-red-700 dark:text-red-300">
                Maximum retry attempts reached. Please refresh the page or contact support.
              </p>
              <button
                onClick={() => window.location.reload()}
                className="mt-2 px-4 py-2 bg-red-500 text-white rounded-md hover:bg-red-600 transition-colors text-sm"
              >
                Refresh Page
              </button>
            </div>
          )}
        </div>
      );
    }

    return children;
  }
}

/**
 * Higher-order component to wrap components with agent error boundary
 */
export function withAgentErrorBoundary<P extends object>(
  Component: React.ComponentType<P>,
  agentType: AgentType,
  options: {
    fallbackComponent?: ReactNode;
    enableRecovery?: boolean;
    onError?: (error: AgentError, errorInfo: ErrorInfo) => void;
  } = {}
) {
  const WrappedComponent = React.forwardRef<any, P>((props, ref) => (
    <AgentErrorBoundary
      agentType={agentType}
      fallbackComponent={options.fallbackComponent}
      enableRecovery={options.enableRecovery}
      onError={options.onError}
    >
      <Component {...props} ref={ref} />
    </AgentErrorBoundary>
  ));

  WrappedComponent.displayName = `withAgentErrorBoundary(${Component.displayName || Component.name})`;
  
  return WrappedComponent;
}

/**
 * Hook to manually trigger error boundary
 */
export function useAgentErrorBoundary() {
  return {
    captureError: (error: Error, agentType: AgentType) => {
      // This is typically handled by the error boundary itself
      // but can be used to manually trigger error handling
      throw error;
    },
  };
}