'use client';

import { Chat } from '@/components/Chat/Chat';
import { Sidebar } from '@/components/sidebar/Sidebar';
import { SettingDialog } from '@/components/settings/SettingDialog';
import { MigrationBanner } from '@/components/migration/MigrationBanner';
import { AppInitializer } from '@/components/providers/AppInitializer';
import { useUI } from '@/lib/hooks/ui/useUI';

/**
 * Main chat page
 */
export default function ChatPage() {
  const { showChatbar } = useUI();

  return (
    <>
      <AppInitializer />
      <div className="flex h-screen w-screen overflow-hidden">
        <Sidebar />

        <div
          className={`flex flex-1 transition-all duration-300 ease-in-out ${
            showChatbar ? 'ml-[260px]' : 'ml-14'
          }`}
        >
          <Chat />
        </div>

        <SettingDialog />
      </div>

      <MigrationBanner />
    </>
  );
}
