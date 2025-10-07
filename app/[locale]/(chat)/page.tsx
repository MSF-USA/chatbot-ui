'use client';

import { Chat } from '@/components/Chat/Chat';
import { Sidebar } from '@/components/Sidebar/Sidebar';
import { SettingDialog } from '@/components/settings/SettingDialog';
import { MigrationBanner } from '@/components/migration/MigrationBanner';
import { ModelLoader } from '@/components/providers/ModelLoader';

/**
 * Main chat page
 */
export default function ChatPage() {
  return (
    <>
      <ModelLoader />
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
