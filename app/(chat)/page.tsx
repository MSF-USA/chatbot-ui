'use client';

import { Chat } from '@/components/Chat/Chat';
import { Sidebar } from '@/components/Sidebar/Sidebar';
import { SettingsDialog } from '@/components/settings/SettingsDialog';
import { MigrationBanner } from '@/components/migration/MigrationBanner';

/**
 * Main chat page
 */
export default function ChatPage() {
  return (
    <>
      <div className="flex h-screen w-screen overflow-hidden">
        <Sidebar />

        <div className="flex flex-1">
          <Chat />
        </div>

        <SettingsDialog />
      </div>

      <MigrationBanner />
    </>
  );
}
