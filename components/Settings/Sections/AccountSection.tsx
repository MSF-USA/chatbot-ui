import { FC } from 'react';
import { useTranslation } from 'next-i18next';
import { SignInSignOut } from '../SignInSignOut';

interface AccountSectionProps {
  // No specific props needed for this section currently
}

export const AccountSection: FC<AccountSectionProps> = () => {
  const { t } = useTranslation('settings');

  return (
    <div className="p-4">
      <h2 className="text-xl font-bold mb-6 text-black dark:text-white">
        {t('Account')}
      </h2>

      <div className="space-y-6">
        {/* Sign In/Sign Out */}
        <div>
          <h3 className="text-sm font-bold mb-3 text-black dark:text-neutral-200">
            {t('Authentication')}
          </h3>
          <SignInSignOut />
        </div>
      </div>
    </div>
  );
};
