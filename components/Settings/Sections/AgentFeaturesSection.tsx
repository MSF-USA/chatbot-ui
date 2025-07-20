/**
 * Agent Features Section Component
 * 
 * Provides UI for managing agent feature toggles and configurations
 */

import React, { useState, useEffect, useCallback } from 'react';
import { useTranslation } from 'next-i18next';
import { 
  IconToggleLeft, 
  IconToggleRight, 
  IconInfoCircle, 
  IconAlertTriangle,
  IconSettings,
  IconDownload,
  IconUpload,
  IconRefresh,
} from '@tabler/icons-react';

import { AgentType } from '@/types/agent';
import { 
  AgentFeatureToggle, 
  AgentFeatureGroup, 
  ToggleEvaluationResult,
  getAgentFeatureToggleService 
} from '@/services/agentFeatureToggleService';

/**
 * Component props
 */
interface AgentFeaturesSectionProps {
  onClose: () => void;
}

/**
 * Feature toggle row component
 */
interface FeatureToggleRowProps {
  feature: AgentFeatureToggle;
  evaluation: ToggleEvaluationResult;
  onToggle: (featureKey: string, enabled: boolean) => void;
  disabled?: boolean;
}

const FeatureToggleRow: React.FC<FeatureToggleRowProps> = ({
  feature,
  evaluation,
  onToggle,
  disabled = false,
}) => {
  const { t } = useTranslation('agents');

  const handleToggle = useCallback(() => {
    if (!disabled) {
      onToggle(feature.key, !evaluation.enabled);
    }
  }, [feature.key, evaluation.enabled, onToggle, disabled]);

  const getCategoryColor = (category: AgentFeatureToggle['category']): string => {
    switch (category) {
      case 'core': return 'text-green-600 bg-green-100';
      case 'experimental': return 'text-orange-600 bg-orange-100';
      case 'performance': return 'text-blue-600 bg-blue-100';
      case 'security': return 'text-red-600 bg-red-100';
      case 'ui': return 'text-purple-600 bg-purple-100';
      default: return 'text-gray-600 bg-gray-100';
    }
  };

  const getSourceIcon = (source: ToggleEvaluationResult['source']) => {
    switch (source) {
      case 'local': return <IconSettings className="h-3 w-3" />;
      case 'remote': return <IconRefresh className="h-3 w-3" />;
      case 'default': return <IconInfoCircle className="h-3 w-3" />;
    }
  };

  return (
    <div className="flex items-center justify-between p-4 border border-gray-200 rounded-lg dark:border-gray-600">
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 mb-1">
          <h4 className="text-sm font-medium text-gray-900 dark:text-gray-100">
            {feature.name}
          </h4>
          <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${getCategoryColor(feature.category)}`}>
            {feature.category}
          </span>
          <div className="flex items-center gap-1 text-gray-500" title={`Source: ${evaluation.source}`}>
            {getSourceIcon(evaluation.source)}
            <span className="text-xs">{evaluation.source}</span>
          </div>
        </div>
        <p className="text-sm text-gray-600 dark:text-gray-400 mb-2">
          {feature.description}
        </p>
        <div className="flex items-center gap-4 text-xs text-gray-500">
          <span>Applies to: {feature.agentTypes.join(', ')}</span>
          {evaluation.reason && (
            <span>Reason: {evaluation.reason}</span>
          )}
        </div>
        {evaluation.dependencies && Object.keys(evaluation.dependencies).length > 0 && (
          <div className="mt-2 text-xs text-amber-600 dark:text-amber-400">
            <IconAlertTriangle className="inline h-3 w-3 mr-1" />
            Dependencies: {Object.entries(evaluation.dependencies)
              .map(([dep, enabled]) => `${dep}: ${enabled ? 'enabled' : 'disabled'}`)
              .join(', ')}
          </div>
        )}
      </div>
      <div className="ml-4">
        <button
          onClick={handleToggle}
          disabled={disabled}
          className={`flex items-center p-1 rounded transition-colors ${
            disabled 
              ? 'opacity-50 cursor-not-allowed' 
              : 'hover:bg-gray-100 dark:hover:bg-gray-700'
          }`}
          title={evaluation.enabled ? 'Disable feature' : 'Enable feature'}
        >
          {evaluation.enabled ? (
            <IconToggleRight className="h-6 w-6 text-green-500" />
          ) : (
            <IconToggleLeft className="h-6 w-6 text-gray-400" />
          )}
        </button>
      </div>
    </div>
  );
};

/**
 * Feature group component
 */
interface FeatureGroupProps {
  group: AgentFeatureGroup;
  features: AgentFeatureToggle[];
  evaluations: Map<string, ToggleEvaluationResult>;
  onToggleGroup: (groupName: string, enabled: boolean) => void;
  onToggleFeature: (featureKey: string, enabled: boolean) => void;
}

const FeatureGroup: React.FC<FeatureGroupProps> = ({
  group,
  features,
  evaluations,
  onToggleGroup,
  onToggleFeature,
}) => {
  const { t } = useTranslation('agents');
  const [expanded, setExpanded] = useState(false);

  const enabledCount = group.features.filter(key => evaluations.get(key)?.enabled).length;
  const allEnabled = enabledCount === group.features.length;
  const someEnabled = enabledCount > 0 && enabledCount < group.features.length;

  const handleGroupToggle = useCallback(() => {
    onToggleGroup(group.name, !allEnabled);
  }, [group.name, allEnabled, onToggleGroup]);

  return (
    <div className="border border-gray-200 rounded-lg dark:border-gray-600">
      <div 
        className="flex items-center justify-between p-4 cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-700"
        onClick={() => setExpanded(!expanded)}
      >
        <div className="flex-1">
          <div className="flex items-center gap-3">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
              {group.name}
            </h3>
            <span className="text-sm text-gray-500">
              ({enabledCount}/{group.features.length} enabled)
            </span>
            {group.requiredForBasicFunctionality && (
              <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium text-red-600 bg-red-100">
                Required
              </span>
            )}
          </div>
          <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
            {group.description}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={(e) => {
              e.stopPropagation();
              handleGroupToggle();
            }}
            disabled={group.requiredForBasicFunctionality}
            className={`flex items-center p-1 rounded transition-colors ${
              group.requiredForBasicFunctionality 
                ? 'opacity-50 cursor-not-allowed' 
                : 'hover:bg-gray-100 dark:hover:bg-gray-600'
            }`}
            title={`${allEnabled ? 'Disable' : 'Enable'} all features in this group`}
          >
            {allEnabled ? (
              <IconToggleRight className="h-6 w-6 text-green-500" />
            ) : someEnabled ? (
              <IconToggleRight className="h-6 w-6 text-yellow-500" />
            ) : (
              <IconToggleLeft className="h-6 w-6 text-gray-400" />
            )}
          </button>
          <button className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300">
            <IconInfoCircle className={`h-5 w-5 transform transition-transform ${expanded ? 'rotate-180' : ''}`} />
          </button>
        </div>
      </div>
      
      {expanded && (
        <div className="border-t border-gray-200 dark:border-gray-600 p-4 space-y-3">
          {features.map(feature => {
            const evaluation = evaluations.get(feature.key);
            if (!evaluation) return null;

            return (
              <FeatureToggleRow
                key={feature.key}
                feature={feature}
                evaluation={evaluation}
                onToggle={onToggleFeature}
                disabled={group.requiredForBasicFunctionality}
              />
            );
          })}
        </div>
      )}
    </div>
  );
};

/**
 * Main Agent Features Section Component
 */
export const AgentFeaturesSection: React.FC<AgentFeaturesSectionProps> = ({ onClose }) => {
  const { t } = useTranslation('agents');
  const [features, setFeatures] = useState<AgentFeatureToggle[]>([]);
  const [groups, setGroups] = useState<AgentFeatureGroup[]>([]);
  const [evaluations, setEvaluations] = useState<Map<string, ToggleEvaluationResult>>(new Map());
  const [loading, setLoading] = useState(true);
  const [selectedAgent, setSelectedAgent] = useState<AgentType | 'all'>('all');

  const service = getAgentFeatureToggleService();

  // Load features and evaluations
  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const allFeatures = service.getAllFeatures();
      const allGroups = service.getAllFeatureGroups();
      
      setFeatures(allFeatures);
      setGroups(allGroups);

      // Evaluate all features for selected agent
      const newEvaluations = new Map<string, ToggleEvaluationResult>();
      
      for (const feature of allFeatures) {
        if (selectedAgent === 'all' || feature.agentTypes.includes(selectedAgent as AgentType)) {
          const agentType = selectedAgent === 'all' ? feature.agentTypes[0] : selectedAgent as AgentType;
          const evaluation = await service.evaluateToggle(feature.key, agentType);
          newEvaluations.set(feature.key, evaluation);
        }
      }
      
      setEvaluations(newEvaluations);
    } catch (error) {
      console.error('Failed to load agent features:', error);
    } finally {
      setLoading(false);
    }
  }, [service, selectedAgent]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // Handle individual feature toggle
  const handleToggleFeature = useCallback(async (featureKey: string, enabled: boolean) => {
    try {
      if (enabled) {
        service.setLocalToggle(featureKey, true);
      } else {
        service.setLocalToggle(featureKey, false);
      }
      
      // Refresh evaluations
      await loadData();
    } catch (error) {
      console.error('Failed to toggle feature:', error);
    }
  }, [service, loadData]);

  // Handle group toggle
  const handleToggleGroup = useCallback(async (groupName: string, enabled: boolean) => {
    try {
      await service.setFeatureGroup(groupName, enabled);
      await loadData();
    } catch (error) {
      console.error('Failed to toggle feature group:', error);
    }
  }, [service, loadData]);

  // Export configuration
  const handleExport = useCallback(() => {
    try {
      const config = service.exportConfiguration();
      const blob = new Blob([config], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = 'agent-features-config.json';
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch (error) {
      console.error('Failed to export configuration:', error);
    }
  }, [service]);

  // Import configuration
  const handleImport = useCallback((event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = async (e) => {
      try {
        const content = e.target?.result as string;
        const success = service.importConfiguration(content);
        if (success) {
          await loadData();
        } else {
          alert('Failed to import configuration');
        }
      } catch (error) {
        console.error('Failed to import configuration:', error);
        alert('Invalid configuration file');
      }
    };
    reader.readAsText(file);
  }, [service, loadData]);

  // Reset all toggles
  const handleReset = useCallback(async () => {
    if (confirm('Are you sure you want to reset all feature toggles to defaults?')) {
      service.resetLocalToggles();
      await loadData();
    }
  }, [service, loadData]);

  const filteredGroups = groups.map(group => ({
    ...group,
    features: group.features.filter(featureKey => {
      const feature = features.find(f => f.key === featureKey);
      return feature && (selectedAgent === 'all' || feature.agentTypes.includes(selectedAgent as AgentType));
    }),
  })).filter(group => group.features.length > 0);

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
          Agent Feature Toggles
        </h2>
        <p className="text-gray-600 dark:text-gray-400">
          Manage advanced features and capabilities for AI agents. 
          Changes take effect immediately and are saved locally.
        </p>
      </div>

      {/* Controls */}
      <div className="flex items-center justify-between mb-6 p-4 bg-gray-50 dark:bg-gray-700 rounded-lg">
        <div className="flex items-center gap-4">
          <label className="text-sm font-medium text-gray-700 dark:text-gray-300">
            Filter by Agent:
          </label>
          <select
            value={selectedAgent}
            onChange={(e) => setSelectedAgent(e.target.value as AgentType | 'all')}
            className="rounded-md border border-gray-300 bg-white px-3 py-1 text-sm shadow-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 dark:bg-gray-600 dark:border-gray-500 dark:text-gray-100"
          >
            <option value="all">All Agents</option>
            {Object.values(AgentType).map(type => (
              <option key={type} value={type}>{type}</option>
            ))}
          </select>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={handleExport}
            className="inline-flex items-center gap-2 px-3 py-1 text-sm bg-blue-500 text-white rounded-md hover:bg-blue-600 transition-colors"
          >
            <IconDownload className="h-4 w-4" />
            Export
          </button>
          <label className="inline-flex items-center gap-2 px-3 py-1 text-sm bg-green-500 text-white rounded-md hover:bg-green-600 transition-colors cursor-pointer">
            <IconUpload className="h-4 w-4" />
            Import
            <input
              type="file"
              accept=".json"
              onChange={handleImport}
              className="hidden"
            />
          </label>
          <button
            onClick={handleReset}
            className="inline-flex items-center gap-2 px-3 py-1 text-sm bg-red-500 text-white rounded-md hover:bg-red-600 transition-colors"
          >
            <IconRefresh className="h-4 w-4" />
            Reset
          </button>
        </div>
      </div>

      {/* Feature Groups */}
      <div className="space-y-4">
        {filteredGroups.map(group => {
          const groupFeatures = features.filter(f => group.features.includes(f.key));
          return (
            <FeatureGroup
              key={group.name}
              group={group}
              features={groupFeatures}
              evaluations={evaluations}
              onToggleGroup={handleToggleGroup}
              onToggleFeature={handleToggleFeature}
            />
          );
        })}
      </div>

      {filteredGroups.length === 0 && (
        <div className="text-center py-8 text-gray-500 dark:text-gray-400">
          No features found for the selected agent type.
        </div>
      )}
    </div>
  );
};