/**
 * Agent Features Section Component
 * 
 * Provides UI for enabling/disabling AI agents
 */

import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useTranslation } from 'next-i18next';
import { 
  IconRobot,
  IconRobotOff,
  IconSearch,
  IconDatabase,
  IconWorldWww,
  IconToggleLeft, 
  IconToggleRight,
  IconCheck,
} from '@tabler/icons-react';

import { AgentType } from '@/types/agent';
import { Settings, AgentSettings } from '@/types/settings';
import { useAdvancedSettings } from '@/hooks/useAdvancedSettings';

/**
 * Component props
 */
interface AgentFeaturesSectionProps {
  onClose: () => void;
}

/**
 * Agent information
 */
interface AgentInfo {
  type: AgentType;
  name: string;
  description: string;
  icon: React.ReactNode;
}

/**
 * Available agents configuration
 */
const AVAILABLE_AGENTS: AgentInfo[] = [
  {
    type: AgentType.WEB_SEARCH,
    name: 'Web Search',
    description: 'Search the web for current information and answers',
    icon: <IconSearch className="h-6 w-6" />,
  },
  {
    type: AgentType.LOCAL_KNOWLEDGE,
    name: 'Local Knowledge',
    description: 'Search your local knowledge base and documents',
    icon: <IconDatabase className="h-6 w-6" />,
  },
  {
    type: AgentType.URL_PULL,
    name: 'URL Content Extractor',
    description: 'Extract and analyze content from URLs',
    icon: <IconWorldWww className="h-6 w-6" />,
  },
];

/**
 * Individual agent toggle component
 */
interface AgentToggleProps {
  agent: AgentInfo;
  enabled: boolean;
  onToggle: (agentType: AgentType, enabled: boolean) => void;
  disabled?: boolean;
}

