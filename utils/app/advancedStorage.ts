/**
 * Advanced Settings Storage Service
 * 
 * Provides enhanced storage capabilities including:
 * - Encryption for sensitive data
 * - Compression for large settings
 * - Cross-device synchronization
 * - Offline support with conflict resolution
 * - Settings versioning and rollback
 */

import { Settings } from '@/types/settings';

/**
 * Storage encryption key (in production, this should be derived from user credentials)
 */
const ENCRYPTION_KEY = 'chatbot-ui-settings-encryption-key-v1';

/**
 * Storage configuration
 */
export interface StorageConfig {
  enableEncryption: boolean;
  enableCompression: boolean;
  enableSync: boolean;
  syncEndpoint?: string;
  maxVersions: number;
  conflictResolution: 'local' | 'remote' | 'merge' | 'prompt';
}

/**
 * Storage entry with metadata
 */
export interface StorageEntry {
  data: Settings;
  version: string;
  timestamp: number;
  checksum: string;
  encrypted: boolean;
  compressed: boolean;
  deviceId: string;
  userId?: string;
}

/**
 * Sync conflict information
 */
export interface SyncConflict {
  localEntry: StorageEntry;
  remoteEntry: StorageEntry;
  conflictType: 'timestamp' | 'checksum' | 'version';
  resolution?: 'local' | 'remote' | 'merge';
}

/**
 * Storage operation result
 */
export interface StorageResult<T = any> {
  success: boolean;
  data?: T;
  error?: string;
  conflict?: SyncConflict;
}

/**
 * Advanced Settings Storage Service
 */
export class AdvancedSettingsStorage {
  private config: StorageConfig;
  private deviceId: string;
  private storageKey: string;
  private versionsKey: string;

  constructor(config: StorageConfig, storageKey = 'advanced-settings') {
    this.config = config;
    this.storageKey = storageKey;
    this.versionsKey = `${storageKey}-versions`;
    this.deviceId = this.getOrCreateDeviceId();
  }

