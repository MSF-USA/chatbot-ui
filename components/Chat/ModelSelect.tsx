import {
  IconSparkles,
  IconWorld,
  IconCode,
  IconInfoCircle,
  IconBolt,
  IconTool,
  IconBrain,
  IconAdjustments,
  IconCheck,
  IconTemperature,
  IconAlertTriangle,
  IconX
} from '@tabler/icons-react';
import { FC, useState, useEffect } from 'react';
import { useTranslations } from 'next-intl';
import { OpenAIModel, OpenAIModelID, OpenAIModels } from '@/types/openai';
import { useConversations } from '@/lib/hooks/conversation/useConversations';
import { useSettings } from '@/lib/hooks/settings/useSettings';
import { TemperatureSlider } from '../settings/Temperature';
import { Conversation } from '@/types/chat';
import { v4 as uuidv4 } from 'uuid';

interface ModelCardProps {
  model: OpenAIModel;
  isSelected: boolean;
  onSelect: () => void;
  useAgent?: boolean;
  onToggleAgent?: () => void;
  temperature?: number;
  onChangeTemperature?: (temperature: number) => void;
}

const ModelCard: FC<ModelCardProps> = ({
  model,
  isSelected,
  onSelect,
  useAgent = false,
  onToggleAgent,
  temperature,
  onChangeTemperature
}) => {
  const modelConfig = OpenAIModels[model.id as OpenAIModelID];
  const isGpt5 = model.id === OpenAIModelID.GPT_5;
  const agentAvailable = !isGpt5; // Agents not available for GPT-5 yet

  return (
    <div
      className={`
        relative w-full rounded-lg border transition-all duration-200
        ${isSelected
          ? 'border-gray-400 dark:border-gray-500 bg-gray-50 dark:bg-gray-800/50 shadow-md'
          : 'border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600 bg-white dark:bg-[#212121]'
        }
      `}
    >
      <button
        onClick={(e) => {
          e.stopPropagation();
          console.log('Model card clicked:', model.name);
          onSelect();
        }}
        className="w-full p-4 text-left"
      >
        {/* Selected indicator */}
        {isSelected && (
          <div className="absolute top-3 right-3 w-6 h-6 rounded-full flex items-center justify-center bg-gray-600 dark:bg-gray-400">
            <IconCheck size={14} className="text-white dark:text-gray-900" />
          </div>
        )}

        {/* Model info */}
        <div>
          <div className="flex items-center mb-2">
            <IconBrain size={20} className="mr-2 text-gray-600 dark:text-gray-400" />
            <h3 className="font-semibold text-gray-900 dark:text-white">
              {model.name}
            </h3>
          </div>

          {/* Model description */}
          {modelConfig?.description && (
            <p className="text-sm text-gray-600 dark:text-gray-400 mb-3">
              {modelConfig.description}
            </p>
          )}

          {/* Model type badge and agent availability */}
          <div className="flex items-center gap-2 mb-3">
            <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${
              modelConfig?.modelType === 'reasoning'
                ? 'bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-300'
                : modelConfig?.modelType === 'omni'
                ? 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300'
                : 'bg-gray-100 text-gray-800 dark:bg-gray-900/30 dark:text-gray-300'
            }`}>
              {modelConfig?.modelType || 'foundational'}
            </span>

            {agentAvailable && (
              <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300">
                <IconTool size={12} className="mr-1" />
                Agent Ready
              </span>
            )}
          </div>

          {/* GPT-5 Agent Notice */}
          {isGpt5 && (
            <div className="mb-3 p-2 bg-amber-50 dark:bg-amber-900/20 rounded-md">
              <div className="flex items-start text-xs text-amber-700 dark:text-amber-300">
                <IconAlertTriangle size={14} className="mr-1.5 mt-0.5 flex-shrink-0" />
                <span>Agent services (web search, code interpreter) are not yet available for GPT-5</span>
              </div>
            </div>
          )}
        </div>
      </button>

      {/* Agent toggle */}
      {isSelected && agentAvailable && (
        <div className="px-4 pb-2 border-t border-gray-200 dark:border-gray-700">
          <div className="flex items-center justify-between py-3">
            <div className="flex items-center">
              <IconTool size={16} className="mr-2 text-gray-600 dark:text-gray-400" />
              <div>
                <div className="text-sm font-medium text-gray-900 dark:text-white">
                  Enable AI Agent
                </div>
                <div className="text-xs text-gray-600 dark:text-gray-400">
                  Web search & code interpreter
                </div>
              </div>
            </div>
            <button
              onClick={(e) => {
                e.stopPropagation();
                onToggleAgent?.();
              }}
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
            <div className="pb-3 space-y-1.5">
              <div className="flex items-center text-xs text-gray-600 dark:text-gray-400">
                <IconWorld size={14} className="mr-1.5 text-gray-600 dark:text-gray-400" />
                <span>Real-time web search</span>
              </div>
              <div className="flex items-center text-xs text-gray-600 dark:text-gray-400">
                <IconCode size={14} className="mr-1.5 text-gray-600 dark:text-gray-400" />
                <span>Code interpreter & file analysis</span>
              </div>
              <div className="flex items-center text-xs text-gray-500 dark:text-gray-500">
                <IconInfoCircle size={14} className="mr-1.5" />
                <span>Fixed configuration, no temperature control</span>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Temperature control for non-agent mode */}
      {isSelected && !useAgent && (
        <div className="px-4 pb-4 border-t border-gray-200 dark:border-gray-700">
          <div className="flex items-center text-xs font-medium text-gray-700 dark:text-gray-300 mb-2 mt-3">
            <IconTemperature size={14} className="mr-1.5" />
            Temperature Control
          </div>
          {temperature !== undefined && onChangeTemperature ? (
            <TemperatureSlider
              temperature={temperature}
              onChangeTemperature={onChangeTemperature}
            />
          ) : (
            <div className="text-xs text-gray-500 dark:text-gray-400">
              Select a conversation to adjust temperature
            </div>
          )}
        </div>
      )}
    </div>
  );
};

interface ModelSelectProps {
  onClose?: () => void;
}

export const ModelSelect: FC<ModelSelectProps> = ({ onClose }) => {
  const t = useTranslations();
  const { selectedConversation, updateConversation, conversations, addConversation } = useConversations();
  const { models, defaultModelId, systemPrompt, temperature: defaultTemp } = useSettings();

  console.log('ModelSelect rendered:', {
    selectedConversation: selectedConversation?.id,
    conversationCount: conversations.length,
    modelCount: models.length,
    defaultModelId
  });

  // If no conversation exists, create one
  useEffect(() => {
    if (!selectedConversation && conversations.length === 0 && models.length > 0) {
      const defaultModel = models.find((m) => m.id === defaultModelId) || models[0];
      const newConversation: Conversation = {
        id: uuidv4(),
        name: 'New Conversation',
        messages: [],
        model: defaultModel,
        prompt: systemPrompt || '',
        temperature: defaultTemp || 0.5,
        folderId: null,
      };
      console.log('ModelSelect creating initial conversation:', newConversation.id);
      addConversation(newConversation);
    }
  }, [selectedConversation, conversations, models, defaultModelId, systemPrompt, defaultTemp, addConversation]);

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

    // Close modal after selection
    if (onClose) {
      onClose();
    }
  };

  const handleToggleAgent = (modelId: string) => {
    if (!selectedConversation) {
      console.warn('No conversation selected, cannot toggle agent');
      return;
    }

    // Find the current model
    const model = models.find(m => m.id === modelId);
    if (!model) return;

    // Toggle agent mode
    const currentlyHasAgent = selectedConversation.model?.agentEnabled;
    const modelConfig = OpenAIModels[model.id as OpenAIModelID];

    // If currently has agent, turn it off. If not, turn it on (if available)
    const modelToUse = currentlyHasAgent ?
      { ...model, agentEnabled: false } :
      (modelConfig?.agentId ? {
        ...model,
        agentEnabled: true,
        agentId: modelConfig.agentId
      } : model);

    console.log('Toggling agent:', { currentlyHasAgent, newAgentState: modelToUse.agentEnabled });

    updateConversation(selectedConversation.id, {
      ...selectedConversation,
      model: modelToUse,
    });
  };

  // Filter out legacy models and the standalone agent model
  const availableModels = models.filter(m =>
    !OpenAIModels[m.id as OpenAIModelID]?.isLegacy &&
    !OpenAIModels[m.id as OpenAIModelID]?.isAgent
  );

  const selectedModelId = selectedConversation?.model?.id || defaultModelId;

  return (
    <div className="w-full">
      {/* Header with close button */}
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

      {/* Model Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {availableModels.map((model) => {
          const isCurrentlySelected = selectedModelId === model.id ||
            (selectedConversation?.model?.name === model.name);
          const useAgent = isCurrentlySelected && selectedConversation?.model?.agentEnabled;

          return (
            <ModelCard
              key={model.id}
              model={model}
              isSelected={isCurrentlySelected}
              onSelect={() => handleModelSelect(model)}
              useAgent={useAgent}
              onToggleAgent={() => handleToggleAgent(model.id)}
              temperature={selectedConversation?.temperature}
              onChangeTemperature={(temperature) =>
                selectedConversation && updateConversation(selectedConversation.id, {
                  ...selectedConversation,
                  temperature,
                })
              }
            />
          );
        })}
      </div>

      {/* Info footer */}
      <div className="mt-6 text-xs text-gray-600 dark:text-gray-400">
        <div className="flex items-start">
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
