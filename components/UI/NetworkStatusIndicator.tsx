/**
 * Network Status Indicator Component
 * 
 * Visual indicator for network connectivity status with user-friendly messaging
 * and recovery options. Provides real-time feedback on connection quality.
 */

import React, { useState, useCallback } from 'react';
import { useTranslation } from 'next-i18next';
import {
  IconWifi,
  IconWifiOff,
  IconRefresh,
  IconClock,
  IconAlertTriangle,
  IconCheck,
} from '@tabler/icons-react';

import { useNetworkStatus, ConnectionQuality, ConnectionType } from '@/hooks/useNetworkStatus';

/**
 * Component props
 */
interface NetworkStatusIndicatorProps {
  showDetails?: boolean;
  position?: 'top-left' | 'top-right' | 'bottom-left' | 'bottom-right';
  compact?: boolean;
  showQueueStatus?: boolean;
}

/**
 * Get icon for connection quality
 */
const getQualityIcon = (quality: ConnectionQuality, isOnline: boolean) => {
  if (!isOnline) {
    return IconWifiOff;
  }

  switch (quality) {
    case ConnectionQuality.EXCELLENT:
      return IconWifi;
    case ConnectionQuality.GOOD:
      return IconWifi;
    case ConnectionQuality.FAIR:
      return IconWifi;
    case ConnectionQuality.POOR:
      return IconWifi;
    case ConnectionQuality.OFFLINE:
      return IconWifiOff;
    default:
      return IconWifi;
  }
};

/**
 * Get styling for connection quality
 */
const getQualityStyles = (quality: ConnectionQuality, isOnline: boolean) => {
  if (!isOnline) {
    return {
      icon: 'text-red-500',
      bg: 'bg-red-50 border-red-200 dark:bg-red-900/20 dark:border-red-800',
      text: 'text-red-700 dark:text-red-300',
    };
  }

  switch (quality) {
    case ConnectionQuality.EXCELLENT:
      return {
        icon: 'text-green-500',
        bg: 'bg-green-50 border-green-200 dark:bg-green-900/20 dark:border-green-800',
        text: 'text-green-700 dark:text-green-300',
      };
    case ConnectionQuality.GOOD:
      return {
        icon: 'text-blue-500',
        bg: 'bg-blue-50 border-blue-200 dark:bg-blue-900/20 dark:border-blue-800',
        text: 'text-blue-700 dark:text-blue-300',
      };
    case ConnectionQuality.FAIR:
      return {
        icon: 'text-yellow-500',
        bg: 'bg-yellow-50 border-yellow-200 dark:bg-yellow-900/20 dark:border-yellow-800',
        text: 'text-yellow-700 dark:text-yellow-300',
      };
    case ConnectionQuality.POOR:
      return {
        icon: 'text-orange-500',
        bg: 'bg-orange-50 border-orange-200 dark:bg-orange-900/20 dark:border-orange-800',
        text: 'text-orange-700 dark:text-orange-300',
      };
    default:
      return {
        icon: 'text-gray-500',
        bg: 'bg-gray-50 border-gray-200 dark:bg-gray-900/20 dark:border-gray-800',
        text: 'text-gray-700 dark:text-gray-300',
      };
  }
};

/**
 * Get position classes
 */
const getPositionClasses = (position: NetworkStatusIndicatorProps['position']) => {
  switch (position) {
    case 'top-left':
      return 'top-4 left-4';
    case 'top-right':
      return 'top-4 right-4';
    case 'bottom-left':
      return 'bottom-4 left-4';
    case 'bottom-right':
      return 'bottom-4 right-4';
    default:
      return 'top-4 right-4';
  }
};

/**
 * Network Status Indicator Component
 */
