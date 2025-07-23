import { AgentType } from '@/types/agent';
import {
  PerformanceSettings,
  PrivacySettings,
  RoutingPreferences,
  SecuritySettings,
  Settings,
  UICustomizationSettings,
} from '@/types/settings';

const STORAGE_KEY = 'settings';
const SETTINGS_VERSION = '1.1.0'; // Version for migration tracking

/**
 * Settings change event listener type
 */
export type SettingsChangeListener = (
  newSettings: Settings,
  changedKeys: string[],
) => void;

/**
 * Settings change events
 */
class SettingsEventEmitter {
  private listeners: SettingsChangeListener[] = [];

  addListener(listener: SettingsChangeListener): () => void {
    this.listeners.push(listener);
    return () => {
      const index = this.listeners.indexOf(listener);
      if (index > -1) {
        this.listeners.splice(index, 1);
      }
    };
  }

  emit(newSettings: Settings, changedKeys: string[]): void {
    this.listeners.forEach((listener) => listener(newSettings, changedKeys));
  }
}

export const settingsEvents = new SettingsEventEmitter();

/**
 * Get default privacy settings
 */
const getDefaultPrivacySettings = (): PrivacySettings => ({
  dataRetention: {
    searchHistory: 30, // 30 days
    conversationData: 90, // 90 days
    agentResults: 30, // 30 days
    citations: 60, // 60 days
  },
  dataSharing: {
    allowAnalytics: false, // Privacy-first default
    allowPerformanceMetrics: true,
    allowErrorReporting: true,
    shareWithExternalServices: false,
    allowCrossConversationData: false,
  },
  privacy: {
    pseudonymizeData: true,
    enableLocalProcessing: true,
    requireExplicitConsent: true,
    allowProfileBuilding: false,
  },
});

/**
 * Get default security settings
 */
const getDefaultSecuritySettings = (): SecuritySettings => ({
  permissions: {
    allowCodeExecution: false, // Secure by default
    allowFileSystemAccess: false,
    allowNetworkAccess: true,
    allowExternalApiCalls: true,
    allowScreenCapture: false,
  },
  restrictions: {
    trustedDomains: [],
    blockedDomains: [],
    allowedFileTypes: ['txt', 'pdf', 'doc', 'docx', 'md'],
    maxUploadSize: 10, // 10MB
    requireSandboxing: true,
  },
  authentication: {
    requireReauth: false,
    reauthInterval: 60, // 60 minutes
    enable2FA: false,
    sessionTimeout: 480, // 8 hours
  },
  audit: {
    enableAuditLogging: true,
    logLevel: 'standard',
    retainAuditLogs: 30, // 30 days
  },
});

/**
 * Get default performance settings
 */
const getDefaultPerformanceSettings = (): PerformanceSettings => ({
  resources: {
    maxConcurrentAgents: 3,
    maxMemoryUsage: 512, // 512MB
    maxBandwidthUsage: 5, // 5MB/s
    enableBackgroundProcessing: true,
  },
  caching: {
    enableResultCaching: true,
    cacheSize: 100, // 100MB
    cacheRetention: 24, // 24 hours
    enablePrefetching: false,
  },
  optimization: {
    enableCompression: true,
    optimizeForBattery: false,
    preferLocalProcessing: false,
    enableParallelProcessing: true,
  },
  limits: {
    requestTimeout: 60, // 60 seconds
    maxRequestsPerMinute: 30,
    maxResultSize: 50, // 50MB
  },
});

/**
 * Get default UI customization settings
 */
const getDefaultUISettings = (): UICustomizationSettings => ({
  display: {
    showAgentIndicators: true,
    showProcessingTime: true,
    showConfidenceScores: false,
    showTokenUsage: false,
    compactMode: false,
  },
  animations: {
    enableLoadingAnimations: true,
    enableTransitions: true,
    animationSpeed: 'normal',
    reduceMotion: false,
  },
  citations: {
    citationStyle: 'inline',
    showThumbnails: true,
    showPreview: true,
    enableHover: true,
  },
  themes: {
    agentColorCoding: true,
    customColors: {
      [AgentType.WEB_SEARCH]: '#3b82f6',
      [AgentType.CODE_INTERPRETER]: '#10b981',
      [AgentType.URL_PULL]: '#8b5cf6',
      [AgentType.LOCAL_KNOWLEDGE]: '#f59e0b',
      [AgentType.STANDARD_CHAT]: '#6b7280',
      [AgentType.FOUNDRY]: '#6366f1',
      [AgentType.THIRD_PARTY]: '#6b7280',
    },
    enableDarkMode: false,
    highContrast: false,
  },
});

/**
 * Get default routing preferences
 */
