import {
  IconCode,
  IconDatabase,
  IconFileText,
  IconRobot,
  IconSearch,
  IconTool,
} from '@tabler/icons-react';
import { FC } from 'react';

import { useTranslation } from 'next-i18next';

import { AgentType } from '@/types/agent';

interface AgentTypeIndicatorProps {
  agentType: AgentType;
  size?: 'sm' | 'md' | 'lg';
  showLabel?: boolean;
  className?: string;
}

/**
 * Visual indicator component showing agent type with icon and optional label
 * Provides consistent agent identification across the UI
 */
export const AgentTypeIndicator: FC<AgentTypeIndicatorProps> = ({
  agentType,
  size = 'md',
  showLabel = false,
  className = '',
}) => {
  const { t } = useTranslation('agents');

  const getAgentConfig = (type: AgentType) => {
    switch (type) {
      case AgentType.WEB_SEARCH:
        return {
          icon: IconSearch,
          color: 'text-blue-600 dark:text-blue-400',
          bgColor: 'bg-blue-100 dark:bg-blue-900/30',
          borderColor: 'border-blue-200 dark:border-blue-800',
          name: t('common.agentTypes.web_search'),
          description: t('indicators.descriptions.web_search'),
        };

      case AgentType.CODE_INTERPRETER:
        return {
          icon: IconCode,
          color: 'text-green-600 dark:text-green-400',
          bgColor: 'bg-green-100 dark:bg-green-900/30',
          borderColor: 'border-green-200 dark:border-green-800',
          name: t('common.agentTypes.code_interpreter'),
          description: t('indicators.descriptions.code_interpreter'),
        };

      case AgentType.URL_PULL:
        return {
          icon: IconFileText,
          color: 'text-purple-600 dark:text-purple-400',
          bgColor: 'bg-purple-100 dark:bg-purple-900/30',
          borderColor: 'border-purple-200 dark:border-purple-800',
          name: t('common.agentTypes.url_pull'),
          description: t('indicators.descriptions.url_pull'),
        };

      case AgentType.LOCAL_KNOWLEDGE:
        return {
          icon: IconDatabase,
          color: 'text-orange-600 dark:text-orange-400',
          bgColor: 'bg-orange-100 dark:bg-orange-900/30',
          borderColor: 'border-orange-200 dark:border-orange-800',
          name: t('common.agentTypes.local_knowledge'),
          description: t('indicators.descriptions.local_knowledge'),
        };

      case AgentType.STANDARD_CHAT:
        return {
          icon: IconRobot,
          color: 'text-gray-600 dark:text-gray-400',
          bgColor: 'bg-gray-100 dark:bg-gray-900/30',
          borderColor: 'border-gray-200 dark:border-gray-700',
          name: t('common.agentTypes.standard_chat'),
          description: t('indicators.descriptions.standard_chat'),
        };

      case AgentType.FOUNDRY:
        return {
          icon: IconTool,
          color: 'text-indigo-600 dark:text-indigo-400',
          bgColor: 'bg-indigo-100 dark:bg-indigo-900/30',
          borderColor: 'border-indigo-200 dark:border-indigo-800',
          name: t('common.agentTypes.foundry'),
          description: t('indicators.descriptions.foundry'),
        };

      case AgentType.THIRD_PARTY:
      default:
        return {
          icon: IconTool,
          color: 'text-gray-600 dark:text-gray-400',
          bgColor: 'bg-gray-100 dark:bg-gray-900/30',
          borderColor: 'border-gray-200 dark:border-gray-700',
          name: t('common.agentTypes.third_party'),
          description: t('indicators.descriptions.third_party'),
        };
    }
  };

  const getSizeConfig = (size: 'sm' | 'md' | 'lg') => {
    switch (size) {
      case 'sm':
        return {
          iconSize: 14,
          padding: 'p-1.5',
          textSize: 'text-xs',
          spacing: 'space-x-1',
        };
      case 'lg':
        return {
          iconSize: 20,
          padding: 'p-3',
          textSize: 'text-sm',
          spacing: 'space-x-2',
        };
      case 'md':
      default:
        return {
          iconSize: 16,
          padding: 'p-2',
          textSize: 'text-xs',
          spacing: 'space-x-1.5',
        };
    }
  };

  const agentConfig = getAgentConfig(agentType);
  const sizeConfig = getSizeConfig(size);
  const IconComponent = agentConfig.icon;

  if (showLabel) {
    return (
      <div
        className={`inline-flex items-center ${sizeConfig.spacing} ${sizeConfig.padding} rounded-lg border ${agentConfig.bgColor} ${agentConfig.borderColor} ${className}`}
        title={agentConfig.description}
      >
        <IconComponent
          size={sizeConfig.iconSize}
          className={agentConfig.color}
        />
        <span
          className={`font-medium ${agentConfig.color} ${sizeConfig.textSize}`}
        >
          {agentConfig.name}
        </span>
      </div>
    );
  }

  return (
    <div
      className={`inline-flex items-center justify-center ${sizeConfig.padding} rounded-lg border ${agentConfig.bgColor} ${agentConfig.borderColor} ${className}`}
      title={`${agentConfig.name} - ${agentConfig.description}`}
    >
      <IconComponent size={sizeConfig.iconSize} className={agentConfig.color} />
    </div>
  );
};

export default AgentTypeIndicator;