export const NetworkStatusIndicator: React.FC<NetworkStatusIndicatorProps> = ({
  showDetails = false,
  position = 'top-right',
  compact = false,
  showQueueStatus = true,
}) => {
  const { t } = useTranslation('network');
  const [isExpanded, setIsExpanded] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);

  const {
    networkStatus,
    isRecovering,
    queueSize,
    refreshNetworkStatus,
    clearQueue,
    isOnline,
    connectionQuality,
  } = useNetworkStatus();

  const QualityIcon = getQualityIcon(connectionQuality, isOnline);
  const styles = getQualityStyles(connectionQuality, isOnline);

  // Handle manual refresh
  const handleRefresh = useCallback(async () => {
    setIsRefreshing(true);
    try {
      await refreshNetworkStatus();
    } finally {
      setIsRefreshing(false);
    }
  }, [refreshNetworkStatus]);

  // Get connection description
  const getConnectionDescription = () => {
    if (!isOnline) {
      return t('Offline - Working offline');
    }

    const qualityText = {
      [ConnectionQuality.EXCELLENT]: t('Excellent connection'),
      [ConnectionQuality.GOOD]: t('Good connection'),
      [ConnectionQuality.FAIR]: t('Fair connection'),
      [ConnectionQuality.POOR]: t('Poor connection'),
      [ConnectionQuality.OFFLINE]: t('Offline'),
    };

    const typeText = {
      [ConnectionType.WIFI]: t('Wi-Fi'),
      [ConnectionType.CELLULAR]: t('Cellular'),
      [ConnectionType.ETHERNET]: t('Ethernet'),
      [ConnectionType.UNKNOWN]: t('Unknown'),
    };

    return `${qualityText[connectionQuality]} (${typeText[networkStatus.connectionType]})`;
  };

  // Don't show if online and excellent quality in compact mode
  if (compact && isOnline && connectionQuality === ConnectionQuality.EXCELLENT && queueSize === 0) {
    return null;
  }

  return (
    <div className={`fixed z-40 ${getPositionClasses(position)}`}>
      <div
        className={`
          transition-all duration-200 ease-in-out
          ${compact ? 'cursor-pointer' : ''}
          ${isExpanded ? 'shadow-lg' : 'shadow-md'}
        `}
        onClick={compact ? () => setIsExpanded(!isExpanded) : undefined}
        role={compact ? 'button' : undefined}
        tabIndex={compact ? 0 : undefined}
        onKeyDown={compact ? (e) => {
          if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault();
            setIsExpanded(!isExpanded);
          }
        } : undefined}
        aria-label={compact ? getConnectionDescription() : undefined}
      >
        {/* Compact indicator */}
        {compact && !isExpanded && (
          <div className={`inline-flex items-center gap-2 px-3 py-2 rounded-md border ${styles.bg}`}>
            <QualityIcon className={`h-4 w-4 ${styles.icon}`} />
            {!isOnline && (
              <span className={`text-sm font-medium ${styles.text}`}>
                {t('Offline')}
              </span>
            )}
            {queueSize > 0 && (
              <div className="flex items-center gap-1">
                <IconClock className="h-3 w-3 text-amber-500" />
                <span className="text-xs text-amber-600 dark:text-amber-400">
                  {queueSize}
                </span>
              </div>
            )}
            {isRecovering && (
              <div className="animate-spin">
                <IconRefresh className="h-3 w-3 text-blue-500" />
              </div>
            )}
          </div>
        )}

        {/* Detailed indicator */}
        {((!compact && showDetails) || (compact && isExpanded)) && (
          <div className={`p-4 rounded-lg border ${styles.bg} min-w-[280px]`}>
            {/* Header */}
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <QualityIcon className={`h-5 w-5 ${styles.icon}`} />
                <h3 className={`text-sm font-medium ${styles.text}`}>
                  {t('Network Status')}
                </h3>
              </div>
              
              <button
                onClick={handleRefresh}
                disabled={isRefreshing}
                className={`p-1 rounded hover:bg-black/10 dark:hover:bg-white/10 transition-colors ${styles.text}`}
                aria-label={t('Refresh network status')}
              >
                <IconRefresh className={`h-4 w-4 ${isRefreshing ? 'animate-spin' : ''}`} />
              </button>
            </div>

            {/* Connection info */}
            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span className={styles.text}>{t('Status')}:</span>
                <span className={`font-medium ${styles.text}`}>
                  {isOnline ? t('Online') : t('Offline')}
                </span>
              </div>
              
              <div className="flex justify-between">
                <span className={styles.text}>{t('Quality')}:</span>
                <span className={`font-medium ${styles.text}`}>
                  {t(connectionQuality)}
                </span>
              </div>
              
              {networkStatus.connectionType !== ConnectionType.UNKNOWN && (
                <div className="flex justify-between">
                  <span className={styles.text}>{t('Type')}:</span>
                  <span className={`font-medium ${styles.text}`}>
                    {t(networkStatus.connectionType)}
                  </span>
                </div>
              )}
              
              {networkStatus.rtt > 0 && (
                <div className="flex justify-between">
                  <span className={styles.text}>{t('Latency')}:</span>
                  <span className={`font-medium ${styles.text}`}>
                    {networkStatus.rtt}ms
                  </span>
                </div>
              )}
              
              {networkStatus.downlink > 0 && (
                <div className="flex justify-between">
                  <span className={styles.text}>{t('Speed')}:</span>
                  <span className={`font-medium ${styles.text}`}>
                    {networkStatus.downlink} Mbps
                  </span>
                </div>
              )}
            </div>

            {/* Queue status */}
            {showQueueStatus && (queueSize > 0 || isRecovering) && (
              <div className="mt-3 pt-3 border-t border-current/20">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <IconClock className="h-4 w-4 text-amber-500" />
                    <span className={`text-sm ${styles.text}`}>
                      {isRecovering 
                        ? t('Processing queued requests...') 
                        : t('{{count}} requests queued', { count: queueSize })
                      }
                    </span>
                  </div>
                  
                  {queueSize > 0 && !isRecovering && (
                    <button
                      onClick={clearQueue}
                      className={`text-xs px-2 py-1 rounded hover:bg-black/10 dark:hover:bg-white/10 transition-colors ${styles.text}`}
                      aria-label={t('Clear request queue')}
                    >
                      {t('Clear')}
                    </button>
                  )}
                </div>
                
                {isRecovering && (
                  <div className="mt-2">
                    <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-1">
                      <div className="h-1 bg-blue-500 rounded-full animate-pulse" style={{ width: '60%' }} />
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Connection tips */}
            {!isOnline && (
              <div className="mt-3 pt-3 border-t border-current/20">
                <div className="flex items-start gap-2">
                  <IconAlertTriangle className="h-4 w-4 text-amber-500 mt-0.5 flex-shrink-0" />
                  <div className={`text-xs ${styles.text}`}>
                    <p className="font-medium mb-1">{t('Working offline')}</p>
                    <p>{t('Your requests will be processed when connection is restored.')}</p>
                  </div>
                </div>
              </div>
            )}

            {connectionQuality === ConnectionQuality.POOR && isOnline && (
              <div className="mt-3 pt-3 border-t border-current/20">
                <div className="flex items-start gap-2">
                  <IconAlertTriangle className="h-4 w-4 text-amber-500 mt-0.5 flex-shrink-0" />
                  <div className={`text-xs ${styles.text}`}>
                    <p className="font-medium mb-1">{t('Poor connection detected')}</p>
                    <p>{t('Some features may be limited to save data.')}</p>
                  </div>
                </div>
              </div>
            )}

            {/* Close button for expanded compact mode */}
            {compact && isExpanded && (
              <div className="mt-3 pt-3 border-t border-current/20">
                <button
                  onClick={() => setIsExpanded(false)}
                  className={`w-full text-xs py-1 rounded hover:bg-black/10 dark:hover:bg-white/10 transition-colors ${styles.text}`}
                >
                  {t('Close')}
                </button>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

/**
 * Hook to use network status indicator in any component
 */
export function useNetworkStatusIndicator() {
  const networkData = useNetworkStatus();

  return {
    ...networkData,
    shouldShowIndicator: !networkData.isOnline || 
                         networkData.connectionQuality === ConnectionQuality.POOR ||
                         networkData.queueSize > 0,
  };
}