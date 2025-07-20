/**
 * Privacy Control Center Component
 * 
 * Comprehensive privacy controls for agent operations,
 * data handling, and user preferences with GDPR/CCPA compliance.
 */

import React, { useState, useEffect, useCallback } from 'react';
import { useTranslation } from 'next-i18next';
import {
  IconShield,
  IconEye,
  IconEyeOff,
  IconTrash,
  IconDownload,
  IconLock,
  IconLockOpen,
  IconClock,
  IconServer,
  IconDatabase,
  IconFingerprint,
  IconToggleLeft,
  IconToggleRight,
  IconInfoCircle,
  IconAlertTriangle,
  IconCheck,
} from '@tabler/icons-react';

import { Settings, PrivacySettings, SecuritySettings } from '@/types/settings';
import { useAdvancedSettings } from '@/hooks/useAdvancedSettings';

/**
 * Component props
 */
interface PrivacyControlSectionProps {
  onClose: () => void;
}

/**
 * Privacy category component
 */
interface PrivacyCategoryProps {
  title: string;
  description: string;
  icon: React.ReactNode;
  children: React.ReactNode;
  expanded?: boolean;
}

const PrivacyCategory: React.FC<PrivacyCategoryProps> = ({
  title,
  description,
  icon,
  children,
  expanded = false,
}) => {
  const [isExpanded, setIsExpanded] = useState(expanded);

  return (
    <div className="border border-gray-200 rounded-lg dark:border-gray-600 mb-4">
      <div
        className="flex items-center justify-between p-4 cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-700"
        onClick={() => setIsExpanded(!isExpanded)}
      >
        <div className="flex items-center gap-3">
          <div className="text-blue-500">{icon}</div>
          <div>
            <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
              {title}
            </h3>
            <p className="text-sm text-gray-600 dark:text-gray-400">
              {description}
            </p>
          </div>
        </div>
        <IconInfoCircle
          className={`h-5 w-5 text-gray-400 transform transition-transform ${
            isExpanded ? 'rotate-180' : ''
          }`}
        />
      </div>
      {isExpanded && (
        <div className="border-t border-gray-200 dark:border-gray-600 p-4">
          {children}
        </div>
      )}
    </div>
  );
};

/**
 * Toggle switch component
 */
interface ToggleSwitchProps {
  enabled: boolean;
  onChange: (enabled: boolean) => void;
  disabled?: boolean;
  label: string;
  description?: string;
  warning?: string;
}

const ToggleSwitch: React.FC<ToggleSwitchProps> = ({
  enabled,
  onChange,
  disabled = false,
  label,
  description,
  warning,
}) => {
  return (
    <div className="flex items-start justify-between py-3">
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <h4 className="text-sm font-medium text-gray-900 dark:text-gray-100">
            {label}
          </h4>
          {warning && (
            <div title={warning} aria-label={warning}>
              <IconAlertTriangle className="h-4 w-4 text-amber-500" />
            </div>
          )}
        </div>
        {description && (
          <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
            {description}
          </p>
        )}
      </div>
      <button
        onClick={() => !disabled && onChange(!enabled)}
        disabled={disabled}
        className={`flex items-center p-1 rounded transition-colors ${
          disabled 
            ? 'opacity-50 cursor-not-allowed' 
            : 'hover:bg-gray-100 dark:hover:bg-gray-700'
        }`}
      >
        {enabled ? (
          <IconToggleRight className="h-6 w-6 text-green-500" />
        ) : (
          <IconToggleLeft className="h-6 w-6 text-gray-400" />
        )}
      </button>
    </div>
  );
};

/**
 * Retention period selector
 */
interface RetentionSelectorProps {
  value: number;
  onChange: (days: number) => void;
  label: string;
  description?: string;
}