const AgentToggle: React.FC<AgentToggleProps> = ({
  agent,
  enabled,
  onToggle,
  disabled = false,
}) => {
  const handleToggle = useCallback(() => {
    if (!disabled) {
      onToggle(agent.type, !enabled);
    }
  }, [agent.type, enabled, onToggle, disabled]);

  return (
    <div className="flex items-center justify-between p-4 border border-gray-200 rounded-lg dark:border-gray-600 hover:shadow-md transition-shadow">
      <div className="flex items-center gap-4">
        <div className={`text-blue-500 dark:text-blue-400 ${disabled ? 'opacity-50' : ''}`}>
          {agent.icon}
        </div>
        <div className="flex-1">
          <h4 className={`text-sm font-medium text-gray-900 dark:text-gray-100 ${disabled ? 'opacity-50' : ''}`}>
            {agent.name}
          </h4>
          <p className={`text-sm text-gray-600 dark:text-gray-400 ${disabled ? 'opacity-50' : ''}`}>
            {agent.description}
          </p>
        </div>
      </div>
      <button
        onClick={handleToggle}
        disabled={disabled}
        className={`flex items-center p-1 rounded transition-colors ${
          disabled 
            ? 'opacity-50 cursor-not-allowed' 
            : 'hover:bg-gray-100 dark:hover:bg-gray-700'
        }`}
        title={enabled ? `Disable ${agent.name}` : `Enable ${agent.name}`}
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
 * Main Agent Features Section Component
 */
export const AgentFeaturesSection: React.FC<AgentFeaturesSectionProps> = ({ onClose }) => {
  const { t } = useTranslation(['settings', 'agents']);
  const {
    settings,
    updateSettings,
    loading,
    error,
  } = useAdvancedSettings({ enableAdvancedFeatures: true });

  const createDefaultAgentSettings = (): AgentSettings => ({
    enabled: true,
    confidenceThreshold: 0.7,
    fallbackEnabled: true,
    enabledAgentTypes: [AgentType.WEB_SEARCH, AgentType.LOCAL_KNOWLEDGE, AgentType.URL_PULL],
    agentConfigurations: {
      [AgentType.WEB_SEARCH]: {
        enabled: true,
        priority: 1,
        timeout: 30000,
        maxRetries: 2,
        parameters: {}
      },
      [AgentType.LOCAL_KNOWLEDGE]: {
        enabled: true,
        priority: 2,
        timeout: 30000,
        maxRetries: 2,
        parameters: {}
      },
      [AgentType.URL_PULL]: {
        enabled: true,
        priority: 3,
        timeout: 30000,
        maxRetries: 2,
        parameters: {}
      },
      [AgentType.CODE_INTERPRETER]: {
        enabled: false,
        priority: 4,
        timeout: 30000,
        maxRetries: 2,
        parameters: {}
      },
      [AgentType.STANDARD_CHAT]: {
        enabled: false,
        priority: 5,
        timeout: 30000,
        maxRetries: 2,
        parameters: {}
      },
      [AgentType.FOUNDRY]: {
        enabled: false,
        priority: 6,
        timeout: 30000,
        maxRetries: 2,
        parameters: {}
      },
      [AgentType.THIRD_PARTY]: {
        enabled: false,
        priority: 7,
        timeout: 30000,
        maxRetries: 2,
        parameters: {}
      }
    },
    preferences: {
      preferredAgents: [AgentType.WEB_SEARCH, AgentType.LOCAL_KNOWLEDGE, AgentType.URL_PULL],
      disabledAgents: [],
      autoRouting: true,
      showAgentAttribution: true,
      confirmBeforeAgentUse: false
    }
  });

  const [agentSettings, setAgentSettings] = useState<AgentSettings>(() => 
    settings.agentSettings || createDefaultAgentSettings()
  );

  // Use ref to track the latest agentSettings for saving
  const agentSettingsRef = useRef(agentSettings);
  agentSettingsRef.current = agentSettings;

  // Track if a save operation is in progress
  const [isSaving, setIsSaving] = useState(false);

  // Check if current agentSettings differ from saved settings
  const hasUnsavedChanges = useCallback((): boolean => {
    if (!settings.agentSettings) return true; // If no saved settings, we have changes
    
    // Deep comparison of the key properties we care about
    const current = agentSettingsRef.current;
    const saved = settings.agentSettings;
    
    return (
      current.enabled !== saved.enabled ||
      current.enabledAgentTypes.length !== saved.enabledAgentTypes.length ||
      current.enabledAgentTypes.some(type => !saved.enabledAgentTypes.includes(type)) ||
      current.preferences.autoRouting !== saved.preferences.autoRouting ||
      current.preferences.showAgentAttribution !== saved.preferences.showAgentAttribution
    );
  }, [settings.agentSettings]);

  // Update local state when settings change
  useEffect(() => {
    if (settings.agentSettings) {
      setAgentSettings(settings.agentSettings);
    }
  }, [settings]);


  // Auto-save when settings change (only if there are unsaved changes)
  useEffect(() => {
    // Only set up auto-save if there are actually unsaved changes
    if (!hasUnsavedChanges() || isSaving) {
      return;
    }

    const timeoutId = setTimeout(() => {
      // Create a stable reference to the save function to avoid dependency issues
      const performSave = async () => {
        if (isSaving || !hasUnsavedChanges()) {
          return;
        }

        setIsSaving(true);
        try {
          const updatedSettings: Settings = {
            ...settings,
            agentSettings: agentSettingsRef.current,
          };
          await updateSettings(updatedSettings);
        } finally {
          setIsSaving(false);
        }
      };
      
      performSave();
    }, 1000); // Debounce saves

    return () => clearTimeout(timeoutId);
  }, [agentSettings, hasUnsavedChanges, isSaving, settings, updateSettings]);

  // Toggle all agents
  const handleToggleAll = useCallback(() => {
    setAgentSettings(prev => ({
      ...prev,
      enabled: !prev.enabled,
    }));
  }, []);

  // Toggle individual agent
  const handleToggleAgent = useCallback((agentType: AgentType, enabled: boolean) => {
    setAgentSettings(prev => {
      const enabledTypes = new Set(prev.enabledAgentTypes);
      
      if (enabled) {
        enabledTypes.add(agentType);
      } else {
        enabledTypes.delete(agentType);
      }

      return {
        ...prev,
        enabledAgentTypes: Array.from(enabledTypes),
      };
    });
  }, []);

  // Toggle auto-routing
  const handleToggleAutoRouting = useCallback(() => {
    setAgentSettings(prev => ({
      ...prev,
      preferences: {
        ...prev.preferences,
        autoRouting: !prev.preferences.autoRouting,
      }
    }));
  }, []);

  // Toggle agent attribution
  const handleToggleAttribution = useCallback(() => {
    setAgentSettings(prev => ({
      ...prev,
      preferences: {
        ...prev.preferences,
        showAgentAttribution: !prev.preferences.showAgentAttribution,
      }
    }));
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
      </div>
    );
  }

  const allAgentsEnabled = agentSettings.enabled;
  const someAgentsEnabled = agentSettings.enabledAgentTypes.length > 0;

  return (
    <div className="max-w-4xl mx-auto p-6">
      <div className="mb-6">
        <h2 className="text-2xl font-bold text-gray-900 dark:text-gray-100 mb-2">
          AI Agent Settings
        </h2>
        <p className="text-gray-600 dark:text-gray-400">
          Configure which AI agents are available to assist you. Changes are saved automatically.
        </p>
      </div>

      {error && (
        <div className="mb-4 p-4 bg-red-50 border border-red-200 rounded-lg text-red-700 dark:bg-red-900/20 dark:border-red-800 dark:text-red-400">
          {error}
        </div>
      )}

      {/* Master Toggle */}
      <div className="mb-6 p-4 bg-gray-50 dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            {allAgentsEnabled ? (
              <IconRobot className="h-8 w-8 text-blue-500" />
            ) : (
              <IconRobotOff className="h-8 w-8 text-gray-400" />
            )}
            <div>
              <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
                AI Agents
              </h3>
              <p className="text-sm text-gray-600 dark:text-gray-400">
                {allAgentsEnabled 
                  ? `${agentSettings.enabledAgentTypes.length} agent${agentSettings.enabledAgentTypes.length !== 1 ? 's' : ''} enabled`
                  : 'All agents disabled'}
              </p>
            </div>
          </div>
          <button
            onClick={handleToggleAll}
            className="flex items-center p-2 rounded-lg transition-colors hover:bg-gray-200 dark:hover:bg-gray-700"
            title={allAgentsEnabled ? 'Disable all agents' : 'Enable all agents'}
          >
            {allAgentsEnabled ? (
              <IconToggleRight className="h-8 w-8 text-green-500" />
            ) : (
              <IconToggleLeft className="h-8 w-8 text-gray-400" />
            )}
          </button>
        </div>
      </div>

      {/* Individual Agent Toggles */}
      <div className="space-y-3 mb-6">
        {AVAILABLE_AGENTS.map(agent => (
          <AgentToggle
            key={agent.type}
            agent={agent}
            enabled={agentSettings.enabledAgentTypes.includes(agent.type)}
            onToggle={handleToggleAgent}
            disabled={!allAgentsEnabled}
          />
        ))}
      </div>

      {/* Additional Settings */}
      <div className="space-y-4 p-4 bg-gray-50 dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700">
        <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-3">
          Agent Behavior
        </h3>
        
        {/* Auto-routing Toggle */}
        <div className="flex items-center justify-between py-2">
          <div>
            <h4 className="text-sm font-medium text-gray-900 dark:text-gray-100">
              Automatic Agent Selection
            </h4>
            <p className="text-sm text-gray-600 dark:text-gray-400">
              Automatically choose the best agent based on your query
            </p>
          </div>
          <button
            onClick={handleToggleAutoRouting}
            disabled={!allAgentsEnabled || !someAgentsEnabled}
            className={`flex items-center p-1 rounded transition-colors ${
              !allAgentsEnabled || !someAgentsEnabled
                ? 'opacity-50 cursor-not-allowed' 
                : 'hover:bg-gray-200 dark:hover:bg-gray-700'
            }`}
          >
            {agentSettings.preferences.autoRouting ? (
              <IconToggleRight className="h-6 w-6 text-green-500" />
            ) : (
              <IconToggleLeft className="h-6 w-6 text-gray-400" />
            )}
          </button>
        </div>

        {/* Attribution Toggle */}
        <div className="flex items-center justify-between py-2">
          <div>
            <h4 className="text-sm font-medium text-gray-900 dark:text-gray-100">
              Show Agent Attribution
            </h4>
            <p className="text-sm text-gray-600 dark:text-gray-400">
              Display which agent provided the response
            </p>
          </div>
          <button
            onClick={handleToggleAttribution}
            disabled={!allAgentsEnabled || !someAgentsEnabled}
            className={`flex items-center p-1 rounded transition-colors ${
              !allAgentsEnabled || !someAgentsEnabled
                ? 'opacity-50 cursor-not-allowed' 
                : 'hover:bg-gray-200 dark:hover:bg-gray-700'
            }`}
          >
            {agentSettings.preferences.showAgentAttribution ? (
              <IconToggleRight className="h-6 w-6 text-green-500" />
            ) : (
              <IconToggleLeft className="h-6 w-6 text-gray-400" />
            )}
          </button>
        </div>
      </div>

      {/* Footer */}
      <div className="mt-8 pt-6 border-t border-gray-200 dark:border-gray-600">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2 text-green-600 dark:text-green-400">
            <IconCheck className="h-5 w-5" />
            <span className="text-sm">Settings are automatically saved</span>
          </div>
          <button
            onClick={onClose}
            className="px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};