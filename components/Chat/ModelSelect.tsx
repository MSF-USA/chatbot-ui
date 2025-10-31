import {
  IconAlertTriangle,
  IconChevronDown,
  IconChevronLeft,
  IconChevronUp,
  IconCode,
  IconCpu,
  IconInfoCircle,
  IconPlus,
  IconSettings,
  IconTemperature,
  IconTool,
  IconWorld,
  IconX,
} from '@tabler/icons-react';
import React, { FC, useMemo, useState } from 'react';
import { RiRobot2Line } from 'react-icons/ri';

import { useTranslations } from 'next-intl';

import { useConversations } from '@/client/hooks/conversation/useConversations';
import { useCustomAgents } from '@/client/hooks/settings/useCustomAgents';
import { useSettings } from '@/client/hooks/settings/useSettings';

import { OpenAIModel, OpenAIModelID, OpenAIModels } from '@/types/openai';

import {
  AzureAIIcon,
  AzureOpenAIIcon,
  DeepSeekIcon,
  MetaIcon,
  OpenAIIcon,
  XAIIcon,
} from '../Icons/providers';
import { TemperatureSlider } from '../Settings/Temperature';
import { TabNavigation } from '../UI/TabNavigation';
import { CustomAgentForm } from './CustomAgents/CustomAgentForm';
import { CustomAgentList } from './CustomAgents/CustomAgentList';
import { ModelCard } from './ModelCard';

import { CustomAgent } from '@/client/stores/settingsStore';

interface ModelSelectProps {
  onClose?: () => void;
}