const RetentionSelector: React.FC<RetentionSelectorProps> = ({
  value,
  onChange,
  label,
  description,
}) => {
  const options = [
    { value: 0, label: 'Never delete' },
    { value: 1, label: '1 day' },
    { value: 7, label: '7 days' },
    { value: 30, label: '30 days' },
    { value: 90, label: '90 days' },
    { value: 365, label: '1 year' },
  ];

  return (
    <div className="py-3">
      <div className="flex items-center justify-between mb-2">
        <div>
          <h4 className="text-sm font-medium text-gray-900 dark:text-gray-100">
            {label}
          </h4>
          {description && (
            <p className="text-sm text-gray-600 dark:text-gray-400">
              {description}
            </p>
          )}
        </div>
      </div>
      <select
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
        className="mt-1 block w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm shadow-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 dark:bg-gray-600 dark:border-gray-500 dark:text-gray-100"
      >
        {options.map(option => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
    </div>
  );
};

/**
 * Main Privacy Control Section Component
 */
export const PrivacyControlSection: React.FC<PrivacyControlSectionProps> = ({ onClose }) => {
  const { t } = useTranslation(['settings', 'privacy']);
  const {
    settings,
    updateSettings,
    loading,
    error,
    exportSettings,
    clearStorage,
  } = useAdvancedSettings({ enableAdvancedFeatures: true });

  const [privacySettings, setPrivacySettings] = useState<PrivacySettings>(() => 
    settings.agentSettings?.privacy || {
      dataRetention: {
        searchHistory: 30,
        conversationData: 90,
        agentResults: 30,
        citations: 60,
      },
      dataSharing: {
        allowAnalytics: false,
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
    }
  );

  const [securitySettings, setSecuritySettings] = useState<SecuritySettings>(() =>
    settings.agentSettings?.security || {
      permissions: {
        allowCodeExecution: false,
        allowFileSystemAccess: false,
        allowNetworkAccess: true,
        allowExternalApiCalls: true,
        allowScreenCapture: false,
      },
      restrictions: {
        trustedDomains: [],
        blockedDomains: [],
        allowedFileTypes: ['txt', 'pdf', 'doc', 'docx', 'md'],
        maxUploadSize: 10,
        requireSandboxing: true,
      },
      authentication: {
        requireReauth: false,
        reauthInterval: 60,
        enable2FA: false,
        sessionTimeout: 480,
      },
      audit: {
        enableAuditLogging: true,
        logLevel: 'standard',
        retainAuditLogs: 30,
      },
    }
  );

  // Update local state when settings change
  useEffect(() => {
    if (settings.agentSettings?.privacy) {
      setPrivacySettings(settings.agentSettings.privacy);
    }
    if (settings.agentSettings?.security) {
      setSecuritySettings(settings.agentSettings.security);
    }
  }, [settings]);

  // Save changes to settings
  const saveChanges = useCallback(async () => {
    const updatedSettings: Settings = {
      ...settings,
      agentSettings: {
        ...settings.agentSettings!,
        privacy: privacySettings,
        security: securitySettings,
      },
    };

    await updateSettings(updatedSettings);
  }, [settings, privacySettings, securitySettings, updateSettings]);

  // Auto-save when settings change
  useEffect(() => {
    const timeoutId = setTimeout(() => {
      saveChanges();
    }, 1000); // Debounce saves

    return () => clearTimeout(timeoutId);
  }, [privacySettings, securitySettings, saveChanges]);

  // Update privacy setting
  const updatePrivacySetting = useCallback((path: string, value: any) => {
    setPrivacySettings(prev => {
      const updated = { ...prev };
      const keys = path.split('.');
      let current: any = updated;
      
      for (let i = 0; i < keys.length - 1; i++) {
        if (!(keys[i] in current)) {
          current[keys[i]] = {};
        }
        current = current[keys[i]];
      }
      
      current[keys[keys.length - 1]] = value;
      return updated;
    });
  }, []);

  // Update security setting
  const updateSecuritySetting = useCallback((path: string, value: any) => {
    setSecuritySettings(prev => {
      const updated = { ...prev };
      const keys = path.split('.');
      let current: any = updated;
      
      for (let i = 0; i < keys.length - 1; i++) {
        if (!(keys[i] in current)) {
          current[keys[i]] = {};
        }
        current = current[keys[i]];
      }
      
      current[keys[keys.length - 1]] = value;
      return updated;
    });
  }, []);

  // Export privacy data
  const handleExportData = useCallback(() => {
    const data = exportSettings();
    if (data) {
      const blob = new Blob([data], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `privacy-data-export-${new Date().toISOString().split('T')[0]}.json`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    }
  }, [exportSettings]);

  // Clear all data
  const handleClearAllData = useCallback(() => {
    if (confirm('Are you sure you want to permanently delete all stored data? This action cannot be undone.')) {
      clearStorage();
      alert('All data has been cleared successfully.');
    }
  }, [clearStorage]);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto p-6">
      <div className="mb-6">
        <h2 className="text-2xl font-bold text-gray-900 dark:text-gray-100 mb-2">
          Privacy Control Center
        </h2>
        <p className="text-gray-600 dark:text-gray-400">
          Manage your privacy preferences and data handling settings. 
          Changes are saved automatically and take effect immediately.
        </p>
      </div>

      {error && (
        <div className="mb-4 p-4 bg-red-50 border border-red-200 rounded-lg text-red-700 dark:bg-red-900/20 dark:border-red-800 dark:text-red-400">
          <IconAlertTriangle className="inline h-4 w-4 mr-2" />
          {error}
        </div>
      )}

      {/* Data Retention Settings */}
      <PrivacyCategory
        title="Data Retention"
        description="Control how long different types of data are stored"
        icon={<IconClock className="h-6 w-6" />}
        expanded
      >
        <div className="space-y-4">
          <RetentionSelector
            value={privacySettings.dataRetention.searchHistory}
            onChange={(days) => updatePrivacySetting('dataRetention.searchHistory', days)}
            label="Search History"
            description="How long to keep records of your search queries"
          />
          <RetentionSelector
            value={privacySettings.dataRetention.conversationData}
            onChange={(days) => updatePrivacySetting('dataRetention.conversationData', days)}
            label="Conversation Data"
            description="How long to keep chat conversations and messages"
          />
          <RetentionSelector
            value={privacySettings.dataRetention.agentResults}
            onChange={(days) => updatePrivacySetting('dataRetention.agentResults', days)}
            label="Agent Results"
            description="How long to keep results from agent operations"
          />
          <RetentionSelector
            value={privacySettings.dataRetention.citations}
            onChange={(days) => updatePrivacySetting('dataRetention.citations', days)}
            label="Citations & References"
            description="How long to keep citation data and web references"
          />
        </div>
      </PrivacyCategory>

      {/* Data Sharing Settings */}
      <PrivacyCategory
        title="Data Sharing & Analytics"
        description="Control what data is shared for analytics and improvement"
        icon={<IconServer className="h-6 w-6" />}
      >
        <div className="space-y-2">
          <ToggleSwitch
            enabled={privacySettings.dataSharing.allowAnalytics}
            onChange={(enabled) => updatePrivacySetting('dataSharing.allowAnalytics', enabled)}
            label="Usage Analytics"
            description="Allow collection of anonymized usage statistics to improve the service"
          />
          <ToggleSwitch
            enabled={privacySettings.dataSharing.allowPerformanceMetrics}
            onChange={(enabled) => updatePrivacySetting('dataSharing.allowPerformanceMetrics', enabled)}
            label="Performance Metrics"
            description="Share performance data to help optimize system performance"
          />
          <ToggleSwitch
            enabled={privacySettings.dataSharing.allowErrorReporting}
            onChange={(enabled) => updatePrivacySetting('dataSharing.allowErrorReporting', enabled)}
            label="Error Reporting"
            description="Automatically report errors and crashes to help fix issues"
          />
          <ToggleSwitch
            enabled={privacySettings.dataSharing.shareWithExternalServices}
            onChange={(enabled) => updatePrivacySetting('dataSharing.shareWithExternalServices', enabled)}
            label="External Service Integration"
            description="Allow sharing data with external services for enhanced functionality"
            warning="This may impact privacy"
          />
          <ToggleSwitch
            enabled={privacySettings.dataSharing.allowCrossConversationData}
            onChange={(enabled) => updatePrivacySetting('dataSharing.allowCrossConversationData', enabled)}
            label="Cross-Conversation Learning"
            description="Allow learning from patterns across different conversations"
          />
        </div>
      </PrivacyCategory>

      {/* Privacy Protection Settings */}
      <PrivacyCategory
        title="Privacy Protection"
        description="Advanced privacy protection features"
        icon={<IconShield className="h-6 w-6" />}
      >
        <div className="space-y-2">
          <ToggleSwitch
            enabled={privacySettings.privacy.pseudonymizeData}
            onChange={(enabled) => updatePrivacySetting('privacy.pseudonymizeData', enabled)}
            label="Data Pseudonymization"
            description="Replace personally identifiable information with pseudonyms"
          />
          <ToggleSwitch
            enabled={privacySettings.privacy.enableLocalProcessing}
            onChange={(enabled) => updatePrivacySetting('privacy.enableLocalProcessing', enabled)}
            label="Local Processing"
            description="Process sensitive data locally when possible"
          />
          <ToggleSwitch
            enabled={privacySettings.privacy.requireExplicitConsent}
            onChange={(enabled) => updatePrivacySetting('privacy.requireExplicitConsent', enabled)}
            label="Explicit Consent Required"
            description="Require explicit consent before processing sensitive data"
          />
          <ToggleSwitch
            enabled={privacySettings.privacy.allowProfileBuilding}
            onChange={(enabled) => updatePrivacySetting('privacy.allowProfileBuilding', enabled)}
            label="User Profiling"
            description="Allow building user profiles for personalization"
            warning="Impacts privacy but improves experience"
          />
        </div>
      </PrivacyCategory>

      {/* Security Settings */}
      <PrivacyCategory
        title="Security & Permissions"
        description="Control security settings and agent permissions"
        icon={<IconLock className="h-6 w-6" />}
      >
        <div className="space-y-2">
          <ToggleSwitch
            enabled={securitySettings.permissions.allowCodeExecution}
            onChange={(enabled) => updateSecuritySetting('permissions.allowCodeExecution', enabled)}
            label="Code Execution"
            description="Allow agents to execute code in sandboxed environments"
            warning="High security risk"
          />
          <ToggleSwitch
            enabled={securitySettings.permissions.allowFileSystemAccess}
            onChange={(enabled) => updateSecuritySetting('permissions.allowFileSystemAccess', enabled)}
            label="File System Access"
            description="Allow agents to access local files (read-only)"
            warning="Security risk"
          />
          <ToggleSwitch
            enabled={securitySettings.permissions.allowNetworkAccess}
            onChange={(enabled) => updateSecuritySetting('permissions.allowNetworkAccess', enabled)}
            label="Network Access"
            description="Allow agents to make network requests"
          />
          <ToggleSwitch
            enabled={securitySettings.permissions.allowExternalApiCalls}
            onChange={(enabled) => updateSecuritySetting('permissions.allowExternalApiCalls', enabled)}
            label="External API Calls"
            description="Allow agents to call external APIs and services"
          />
          <ToggleSwitch
            enabled={securitySettings.audit.enableAuditLogging}
            onChange={(enabled) => updateSecuritySetting('audit.enableAuditLogging', enabled)}
            label="Audit Logging"
            description="Log all agent activities for security auditing"
          />
        </div>
      </PrivacyCategory>

      {/* Data Management Actions */}
      <PrivacyCategory
        title="Data Management"
        description="Export, delete, or manage your data"
        icon={<IconDatabase className="h-6 w-6" />}
      >
        <div className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <button
              onClick={handleExportData}
              className="flex items-center justify-center gap-2 px-4 py-3 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors"
            >
              <IconDownload className="h-5 w-5" />
              Export My Data
            </button>
            <button
              onClick={handleClearAllData}
              className="flex items-center justify-center gap-2 px-4 py-3 bg-red-500 text-white rounded-lg hover:bg-red-600 transition-colors"
            >
              <IconTrash className="h-5 w-5" />
              Delete All Data
            </button>
          </div>
          
          <div className="p-4 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg">
            <div className="flex items-start gap-3">
              <IconInfoCircle className="h-5 w-5 text-blue-500 mt-0.5" />
              <div className="text-sm text-blue-700 dark:text-blue-300">
                <h4 className="font-medium mb-1">Your Rights</h4>
                <p>
                  Under GDPR and CCPA, you have the right to access, correct, delete, 
                  or port your personal data. Use the buttons above to exercise these rights.
                </p>
              </div>
            </div>
          </div>
        </div>
      </PrivacyCategory>

      {/* Footer */}
      <div className="mt-8 pt-6 border-t border-gray-200 dark:border-gray-600">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2 text-green-600 dark:text-green-400">
            <IconCheck className="h-5 w-5" />
            <span className="text-sm">Settings are automatically saved</span>
          </div>
          <button
            onClick={onClose}
            className="px-4 py-2 bg-gray-500 text-white rounded-lg hover:bg-gray-600 transition-colors"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};