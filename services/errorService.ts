import { signOut } from 'next-auth/react';
import { useMemo } from 'react';

import { useTranslations } from 'next-intl';

import {
  FORCE_LOGOUT_ON_REFRESH_FAILURE,
  OPENAI_API_TYPE,
} from '@/utils/app/const';

import { ErrorMessage } from '@/types/error';

const useErrorService = () => {
  const t = useTranslations('chat');

  return {
    getModelsError: useMemo(
      () => (error: any) => {
        if (
          FORCE_LOGOUT_ON_REFRESH_FAILURE.trim().toLowerCase() === 'true' &&
          OPENAI_API_TYPE === 'azure' &&
          error
        ) {
          signOut();
        }
        return !error
          ? null
          : ({
              title: t('Error fetching models.'),
              code: error.status || 'unknown',
              messageLines: error.statusText
                ? [error.statusText]
                : [
                    t('MSF AI Assistant is having issues right now.'),
                    t('Please check back later.'),
                  ],
            } as ErrorMessage);
      },
      [t],
    ),
  };
};

export default useErrorService;