export const ModelSelect: FC<ModelSelectProps> = ({ onClose }) => {
  const t = useTranslations();
  const { selectedConversation, updateConversation, conversations } =
    useConversations();
  const { models, defaultModelId, setDefaultModelId } = useSettings();
  const { customAgents, addCustomAgent, updateCustomAgent, deleteCustomAgent } =
    useCustomAgents();

  const [activeTab, setActiveTab] = useState<'models' | 'agents'>('models');
  const [showAgentForm, setShowAgentForm] = useState(false);
  const [editingAgent, setEditingAgent] = useState<CustomAgent | undefined>();
  const [showModelAdvanced, setShowModelAdvanced] = useState(false);
  const [mobileView, setMobileView] = useState<'list' | 'details'>('list');
  const [showAgentWarning, setShowAgentWarning] = useState(false);

  // Helper function to get provider icon
  const getProviderIcon = (provider?: string, size: 'sm' | 'lg' = 'sm') => {
    const iconProps = {
      className:
        size === 'lg' ? 'w-6 h-6 flex-shrink-0' : 'w-4 h-4 flex-shrink-0',
    };
    switch (provider) {
      case 'openai':
        return <OpenAIIcon {...iconProps} />;
      case 'deepseek':
        return <DeepSeekIcon {...iconProps} />;
      case 'xai':
        return <XAIIcon {...iconProps} />;
      case 'meta':
        return <MetaIcon {...iconProps} />;
      default:
        return null;
    }
  };

  // Filter out legacy models
  const baseModels = models
    .filter((m) => !OpenAIModels[m.id as OpenAIModelID]?.isLegacy)
    .sort((a, b) => {
      const aProvider = OpenAIModels[a.id as OpenAIModelID]?.provider || '';
      const bProvider = OpenAIModels[b.id as OpenAIModelID]?.provider || '';

      // Provider order: openai, meta, deepseek, xai
      const providerOrder = { openai: 0, meta: 1, deepseek: 2, xai: 3 };
      const providerDiff =
        (providerOrder[aProvider as keyof typeof providerOrder] ?? 4) -
        (providerOrder[bProvider as keyof typeof providerOrder] ?? 4);

      if (providerDiff !== 0) return providerDiff;

      // Within OpenAI, ensure GPT-4.1 is first
      if (aProvider === 'openai') {
        if (a.id === OpenAIModelID.GPT_4_1) return -1;
        if (b.id === OpenAIModelID.GPT_4_1) return 1;
      }

      return a.name.localeCompare(b.name);
    });

  // Convert custom agents to OpenAIModel format
  const customAgentModels: OpenAIModel[] = useMemo(() => {
    return customAgents.map((agent) => {
      const baseModel = OpenAIModels[agent.baseModelId];
      return {
        ...baseModel,
        id: `custom-${agent.id}`,
        name: agent.name,
        agentId: agent.agentId,
        azureAgentMode: true,
        searchModeEnabled: false,
        description:
          agent.description || `Custom agent based on ${baseModel.name}`,
        modelType: 'agent' as const,
      };
    });
  }, [customAgents]);

  // Combine base models and custom agents
  const availableModels = [...baseModels, ...customAgentModels];

  const selectedModelId = selectedConversation?.model?.id || defaultModelId;

  const selectedModel =
    availableModels.find((m) => m.id === selectedModelId) || availableModels[0];
  const modelConfig = selectedModel
    ? OpenAIModels[selectedModel.id as OpenAIModelID]
    : null;
  const isCustomAgent = selectedModel?.id?.startsWith('custom-');
  const isGpt5 = selectedModel?.id === OpenAIModelID.GPT_5;
  const agentAvailable = modelConfig?.agentId !== undefined;
  const useAzureAgent =
    selectedConversation?.model?.azureAgentMode || isCustomAgent;
  const searchModeEnabled =
    selectedConversation?.model?.searchModeEnabled ?? true;

  const handleModelSelect = (model: OpenAIModel) => {
    if (!selectedConversation) {
      console.warn('No conversation selected, cannot update model');
      return;
    }

    // Validate that the model exists in available models
    if (!availableModels.find((m) => m.id === model.id)) {
      console.error('Selected model not found in available models:', model.id);
      return;
    }

    // Switch to details view on mobile when a model is selected
    setMobileView('details');

    // Set as default model for future conversations
    setDefaultModelId(model.id as OpenAIModelID);

    // When selecting a model, set defaults: azureAgentMode OFF, searchModeEnabled ON
    const modelConfig = OpenAIModels[model.id as OpenAIModelID];
    const modelToUse = {
      ...model,
      azureAgentMode: false, // Azure Agent Mode OFF by default (privacy-first)
      searchModeEnabled: true, // Search Mode ON by default
      ...(modelConfig?.agentId && { agentId: modelConfig.agentId }),
    };

    // Only update the model field to avoid overwriting other conversation properties
    updateConversation(selectedConversation.id, {
      model: modelToUse,
    });
  };

  const handleToggleAzureAgent = () => {
    if (!selectedConversation || !selectedModel) return;

    const currentlyEnabled = selectedConversation.model?.azureAgentMode;
    const modelConfig = OpenAIModels[selectedModel.id as OpenAIModelID];

    const modelToUse = {
      ...selectedModel,
      azureAgentMode: !currentlyEnabled,
      // Search mode stays ON, we're just changing the routing method
      searchModeEnabled: true,
      ...(modelConfig?.agentId && { agentId: modelConfig.agentId }),
    };

    // Only update the model field to avoid overwriting other conversation properties
    updateConversation(selectedConversation.id, {
      model: modelToUse,
    });
  };

  const handleToggleSearchMode = () => {
    if (!selectedConversation || !selectedModel) return;

    const currentlyEnabled =
      selectedConversation.model?.searchModeEnabled ?? true;

    const modelToUse = {
      ...selectedModel,
      searchModeEnabled: !currentlyEnabled,
      // If turning off search mode, also turn off Azure Agent Mode
      azureAgentMode: currentlyEnabled ? false : selectedModel.azureAgentMode,
    };

    // Only update the model field to avoid overwriting other conversation properties
    updateConversation(selectedConversation.id, {
      model: modelToUse,
    });
  };

  const handleSaveAgent = (agent: CustomAgent) => {
    if (editingAgent) {
      updateCustomAgent(agent.id, agent);
    } else {
      addCustomAgent(agent);
    }
    setShowAgentForm(false);
    setEditingAgent(undefined);
  };

  const handleEditAgent = (agent: CustomAgent) => {
    setEditingAgent(agent);
    setShowAgentForm(true);
  };

  const handleImportAgents = (agents: CustomAgent[]) => {
    agents.forEach((agent) => {
      addCustomAgent(agent);
    });
  };

  const handleDeleteAgent = (agentId: string) => {
    deleteCustomAgent(agentId);

    // If currently selected model is the deleted agent, switch to default
    if (
      selectedConversation &&
      selectedConversation.model?.id === `custom-${agentId}`
    ) {
      const defaultModel = baseModels[0];
      // Only update the model field to avoid overwriting other conversation properties
      updateConversation(selectedConversation.id, {
        model: defaultModel,
      });
    }
  };

  const handleCloseAgentForm = () => {
    setShowAgentForm(false);
    setEditingAgent(undefined);
  };

  return (
    <div className="w-full h-full flex flex-col">
      {/* Tab Navigation */}
      <TabNavigation
        tabs={[
          {
            id: 'models',
            label: 'Models',
            icon: <AzureOpenAIIcon className="w-5 h-5" />,
            width: '110px',
          },
          {
            id: 'agents',
            label: 'Agents',
            icon: <AzureAIIcon className="w-5 h-5" />,
            badge: customAgents.length,
            width: customAgents.length > 0 ? '145px' : '115px',
          },
        ]}
        activeTab={activeTab}
        onTabChange={(tab) => setActiveTab(tab as 'models' | 'agents')}
        onClose={onClose}
        closeIcon={<IconX size={20} />}
      />

      {/* Models Tab Content */}
      {activeTab === 'models' && (
        <div
          className="flex-1 flex flex-col overflow-hidden animate-fade-in-fast"
          key="models-tab"
        >
          <div className="flex-1 flex flex-col md:flex-row gap-4 md:gap-6 overflow-hidden p-4 md:p-0">
            {/* Left: Model List */}
            <div
              className={`${
                mobileView === 'details' ? 'hidden md:block' : 'block'
              } w-full md:w-80 flex-shrink-0 overflow-y-auto md:border-r border-gray-200 dark:border-gray-700 md:pr-4`}
            >
              <div className="space-y-4">
                {/* Base Models */}
                <div>
                  <h4 className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase mb-2">
                    Base Models
                  </h4>
                  <div className="space-y-2">
                    {baseModels.map((model) => {
                      const config = OpenAIModels[model.id as OpenAIModelID];
                      const isSelected = selectedModelId === model.id;

                      return (
                        <ModelCard
                          key={model.id}
                          id={model.id}
                          name={model.name}
                          isSelected={isSelected}
                          onClick={() => handleModelSelect(model)}
                          icon={getProviderIcon(config?.provider)}
                        />
                      );
                    })}
                  </div>
                </div>
              </div>
            </div>

            {/* Right: Model Details */}
            <div
              className={`${
                mobileView === 'list' ? 'hidden md:block' : 'block'
              } flex-1 overflow-y-auto`}
            >
              {selectedModel && (modelConfig || isCustomAgent) && (
                <div className="space-y-4 md:space-y-6">
                  {/* Mobile Back Button */}
                  <button
                    onClick={() => setMobileView('list')}
                    className="md:hidden flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-100 mb-4"
                  >
                    <IconChevronLeft size={16} />
                    Back to Models
                  </button>

                  {/* Model Header */}
                  <div>
                    <div className="flex items-center gap-2 md:gap-3 mb-3">
                      {getProviderIcon(
                        selectedModel.provider || modelConfig?.provider,
                        'lg',
                      )}
                      <h2 className="text-xl md:text-2xl font-semibold text-gray-900 dark:text-white">
                        {selectedModel.name}
                      </h2>
                    </div>
                    <p className="text-sm md:text-base text-gray-600 dark:text-gray-400 mb-3">
                      {selectedModel.description || modelConfig?.description}
                    </p>

                    {/* Model Type and Knowledge Cutoff */}
                    <div className="flex items-center gap-2 flex-wrap">
                      <span
                        className={`inline-flex items-center px-2 py-1 rounded text-xs font-medium ${
                          modelConfig?.modelType === 'reasoning'
                            ? 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300'
                            : modelConfig?.modelType === 'omni'
                              ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300'
                              : modelConfig?.modelType === 'agent'
                                ? 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300'
                                : 'bg-gray-100 text-gray-700 dark:bg-gray-900/30 dark:text-gray-300'
                        }`}
                      >
                        {modelConfig?.modelType || 'foundational'}
                      </span>
                      {modelConfig?.knowledgeCutoff && (
                        <span className="text-xs text-gray-600 dark:text-gray-400">
                          Knowledge cutoff: {modelConfig.knowledgeCutoff}
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Custom Agent Info */}
                  {isCustomAgent && (
                    <div className="p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg border border-blue-200 dark:border-blue-800">
                      <div className="flex items-start mb-3">
                        <AzureAIIcon className="w-[18px] h-[18px] mr-2 mt-0.5 flex-shrink-0" />
                        <div className="text-sm text-blue-700 dark:text-blue-300">
                          <strong>Custom Agent:</strong> This agent runs on the
                          MSF AI Assistant Foundry instance with tools always
                          enabled.
                        </div>
                      </div>

                      {/* Tool capabilities */}
                      <div className="space-y-2 pt-3 border-t border-blue-200 dark:border-blue-700">
                        <div className="flex items-center text-sm text-blue-600 dark:text-blue-400">
                          <IconWorld size={16} className="mr-2" />
                          <span>Real-time web search</span>
                        </div>
                        <div className="flex items-center text-sm text-blue-600 dark:text-blue-400">
                          <IconCode size={16} className="mr-2" />
                          <span>Code interpreter & file analysis</span>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Search Mode Toggle (for all models) */}
                  {!isCustomAgent && (
                    <div className="p-4 bg-gray-50 dark:bg-gray-800/50 rounded-lg border border-gray-200 dark:border-gray-700">
                      <div className="flex items-center justify-between mb-3">
                        <div className="flex items-center gap-2">
                          <IconWorld
                            size={20}
                            className="text-gray-600 dark:text-gray-400"
                          />
                          <div>
                            <div className="font-medium text-gray-900 dark:text-white">
                              Search Mode
                            </div>
                            <div className="text-xs text-gray-600 dark:text-gray-400">
                              Will use web search when needed
                            </div>
                          </div>
                        </div>
                        <button
                          onClick={handleToggleSearchMode}
                          className="flex items-center"
                        >
                          <div
                            className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                              searchModeEnabled
                                ? 'bg-blue-600'
                                : 'bg-gray-300 dark:bg-gray-600'
                            }`}
                          >
                            <span
                              className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                                searchModeEnabled
                                  ? 'translate-x-6'
                                  : 'translate-x-1'
                              }`}
                            />
                          </div>
                        </button>
                      </div>

                      {/* Show search mode routing options when enabled */}
                      {searchModeEnabled && (
                        <div className="space-y-3 pt-3 border-t border-gray-200 dark:border-gray-700">
                          <div className="text-xs font-medium text-gray-700 dark:text-gray-300 mb-2">
                            Search Routing:
                          </div>

                          {/* Privacy-Focused Option */}
                          <label className="flex items-start gap-3 p-3 rounded-lg border-2 border-gray-200 dark:border-gray-700 hover:border-blue-300 dark:hover:border-blue-600 cursor-pointer transition-colors bg-white dark:bg-gray-900/50">
                            <input
                              type="radio"
                              name="searchRouting"
                              checked={!useAzureAgent}
                              onChange={() => {
                                if (useAzureAgent) {
                                  handleToggleAzureAgent();
                                }
                              }}
                              className="mt-0.5 w-4 h-4 text-blue-600 focus:ring-blue-500"
                            />
                            <div className="flex-1">
                              <div className="flex items-center gap-2 mb-1">
                                <IconWorld
                                  size={16}
                                  className="text-gray-600 dark:text-gray-400"
                                />
                                <span className="text-sm font-medium text-gray-900 dark:text-white">
                                  Privacy-Focused (default)
                                </span>
                              </div>
                              <div className="text-xs text-gray-600 dark:text-gray-400">
                                Slower but will use web search when needed
                              </div>
                            </div>
                          </label>

                          {/* Azure AI Foundry Mode Option (only for GPT-4.1) */}
                          {agentAvailable && modelConfig?.agentId && (
                            <label
                              className={`flex items-start gap-3 p-3 rounded-lg border-2 ${useAzureAgent ? 'border-blue-500 dark:border-blue-400 bg-blue-50 dark:bg-blue-900/20' : 'border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900/50'} hover:border-blue-300 dark:hover:border-blue-600 cursor-pointer transition-colors`}
                            >
                              <input
                                type="radio"
                                name="searchRouting"
                                checked={useAzureAgent}
                                onChange={() => {
                                  if (!useAzureAgent) {
                                    handleToggleAzureAgent();
                                  }
                                }}
                                className="mt-0.5 w-4 h-4 text-blue-600 focus:ring-blue-500"
                              />
                              <div className="flex-1">
                                <div className="flex items-center gap-2 mb-1">
                                  <AzureAIIcon className="w-4 h-4 flex-shrink-0" />
                                  <span className="text-sm font-medium text-gray-900 dark:text-white">
                                    Azure AI Foundry Mode
                                  </span>
                                </div>
                                <div className="text-xs text-gray-600 dark:text-gray-400">
                                  Faster responses with full context (less
                                  private)
                                </div>
                              </div>
                            </label>
                          )}
                        </div>
                      )}
                    </div>
                  )}

                  {/* Advanced Options for Model */}
                  {!useAzureAgent &&
                    selectedConversation &&
                    (modelConfig?.supportsTemperature !== false ||
                      modelConfig?.supportsReasoningEffort ||
                      modelConfig?.supportsVerbosity) && (
                      <div className="border border-gray-200 dark:border-gray-700 rounded-lg">
                        {/* Collapsible Header */}
                        <button
                          onClick={() =>
                            setShowModelAdvanced(!showModelAdvanced)
                          }
                          className="w-full flex items-center justify-between p-4 hover:bg-gray-50 dark:hover:bg-gray-800/50 rounded-lg transition-colors"
                        >
                          <div className="flex items-center gap-2">
                            <IconSettings
                              size={18}
                              className="text-gray-600 dark:text-gray-400"
                            />
                            <span className="text-sm font-medium text-gray-900 dark:text-white">
                              Advanced Options
                            </span>
                          </div>
                          {showModelAdvanced ? (
                            <IconChevronUp
                              size={18}
                              className="text-gray-600 dark:text-gray-400"
                            />
                          ) : (
                            <IconChevronDown
                              size={18}
                              className="text-gray-600 dark:text-gray-400"
                            />
                          )}
                        </button>

                        {/* Collapsible Content */}
                        {showModelAdvanced && (
                          <div className="px-4 pb-4 space-y-4 border-t border-gray-200 dark:border-gray-700 pt-4">
                            {/* Temperature Control */}
                            {modelConfig?.supportsTemperature !== false && (
                              <div>
                                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                                  Temperature
                                </label>
                                <TemperatureSlider
                                  temperature={
                                    selectedConversation.temperature || 0.5
                                  }
                                  onChangeTemperature={(temperature) =>
                                    updateConversation(
                                      selectedConversation.id,
                                      {
                                        temperature,
                                      },
                                    )
                                  }
                                />
                              </div>
                            )}

                            {/* Temperature Not Supported Notice */}
                            {modelConfig?.supportsTemperature === false && (
                              <div className="p-3 bg-blue-50 dark:bg-blue-900/20 rounded-lg border border-blue-200 dark:border-blue-800 text-xs">
                                <div className="flex items-start">
                                  <IconInfoCircle
                                    size={16}
                                    className="mr-2 mt-0.5 flex-shrink-0 text-blue-600 dark:text-blue-400"
                                  />
                                  <div className="text-blue-700 dark:text-blue-300">
                                    <strong>Note:</strong> This model uses fixed
                                    temperature values for consistent
                                    performance.
                                  </div>
                                </div>
                              </div>
                            )}

                            {/* Reasoning Effort Control */}
                            {modelConfig?.supportsReasoningEffort && (
                              <div>
                                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                                  Reasoning Effort
                                </label>
                                <div className="grid grid-cols-4 gap-2">
                                  {modelConfig?.supportsMinimalReasoning && (
                                    <button
                                      onClick={() =>
                                        updateConversation(
                                          selectedConversation.id,
                                          {
                                            reasoningEffort: 'minimal',
                                          },
                                        )
                                      }
                                      className={`px-3 py-2 text-sm font-medium rounded-lg transition-all ${
                                        (selectedConversation.reasoningEffort ||
                                          selectedConversation.model
                                            .reasoningEffort) === 'minimal'
                                          ? 'bg-blue-600 text-white shadow-md'
                                          : 'bg-gray-100 dark:bg-gray-700/50 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-700'
                                      }`}
                                    >
                                      Minimal
                                    </button>
                                  )}
                                  <button
                                    onClick={() =>
                                      updateConversation(
                                        selectedConversation.id,
                                        {
                                          reasoningEffort: 'low',
                                        },
                                      )
                                    }
                                    className={`px-3 py-2 text-sm font-medium rounded-lg transition-all ${
                                      (selectedConversation.reasoningEffort ||
                                        selectedConversation.model
                                          .reasoningEffort) === 'low'
                                        ? 'bg-blue-600 text-white shadow-md'
                                        : 'bg-gray-100 dark:bg-gray-700/50 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-700'
                                    }`}
                                  >
                                    Low
                                  </button>
                                  <button
                                    onClick={() =>
                                      updateConversation(
                                        selectedConversation.id,
                                        {
                                          reasoningEffort: 'medium',
                                        },
                                      )
                                    }
                                    className={`px-3 py-2 text-sm font-medium rounded-lg transition-all ${
                                      (selectedConversation.reasoningEffort ||
                                        selectedConversation.model
                                          .reasoningEffort) === 'medium'
                                        ? 'bg-blue-600 text-white shadow-md'
                                        : 'bg-gray-100 dark:bg-gray-700/50 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-700'
                                    }`}
                                  >
                                    Medium
                                  </button>
                                  <button
                                    onClick={() =>
                                      updateConversation(
                                        selectedConversation.id,
                                        {
                                          reasoningEffort: 'high',
                                        },
                                      )
                                    }
                                    className={`px-3 py-2 text-sm font-medium rounded-lg transition-all ${
                                      (selectedConversation.reasoningEffort ||
                                        selectedConversation.model
                                          .reasoningEffort) === 'high'
                                        ? 'bg-blue-600 text-white shadow-md'
                                        : 'bg-gray-100 dark:bg-gray-700/50 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-700'
                                    }`}
                                  >
                                    High
                                  </button>
                                </div>
                              </div>
                            )}

                            {/* Verbosity Control */}
                            {modelConfig?.supportsVerbosity && (
                              <div>
                                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                                  Verbosity
                                </label>
                                <div className="grid grid-cols-3 gap-2">
                                  <button
                                    onClick={() =>
                                      updateConversation(
                                        selectedConversation.id,
                                        {
                                          verbosity: 'low',
                                        },
                                      )
                                    }
                                    className={`px-3 py-2 text-sm font-medium rounded-lg transition-all ${
                                      (selectedConversation.verbosity ||
                                        selectedConversation.model
                                          .verbosity) === 'low'
                                        ? 'bg-blue-600 text-white shadow-md'
                                        : 'bg-gray-100 dark:bg-gray-700/50 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-700'
                                    }`}
                                  >
                                    Low
                                  </button>
                                  <button
                                    onClick={() =>
                                      updateConversation(
                                        selectedConversation.id,
                                        {
                                          verbosity: 'medium',
                                        },
                                      )
                                    }
                                    className={`px-3 py-2 text-sm font-medium rounded-lg transition-all ${
                                      (selectedConversation.verbosity ||
                                        selectedConversation.model
                                          .verbosity) === 'medium'
                                        ? 'bg-blue-600 text-white shadow-md'
                                        : 'bg-gray-100 dark:bg-gray-700/50 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-700'
                                    }`}
                                  >
                                    Medium
                                  </button>
                                  <button
                                    onClick={() =>
                                      updateConversation(
                                        selectedConversation.id,
                                        {
                                          verbosity: 'high',
                                        },
                                      )
                                    }
                                    className={`px-3 py-2 text-sm font-medium rounded-lg transition-all ${
                                      (selectedConversation.verbosity ||
                                        selectedConversation.model
                                          .verbosity) === 'high'
                                        ? 'bg-blue-600 text-white shadow-md'
                                        : 'bg-gray-100 dark:bg-gray-700/50 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-700'
                                    }`}
                                  >
                                    High
                                  </button>
                                </div>
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                    )}
                </div>
              )}
            </div>
          </div>

          {/* Info Footer for Models Tab */}
          <div className="mt-6 pt-4 border-t border-gray-200 dark:border-gray-700">
            <div className="flex items-start text-xs text-gray-600 dark:text-gray-400">
              <IconInfoCircle size={16} className="mr-2 mt-0.5 flex-shrink-0" />
              <div>
                <p>
                  <strong>Azure Agent Mode:</strong> Direct AI Foundry routing
                  with full conversation context and tools.
                  <strong className="ml-2">Search Mode:</strong> Privacy-focused
                  routing where only search queries are sent to AI Foundry.
                </p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Agent System Tab Content */}
      {activeTab === 'agents' && (
        <div
          className="flex-1 overflow-hidden flex flex-col animate-fade-in-fast"
          key="agents-tab"
        >
          {/* Description */}
          <div className="mb-6 p-4 md:p-0">
            <div className="flex items-center gap-2 mb-3">
              <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300">
                Advanced Feature
              </span>
            </div>
            <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
              Create and manage custom AI agents with specialized capabilities.
              These agents run on the MSF AI Assistant Foundry instance.
            </p>

            {/* Collapsible Warning */}
            <div className="bg-blue-50 dark:bg-blue-900/20 rounded-lg border border-blue-200 dark:border-blue-800 overflow-hidden">
              <button
                onClick={() => setShowAgentWarning(!showAgentWarning)}
                className="w-full p-4 flex items-start gap-3 hover:bg-blue-100 dark:hover:bg-blue-900/30 transition-colors"
              >
                <IconInfoCircle
                  size={18}
                  className="flex-shrink-0 text-blue-600 dark:text-blue-400 mt-0.5"
                />
                <div className="flex-1 text-left">
                  <div className="text-sm font-medium text-blue-700 dark:text-blue-300">
                    Advanced Feature - Requires Coordination with AI Assistant
                    Technical Team
                  </div>
                </div>
                {showAgentWarning ? (
                  <IconChevronUp
                    size={18}
                    className="flex-shrink-0 text-blue-600 dark:text-blue-400"
                  />
                ) : (
                  <IconChevronDown
                    size={18}
                    className="flex-shrink-0 text-blue-600 dark:text-blue-400"
                  />
                )}
              </button>
              {showAgentWarning && (
                <div className="px-4 pb-4 text-sm text-blue-700 dark:text-blue-300">
                  Custom agents only work with the{' '}
                  <strong>MSF AI Assistant Foundry instance</strong>. Agent IDs
                  must be created by the AI Assistant technical team in this
                  specific instance and coordinated with you before use.
                </div>
              )}
            </div>
          </div>

          {/* Add Agent Button */}
          <div className="mb-6 px-4 md:px-0">
            <button
              onClick={() => setShowAgentForm(true)}
              className="w-full p-4 border-2 border-dashed border-gray-300 dark:border-gray-600 rounded-lg text-sm font-medium text-gray-700 dark:text-gray-300 hover:border-blue-500 dark:hover:border-blue-400 hover:text-blue-600 dark:hover:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-900/10 transition-all flex items-center justify-center gap-2"
            >
              <IconPlus size={18} />
              Create New Custom Agent
            </button>
          </div>

          {/* Custom Agents List */}
          <div className="flex-1 overflow-y-auto px-4 md:px-0">
            {customAgents.length > 0 ? (
              <CustomAgentList
                agents={customAgents}
                onEdit={handleEditAgent}
                onDelete={handleDeleteAgent}
                onImport={handleImportAgents}
              />
            ) : (
              <div className="flex flex-col items-center justify-center py-12 text-center">
                <div className="w-16 h-16 bg-gray-100 dark:bg-gray-800 rounded-full flex items-center justify-center mb-4">
                  <AzureAIIcon className="w-8 h-8" />
                </div>
                <h4 className="text-lg font-medium text-gray-900 dark:text-white mb-2">
                  No Custom Agents Yet
                </h4>
                <p className="text-sm text-gray-600 dark:text-gray-400 max-w-md">
                  Create your first custom agent to extend AI capabilities with
                  specialized tools and behaviors.
                </p>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Custom Agent Form Modal */}
      {showAgentForm && (
        <CustomAgentForm
          onSave={handleSaveAgent}
          onClose={handleCloseAgentForm}
          existingAgent={editingAgent}
          existingAgents={customAgents}
        />
      )}
    </div>
  );
};