  /**
   * Save settings with advanced features
   */
  async saveSettings(settings: Settings, userId?: string): Promise<StorageResult> {
    try {
      // Create storage entry
      const entry: StorageEntry = {
        data: settings,
        version: this.generateVersion(),
        timestamp: Date.now(),
        checksum: await this.generateChecksum(settings),
        encrypted: this.config.enableEncryption,
        compressed: this.config.enableCompression,
        deviceId: this.deviceId,
        userId,
      };

      // Process data
      let processedData: string = JSON.stringify(entry.data);

      if (this.config.enableCompression) {
        processedData = await this.compress(processedData);
      }

      if (this.config.enableEncryption) {
        processedData = await this.encrypt(processedData);
      }

      // Save to localStorage
      const storageData = {
        ...entry,
        data: processedData,
      };

      localStorage.setItem(this.storageKey, JSON.stringify(storageData));

      // Maintain version history
      await this.saveVersion(entry);

      // Sync if enabled
      if (this.config.enableSync && userId) {
        const syncResult = await this.syncToRemote(entry);
        if (!syncResult.success && syncResult.conflict) {
          return {
            success: false,
            conflict: syncResult.conflict,
            error: 'Sync conflict detected',
          };
        }
      }

      return { success: true, data: entry };

    } catch (error) {
      console.error('[ERROR] Failed to save settings:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }

  /**
   * Load settings with advanced features
   */
  async loadSettings(userId?: string): Promise<StorageResult<Settings>> {
    try {
      // Try to sync from remote first if enabled
      if (this.config.enableSync && userId) {
        const syncResult = await this.syncFromRemote(userId);
        if (syncResult.success && syncResult.data) {
          return { success: true, data: syncResult.data.data };
        }
      }

      // Load from localStorage
      const stored = localStorage.getItem(this.storageKey);
      if (!stored) {
        return { success: false, error: 'No settings found' };
      }

      const entry: StorageEntry = JSON.parse(stored);
      let processedData = typeof entry.data === 'string' ? entry.data : JSON.stringify(entry.data);

      // Decrypt if needed
      if (entry.encrypted && this.config.enableEncryption) {
        processedData = await this.decrypt(processedData);
      }

      // Decompress if needed
      if (entry.compressed && this.config.enableCompression) {
        processedData = await this.decompress(processedData);
      }

      // Parse final data
      const settings: Settings = typeof processedData === 'string' 
        ? JSON.parse(processedData) 
        : processedData;

      // Verify checksum
      const expectedChecksum = await this.generateChecksum(settings);
      if (entry.checksum !== expectedChecksum) {
        console.warn('[WARN] Settings checksum mismatch, data may be corrupted');
      }

      return { success: true, data: settings };

    } catch (error) {
      console.error('[ERROR] Failed to load settings:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }

  /**
   * Get settings version history
   */
  async getVersionHistory(): Promise<StorageEntry[]> {
    try {
      const stored = localStorage.getItem(this.versionsKey);
      if (!stored) {
        return [];
      }

      const versions: StorageEntry[] = JSON.parse(stored);
      return versions.sort((a, b) => b.timestamp - a.timestamp);

    } catch (error) {
      console.error('[ERROR] Failed to get version history:', error);
      return [];
    }
  }

  /**
   * Rollback to a specific version
   */
  async rollbackToVersion(version: string): Promise<StorageResult<Settings>> {
    try {
      const versions = await this.getVersionHistory();
      const targetVersion = versions.find(v => v.version === version);

      if (!targetVersion) {
        return { success: false, error: 'Version not found' };
      }

      // Save current as rollback point
      const current = await this.loadSettings();
      if (current.success && current.data) {
        await this.saveSettings(current.data);
      }

      // Restore target version
      return await this.saveSettings(targetVersion.data);

    } catch (error) {
      console.error('[ERROR] Failed to rollback settings:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }

  /**
   * Clear all stored data
   */
  clearStorage(): void {
    localStorage.removeItem(this.storageKey);
    localStorage.removeItem(this.versionsKey);
    localStorage.removeItem('device-id');
  }

  /**
   * Get storage statistics
   */
  getStorageStats(): {
    currentSize: number;
    versionsCount: number;
    lastModified: number;
    deviceId: string;
  } {
    const current = localStorage.getItem(this.storageKey);
    const versions = localStorage.getItem(this.versionsKey);
    
    let lastModified = 0;
    if (current) {
      try {
        const entry: StorageEntry = JSON.parse(current);
        lastModified = entry.timestamp;
      } catch (error) {
        console.error('Error parsing storage stats:', error);
      }
    }

    return {
      currentSize: (current?.length || 0) + (versions?.length || 0),
      versionsCount: versions ? JSON.parse(versions).length : 0,
      lastModified,
      deviceId: this.deviceId,
    };
  }

  /**
   * Private helper methods
   */

  private getOrCreateDeviceId(): string {
    let deviceId = localStorage.getItem('device-id');
    if (!deviceId) {
      deviceId = `device-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
      localStorage.setItem('device-id', deviceId);
    }
    return deviceId;
  }

  private generateVersion(): string {
    return `v${Date.now()}-${Math.random().toString(36).substr(2, 5)}`;
  }

  private async generateChecksum(data: any): Promise<string> {
    const str = JSON.stringify(data);
    const encoder = new TextEncoder();
    const dataBuffer = encoder.encode(str);
    const hashBuffer = await crypto.subtle.digest('SHA-256', dataBuffer);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
  }

  private async compress(data: string): Promise<string> {
    // Simple compression using browser APIs
    if (typeof window !== 'undefined' && 'CompressionStream' in window) {
      try {
        const stream = new (window as any).CompressionStream('gzip');
        const encoder = new TextEncoder();
        const decoder = new TextDecoder();
        
        const writer = stream.writable.getWriter();
        const reader = stream.readable.getReader();
        
        writer.write(encoder.encode(data));
        writer.close();
        
        const chunks: Uint8Array[] = [];
        let done = false;
        
        while (!done) {
          const { value, done: readerDone } = await reader.read();
          done = readerDone;
          if (value) {
            chunks.push(value);
          }
        }
        
        // Convert to base64 for storage
        const compressed = new Uint8Array(chunks.reduce((acc, chunk) => acc + chunk.length, 0));
        let offset = 0;
        for (const chunk of chunks) {
          compressed.set(chunk, offset);
          offset += chunk.length;
        }
        
        return btoa(String.fromCharCode(...compressed));
      } catch (error) {
        console.warn('[WARN] Compression failed, storing uncompressed:', error);
        return data;
      }
    }
    return data;
  }

  private async decompress(data: string): Promise<string> {
    // Simple decompression
    if (typeof window !== 'undefined' && 'DecompressionStream' in window) {
      try {
        const compressed = Uint8Array.from(atob(data), c => c.charCodeAt(0));
        const stream = new (window as any).DecompressionStream('gzip');
        const decoder = new TextDecoder();
        
        const writer = stream.writable.getWriter();
        const reader = stream.readable.getReader();
        
        writer.write(compressed);
        writer.close();
        
        const chunks: Uint8Array[] = [];
        let done = false;
        
        while (!done) {
          const { value, done: readerDone } = await reader.read();
          done = readerDone;
          if (value) {
            chunks.push(value);
          }
        }
        
        const decompressed = new Uint8Array(chunks.reduce((acc, chunk) => acc + chunk.length, 0));
        let offset = 0;
        for (const chunk of chunks) {
          decompressed.set(chunk, offset);
          offset += chunk.length;
        }
        
        return decoder.decode(decompressed);
      } catch (error) {
        console.warn('[WARN] Decompression failed, returning as-is:', error);
        return data;
      }
    }
    return data;
  }

  private async encrypt(data: string): Promise<string> {
    // Simple encryption using Web Crypto API
    try {
      const encoder = new TextEncoder();
      const keyData = encoder.encode(ENCRYPTION_KEY);
      
      const key = await crypto.subtle.importKey(
        'raw',
        keyData,
        { name: 'AES-GCM' },
        false,
        ['encrypt']
      );
      
      const iv = crypto.getRandomValues(new Uint8Array(12));
      const encrypted = await crypto.subtle.encrypt(
        { name: 'AES-GCM', iv },
        key,
        encoder.encode(data)
      );
      
      // Combine IV and encrypted data
      const combined = new Uint8Array(iv.length + encrypted.byteLength);
      combined.set(iv);
      combined.set(new Uint8Array(encrypted), iv.length);
      
      return btoa(String.fromCharCode(...combined));
    } catch (error) {
      console.warn('[WARN] Encryption failed, storing unencrypted:', error);
      return data;
    }
  }

  private async decrypt(data: string): Promise<string> {
    // Simple decryption using Web Crypto API
    try {
      const combined = Uint8Array.from(atob(data), c => c.charCodeAt(0));
      const iv = combined.slice(0, 12);
      const encrypted = combined.slice(12);
      
      const encoder = new TextEncoder();
      const decoder = new TextDecoder();
      const keyData = encoder.encode(ENCRYPTION_KEY);
      
      const key = await crypto.subtle.importKey(
        'raw',
        keyData,
        { name: 'AES-GCM' },
        false,
        ['decrypt']
      );
      
      const decrypted = await crypto.subtle.decrypt(
        { name: 'AES-GCM', iv },
        key,
        encrypted
      );
      
      return decoder.decode(decrypted);
    } catch (error) {
      console.warn('[WARN] Decryption failed, returning as-is:', error);
      return data;
    }
  }

  private async saveVersion(entry: StorageEntry): Promise<void> {
    try {
      const versions = await this.getVersionHistory();
      versions.unshift(entry);
      
      // Keep only max versions
      if (versions.length > this.config.maxVersions) {
        versions.splice(this.config.maxVersions);
      }
      
      localStorage.setItem(this.versionsKey, JSON.stringify(versions));
    } catch (error) {
      console.error('[ERROR] Failed to save version:', error);
    }
  }

  private async syncToRemote(entry: StorageEntry): Promise<StorageResult> {
    // Placeholder for remote sync implementation
    // In production, this would integrate with your backend API
    if (!this.config.syncEndpoint) {
      return { success: false, error: 'No sync endpoint configured' };
    }

    try {
      const response = await fetch(`${this.config.syncEndpoint}/settings`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(entry),
      });

      if (!response.ok) {
        throw new Error(`Sync failed: ${response.statusText}`);
      }

      const result = await response.json();
      return { success: true, data: result };

    } catch (error) {
      console.error('[ERROR] Remote sync failed:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Sync failed',
      };
    }
  }

  private async syncFromRemote(userId: string): Promise<StorageResult<StorageEntry>> {
    // Placeholder for remote sync implementation
    if (!this.config.syncEndpoint) {
      return { success: false, error: 'No sync endpoint configured' };
    }

    try {
      const response = await fetch(`${this.config.syncEndpoint}/settings/${userId}`);

      if (!response.ok) {
        if (response.status === 404) {
          return { success: false, error: 'No remote settings found' };
        }
        throw new Error(`Sync failed: ${response.statusText}`);
      }

      const remoteEntry: StorageEntry = await response.json();
      
      // Check for conflicts with local data
      const localResult = await this.loadSettings();
      if (localResult.success && localResult.data) {
        const localEntry = JSON.parse(localStorage.getItem(this.storageKey) || '{}');
        
        if (localEntry.timestamp > remoteEntry.timestamp) {
          // Local is newer, potential conflict
          const conflict: SyncConflict = {
            localEntry,
            remoteEntry,
            conflictType: 'timestamp',
          };
          
          return { success: false, conflict };
        }
      }

      return { success: true, data: remoteEntry };

    } catch (error) {
      console.error('[ERROR] Remote sync failed:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Sync failed',
      };
    }
  }
}

/**
 * Default configuration for advanced storage
 */
export const defaultStorageConfig: StorageConfig = {
  enableEncryption: false, // Disabled by default for performance
  enableCompression: true,
  enableSync: false, // Requires backend implementation
  maxVersions: 10,
  conflictResolution: 'local',
};

/**
 * Create an advanced storage instance with default config
 */
export const createAdvancedStorage = (config?: Partial<StorageConfig>): AdvancedSettingsStorage => {
  const finalConfig = { ...defaultStorageConfig, ...config };
  return new AdvancedSettingsStorage(finalConfig);
};