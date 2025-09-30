import {
  FC,
  ReactNode,
  createContext,
  useContext,
  useEffect,
  useState,
} from 'react';
import React from 'react';

import {
  STORAGE_THRESHOLDS,
  dismissThreshold,
  resetDismissedThresholds,
  updateStorageStats,
} from '@/utils/app/storageMonitor';

interface StorageMonitorContextProps {
  isNearingLimit: boolean;
  storagePercentage: number;
  currentThreshold: string | null;
  checkStorage: () => void;
  showStorageWarning: boolean;
  setShowStorageWarning: (show: boolean) => void;
  dismissCurrentThreshold: () => void;
  resetDismissedThresholds: () => void;
  isEmergencyLevel: boolean;
  isCriticalLevel: boolean;
  setUserActionCooldown: (cooldown: boolean) => void;
}

const StorageMonitorContext = createContext<StorageMonitorContextProps>({
  isNearingLimit: false,
  storagePercentage: 0,
  currentThreshold: null,
  checkStorage: () => {},
  showStorageWarning: false,
  setShowStorageWarning: () => {},
  dismissCurrentThreshold: () => {},
  resetDismissedThresholds: () => {},
  isEmergencyLevel: false,
  isCriticalLevel: false,
  setUserActionCooldown: () => {},
});

interface StorageMonitorProviderProps {
  children: ReactNode;
}

export const StorageMonitorProvider: FC<StorageMonitorProviderProps> = ({
  children,
}) => {
  const [isNearingLimit, setIsNearingLimit] = useState<boolean>(false);
  const [storagePercentage, setStoragePercentage] = useState<number>(0);
  const [showStorageWarning, setShowStorageWarning] = useState<boolean>(false);
  const [currentThreshold, setCurrentThreshold] = useState<string | null>(null);
  const [userActionCooldown, setUserActionCooldown] = useState<boolean>(false);

  // Function to dismiss the current threshold
  const dismissCurrentThreshold = () => {
    if (currentThreshold) {
      dismissThreshold(currentThreshold);
      // Always allow hiding the modal - user can dismiss at any level
      setShowStorageWarning(false);
    }
  };

  // Function to check storage status
  const checkStorage = () => {
    const {
      isNearingLimit,
      usageData,
      currentThreshold: newThreshold,
      shouldShowWarning,
    } = updateStorageStats();

    setIsNearingLimit(isNearingLimit);
    setStoragePercentage(usageData.percentUsed);
    setCurrentThreshold(newThreshold);

    // Update warning visibility based on threshold and dismissal status
    // Don't show warning if user recently took action (cooldown period)
    if (shouldShowWarning && !showStorageWarning && !userActionCooldown) {
      setShowStorageWarning(true);
    }
  };

  // Check storage on initial load
  useEffect(() => {
    checkStorage();

    // Set up an interval to regularly check storage (every 5 minutes)
    const intervalId = setInterval(checkStorage, 5 * 60 * 1000);

    return () => clearInterval(intervalId);
  }, []);

  // Clear cooldown after a delay
  useEffect(() => {
    if (userActionCooldown) {
      // Clear cooldown after 30 seconds
      const timeoutId = setTimeout(() => {
        setUserActionCooldown(false);
      }, 30000);
      return () => clearTimeout(timeoutId);
    }
  }, [userActionCooldown]);

  // Compute derived state
  const isEmergencyLevel = currentThreshold === 'EMERGENCY';
  const isCriticalLevel = currentThreshold === 'CRITICAL';

  return (
    <StorageMonitorContext.Provider
      value={{
        isNearingLimit,
        storagePercentage,
        currentThreshold,
        checkStorage,
        showStorageWarning,
        setShowStorageWarning,
        dismissCurrentThreshold,
        resetDismissedThresholds,
        isEmergencyLevel,
        isCriticalLevel,
        setUserActionCooldown,
      }}
    >
      {children}
    </StorageMonitorContext.Provider>
  );
};

export const useStorageMonitor = () => useContext(StorageMonitorContext);
