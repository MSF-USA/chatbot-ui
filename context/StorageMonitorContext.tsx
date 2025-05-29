import {
  createContext,
  useState,
  useContext,
  useEffect,
  FC,
  ReactNode
} from 'react';
import {
  updateStorageStats,
  dismissThreshold,
  resetDismissedThresholds,
  STORAGE_THRESHOLDS
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
});

interface StorageMonitorProviderProps {
  children: ReactNode;
}

export const StorageMonitorProvider: FC<StorageMonitorProviderProps> = ({
  children
}) => {
  const [isNearingLimit, setIsNearingLimit] = useState<boolean>(false);
  const [storagePercentage, setStoragePercentage] = useState<number>(0);
  const [showStorageWarning, setShowStorageWarning] = useState<boolean>(false);
  const [currentThreshold, setCurrentThreshold] = useState<string | null>(null);

  // Function to dismiss the current threshold
  const dismissCurrentThreshold = () => {
    if (currentThreshold) {
      dismissThreshold(currentThreshold);
      // Only hide the warning if not at emergency level
      if (currentThreshold !== 'EMERGENCY') {
        setShowStorageWarning(false);
      }
    }
  };

  // Function to check storage status
  const checkStorage = () => {
    const { isNearingLimit, usageData, currentThreshold: newThreshold, shouldShowWarning } = updateStorageStats();

    setIsNearingLimit(isNearingLimit);
    setStoragePercentage(usageData.percentUsed);
    setCurrentThreshold(newThreshold);

    // Update warning visibility based on threshold and dismissal status
    if (shouldShowWarning && !showStorageWarning) {
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
      }}
    >
      {children}
    </StorageMonitorContext.Provider>
  );
};

export const useStorageMonitor = () => useContext(StorageMonitorContext);
