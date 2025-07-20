/**
 * Advanced Settings Hook
 * 
 * React hook for managing settings with advanced storage features
 * including encryption, versioning, and sync capabilities.
 */

import { useState, useEffect, useCallback, useRef } from 'react';
import { Settings } from '@/types/settings';
import { 
  AdvancedSettingsStorage, 
  StorageConfig, 
  StorageResult, 
  SyncConflict,
  defaultStorageConfig,
  createAdvancedStorage 
} from '@/utils/app/advancedStorage';
import { getSettings as getFallbackSettings, saveSettings as saveFallbackSettings } from '@/utils/app/settings';

/**
 * Hook options
 */
export interface UseAdvancedSettingsOptions {
  storageConfig?: Partial<StorageConfig>;
  enableAdvancedFeatures?: boolean;
  userId?: string;
  onSyncConflict?: (conflict: SyncConflict) => 'local' | 'remote' | 'merge';
  onError?: (error: string) => void;
}

/**
 * Hook return type
 */
export interface UseAdvancedSettingsReturn {
  settings: Settings;
  loading: boolean;
  error: string | null;
  conflict: SyncConflict | null;
  
  // Core operations
  updateSettings: (newSettings: Settings) => Promise<boolean>;
  resetSettings: () => Promise<boolean>;
  
  // Advanced operations
  saveSettingsAdvanced: (settings: Settings) => Promise<boolean>;
  loadSettingsAdvanced: () => Promise<boolean>;
  
  // Version management
  getVersionHistory: () => Promise<any[]>;
  rollbackToVersion: (version: string) => Promise<boolean>;
  
  // Sync operations
  syncSettings: () => Promise<boolean>;
  resolveConflict: (resolution: 'local' | 'remote' | 'merge') => Promise<boolean>;
  
  // Storage management
  clearStorage: () => void;
  getStorageStats: () => any;
  
  // Backup/restore
  exportSettings: () => string | null;
  importSettings: (data: string) => Promise<boolean>;
}

/**
 * Advanced Settings Hook
 */
