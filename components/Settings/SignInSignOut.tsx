import { signIn, signOut, useSession } from "next-auth/react"
import { IconLogin, IconLogin2 } from '@tabler/icons-react';
import { FC } from 'react';

import { useTranslation } from 'next-i18next';

import { SidebarButton } from '../Sidebar/SidebarButton';


export const SignInSignOut: FC<Props> = () => {
  const { data: session } = useSession();
  const { t } = useTranslation('sidebar');

  if (session) {
  return (
    <>
        <SidebarButton
            text={t('Sign Out')}
            icon={<IconLogin size={18} />}
            onClick={() => signOut()}
        />
    </>
  )
  }
  else {
    return (
      <>
          <SidebarButton
              text={t('Sign in')}
              icon={<IconLogin size={18} />}
              onClick={() => signIn()}
          />
      </>
    )
  }
};
