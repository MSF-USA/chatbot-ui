'use client';

import {
  IconExternalLink,
  IconInfoCircle,
  IconMail,
} from '@tabler/icons-react';
import { FC } from 'react';

import { useTranslations } from 'next-intl';

import { useOrganizationSupport } from '@/client/hooks/settings/useOrganizationSupport';

import { OrganizationSelector } from './OrganizationSelector';

interface SupportContactProps {
  /** Whether to show the organization selector */
  showOrganizationSelector?: boolean;
  /** Display variant: 'full' for detailed view, 'compact' for inline usage */
  variant?: 'full' | 'compact';
  /** Additional CSS classes */
  className?: string;
}

/**
 * Displays support contact information based on the user's organization.
 * For organizations with email support (USA, OCG, OCA), shows an email link.
 * For Field/Other staff, shows escalation instructions.
 *
 * @example
 * <SupportContact />
 *
 * @example
 * <SupportContact variant="compact" showOrganizationSelector={false} />
 */
export const SupportContact: FC<SupportContactProps> = ({
  showOrganizationSelector = true,
  variant = 'full',
  className = '',
}) => {
  const t = useTranslations();
  const { contactConfig } = useOrganizationSupport();

  if (variant === 'compact') {
    return (
      <div className={`flex flex-col gap-2 ${className}`}>
        {showOrganizationSelector && (
          <OrganizationSelector compact showResetButton={false} />
        )}

        {contactConfig.hasEmailSupport ? (
          <a
            href={`mailto:${contactConfig.email}`}
            className="inline-flex items-center gap-2 text-sm text-blue-600 dark:text-blue-400 hover:underline"
          >
            <IconMail size={16} />
            {contactConfig.email}
          </a>
        ) : (
          <div className="text-sm text-gray-600 dark:text-gray-400">
            {t('support.escalationTitle')}
          </div>
        )}
      </div>
    );
  }

  // Full variant
  return (
    <div className={`space-y-4 ${className}`}>
      {/* Organization Selector */}
      {showOrganizationSelector && (
        <div className="flex flex-row justify-between items-center px-3 py-2 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors">
          <div className="text-sm text-gray-700 dark:text-gray-300">
            {t('support.selectOrganization')}
          </div>
          <OrganizationSelector />
        </div>
      )}

      {/* Contact Display */}
      {contactConfig.hasEmailSupport ? (
        // Email Support Card
        <a
          href={`mailto:${contactConfig.email}`}
          className="group block border border-gray-200 dark:border-gray-700 rounded-lg p-4 hover:border-blue-500 dark:hover:border-blue-400 transition-all hover:shadow-md"
        >
          <div className="flex items-start gap-3">
            <div className="p-2 bg-blue-100 dark:bg-blue-900/30 rounded-lg group-hover:bg-blue-200 dark:group-hover:bg-blue-900/50 transition-colors">
              <IconMail
                size={20}
                className="text-blue-600 dark:text-blue-400"
              />
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-1">
                <h4 className="text-sm font-semibold text-gray-900 dark:text-white">
                  {t('support.emailSupport')}
                </h4>
                <IconExternalLink
                  size={14}
                  className="text-gray-400 dark:text-gray-500 group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors"
                />
              </div>
              <p className="text-xs text-gray-600 dark:text-gray-400 mb-1">
                {t('support.emailDescription', {
                  organization: contactConfig.displayName,
                })}
              </p>
              <span className="text-sm font-medium text-blue-600 dark:text-blue-400">
                {contactConfig.email}
              </span>
            </div>
          </div>
        </a>
      ) : (
        // Escalation Instructions Card
        <div className="border border-gray-200 dark:border-gray-700 rounded-lg p-4 bg-amber-50 dark:bg-amber-900/10 border-amber-200 dark:border-amber-800/50">
          <div className="flex items-start gap-3">
            <div className="p-2 bg-amber-100 dark:bg-amber-900/30 rounded-lg">
              <IconInfoCircle
                size={20}
                className="text-amber-600 dark:text-amber-400"
              />
            </div>
            <div className="flex-1 min-w-0">
              <h4 className="text-sm font-semibold text-gray-900 dark:text-white mb-2">
                {t('support.escalationTitle')}
              </h4>
              <p className="text-xs text-gray-600 dark:text-gray-400 mb-3">
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
      )}
    </div>
  );
};
