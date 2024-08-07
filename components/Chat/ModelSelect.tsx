import { IconExternalLink } from '@tabler/icons-react';
import {FC, useContext} from 'react';

import { useTranslation } from 'next-i18next';

import { OpenAIModel } from '@/types/openai';

import HomeContext from '@/pages/api/home/home.context';

export const ModelSelect = () => {
  const { t } = useTranslation('chat');

  const {
    state: { selectedConversation, models, defaultModelId },
    handleUpdateConversation,
    dispatch: homeDispatch,
  } = useContext(HomeContext);

  const handleChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    selectedConversation &&
      handleUpdateConversation(selectedConversation, {
        key: 'model',
        value: models.find(
          (model) => model.id === e.target.value,
        ) as OpenAIModel,
      });
  };

  return (
    <div className='flex flex-row items-center'>
      <div className="flex flex-col my-5 ml-7">
        <div className="max-w-[210px] rounded-lg bg-[#F4F4F4] dark:bg-[#2F2F2F] pr-2 text-neutral-900 dark:text-white dark:hover:bg-[#171717] hover:bg-gray-300">
          <select
            className="cursor-pointer w-full bg-transparent p-2 text-neutral-900 dark:text-white border-none text-center"
            placeholder={t('Select a model') || ''}
            value={selectedConversation?.model?.id || defaultModelId}
            onChange={handleChange}
          >
            {models.map((model) => (
              <option
                key={model.id}
                value={model.id}
                className="text-neutral-900 dark:bg-[#212121] dark:text-white"
              >
                {model.name}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* <div className="w-full mt-3 text-left text-neutral-700 dark:text-neutral-400 flex items-center">
        <a
          href="https://platform.openai.com/account/usage"
          target="_blank"
          className="flex items-center"
        >
          <IconExternalLink size={18} className={'inline mr-1'} />
          {t('View Account Usage')}
        </a>
      </div> */}
    </div>
  );
};
