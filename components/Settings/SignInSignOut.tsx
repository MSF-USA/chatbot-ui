import { IconLogin, IconLogin2 } from '@tabler/icons-react';
import { signIn, signOut, useSession } from 'next-auth/react';

import { useTranslations } from 'next-intl';

export const SignInSignOut = () => {
  const { data: session } = useSession();
  const t = useTranslations('sidebar');

  if (session) {
    return (
      <button
        type="button"
        className="w-[120px] flex items-center justify-center px-4 py-2 border rounded-lg shadow border-neutral-500 text-neutral-900 hover:bg-neutral-100 focus:outline-none dark:border-neutral-800 dark:border-opacity-50 dark:bg-white dark:text-black dark:hover:bg-neutral-300 text-sm"
        onClick={() => signOut()}
      >
        <IconLogin size={18} className="mr-2" />
        Sign Out
      </button>
    );
  } else {
    return (
      <button
        type="button"
        className="w-[120px] flex items-center justify-center px-4 py-2 border rounded-lg shadow border-neutral-500 text-neutral-900 hover:bg-neutral-100 focus:outline-none dark:border-neutral-800 dark:border-opacity-50 dark:bg-white dark:text-black dark:hover:bg-neutral-300 text-sm"
        onClick={() => signIn()}
      >
        <IconLogin size={18} className="mr-2" />
        Sign In
      </button>
    );
  }
};
