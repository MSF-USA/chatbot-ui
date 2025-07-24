import { IconAlertCircle, IconRobot } from '@tabler/icons-react';
import { FC, MutableRefObject, useEffect, useMemo } from 'react';

import { useTranslation } from 'next-i18next';

import { OpenAIModel, OpenAIModelID, OpenAIModels } from '@/types/openai';
import { getModelUsageCount } from '@/utils/app/modelUsage';

interface Props {
  models: OpenAIModel[];
  activeModelIndex: number;
  onSelect: () => void;
  onMouseOver: (index: number) => void;
  modelListRef: MutableRefObject<HTMLUListElement | null>;
  onModelsSort?: (sortedModels: OpenAIModel[]) => void;
}

interface ModelItemProps {
  model: OpenAIModel;
  isActive: boolean;
  onClick: () => void;
  onMouseEnter: () => void;
}

const ModelItem: FC<ModelItemProps> = ({
  model,
  isActive,
  onClick,
  onMouseEnter,
}) => {
  const isLegacy = OpenAIModels[model.id as OpenAIModelID]?.isLegacy;

  return (
    <li
      className={`${
        isActive ? 'bg-gray-200 dark:bg-[#171717]' : ''
      } cursor-pointer px-3 py-2 text-sm text-black dark:text-white hover:bg-gray-100 dark:hover:bg-[#2a2a2a] transition-colors`}
      onClick={(e) => {
        e.preventDefault();
        e.stopPropagation();
        onClick();
      }}
      onMouseEnter={onMouseEnter}
    >
      <div className="flex items-start space-x-2">
        <div className="flex-shrink-0 mt-0.5">
          <IconRobot size={16} className="text-blue-500" />
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center space-x-2">
            <span
              className={`font-medium ${
                isLegacy
                  ? 'text-amber-600 dark:text-amber-400'
                  : 'text-blue-600 dark:text-blue-400'
              }`}
            >
              {isLegacy ? `⚠️ ${model.name}` : model.name}
            </span>
            {isLegacy && (
              <span className="px-2 py-0.5 text-xs rounded-full bg-amber-100 dark:bg-amber-900 text-amber-700 dark:text-amber-300">
                Legacy
              </span>
            )}
          </div>
          <p className="text-xs text-gray-600 dark:text-gray-400 mt-1">
            {model.id}
          </p>
          {model.tokenLimit && (
            <div className="text-xs text-gray-500 dark:text-gray-500 mt-1">
              <span>Token limit: {model.tokenLimit.toLocaleString()}</span>
            </div>
          )}
          {isLegacy && (
            <div className="text-xs flex items-center mt-1 text-amber-600 dark:text-amber-400">
              <IconAlertCircle size={12} className="mr-1" />
              Legacy models may have limitations
            </div>
          )}
        </div>
      </div>
    </li>
  );
};

export const ModelList: FC<Props> = ({
  models,
  activeModelIndex,
  onSelect,
  onMouseOver,
  modelListRef,
  onModelsSort,
}) => {
  const { t } = useTranslation('chat');

  const handleItemClick = () => {
    onSelect();
  };

  const handleItemMouseEnter = (index: number) => {
    onMouseOver(index);
  };

  const sortedModels = useMemo(() => {
    return [...models].sort((a, b) => {
      const aIsLegacy = OpenAIModels[a.id as OpenAIModelID]?.isLegacy || false;
      const bIsLegacy = OpenAIModels[b.id as OpenAIModelID]?.isLegacy || false;
      
      // Primary sort: Non-legacy models first
      if (aIsLegacy && !bIsLegacy) return 1;
      if (!aIsLegacy && bIsLegacy) return -1;
      
      // Secondary sort: Higher usage count first (within same legacy status)
      const aUsage = getModelUsageCount(a.id);
      const bUsage = getModelUsageCount(b.id);
      if (aUsage !== bUsage) return bUsage - aUsage;
      
      // Tertiary sort: Preserve original order for equal usage
      return 0;
    });
  }, [models]);

  // Notify parent component when models are sorted
  useEffect(() => {
    if (onModelsSort) {
      onModelsSort(sortedModels);
    }
  }, [sortedModels, onModelsSort]);

  return (
    <ul
      ref={modelListRef}
      className="z-10 max-h-80 w-full overflow-y-auto rounded border border-black/10 bg-white shadow-[0_0_10px_rgba(0,0,0,0.10)] dark:border-neutral-500 dark:bg-[#212121] dark:text-white dark:shadow-[0_0_15px_rgba(0,0,0,0.10)]"
    >
      {sortedModels.length > 0 ? (
        sortedModels.map((model, index) => (
          <ModelItem
            key={model.id}
            model={model}
            isActive={index === activeModelIndex}
            onClick={handleItemClick}
            onMouseEnter={() => handleItemMouseEnter(index)}
          />
        ))
      ) : (
        <li className="px-3 py-4 text-sm text-gray-500 dark:text-gray-400 text-center">
          {t('No models available')}
        </li>
      )}
    </ul>
  );
};