export const useAdvancedSettings = (options: UseAdvancedSettingsOptions = {}): UseAdvancedSettingsReturn => {
  const {
    storageConfig = {},
    enableAdvancedFeatures = true,
    userId,
    onSyncConflict,
    onError,
  } = options;

  // State
  const [settings, setSettings] = useState<Settings>(() => getFallbackSettings());
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [conflict, setConflict] = useState<SyncConflict | null>(null);

  // Storage instance
  const storageRef = useRef<AdvancedSettingsStorage | null>(null);

  // Initialize storage
  useEffect(() => {
    if (enableAdvancedFeatures) {
      const config = { ...defaultStorageConfig, ...storageConfig };
      storageRef.current = createAdvancedStorage(config);
    }
  }, [enableAdvancedFeatures, storageConfig]);

  // Load settings on mount
  useEffect(() => {
    loadSettingsAdvanced();
  }, []);

  // Helper to handle errors
  const handleError = useCallback((errorMessage: string) => {
    setError(errorMessage);
    onError?.(errorMessage);
    console.error('[AdvancedSettings]', errorMessage);
  }, [onError]);

  // Load settings with advanced features
  const loadSettingsAdvanced = useCallback(async (): Promise<boolean> => {
    setLoading(true);
    setError(null);

    try {
      if (!enableAdvancedFeatures || !storageRef.current) {
        // Fallback to basic settings
        const fallbackSettings = getFallbackSettings();
        setSettings(fallbackSettings);
        return true;
      }

      const result = await storageRef.current.loadSettings(userId);

      if (result.success && result.data) {
        setSettings(result.data);
        return true;
      } else if (result.conflict) {
        setConflict(result.conflict);
        
        // Auto-resolve if handler provided
        if (onSyncConflict) {
          const resolution = onSyncConflict(result.conflict);
          return await resolveConflict(resolution);
        }
        
        handleError('Sync conflict detected. Please resolve manually.');
        return false;
      } else {
        // Try fallback settings if advanced loading fails
        const fallbackSettings = getFallbackSettings();
        setSettings(fallbackSettings);
        
        if (result.error) {
          handleError(`Failed to load advanced settings: ${result.error}`);
        }
        
        return false;
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Unknown error loading settings';
      handleError(errorMessage);
      
      // Always fallback to basic settings
      const fallbackSettings = getFallbackSettings();
      setSettings(fallbackSettings);
      return false;
    } finally {
      setLoading(false);
    }
  }, [enableAdvancedFeatures, userId, onSyncConflict, handleError]);

  // Save settings with advanced features
  const saveSettingsAdvanced = useCallback(async (newSettings: Settings): Promise<boolean> => {
    setLoading(true);
    setError(null);

    try {
      if (!enableAdvancedFeatures || !storageRef.current) {
        // Fallback to basic settings
        saveFallbackSettings(newSettings);
        setSettings(newSettings);
        return true;
      }

      const result = await storageRef.current.saveSettings(newSettings, userId);

      if (result.success) {
        setSettings(newSettings);
        return true;
      } else if (result.conflict) {
        setConflict(result.conflict);
        
        // Auto-resolve if handler provided
        if (onSyncConflict) {
          const resolution = onSyncConflict(result.conflict);
          return await resolveConflict(resolution);
        }
        
        handleError('Sync conflict detected. Please resolve manually.');
        return false;
      } else {
        handleError(`Failed to save settings: ${result.error || 'Unknown error'}`);
        return false;
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Unknown error saving settings';
      handleError(errorMessage);
      return false;
    } finally {
      setLoading(false);
    }
  }, [enableAdvancedFeatures, userId, onSyncConflict, handleError]);

  // Update settings (unified interface)
  const updateSettings = useCallback(async (newSettings: Settings): Promise<boolean> => {
    return await saveSettingsAdvanced(newSettings);
  }, [saveSettingsAdvanced]);

  // Reset settings to defaults
  const resetSettings = useCallback(async (): Promise<boolean> => {
    const defaultSettings = getFallbackSettings();
    return await updateSettings(defaultSettings);
  }, [updateSettings]);

  // Get version history
  const getVersionHistory = useCallback(async () => {
    if (!enableAdvancedFeatures || !storageRef.current) {
      return [];
    }

    try {
      return await storageRef.current.getVersionHistory();
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to get version history';
      handleError(errorMessage);
      return [];
    }
  }, [enableAdvancedFeatures, handleError]);

  // Rollback to specific version
  const rollbackToVersion = useCallback(async (version: string): Promise<boolean> => {
    if (!enableAdvancedFeatures || !storageRef.current) {
      handleError('Advanced features not enabled');
      return false;
    }

    setLoading(true);
    try {
      const result = await storageRef.current.rollbackToVersion(version);
      
      if (result.success && result.data) {
        setSettings(result.data);
        return true;
      } else {
        handleError(`Failed to rollback: ${result.error || 'Unknown error'}`);
        return false;
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Rollback failed';
      handleError(errorMessage);
      return false;
    } finally {
      setLoading(false);
    }
  }, [enableAdvancedFeatures, handleError]);

  // Sync settings manually
  const syncSettings = useCallback(async (): Promise<boolean> => {
    if (!enableAdvancedFeatures || !storageRef.current || !userId) {
      handleError('Sync not available');
      return false;
    }

    return await loadSettingsAdvanced();
  }, [enableAdvancedFeatures, userId, loadSettingsAdvanced, handleError]);

  // Resolve sync conflict
  const resolveConflict = useCallback(async (resolution: 'local' | 'remote' | 'merge'): Promise<boolean> => {
    if (!conflict) {
      return true;
    }

    setLoading(true);
    try {
      let resolvedSettings: Settings;

      switch (resolution) {
        case 'local':
          resolvedSettings = conflict.localEntry.data;
          break;
        case 'remote':
          resolvedSettings = conflict.remoteEntry.data;
          break;
        case 'merge':
          // Simple merge strategy - prefer local but take remote for missing keys
          resolvedSettings = {
            ...conflict.remoteEntry.data,
            ...conflict.localEntry.data,
          };
          break;
        default:
          throw new Error('Invalid resolution strategy');
      }

      const success = await saveSettingsAdvanced(resolvedSettings);
      if (success) {
        setConflict(null);
      }
      return success;

    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Conflict resolution failed';
      handleError(errorMessage);
      return false;
    } finally {
      setLoading(false);
    }
  }, [conflict, saveSettingsAdvanced, handleError]);

  // Clear storage
  const clearStorage = useCallback(() => {
    if (storageRef.current) {
      storageRef.current.clearStorage();
    }
    // Also clear fallback storage
    localStorage.removeItem('settings');
    setSettings(getFallbackSettings());
    setError(null);
    setConflict(null);
  }, []);

  // Get storage statistics
  const getStorageStats = useCallback(() => {
    if (!enableAdvancedFeatures || !storageRef.current) {
      return null;
    }
    return storageRef.current.getStorageStats();
  }, [enableAdvancedFeatures]);

  // Export settings
  const exportSettings = useCallback((): string | null => {
    try {
      return JSON.stringify({
        settings,
        timestamp: Date.now(),
        version: '1.1.0',
      }, null, 2);
    } catch (err) {
      handleError('Failed to export settings');
      return null;
    }
  }, [settings, handleError]);

  // Import settings
  const importSettings = useCallback(async (data: string): Promise<boolean> => {
    try {
      const imported = JSON.parse(data);
      
      if (!imported.settings) {
        handleError('Invalid settings file format');
        return false;
      }

      return await updateSettings(imported.settings);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Import failed';
      handleError(errorMessage);
      return false;
    }
  }, [updateSettings, handleError]);

  return {
    settings,
    loading,
    error,
    conflict,
    
    // Core operations
    updateSettings,
    resetSettings,
    
    // Advanced operations
    saveSettingsAdvanced,
    loadSettingsAdvanced,
    
    // Version management
    getVersionHistory,
    rollbackToVersion,
    
    // Sync operations
    syncSettings,
    resolveConflict,
    
    // Storage management
    clearStorage,
    getStorageStats,
    
    // Backup/restore
    exportSettings,
    importSettings,
  };
};