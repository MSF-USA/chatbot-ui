'use client';

import { Suspense, useState } from 'react';

import { useUI } from '@/lib/hooks/ui/useUI';

import { Chat } from '@/components/Chat/Chat';
import { LoadingScreen } from '@/components/Chat/LoadingScreen';
import { MobileChatHeader } from '@/components/Chat/MobileChatHeader';
import { AppInitializer } from '@/components/Providers/AppInitializer';
import { SettingDialog } from '@/components/Settings/SettingDialog';
import { Sidebar } from '@/components/Sidebar/Sidebar';

/**
 * Main chat page
 * Client component - entire page is interactive
 */
export default function ChatPage() {
  const { showChatbar } = useUI();
  const [isModelSelectOpen, setIsModelSelectOpen] = useState(false);

  return (
    <>
      <AppInitializer />
      <div className="flex h-screen w-screen overflow-hidden">
        <Sidebar />

        <MobileChatHeader onModelSelectChange={setIsModelSelectOpen} />

        <div
          className={`flex flex-1 transition-all duration-300 ease-in-out pt-14 md:pt-0 ${
            showChatbar ? 'md:ml-[260px]' : 'md:ml-14'
          }`}
        >
          <Suspense fallback={<LoadingScreen />}>
            <Chat
              mobileModelSelectOpen={isModelSelectOpen}
              onMobileModelSelectChange={setIsModelSelectOpen}
            />
          </Suspense>
        </div>

        <SettingDialog />
      </div>
    </>
  );
}
