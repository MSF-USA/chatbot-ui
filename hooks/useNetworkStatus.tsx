/**
 * Network Status Hook
 *
 * Real-time network monitoring with request queuing and recovery capabilities.
 * Provides seamless offline/online experience with automatic request replay.
 */
import { useCallback, useEffect, useRef, useState } from 'react';

import { useErrorToast } from './useErrorToast';

/**
 * Network connection type
 */
export enum ConnectionType {
  WIFI = 'wifi',
  CELLULAR = 'cellular',
  ETHERNET = 'ethernet',
  UNKNOWN = 'unknown',
}

/**
 * Connection quality levels
 */
export enum ConnectionQuality {
  EXCELLENT = 'excellent',
  GOOD = 'good',
  FAIR = 'fair',
  POOR = 'poor',
  OFFLINE = 'offline',
}

/**
 * Queued request interface
 */
export interface QueuedRequest {
  id: string;
  url: string;
  options: RequestInit;
  timestamp: number;
  retryCount: number;
  priority: 'high' | 'medium' | 'low';
  resolve: (value: Response) => void;
  reject: (reason: any) => void;
}

/**
 * Network status information
 */
export interface NetworkStatus {
  isOnline: boolean;
  connectionType: ConnectionType;
  connectionQuality: ConnectionQuality;
  effectiveType: string;
  downlink: number;
  rtt: number;
  saveData: boolean;
  lastCheck: number;
}

/**
 * Network hook configuration
 */
interface NetworkConfig {
  enableQueuing: boolean;
  maxQueueSize: number;
  maxRetries: number;
  retryDelay: number;
  enableNotifications: boolean;
  enablePerformanceMonitoring: boolean;
}

/**
 * Default configuration
 */
const defaultConfig: NetworkConfig = {
  enableQueuing: true,
  maxQueueSize: 50,
  maxRetries: 3,
  retryDelay: 1000,
  enableNotifications: true,
  enablePerformanceMonitoring: true,
};

/**
 * Network Status Hook
 */
