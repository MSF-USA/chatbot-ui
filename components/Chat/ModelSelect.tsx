import {
  IconWorld,
  IconCode,
  IconInfoCircle,
  IconTool,
  IconCheck,
  IconTemperature,
  IconAlertTriangle,
  IconX,
  IconRobot,
  IconPlus,
  IconSettings,
  IconChevronDown,
  IconChevronUp
} from '@tabler/icons-react';
import { FC, useState, useMemo } from 'react';
import { useTranslations } from 'next-intl';
import { OpenAIModel, OpenAIModelID, OpenAIModels } from '@/types/openai';
import { useConversations } from '@/lib/hooks/conversation/useConversations';
import { useSettings } from '@/lib/hooks/settings/useSettings';
import { useCustomAgents } from '@/lib/hooks/settings/useCustomAgents';
import { CustomAgent } from '@/lib/stores/settingsStore';
import { TemperatureSlider } from '../settings/Temperature';
import { CustomAgentForm } from './CustomAgents/CustomAgentForm';
import { CustomAgentList } from './CustomAgents/CustomAgentList';
import { OpenAIIcon, DeepSeekIcon, XAIIcon } from '../Icons/providers';

interface ModelSelectProps {
  onClose?: () => void;
}

export const ModelSelect: FC<ModelSelectProps> = ({ onClose }) => {
  const t = useTranslations();
  const { selectedConversation, updateConversation, conversations } = useConversations();
  const { models, defaultModelId, setDefaultModelId } = useSettings();
  const { customAgents, addCustomAgent, updateCustomAgent, deleteCustomAgent } = useCustomAgents();

  const [showAgentForm, setShowAgentForm] = useState(false);
  const [showAgentManager, setShowAgentManager] = useState(false);
  const [editingAgent, setEditingAgent] = useState<CustomAgent | undefined>();
  const [showAdvanced, setShowAdvanced] = useState(false);

  // Helper function to get provider icon
  const getProviderIcon = (provider?: string, size: 'sm' | 'lg' = 'sm') => {
    const iconProps = { className: size === 'lg' ? "w-6 h-6 flex-shrink-0" : "w-4 h-4 flex-shrink-0" };
    switch (provider) {
      case 'openai':
        return <OpenAIIcon {...iconProps} />;
      case 'deepseek':
        return <DeepSeekIcon {...iconProps} />;
      case 'xai':
        return <XAIIcon {...iconProps} />;
      default:
        return null;
    }
  };

  // Filter out legacy models and the standalone agent model
  const baseModels = models
    .filter(m =>
      !OpenAIModels[m.id as OpenAIModelID]?.isLegacy &&
      !OpenAIModels[m.id as OpenAIModelID]?.isAgent
    )
    .sort((a, b) => {
      const aProvider = OpenAIModels[a.id as OpenAIModelID]?.provider || '';
      const bProvider = OpenAIModels[b.id as OpenAIModelID]?.provider || '';

      // Provider order: openai, deepseek, xai
      const providerOrder = { openai: 0, deepseek: 1, xai: 2 };
      const providerDiff = (providerOrder[aProvider as keyof typeof providerOrder] ?? 3) - (providerOrder[bProvider as keyof typeof providerOrder] ?? 3);

      if (providerDiff !== 0) return providerDiff;

      // Within OpenAI, ensure GPT-5 is first
      if (aProvider === 'openai') {
        if (a.id === OpenAIModelID.GPT_5) return -1;
        if (b.id === OpenAIModelID.GPT_5) return 1;
      }

      return a.name.localeCompare(b.name);
    });

  // Convert custom agents to OpenAIModel format
  const customAgentModels: OpenAIModel[] = useMemo(() => {
    return customAgents.map(agent => {
      const baseModel = OpenAIModels[agent.baseModelId];
      return {
        ...baseModel,
        id: `custom-${agent.id}`,
        name: agent.name,
        agentId: agent.agentId,
        agentEnabled: true,
        description: agent.description || `Custom agent based on ${baseModel.name}`,
        modelType: 'agent' as const,
      };
    });
  }, [customAgents]);

  // Combine base models and custom agents
  const availableModels = [...baseModels, ...customAgentModels];

  const selectedModelId = selectedConversation?.model?.id || defaultModelId;

  const selectedModel = availableModels.find(m => m.id === selectedModelId) || availableModels[0];
  const modelConfig = selectedModel ? OpenAIModels[selectedModel.id as OpenAIModelID] : null;
  const isCustomAgent = selectedModel?.id?.startsWith('custom-');
  const isGpt5 = selectedModel?.id === OpenAIModelID.GPT_5;
  const agentAvailable = modelConfig?.agentId !== undefined;
  const useAgent = selectedConversation?.model?.agentEnabled || isCustomAgent;

  const handleModelSelect = (model: OpenAIModel) => {
    if (!selectedConversation) {
      console.warn('No conversation selected, cannot update model');
      return;
    }

    // Set as default model for future conversations
    setDefaultModelId(model.id as OpenAIModelID);

    // When selecting a model, use agent mode by default if available
    const shouldUseAgent = OpenAIModels[model.id as OpenAIModelID]?.agentId !== undefined;
    const modelToUse = shouldUseAgent ? {
      ...model,
      agentEnabled: true,
      agentId: OpenAIModels[model.id as OpenAIModelID]?.agentId
    } : model;

    updateConversation(selectedConversation.id, {
      ...selectedConversation,
      model: modelToUse,
    });
  };

  const handleToggleAgent = () => {
    if (!selectedConversation || !selectedModel) return;

    const currentlyHasAgent = selectedConversation.model?.agentEnabled;
    const modelConfig = OpenAIModels[selectedModel.id as OpenAIModelID];

    const modelToUse = currentlyHasAgent ?
      { ...selectedModel, agentEnabled: false } :
      (modelConfig?.agentId ? {
        ...selectedModel,
        agentEnabled: true,
        agentId: modelConfig.agentId
      } : selectedModel);

    updateConversation(selectedConversation.id, {
      ...selectedConversation,
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
    setShowAgentManager(false);
  };

  const handleDeleteAgent = (agentId: string) => {
    deleteCustomAgent(agentId);

    // If currently selected model is the deleted agent, switch to default
    if (selectedConversation && selectedConversation.model?.id === `custom-${agentId}`) {
      const defaultModel = baseModels[0];
      updateConversation(selectedConversation.id, {
        ...selectedConversation,
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
      {/* Header */}
      <div className="flex justify-between items-start mb-6">
        <div>
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
            Select AI Model
          </h3>
          <p className="text-sm text-gray-600 dark:text-gray-400">
            Choose your AI model and optionally enable agent capabilities for enhanced functionality
          </p>
        </div>
        {onClose && (
          <button
            className="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200 transition-colors"
            onClick={onClose}
          >
            <IconX size={24} />
          </button>
        )}
      </div>

      {/* Master-Detail Layout */}
      <div className="flex-1 flex gap-6 overflow-hidden">
        {/* Left: Model List */}
        <div className="w-80 flex-shrink-0 overflow-y-auto border-r border-gray-200 dark:border-gray-700 pr-4">
          <div className="space-y-4">
            {/* Base Models */}
            <div>
              <h4 className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase mb-2">
                Models
              </h4>
              <div className="space-y-2">
                {baseModels.map((model) => {
                  const config = OpenAIModels[model.id as OpenAIModelID];
                  const isSelected = selectedModelId === model.id;

                  return (
                    <button
                      key={model.id}
                      onClick={() => handleModelSelect(model)}
                      className={`
                        w-full text-left p-3 rounded-lg transition-all duration-150
                        ${isSelected
                          ? 'bg-blue-50 dark:bg-blue-900/20 border-2 border-blue-300 dark:border-blue-600'
                          : 'bg-white dark:bg-[#212121] border-2 border-transparent hover:border-gray-200 dark:hover:border-gray-700'
                        }
                      `}
                    >
                      <div className="flex items-center justify-between mb-1">
                        <div className="flex items-center gap-2">
                          {getProviderIcon(config?.provider)}
                          <span className="font-medium text-sm text-gray-900 dark:text-white">
                            {model.name}
                          </span>
                        </div>
                        {isSelected && (
                          <IconCheck size={16} className="text-blue-600 dark:text-blue-400" />
                        )}
                      </div>
                      <div className="flex items-center gap-1.5">
                        <span className={`inline-flex items-center px-1.5 py-0.5 rounded text-xs font-medium ${
                          config?.modelType === 'reasoning'
                            ? 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300'
                            : config?.modelType === 'omni'
                            ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300'
                            : 'bg-gray-100 text-gray-700 dark:bg-gray-900/30 dark:text-gray-300'
                        }`}>
                          {config?.modelType || 'foundational'}
                        </span>
                        {config?.agentId && model.id !== OpenAIModelID.GPT_5 && (
                          <span className="inline-flex items-center px-1.5 py-0.5 rounded text-xs font-medium bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300">
                            <IconTool size={10} className="mr-0.5" />
                            Agent
                          </span>
                        )}
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Advanced Settings - Collapsible Section */}
            <div className="border-t border-gray-200 dark:border-gray-700 pt-4">
              <button
                onClick={() => setShowAdvanced(!showAdvanced)}
                className="w-full flex items-center justify-between p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
              >
                <div className="flex items-center gap-2">
                  <IconSettings size={16} className="text-gray-600 dark:text-gray-400" />
                  <span className="text-xs font-semibold text-gray-600 dark:text-gray-400 uppercase">
                    Advanced
                  </span>
                  <span className="inline-flex items-center px-1.5 py-0.5 rounded text-xs font-medium bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300">
                    Experimental
                  </span>
                </div>
                {showAdvanced ? (
                  <IconChevronUp size={16} className="text-gray-600 dark:text-gray-400" />
                ) : (
                  <IconChevronDown size={16} className="text-gray-600 dark:text-gray-400" />
                )}
              </button>

              {/* Collapsible Content */}
              {showAdvanced && (
                <div className="mt-3 space-y-4">
                  {/* Custom Agents */}
                  {customAgentModels.length > 0 && (
                    <div>
                      <h4 className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase mb-2">
                        Custom Agents
                      </h4>
                      <div className="space-y-2">
                        {customAgentModels.map((model) => {
                          const isSelected = selectedModelId === model.id;

                          return (
                            <button
                              key={model.id}
                              onClick={() => handleModelSelect(model)}
                              className={`
                                w-full text-left p-3 rounded-lg transition-all duration-150
                                ${isSelected
                                  ? 'bg-blue-50 dark:bg-blue-900/20 border-2 border-blue-300 dark:border-blue-600'
                                  : 'bg-white dark:bg-[#212121] border-2 border-transparent hover:border-gray-200 dark:hover:border-gray-700'
                                }
                              `}
                            >
                              <div className="flex items-center justify-between mb-1">
                                <span className="font-medium text-sm text-gray-900 dark:text-white">
                                  {model.name}
                                </span>
                                {isSelected && (
                                  <IconCheck size={16} className="text-blue-600 dark:text-blue-400" />
                                )}
                              </div>
                              <div className="flex items-center gap-1.5">
                                <span className="inline-flex items-center px-1.5 py-0.5 rounded text-xs font-medium bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-300">
                                  Custom
                                </span>
                              </div>
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  )}

                  {/* Add Custom Agent Button */}
                  <div>
                    <button
                      onClick={() => setShowAgentForm(true)}
                      className="w-full p-3 border-2 border-dashed border-gray-300 dark:border-gray-600 rounded-lg text-sm text-gray-600 dark:text-gray-400 hover:border-blue-400 dark:hover:border-blue-500 hover:text-blue-600 dark:hover:text-blue-400 transition-colors flex items-center justify-center gap-2"
                    >
                      <IconPlus size={16} />
                      Add Custom Agent
                    </button>
                    <p className="mt-2 text-xs text-center text-gray-500 dark:text-gray-400">
                      MSF AI Assistant Foundry only
                    </p>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Right: Model Details */}
        <div className="flex-1 overflow-y-auto">
          {selectedModel && (modelConfig || isCustomAgent) && (
            <div className="space-y-6">
              {/* Model Header */}
              <div>
                <div className="flex items-center gap-3 mb-3">
                  {getProviderIcon(selectedModel.provider || modelConfig?.provider, 'lg')}
                  <h2 className="text-2xl font-semibold text-gray-900 dark:text-white">
                    {selectedModel.name}
                  </h2>
                </div>
                <p className="text-gray-600 dark:text-gray-400">
                  {selectedModel.description || modelConfig?.description}
                </p>
              </div>

              {/* Custom Agent Info */}
              {isCustomAgent && (
                <div className="p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg border border-blue-200 dark:border-blue-800">
                  <div className="flex items-start mb-3">
                    <IconRobot size={18} className="mr-2 mt-0.5 flex-shrink-0 text-blue-600 dark:text-blue-400" />
                    <div className="text-sm text-blue-700 dark:text-blue-300">
                      <strong>Custom Agent:</strong> This agent runs on the MSF AI Assistant Foundry instance with agent capabilities always enabled.
                    </div>
                  </div>

                  {/* Agent capabilities */}
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

              {/* No Agent Notice for models without agent support */}
              {!agentAvailable && !isCustomAgent && (
                <div className="p-3 bg-amber-50 dark:bg-amber-900/20 rounded-lg border border-amber-200 dark:border-amber-800">
                  <div className="flex items-start">
                    <IconAlertTriangle size={18} className="mr-2 mt-0.5 flex-shrink-0 text-amber-600 dark:text-amber-400" />
                    <div className="text-sm text-amber-700 dark:text-amber-300">
                      <strong>Note:</strong> Agent services (web search, code interpreter) are not yet available for this model
                    </div>
                  </div>
                </div>
              )}

              {/* Agent Toggle (only for non-custom agents) */}
              {agentAvailable && modelConfig?.agentId && !isCustomAgent && (
                <div className="p-4 bg-gray-50 dark:bg-gray-800/50 rounded-lg border border-gray-200 dark:border-gray-700">
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-2">
                      <IconTool size={20} className="text-gray-600 dark:text-gray-400" />
                      <div>
                        <div className="font-medium text-gray-900 dark:text-white">
                          Enable AI Agent
                        </div>
                        <div className="text-xs text-gray-600 dark:text-gray-400">
                          Web search & code interpreter
                        </div>
                      </div>
                    </div>
                    <button
                      onClick={handleToggleAgent}
                      className="flex items-center"
                    >
                      <div className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                        useAgent ? 'bg-blue-600' : 'bg-gray-300 dark:bg-gray-600'
                      }`}>
                        <span className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                          useAgent ? 'translate-x-6' : 'translate-x-1'
                        }`} />
                      </div>
                    </button>
                  </div>

                  {/* Show agent capabilities when enabled */}
                  {useAgent && (
                    <div className="space-y-2 pt-3 border-t border-gray-200 dark:border-gray-700">
                      <div className="flex items-center text-sm text-gray-600 dark:text-gray-400">
                        <IconWorld size={16} className="mr-2 text-gray-600 dark:text-gray-400" />
                        <span>Real-time web search</span>
                      </div>
                      <div className="flex items-center text-sm text-gray-600 dark:text-gray-400">
                        <IconCode size={16} className="mr-2 text-gray-600 dark:text-gray-400" />
                        <span>Code interpreter & file analysis</span>
                      </div>
                      <div className="flex items-center text-sm text-gray-500 dark:text-gray-500">
                        <IconInfoCircle size={16} className="mr-2" />
                        <span>Fixed configuration, no temperature control</span>
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* Temperature Control */}
              {!useAgent && selectedConversation && (
                <div className="p-4 bg-gray-50 dark:bg-gray-800/50 rounded-lg border border-gray-200 dark:border-gray-700">
                  <div className="flex items-center mb-3">
                    <IconTemperature size={20} className="mr-2 text-gray-600 dark:text-gray-400" />
                    <span className="font-medium text-gray-900 dark:text-white">
                      Temperature Control
                    </span>
                  </div>
                  <TemperatureSlider
                    temperature={selectedConversation.temperature || 0.5}
                    onChangeTemperature={(temperature) =>
                      updateConversation(selectedConversation.id, {
                        ...selectedConversation,
                        temperature,
                      })
                    }
                  />
                </div>
              )}

            </div>
          )}
        </div>
      </div>

      {/* Info Footer */}
      <div className="mt-6 pt-4 border-t border-gray-200 dark:border-gray-700">
        <div className="flex items-start text-xs text-gray-600 dark:text-gray-400 mb-4">
          <IconInfoCircle size={16} className="mr-2 mt-0.5 flex-shrink-0" />
          <div>
            <p>
              <strong>Agent Mode:</strong> Automatically uses tools like web search and code interpreter when needed.
              Temperature and other settings remain fixed for optimal tool performance.
            </p>
          </div>
        </div>

        {/* Advanced Features - Only show when advanced section is expanded */}
        {customAgents.length > 0 && showAdvanced && (
          <div className="pt-4 border-t border-gray-200 dark:border-gray-700">
            <button
              onClick={() => setShowAgentManager(true)}
              className="w-full p-3 bg-gray-50 dark:bg-gray-800/50 rounded-lg text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors flex items-center justify-center gap-2"
            >
              <IconSettings size={16} />
              Manage Custom Agents ({customAgents.length})
            </button>
          </div>
        )}
      </div>

      {/* Custom Agent Form Modal */}
      {showAgentForm && (
        <CustomAgentForm
          onSave={handleSaveAgent}
          onClose={handleCloseAgentForm}
          existingAgent={editingAgent}
        />
      )}

      {/* Custom Agent Manager Modal */}
      {showAgentManager && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <div className="bg-white dark:bg-[#212121] rounded-lg shadow-xl max-w-3xl w-full mx-4 max-h-[80vh] flex flex-col">
            {/* Header */}
            <div className="flex justify-between items-center p-6 border-b border-gray-200 dark:border-gray-700">
              <div>
                <div className="flex items-center gap-2 mb-1">
                  <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                    Manage Custom Agents
                  </h3>
                  <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300">
                    Experimental
                  </span>
                </div>
                <p className="text-xs text-gray-500 dark:text-gray-400">
                  MSF AI Assistant Foundry instance only
                </p>
              </div>
              <button
                onClick={() => setShowAgentManager(false)}
                className="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
              >
                <IconX size={20} />
              </button>
            </div>

            {/* Content */}
            <div className="flex-1 overflow-y-auto p-6">
              {/* Info Banner */}
              <div className="mb-4 p-3 bg-blue-50 dark:bg-blue-900/20 rounded-lg border border-blue-200 dark:border-blue-800">
                <div className="flex items-start">
                  <IconInfoCircle size={16} className="mr-2 mt-0.5 flex-shrink-0 text-blue-600 dark:text-blue-400" />
                  <div className="text-xs text-blue-700 dark:text-blue-300">
                    <strong>Instance Restriction:</strong> Custom agents only work with the <strong>MSF AI Assistant Foundry instance</strong>.
                    Agent IDs must be created by an administrator in this specific instance and shared with you.
                    External or personal Azure AI Foundry instances are not supported.
                  </div>
                </div>
              </div>

              <CustomAgentList
                agents={customAgents}
                onEdit={handleEditAgent}
                onDelete={handleDeleteAgent}
              />
            </div>

            {/* Footer */}
            <div className="p-6 border-t border-gray-200 dark:border-gray-700">
              <button
                onClick={() => {
                  setShowAgentManager(false);
                  setShowAgentForm(true);
                }}
                className="w-full px-4 py-2 text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 rounded-md transition-colors flex items-center justify-center gap-2"
              >
                <IconPlus size={16} />
                Add New Agent
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
