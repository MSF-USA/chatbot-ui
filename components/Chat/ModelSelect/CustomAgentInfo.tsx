import { IconCode, IconWorld } from '@tabler/icons-react';
import React, { FC } from 'react';

import { useTranslations } from 'next-intl';

import { AzureAIIcon } from '@/components/Icons/providers';

export const CustomAgentInfo: FC = () => {
  const t = useTranslations();

  return (
    <div className="p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg border border-blue-200 dark:border-blue-800">
      <div className="flex items-start mb-3">
        <AzureAIIcon className="w-[18px] h-[18px] me-2 mt-0.5 flex-shrink-0" />
        <div className="text-sm text-blue-700 dark:text-blue-300">
          <strong>{t('modelSelect.customAgent.label')}</strong>{' '}
          {t('modelSelect.customAgent.description')}
        </div>
      </div>

      <div className="space-y-2 pt-3 border-t border-blue-200 dark:border-blue-700">
        <div className="flex items-center text-sm text-blue-600 dark:text-blue-400">
          <IconWorld size={16} className="me-2" />
          <span>{t('modelSelect.customAgent.webSearch')}</span>
        </div>
        <div className="flex items-center text-sm text-blue-600 dark:text-blue-400">
          <IconCode size={16} className="me-2" />
          <span>{t('modelSelect.customAgent.codeInterpreter')}</span>
        </div>
      </div>
    </div>
  );
};
