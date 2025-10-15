'use client';

import { Chat } from '@/components/Chat/Chat';
import { Sidebar } from '@/components/Sidebar/Sidebar';
import { SettingDialog } from '@/components/settings/SettingDialog';
import { AppInitializer } from '@/components/providers/AppInitializer';
import { useUI } from '@/lib/hooks/ui/useUI';
import { useConversations } from '@/lib/hooks/conversation/useConversations';
import { IconMenu2, IconChevronDown, IconClearAll, IconTool } from '@tabler/icons-react';
import { useState } from 'react';
import { OpenAIModels, OpenAIModelID } from '@/types/openai';
import { OpenAIIcon, DeepSeekIcon, XAIIcon } from '@/components/Icons/providers';

/**
 * Main chat page
 */
export default function ChatPage() {
  const { showChatbar, toggleChatbar } = useUI();
  const { selectedConversation, updateConversation } = useConversations();
  const [isModelSelectOpen, setIsModelSelectOpen] = useState(false);

  const displayModelName = selectedConversation?.model?.name || 'Chat';
  const hasMessages = (selectedConversation?.messages?.length || 0) > 0;
  const agentEnabled = selectedConversation?.model?.agentEnabled || false;
  const modelProvider = OpenAIModels[selectedConversation?.model?.id as OpenAIModelID]?.provider;

  // Helper function to get provider icon
  const getProviderIcon = (provider?: string) => {
    const iconProps = { className: "w-3.5 h-3.5 flex-shrink-0" };
    switch (provider) {
      case 'openai':
        return <OpenAIIcon {...iconProps} />;
      case 'deepseek':
        return <DeepSeekIcon {...iconProps} />;
      case 'xai':
        return <XAIIcon {...iconProps} />;
      default:
        return null;
    }
  };

  const handleClearAll = () => {
    if (selectedConversation && window.confirm('Are you sure you want to clear this conversation?')) {
      updateConversation(selectedConversation.id, {
        ...selectedConversation,
        messages: [],
      });
    }
  };

  return (
    <>
      <AppInitializer />
      <div className="flex h-screen w-screen overflow-hidden">
        <Sidebar />

        {/* Mobile header with menu button, model selector, and clear button */}
        <div className="md:hidden fixed top-0 left-0 right-0 z-30 h-14 bg-white dark:bg-[#212121] border-b border-neutral-300 dark:border-neutral-700 flex items-center justify-between px-4">
          <div className="flex items-center flex-1 min-w-0">
            <button
              onClick={toggleChatbar}
              className="p-2 rounded-lg text-neutral-700 hover:bg-neutral-100 dark:text-neutral-200 dark:hover:bg-neutral-800 transition-colors shrink-0"
              aria-label="Toggle menu"
            >
              <IconMenu2 size={24} />
            </button>

            {/* Model selection button */}
            <button
              onClick={() => setIsModelSelectOpen(true)}
              className="ml-2 flex items-center px-2 py-1 rounded-md hover:bg-neutral-100 dark:hover:bg-neutral-700 transition-colors min-w-0"
              aria-label="Select Model"
            >
              {getProviderIcon(modelProvider)}
              <span className="font-semibold text-neutral-900 dark:text-white truncate text-sm ml-1.5">
                {displayModelName}
              </span>
              {agentEnabled && (
                <IconTool size={12} className="ml-1 text-gray-600 dark:text-gray-400 shrink-0" title="Agent Tools Enabled" />
              )}
              <IconChevronDown size={14} className="ml-1 opacity-60 text-black dark:text-white shrink-0" />
            </button>
          </div>

          {/* Clear button */}
          {hasMessages && (
            <button
              onClick={handleClearAll}
              className="p-2 rounded-md hover:bg-neutral-100 dark:hover:bg-neutral-700 transition-colors shrink-0"
              aria-label="Clear Conversation"
              title="Clear Conversation"
            >
              <IconClearAll size={20} className="text-black dark:text-white" />
            </button>
          )}
        </div>

        <div
          className={`flex flex-1 transition-all duration-300 ease-in-out pt-14 md:pt-0 ${
            showChatbar ? 'md:ml-[260px]' : 'md:ml-14'
          }`}
        >
          <Chat mobileModelSelectOpen={isModelSelectOpen} onMobileModelSelectChange={setIsModelSelectOpen} />
        </div>

        <SettingDialog />
      </div>
    </>
  );
}
