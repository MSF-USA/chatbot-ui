'use client';

import {
  IconBolt,
  IconBrain,
  IconSparkles,
  IconWorld,
} from '@tabler/icons-react';

import { useTranslations } from 'next-intl';

import { OpenAIModel } from '@/types/openai';

interface ModelTypeIconProps {
  modelType: OpenAIModel['modelType'];
}

const iconConfig = {
  foundational: {
    Icon: IconBolt,
    colorClass: 'text-gray-600 dark:text-gray-400',
    bgClass: 'bg-gray-100 dark:bg-gray-800',
  },
  reasoning: {
    Icon: IconBrain,
    colorClass: 'text-amber-600 dark:text-amber-400',
    bgClass: 'bg-amber-100 dark:bg-amber-900/30',
  },
  omni: {
    Icon: IconSparkles,
    colorClass: 'text-blue-600 dark:text-blue-400',
    bgClass: 'bg-blue-100 dark:bg-blue-900/30',
  },
  agent: {
    Icon: IconWorld,
    colorClass: 'text-blue-600 dark:text-blue-400',
    bgClass: 'bg-blue-100 dark:bg-blue-900/30',
  },
};

/**
 * Renders an icon representing the model type with hover tooltip.
 * Helps users quickly identify model characteristics in the model list.
 *
 * @param modelType - The type of model (foundational, reasoning, omni, agent)
 * @returns A circular icon badge with appropriate color and tooltip
 */
export function ModelTypeIcon({ modelType }: ModelTypeIconProps) {
  const t = useTranslations('modelSelect.modelTypeIcons');

  if (!modelType) return null;

  const config = iconConfig[modelType];
  if (!config) return null;

  const { Icon, colorClass, bgClass } = config;

  return (
    <div
      className={`inline-flex items-center justify-center rounded-full p-1 ${bgClass}`}
      title={t(modelType)}
    >
      <Icon className={`h-3.5 w-3.5 ${colorClass}`} />
    </div>
  );
}
