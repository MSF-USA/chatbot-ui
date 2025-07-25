import { FC } from 'react';

import { useTranslation } from 'next-i18next';

import { FAQData } from '@/types/faq';

import { FAQ } from '../faq';

interface HelpSupportSectionProps {
  faqData: FAQData;
}

export const HelpSupportSection: FC<HelpSupportSectionProps> = ({
  faqData,
}) => {
  const { t } = useTranslation('settings');

  return (
    <div className="p-4">
      <h2 className="text-xl font-bold mb-6 text-black dark:text-white">
        {t('Help & Support')}
      </h2>

      <div className="space-y-6">
        {/* FAQ */}
        <div>
          <h3 className="text-sm font-bold mb-3 text-black dark:text-neutral-200">
            {t('Frequently Asked Questions')}
          </h3>
          <FAQ faq={faqData.faq} />
        </div>
      </div>
    </div>
  );
};
