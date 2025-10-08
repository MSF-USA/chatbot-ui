import {
  IconWorld,
  IconCode,
  IconInfoCircle,
  IconTool,
  IconBrain,
  IconCheck,
  IconTemperature,
  IconAlertTriangle,
  IconX
} from '@tabler/icons-react';
import { FC } from 'react';
import { useTranslations } from 'next-intl';
import { OpenAIModel, OpenAIModelID, OpenAIModels } from '@/types/openai';
import { useConversations } from '@/lib/hooks/conversation/useConversations';
import { useSettings } from '@/lib/hooks/settings/useSettings';
import { TemperatureSlider } from '../settings/Temperature';

interface ModelSelectProps {
  onClose?: () => void;
}

export const ModelSelect: FC<ModelSelectProps> = ({ onClose }) => {
  const t = useTranslations();
  const { selectedConversation, updateConversation, conversations } = useConversations();
  const { models, defaultModelId } = useSettings();

  // Filter out legacy models and the standalone agent model
  const availableModels = models.filter(m =>
    !OpenAIModels[m.id as OpenAIModelID]?.isLegacy &&
    !OpenAIModels[m.id as OpenAIModelID]?.isAgent
  );

  const selectedModelId = selectedConversation?.model?.id || defaultModelId;

  const selectedModel = availableModels.find(m => m.id === selectedModelId) || availableModels[0];
  const modelConfig = selectedModel ? OpenAIModels[selectedModel.id as OpenAIModelID] : null;
  const isGpt5 = selectedModel?.id === OpenAIModelID.GPT_5;
  const agentAvailable = !isGpt5;
  const useAgent = selectedConversation?.model?.agentEnabled;

  const handleModelSelect = (model: OpenAIModel) => {
    if (!selectedConversation) {
      console.warn('No conversation selected, cannot update model');
      return;
    }

    // When selecting a model, use agent mode by default (except GPT-5)
    const shouldUseAgent = model.id !== OpenAIModelID.GPT_5 && OpenAIModels[model.id as OpenAIModelID]?.agentId;
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
          <div className="space-y-2">
            {availableModels.map((model) => {
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
                      <IconBrain size={16} className="text-gray-600 dark:text-gray-400" />
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

        {/* Right: Model Details */}
        <div className="flex-1 overflow-y-auto">
          {selectedModel && modelConfig && (
            <div className="space-y-6">
              {/* Model Header */}
              <div>
                <div className="flex items-center gap-3 mb-3">
                  <IconBrain size={32} className="text-gray-600 dark:text-gray-400" />
                  <h2 className="text-2xl font-semibold text-gray-900 dark:text-white">
                    {selectedModel.name}
                  </h2>
                </div>
                <p className="text-gray-600 dark:text-gray-400">
                  {modelConfig.description}
                </p>
              </div>

              {/* GPT-5 Agent Notice */}
              {isGpt5 && (
                <div className="p-3 bg-amber-50 dark:bg-amber-900/20 rounded-lg border border-amber-200 dark:border-amber-800">
                  <div className="flex items-start">
                    <IconAlertTriangle size={18} className="mr-2 mt-0.5 flex-shrink-0 text-amber-600 dark:text-amber-400" />
                    <div className="text-sm text-amber-700 dark:text-amber-300">
                      <strong>Note:</strong> Agent services (web search, code interpreter) are not yet available for GPT-5
                    </div>
                  </div>
                </div>
              )}

              {/* Agent Toggle */}
              {agentAvailable && modelConfig?.agentId && (
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
        <div className="flex items-start text-xs text-gray-600 dark:text-gray-400">
          <IconInfoCircle size={16} className="mr-2 mt-0.5 flex-shrink-0" />
          <div>
            <p>
              <strong>Agent Mode:</strong> Automatically uses tools like web search and code interpreter when needed.
              Temperature and other settings remain fixed for optimal tool performance.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};
