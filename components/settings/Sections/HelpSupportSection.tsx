import { IconExternalLink, IconHelp } from '@tabler/icons-react';
import { useSession } from 'next-auth/react';
import { FC } from 'react';

import { useTranslations } from 'next-intl';
import Link from 'next/link';

export const HelpSupportSection: FC = () => {
  const t = useTranslations();
  const { data: session } = useSession();

  const supportEmail =
    session?.user?.region === 'US'
      ? 'ai@newyork.msf.org'
      : 'ai.team@amsterdam.msf.org';

  return (
    <div className="p-4">
      <h2 className="hidden md:block text-xl font-bold mb-6 text-black dark:text-white">
        {t('Help & Support')}
      </h2>

      <div className="space-y-4">
        {/* Help Center Link */}
        <Link
          href="/info/help"
          className="flex items-start gap-4 p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg border border-blue-200 dark:border-blue-800 hover:bg-blue-100 dark:hover:bg-blue-900/30 transition-colors"
        >
          <IconHelp
            size={24}
            className="text-blue-600 dark:text-blue-400 flex-shrink-0 mt-0.5"
          />
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-1">
              <h3 className="text-sm font-semibold text-gray-900 dark:text-white">
                Help Center
              </h3>
              <IconExternalLink
                size={14}
                className="text-gray-500 dark:text-gray-400"
              />
            </div>
            <p className="text-xs text-gray-600 dark:text-gray-400">
              View FAQs, privacy policy, and terms of use
            </p>
          </div>
        </Link>

        {/* Contact Support */}
        <div className="p-4 bg-gray-50 dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700">
          <h3 className="text-sm font-semibold text-gray-900 dark:text-white mb-3">
            Contact Support
          </h3>
          <div className="text-sm">
            <div className="text-xs text-gray-600 dark:text-gray-400 mb-1">
              General Support & Feedback:
            </div>
            <a
              href={`mailto:${supportEmail}`}
              className="text-blue-600 dark:text-blue-400 hover:underline font-medium"
            >
              {supportEmail}
            </a>
          </div>
        </div>
      </div>
    </div>
  );
};
