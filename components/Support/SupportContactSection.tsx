'use client';

import {
  IconExternalLink,
  IconInfoCircle,
  IconMail,
} from '@tabler/icons-react';
import { FC } from 'react';

import { useTranslations } from 'next-intl';

import { useOrganizationSupport } from '@/client/hooks/settings/useOrganizationSupport';

/**
 * Component that displays support contact options based on the user's organization.
 * Shows either an email link (for USA, OCG, OCA) or escalation instructions (for Field).
 *
 * NOTE: This component uses useOrganizationSupport which requires SessionProvider.
 * Wrap with OrganizationSupportWrapper if using outside of (chat) route group.
 */
export const SupportContactSection: FC = () => {
  const t = useTranslations();
  const { contactConfig } = useOrganizationSupport();

  if (contactConfig.hasEmailSupport) {
    return (
      <a
        href={`mailto:${contactConfig.email}`}
        className="group relative overflow-hidden border-2 border-gray-200 dark:border-gray-700 rounded-xl p-4 hover:border-purple-400 dark:hover:border-purple-500 hover:shadow-lg transition-all bg-white dark:bg-gray-900/50"
      >
        <div className="flex items-center gap-4">
          <div className="flex-shrink-0 p-2.5 bg-gradient-to-br from-purple-100 to-purple-200 dark:from-purple-900/40 dark:to-purple-800/40 rounded-lg group-hover:scale-110 transition-transform">
            <IconMail
              size={24}
              className="text-purple-600 dark:text-purple-400"
            />
          </div>
          <div className="flex-1 min-w-0">
            <h4 className="text-base font-bold text-gray-900 dark:text-white mb-1">
              {t('help.contact.emailSupport')}
            </h4>
            <p className="text-sm text-gray-600 dark:text-gray-400 mb-1.5">
              {t('support.emailDescription', {
                organization: contactConfig.displayName,
              })}
            </p>
            <span className="inline-flex items-center gap-2 text-sm font-semibold text-purple-600 dark:text-purple-400">
              {contactConfig.email}
              <IconExternalLink size={14} />
            </span>
          </div>
        </div>
      </a>
    );
  }

  // Escalation Instructions for Field/Other
  return (
    <div className="border-2 border-amber-200 dark:border-amber-800/50 bg-amber-50 dark:bg-amber-900/10 rounded-xl p-4">
      <div className="flex items-start gap-4">
        <div className="flex-shrink-0 p-2.5 bg-amber-100 dark:bg-amber-900/30 rounded-lg">
          <IconInfoCircle
            size={24}
            className="text-amber-600 dark:text-amber-400"
          />
        </div>
        <div className="flex-1 min-w-0">
          <h4 className="text-base font-bold text-gray-900 dark:text-white mb-2">
            {t('support.escalationTitle')}
          </h4>
          <p className="text-sm text-gray-600 dark:text-gray-400 mb-3">
            {t('support.escalationDescription')}
          </p>
          <ol className="space-y-2 text-sm text-gray-700 dark:text-gray-300">
            <li className="flex items-start gap-2">
              <span className="flex-shrink-0 w-5 h-5 flex items-center justify-center bg-amber-200 dark:bg-amber-800/50 text-amber-800 dark:text-amber-200 rounded-full text-xs font-bold">
                1
              </span>
              {t('support.escalationStep1')}
            </li>
            <li className="flex items-start gap-2">
              <span className="flex-shrink-0 w-5 h-5 flex items-center justify-center bg-amber-200 dark:bg-amber-800/50 text-amber-800 dark:text-amber-200 rounded-full text-xs font-bold">
                2
              </span>
              {t('support.escalationStep2')}
            </li>
            <li className="flex items-start gap-2">
              <span className="flex-shrink-0 w-5 h-5 flex items-center justify-center bg-amber-200 dark:bg-amber-800/50 text-amber-800 dark:text-amber-200 rounded-full text-xs font-bold">
                3
              </span>
              {t('support.escalationStep3')}
            </li>
          </ol>
        </div>
      </div>
    </div>
  );
};
