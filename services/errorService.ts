import { useMemo } from 'react';

import { useTranslation } from 'next-i18next';

import { ErrorMessage } from '@/types/error';
import {signOut} from "next-auth/react";
import {FORCE_LOGOUT_ON_REFRESH_FAILURE, OPENAI_API_TYPE} from "@/utils/app/const";

const useErrorService = () => {
  const { t } = useTranslation('chat');

  return {
    getModelsError: useMemo(
      () => (error: any) => {
        if (FORCE_LOGOUT_ON_REFRESH_FAILURE.trim().toLowerCase() === 'true' &&
            OPENAI_API_TYPE === 'azure' && error) {
            signOut()
        }
        return !error
          ? null
          : ({
              title: t('Error fetching models.'),
              code: error.status || 'unknown',
              messageLines: error.statusText
                ? [error.statusText]
                : [
                    t(
                      'Make sure your OpenAI API key is set in the bottom left of the sidebar.',
                    ),
                    t(
                      'If you completed this step, OpenAI may be experiencing issues.',
                    ),
                  ],
            } as ErrorMessage);
      },
      [t],
    ),
  };
};

export default useErrorService;
