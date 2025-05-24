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
  isStorageNearingLimit,
  STORAGE_WARNING_THRESHOLD 
} from '@/utils/app/storageMonitor';

interface StorageMonitorContextProps {
  isNearingLimit: boolean;
  storagePercentage: number;
  checkStorage: () => void;
  showStorageWarning: boolean;
  setShowStorageWarning: (show: boolean) => void;
}

const StorageMonitorContext = createContext<StorageMonitorContextProps>({
  isNearingLimit: false,
  storagePercentage: 0,
  checkStorage: () => {},
  showStorageWarning: false,
  setShowStorageWarning: () => {},
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

  // Function to check storage status
  const checkStorage = () => {
    const { isNearingLimit, usageData } = updateStorageStats();
    setIsNearingLimit(isNearingLimit);
    setStoragePercentage(usageData.percentUsed);
    
    // If we're nearing the limit and not already showing the warning
    if (isNearingLimit && !showStorageWarning) {
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

  return (
    <StorageMonitorContext.Provider
      value={{
        isNearingLimit,
        storagePercentage,
        checkStorage,
        showStorageWarning,
        setShowStorageWarning,
      }}
    >
      {children}
    </StorageMonitorContext.Provider>
  );
};

export const useStorageMonitor = () => useContext(StorageMonitorContext);