export function useNetworkStatus(config: Partial<NetworkConfig> = {}) {
  const finalConfig = { ...defaultConfig, ...config };
  const { showErrorToast, showSuccessToast, showWarningToast } =
    useErrorToast();

  // State
  const [networkStatus, setNetworkStatus] = useState<NetworkStatus>(() => ({
    isOnline: typeof navigator !== 'undefined' ? navigator.onLine : true,
    connectionType: ConnectionType.UNKNOWN,
    connectionQuality: ConnectionQuality.GOOD,
    effectiveType: 'unknown',
    downlink: 0,
    rtt: 0,
    saveData: false,
    lastCheck: Date.now(),
  }));

  const [isRecovering, setIsRecovering] = useState(false);
  const [queuedRequests, setQueuedRequests] = useState<QueuedRequest[]>([]);

  // Refs
  const performanceCheckInterval = useRef<NodeJS.Timeout | null>(null);
  const recoveryTimeout = useRef<NodeJS.Timeout | null>(null);
  const requestCounter = useRef(0);

  /**
   * Get connection information from browser APIs
   */
  const getConnectionInfo = useCallback((): Partial<NetworkStatus> => {
    if (typeof navigator === 'undefined') {
      return {};
    }

    const connection =
      (navigator as any).connection ||
      (navigator as any).mozConnection ||
      (navigator as any).webkitConnection;

    if (!connection) {
      return {};
    }

    // Determine connection type
    let connectionType = ConnectionType.UNKNOWN;
    if (connection.type) {
      switch (connection.type) {
        case 'wifi':
          connectionType = ConnectionType.WIFI;
          break;
        case 'cellular':
          connectionType = ConnectionType.CELLULAR;
          break;
        case 'ethernet':
          connectionType = ConnectionType.ETHERNET;
          break;
        default:
          connectionType = ConnectionType.UNKNOWN;
      }
    }

    // Determine connection quality based on effective type and metrics
    let connectionQuality = ConnectionQuality.GOOD;
    const effectiveType = connection.effectiveType || 'unknown';
    const rtt = connection.rtt || 0;
    const downlink = connection.downlink || 0;

    if (!navigator.onLine) {
      connectionQuality = ConnectionQuality.OFFLINE;
    } else if (effectiveType === '4g' && rtt < 100 && downlink > 10) {
      connectionQuality = ConnectionQuality.EXCELLENT;
    } else if (effectiveType === '4g' || (rtt < 200 && downlink > 5)) {
      connectionQuality = ConnectionQuality.GOOD;
    } else if (effectiveType === '3g' || (rtt < 500 && downlink > 1)) {
      connectionQuality = ConnectionQuality.FAIR;
    } else {
      connectionQuality = ConnectionQuality.POOR;
    }

    return {
      connectionType,
      connectionQuality,
      effectiveType,
      downlink: connection.downlink || 0,
      rtt: connection.rtt || 0,
      saveData: connection.saveData || false,
    };
  }, []);

  /**
   * Update network status
   */
  const updateNetworkStatus = useCallback(() => {
    const isOnline = typeof navigator !== 'undefined' ? navigator.onLine : true;
    const connectionInfo = getConnectionInfo();

    setNetworkStatus((prev) => ({
      ...prev,
      isOnline,
      ...connectionInfo,
      lastCheck: Date.now(),
    }));

    return isOnline;
  }, [getConnectionInfo]);

  /**
   * Perform network connectivity test
   */
  const performConnectivityTest = useCallback(async (): Promise<boolean> => {
    if (!finalConfig.enablePerformanceMonitoring) {
      return navigator.onLine;
    }

    try {
      const startTime = Date.now();
      const response = await fetch('/api/health', {
        method: 'HEAD',
        cache: 'no-cache',
        signal: AbortSignal.timeout(5000),
      });

      const endTime = Date.now();
      const responseTime = endTime - startTime;

      // Update RTT based on actual network test
      setNetworkStatus((prev) => ({
        ...prev,
        rtt: responseTime,
        isOnline: response.ok,
        lastCheck: Date.now(),
      }));

      return response.ok;
    } catch (error) {
      setNetworkStatus((prev) => ({
        ...prev,
        isOnline: false,
        lastCheck: Date.now(),
      }));
      return false;
    }
  }, [finalConfig.enablePerformanceMonitoring]);

  /**
   * Handle online event
   */
  const handleOnline = useCallback(async () => {
    console.log('[NetworkStatus] Browser reports online');

    // Verify actual connectivity
    const isActuallyOnline = await performConnectivityTest();

    if (isActuallyOnline) {
      updateNetworkStatus();

      if (finalConfig.enableNotifications) {
        showSuccessToast('Connection restored', "You're back online");
      }

      // Start recovery process
      if (queuedRequests.length > 0) {
        setIsRecovering(true);
        await processQueuedRequests();
        setIsRecovering(false);
      }
    }
  }, [
    performConnectivityTest,
    updateNetworkStatus,
    finalConfig.enableNotifications,
    showSuccessToast,
    queuedRequests.length,
  ]);

  /**
   * Handle offline event
   */
  const handleOffline = useCallback(() => {
    console.log('[NetworkStatus] Browser reports offline');
    updateNetworkStatus();

    if (finalConfig.enableNotifications) {
      showWarningToast(
        'Connection lost',
        'Working offline - requests will be queued',
      );
    }
  }, [updateNetworkStatus, finalConfig.enableNotifications, showWarningToast]);

  /**
   * Queue a request for later execution
   */
  const queueRequest = useCallback(
    (
      url: string,
      options: RequestInit = {},
      priority: QueuedRequest['priority'] = 'medium',
    ): Promise<Response> => {
      return new Promise((resolve, reject) => {
        if (queuedRequests.length >= finalConfig.maxQueueSize) {
          reject(new Error('Request queue is full'));
          return;
        }

        const requestId = `req-${Date.now()}-${++requestCounter.current}`;

        const queuedRequest: QueuedRequest = {
          id: requestId,
          url,
          options,
          timestamp: Date.now(),
          retryCount: 0,
          priority,
          resolve,
          reject,
        };

        setQueuedRequests((prev) => {
          const newQueue = [...prev, queuedRequest];
          // Sort by priority (high > medium > low) and timestamp
          return newQueue.sort((a, b) => {
            const priorityOrder = { high: 3, medium: 2, low: 1 };
            const priorityDiff =
              priorityOrder[b.priority] - priorityOrder[a.priority];
            return priorityDiff !== 0
              ? priorityDiff
              : a.timestamp - b.timestamp;
          });
        });

        console.log(
          `[NetworkStatus] Queued request: ${url} (priority: ${priority})`,
        );
      });
    },
    [queuedRequests.length, finalConfig.maxQueueSize],
  );

  /**
   * Process queued requests when back online
   */
  const processQueuedRequests = useCallback(async () => {
    if (queuedRequests.length === 0) {
      return;
    }

    console.log(
      `[NetworkStatus] Processing ${queuedRequests.length} queued requests`,
    );

    const requestsToProcess = [...queuedRequests];
    setQueuedRequests([]);

    let successCount = 0;
    let failureCount = 0;

    for (const request of requestsToProcess) {
      try {
        const response = await fetch(request.url, request.options);

        if (response.ok) {
          request.resolve(response);
          successCount++;
        } else {
          throw new Error(`Request failed with status: ${response.status}`);
        }
      } catch (error) {
        request.retryCount++;

        if (request.retryCount < finalConfig.maxRetries) {
          // Re-queue for retry
          setTimeout(() => {
            setQueuedRequests((prev) => [...prev, request]);
          }, finalConfig.retryDelay * request.retryCount);
        } else {
          request.reject(error);
          failureCount++;
        }
      }

      // Small delay between requests to avoid overwhelming the server
      await new Promise((resolve) => setTimeout(resolve, 100));
    }

    if (finalConfig.enableNotifications) {
      if (successCount > 0) {
        showSuccessToast(
          'Requests processed',
          `${successCount} requests completed successfully`,
        );
      }

      if (failureCount > 0) {
        showErrorToast({
          id: 'queue-failures',
          agentType: 'network' as any,
          category: 'network' as any,
          severity: 'medium' as any,
          code: 'QUEUE_PROCESSING_FAILED',
          message: `${failureCount} requests failed after retry`,
          userMessage: `${failureCount} requests could not be completed`,
          timestamp: Date.now(),
          recoveryStrategy: 'retry' as any,
          isRecoverable: true,
        });
      }
    }
  }, [
    queuedRequests,
    finalConfig.maxRetries,
    finalConfig.retryDelay,
    finalConfig.enableNotifications,
    showSuccessToast,
    showErrorToast,
  ]);

  /**
   * Smart fetch with automatic queuing
   */
  const smartFetch = useCallback(
    async (
      url: string,
      options: RequestInit = {},
      priority: QueuedRequest['priority'] = 'medium',
    ): Promise<Response> => {
      // Check network status first
      const isOnline = await performConnectivityTest();

      if (!isOnline && finalConfig.enableQueuing) {
        return queueRequest(url, options, priority);
      }

      // Proceed with normal fetch
      try {
        const response = await fetch(url, options);

        if (!response.ok && response.status >= 500) {
          // Server error - queue if enabled
          if (finalConfig.enableQueuing) {
            return queueRequest(url, options, priority);
          }
        }

        return response;
      } catch (error) {
        // Network error - queue if enabled
        if (finalConfig.enableQueuing && networkStatus.isOnline) {
          return queueRequest(url, options, priority);
        }

        throw error;
      }
    },
    [
      performConnectivityTest,
      finalConfig.enableQueuing,
      queueRequest,
      networkStatus.isOnline,
    ],
  );

  /**
   * Clear request queue
   */
  const clearQueue = useCallback(() => {
    queuedRequests.forEach((request) => {
      request.reject(new Error('Request queue cleared'));
    });
    setQueuedRequests([]);
  }, [queuedRequests]);

  /**
   * Force network status refresh
   */
  const refreshNetworkStatus = useCallback(async () => {
    await performConnectivityTest();
    updateNetworkStatus();
  }, [performConnectivityTest, updateNetworkStatus]);

  // Set up event listeners
  useEffect(() => {
    if (typeof window === 'undefined') {
      return;
    }

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    // Connection change listener
    const connection = (navigator as any).connection;
    if (connection) {
      connection.addEventListener('change', updateNetworkStatus);
    }

    // Periodic connectivity check
    if (finalConfig.enablePerformanceMonitoring) {
      performanceCheckInterval.current = setInterval(() => {
        performConnectivityTest();
      }, 30000); // Check every 30 seconds
    }

    // Initial status update
    updateNetworkStatus();

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);

      if (connection) {
        connection.removeEventListener('change', updateNetworkStatus);
      }

      if (performanceCheckInterval.current) {
        clearInterval(performanceCheckInterval.current);
      }

      if (recoveryTimeout.current) {
        clearTimeout(recoveryTimeout.current);
      }
    };
  }, [
    handleOnline,
    handleOffline,
    updateNetworkStatus,
    performConnectivityTest,
    finalConfig.enablePerformanceMonitoring,
  ]);

  return {
    // Status
    networkStatus,
    isRecovering,
    queueSize: queuedRequests.length,

    // Methods
    smartFetch,
    queueRequest,
    clearQueue,
    refreshNetworkStatus,

    // Utilities
    isOnline: networkStatus.isOnline,
    connectionQuality: networkStatus.connectionQuality,
    shouldReduceData:
      networkStatus.saveData ||
      networkStatus.connectionQuality === ConnectionQuality.POOR,
  };
}
