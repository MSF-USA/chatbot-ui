import { IconFileExport, IconSettings } from '@tabler/icons-react';
import { useContext, useState } from 'react';
import { Transition } from '@headlessui/react';

import { useTranslation } from 'next-i18next';

import HomeContext from '@/pages/api/home/home.context';

import { SettingDialog } from '@/components/Settings/SettingDialog';

import { Import } from '../../Settings/Import';
import { Key } from '../../Settings/Key';
import { SidebarButton } from '../../Sidebar/SidebarButton';
import ChatbarContext from '../Chatbar.context';
import { PluginKeys } from './PluginKeys';
import {OPENAI_API_HOST_TYPE} from "@/utils/app/const";
import { Session } from 'inspector';

export const ChatbarSettings = () => {
  const { t } = useTranslation('sidebar');
  const [isSettingDialogOpen, setIsSettingDialog] = useState<boolean>(false);

  const {
    state: {
      user,
      apiKey,
      lightMode,
      serverSideApiKeyIsSet,
      serverSidePluginKeysSet,
      conversations,
    },
    dispatch: homeDispatch,
  } = useContext(HomeContext);

  const {
    handleApiKeyChange,
  } = useContext(ChatbarContext);

  const getInitials = (name: string) => {
    const names = name.replace(/[^a-zA-Z\s]/g, '').trim().split(/\s+/);
    const firstInitial = names[0] ? names[0][0] : '';
    const lastInitial = names.length > 1 ? names[names.length - 1][0] : '';
    return firstInitial + lastInitial;
  };

  return (
    <div className="flex flex-col items-center space-y-1 border-t border-black dark:border-white/20 pt-1 text-sm">
      <SidebarButton
        text={t('Settings')}
        icon={user?.displayName != undefined ?
            <div
              className="rounded-full bg-[#D7211E] h-10 w-10 flex items-center justify-center dark:text-white text-black"
              style={{ fontSize: '16px' }}
            >
              {getInitials(user.displayName)}
            </div> : <IconSettings size={18} />}
        onClick={() => setIsSettingDialog(true)}
      />

      {!serverSideApiKeyIsSet && OPENAI_API_HOST_TYPE !== 'apim' ? (
        <Key apiKey={apiKey} onApiKeyChange={handleApiKeyChange} />
      ) : null}

      {/* {!serverSidePluginKeysSet ? <PluginKeys /> : null} */}

      <Transition
        show={isSettingDialogOpen}
        as="div"
        className="absolute inset-0 overflow-hidden z-10"
        enter="transition-opacity ease-out duration-400"
        enterFrom="opacity-0"
        enterTo="opacity-100"
        leave="transition-opacity ease-in duration-400"
        leaveFrom="opacity-100"
        leaveTo="opacity-0"
      >
        <SettingDialog
          open={isSettingDialogOpen}
          onClose={() => {
            setIsSettingDialog(false);
          }}
          user={user}
        />
      </Transition>
    </div>
  );
};
