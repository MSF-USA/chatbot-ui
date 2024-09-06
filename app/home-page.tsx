'use client';

import { useEffect, useRef } from 'react';

import { useTranslations } from 'next-intl';

import { Chat } from '@/components/Chat/Chat';
import { Chatbar } from '@/components/Chatbar/Chatbar';
import { Navbar } from '@/components/Mobile/Navbar';

import { useHomeContext } from './home-provider';

interface Props {
  serverSideApiKeyIsSet: boolean;
  serverSidePluginKeysSet: boolean;
  defaultModelId: string;
}

export default function HomePage({
  serverSideApiKeyIsSet,
  serverSidePluginKeysSet,
  defaultModelId,
}: Props) {
  const t = useTranslations('chat');
  const {
    state: { lightMode, selectedConversation },
    handleNewConversation,
    dispatch,
  } = useHomeContext();

  const stopConversationRef = useRef<boolean>(false);

  // Set initial state
  useEffect(() => {
    dispatch({ field: 'serverSideApiKeyIsSet', value: serverSideApiKeyIsSet });
    dispatch({
      field: 'serverSidePluginKeysSet',
      value: serverSidePluginKeysSet,
    });
    dispatch({ field: 'defaultModelId', value: defaultModelId });
  }, [
    serverSideApiKeyIsSet,
    serverSidePluginKeysSet,
    defaultModelId,
    dispatch,
  ]);

  return (
    <main
      className={`flex h-screen w-screen flex-col text-sm text-white dark:text-white ${lightMode}`}
    >
      <div className="fixed top-0 w-full sm:hidden">
        {selectedConversation && (
          <Navbar
            selectedConversation={selectedConversation}
            onNewConversation={handleNewConversation}
          />
        )}
      </div>

      <div className="flex h-full w-full pt-[48px] sm:pt-0">
        <Chatbar />

        <div className="flex flex-1">
          <Chat stopConversationRef={stopConversationRef} />
        </div>
      </div>
    </main>
  );
}