const getDefaultRoutingSettings = (): RoutingPreferences => ({
  defaultAgent: 'auto',
  routingRules: [],
  fallbackBehavior: {
    enableAutoFallback: true,
    fallbackChain: [AgentType.WEB_SEARCH, AgentType.STANDARD_CHAT],
    maxFallbackAttempts: 2,
  },
  performance: {
    preferFastResponse: false,
    tolerateHigherCosts: false,
    prioritizeAccuracy: true,
  },
  contextual: {
    enableSmartRouting: true,
    considerUserHistory: true,
    adaptToDeviceCapabilities: true,
  },
});

const getDefaultSettings = (): Settings => {
  const userDefaultThemeIsDark =
    typeof window !== 'undefined' &&
    window.matchMedia('(prefers-color-scheme: dark)').matches;

  return {
    theme: userDefaultThemeIsDark ? 'dark' : 'light',
    temperature: 0.5,
    systemPrompt:
      process.env.NEXT_PUBLIC_DEFAULT_SYSTEM_PROMPT ||
      "You are ChatGPT, a large language model trained by OpenAI. Follow the user's instructions carefully. Respond using markdown.",
    advancedMode: false,
    agentSettings: {
      enabled: true,
      confidenceThreshold: 0.6,
      fallbackEnabled: true,
      enabledAgentTypes: [
        AgentType.WEB_SEARCH,
        AgentType.CODE_INTERPRETER,
        AgentType.URL_PULL,
        AgentType.LOCAL_KNOWLEDGE,
        AgentType.FOUNDRY,
      ],
      agentConfigurations: Object.values(AgentType).reduce(
        (configs, agentType) => {
          configs[agentType] = {
            enabled:
              agentType !== AgentType.THIRD_PARTY &&
              agentType !== AgentType.CODE_INTERPRETER, // Disable third-party by default
            priority: 50,
            timeout: 30000,
            maxRetries: 2,
            parameters: {},
            securityLevel: 'normal',
            resourceLimits: {
              maxMemoryMb: 256,
              maxExecutionTime: 60000,
              maxConcurrentOperations: 2,
            },
            contentFilters: {
              allowedDomains: [],
              blockedDomains: [],
              contentTypes: ['text', 'html', 'json'],
              safeSearch: 'moderate',
            },
          };
          return configs;
        },
        {} as any,
      ),
      preferences: {
        preferredAgents: [],
        disabledAgents: [],
        autoRouting: true,
        showAgentAttribution: true,
        confirmBeforeAgentUse: false,
        routingStrategy: 'balanced',
        fallbackChain: [AgentType.WEB_SEARCH, AgentType.STANDARD_CHAT],
        maxRetryAttempts: 3,
        enableCaching: true,
      },
      privacy: getDefaultPrivacySettings(),
      security: getDefaultSecuritySettings(),
      performance: getDefaultPerformanceSettings(),
      ui: getDefaultUISettings(),
      routing: getDefaultRoutingSettings(),
    },
  };
};

/**
 * Settings backup for emergency restore
 */
let settingsBackup: Settings | null = null;

/**
 * Migrate settings from older versions
 */
const migrateSettings = (settings: any): Settings => {
  const defaultSettings = getDefaultSettings();

  // Handle version 1.0.0 -> 1.1.0 migration
  if (!settings.version || settings.version === '1.0.0') {
    // Add new privacy, security, performance, ui, and routing settings
    const migrated = {
      ...defaultSettings,
      ...settings,
      version: SETTINGS_VERSION,
      agentSettings: {
        ...defaultSettings.agentSettings,
        ...settings.agentSettings,
        privacy: getDefaultPrivacySettings(),
        security: getDefaultSecuritySettings(),
        performance: getDefaultPerformanceSettings(),
        ui: getDefaultUISettings(),
        routing: getDefaultRoutingSettings(),
      },
    };

    console.log('[INFO] Migrated settings from v1.0.0 to v1.1.0');
    return migrated;
  }

  return { ...defaultSettings, ...settings };
};

/**
 * Validate settings structure
 */
const validateSettings = (settings: any): boolean => {
  try {
    // Basic structure validation
    if (!settings || typeof settings !== 'object') {
      return false;
    }

    // Required fields
    const requiredFields = ['theme', 'temperature', 'systemPrompt'];
    for (const field of requiredFields) {
      if (!(field in settings)) {
        return false;
      }
    }

    // Type validation
    if (
      typeof settings.theme !== 'string' ||
      !['light', 'dark'].includes(settings.theme)
    ) {
      return false;
    }

    if (
      typeof settings.temperature !== 'number' ||
      settings.temperature < 0 ||
      settings.temperature > 2
    ) {
      return false;
    }

    if (typeof settings.systemPrompt !== 'string') {
      return false;
    }

    return true;
  } catch (error) {
    console.error('Settings validation error:', error);
    return false;
  }
};

