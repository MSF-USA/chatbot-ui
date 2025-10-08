'use client';

import { Chat } from '@/components/Chat/Chat';
import { Sidebar } from '@/components/sidebar/Sidebar';
import { SettingDialog } from '@/components/settings/SettingDialog';
import { MigrationBanner } from '@/components/migration/MigrationBanner';
import { AppInitializer } from '@/components/providers/AppInitializer';

/**
 * Main chat page
 */
export default function ChatPage() {
  return (
    <>
      <AppInitializer />
      <div className="flex h-screen w-screen overflow-hidden">
        <Sidebar />

        <div className="flex flex-1">
          <Chat />
        </div>

        <SettingDialog />
      </div>

      <MigrationBanner />
    </>
  );
}
