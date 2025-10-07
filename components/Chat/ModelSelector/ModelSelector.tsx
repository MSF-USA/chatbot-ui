'use client';

import { OpenAIModel } from '@/types/openai';
import { IconCheck } from '@tabler/icons-react';

interface ModelSelectorProps {
  currentModel: OpenAIModel;
  models: OpenAIModel[];
  onSelect: (model: OpenAIModel) => void;
  onClose: () => void;
}

/**
 * Model selector dropdown
 */
export function ModelSelector({
  currentModel,
  models,
  onSelect,
  onClose,
}: ModelSelectorProps) {
  return (
    <div className="absolute left-0 top-full z-50 mt-2 w-64 rounded-lg border border-neutral-300 bg-white shadow-lg dark:border-neutral-700 dark:bg-neutral-800">
      <div className="max-h-96 overflow-y-auto p-2">
        {models.map((model) => {
          const isSelected = currentModel.id === model.id;

          return (
            <button
              key={model.id}
              onClick={() => onSelect(model)}
              className="flex w-full items-center justify-between rounded-md px-3 py-2 text-left transition-colors hover:bg-neutral-100 dark:hover:bg-neutral-700"
            >
              <div className="flex-1">
                <div className="font-medium text-gray-800 dark:text-white">
                  {model.name}
                </div>
                {model.description && (
                  <div className="text-xs text-gray-500 dark:text-gray-400">
                    {model.description}
                  </div>
                )}
              </div>

              {isSelected && (
                <IconCheck size={18} className="text-blue-500" />
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
}