export const getSettings = (): Settings => {
  const defaultSettings = getDefaultSettings();

  const settingsJson =
    typeof localStorage !== 'undefined'
      ? localStorage.getItem(STORAGE_KEY)
      : null;

  if (!settingsJson) {
    return defaultSettings;
  }

  try {
    const rawSettings = JSON.parse(settingsJson);

    // Validate settings structure
    if (!validateSettings(rawSettings)) {
      console.warn('[WARN] Invalid settings found, using defaults');
      return defaultSettings;
    }

    // Migrate if necessary
    const migratedSettings = migrateSettings(rawSettings);

    // Create backup before returning
    settingsBackup = JSON.parse(JSON.stringify(migratedSettings));

    return migratedSettings;
  } catch (error) {
    console.error('Error parsing saved settings:', error);
    return defaultSettings;
  }
};

/**
 * Deep compare two objects to find changed keys
 */
const getChangedKeys = (oldObj: any, newObj: any, prefix = ''): string[] => {
  const changedKeys: string[] = [];

  // Check all keys in new object
  for (const key in newObj) {
    const fullKey = prefix ? `${prefix}.${key}` : key;
    const oldValue = oldObj?.[key];
    const newValue = newObj[key];

    if (
      typeof newValue === 'object' &&
      newValue !== null &&
      !Array.isArray(newValue)
    ) {
      // Recursively check nested objects
      changedKeys.push(...getChangedKeys(oldValue, newValue, fullKey));
    } else if (JSON.stringify(oldValue) !== JSON.stringify(newValue)) {
      changedKeys.push(fullKey);
    }
  }

  return changedKeys;
};

export const saveSettings = (settings: Settings) => {
  try {
    // Validate settings before saving
    if (!validateSettings(settings)) {
      console.error('[ERROR] Cannot save invalid settings');
      return;
    }

    // Get current settings for change detection
    const currentSettings = settingsBackup || getDefaultSettings();

    // Add version and timestamp
    const settingsToSave = {
      ...settings,
      version: SETTINGS_VERSION,
      lastModified: Date.now(),
    };

    // Detect changed keys
    const changedKeys = getChangedKeys(currentSettings, settingsToSave);

    if (typeof localStorage !== 'undefined') {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(settingsToSave));
    }

    // Update backup
    settingsBackup = JSON.parse(JSON.stringify(settingsToSave));

    // Emit change events if there are changes
    if (changedKeys.length > 0) {
      settingsEvents.emit(settingsToSave, changedKeys);

      console.log(
        `[INFO] Settings saved with ${changedKeys.length} changes:`,
        changedKeys,
      );
    }
  } catch (error) {
    console.error('[ERROR] Failed to save settings:', error);
  }
};

/**
 * Backup current settings
 */
export const backupSettings = (): string | null => {
  try {
    const currentSettings = getSettings();
    return JSON.stringify(currentSettings);
  } catch (error) {
    console.error('[ERROR] Failed to backup settings:', error);
    return null;
  }
};

/**
 * Restore settings from backup string
 */
export const restoreSettings = (backupString: string): boolean => {
  try {
    const settings = JSON.parse(backupString);

    if (!validateSettings(settings)) {
      console.error('[ERROR] Invalid backup settings');
      return false;
    }

    saveSettings(settings);
    console.log('[INFO] Settings restored from backup');
    return true;
  } catch (error) {
    console.error('[ERROR] Failed to restore settings:', error);
    return false;
  }
};

/**
 * Reset settings to defaults
 */
export const resetSettings = (): void => {
  const defaultSettings = getDefaultSettings();
  saveSettings(defaultSettings);
  console.log('[INFO] Settings reset to defaults');
};

/**
 * Check if a specific setting exists
 */
export const hasSetting = (settingPath: string): boolean => {
  try {
    const settings = getSettings();
    const keys = settingPath.split('.');
    let current: any = settings;

    for (const key of keys) {
      if (current === null || current === undefined || !(key in current)) {
        return false;
      }
      current = current[key];
    }

    return true;
  } catch (error) {
    return false;
  }
};

/**
 * Get a specific setting by path
 */
export const getSetting = (settingPath: string, defaultValue?: any): any => {
  try {
    const settings = getSettings();
    const keys = settingPath.split('.');
    let current: any = settings;

    for (const key of keys) {
      if (current === null || current === undefined || !(key in current)) {
        return defaultValue;
      }
      current = current[key];
    }

    return current;
  } catch (error) {
    return defaultValue;
  }
};

/**
 * Update a specific setting by path
 */
export const updateSetting = (settingPath: string, value: any): void => {
  try {
    const settings = getSettings();
    const keys = settingPath.split('.');
    let current: any = settings;

    // Navigate to the parent of the target key
    for (let i = 0; i < keys.length - 1; i++) {
      const key = keys[i];
      if (!(key in current)) {
        current[key] = {};
      }
      current = current[key];
    }

    // Set the value
    const lastKey = keys[keys.length - 1];
    current[lastKey] = value;

    saveSettings(settings);
  } catch (error) {
    console.error('[ERROR] Failed to update setting:', error);
  }
};
