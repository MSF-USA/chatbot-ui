'use client';

import { useState } from 'react';
import { IconSettings, IconClearAll, IconExternalLink } from '@tabler/icons-react';
import { useConversations } from '@/lib/hooks/conversation/useConversations';
import { useSettings } from '@/lib/hooks/settings/useSettings';
import { useUI } from '@/lib/hooks/ui/useUI';
import { ModelSelector } from './ModelSelector/ModelSelector';
import { isUSBased } from '@/lib/utils/app/userAuth';
import { FEEDBACK_EMAIL, US_FEEDBACK_EMAIL } from '@/types/contact';
import { useTranslations } from 'next-intl';

interface ChatHeaderProps {
  userEmail?: string;
}

/**
 * Chat header with model selector, settings, and actions
 */
export function ChatHeader({ userEmail }: ChatHeaderProps) {
  const t = useTranslations();
  const { selectedConversation, updateConversation } = useConversations();
  const { models } = useSettings();
  const { setIsSettingsOpen } = useUI();
  const [showModelSelector, setShowModelSelector] = useState(false);

  if (!selectedConversation) return null;

  const handleClearConversation = () => {
    if (window.confirm(t('clearConversationConfirm') || 'Clear all messages?')) {
      updateConversation(selectedConversation.id, { messages: [] });
    }
  };

  const hasMessages = selectedConversation.messages.length > 0;

  return (
    <div className="sticky top-0 z-10 border-b border-neutral-300 bg-neutral-100 py-2 text-sm text-neutral-500 dark:border-none dark:bg-[#2F2F2F] dark:text-neutral-200">
      <div className="mx-8 flex items-center justify-between px-2">
        {/* Model Selector */}
        <div className="flex items-center">
          <button
            onClick={() => setShowModelSelector(!showModelSelector)}
            className="flex items-center rounded-md border border-transparent px-2 py-1 transition-colors hover:border-neutral-300 hover:bg-neutral-200 dark:hover:border-neutral-600 dark:hover:bg-neutral-700"
            aria-label="Model Settings"
          >
            <span className="truncate font-bold text-gray-800 dark:text-blue-50">
              {selectedConversation.model?.name || selectedConversation.model?.id}
            </span>
          </button>

          {showModelSelector && (
            <ModelSelector
              currentModel={selectedConversation.model}
              models={models}
              onSelect={(model) => {
                updateConversation(selectedConversation.id, { model });
                setShowModelSelector(false);
              }}
              onClose={() => setShowModelSelector(false)}
            />
          )}
        </div>

        {/* Actions */}
        <div className="flex items-center space-x-3">
          {hasMessages && (
            <button
              onClick={handleClearConversation}
              className="rounded-md p-1.5 transition-colors hover:bg-neutral-200 dark:hover:bg-neutral-700"
              aria-label="Clear Conversation"
              title="Clear Conversation"
            >
              <IconClearAll size={18} className="text-black dark:text-white" />
            </button>
          )}

          <button
            onClick={() => setIsSettingsOpen(true)}
            className="rounded-md p-1.5 transition-colors hover:bg-neutral-200 dark:hover:bg-neutral-700"
            aria-label="Settings"
            title="Settings"
          >
            <IconSettings size={18} className="text-black dark:text-white" />
          </button>

          <a
            href={`mailto:${
              isUSBased(userEmail ?? '') ? US_FEEDBACK_EMAIL : FEEDBACK_EMAIL
            }`}
            className="flex items-center rounded-md px-2 py-1 text-[12px] text-black/50 transition-colors hover:bg-neutral-200 dark:text-white/50 dark:hover:bg-neutral-700"
            title={t('sendFeedback')}
          >
            <IconExternalLink size={16} className="mr-1 text-black dark:text-white/50" />
            <span className="hidden sm:inline">{t('sendFeedback')}</span>
            <span className="sm:hidden">Feedback</span>
          </a>
        </div>
      </div>
    </div>
  );
}
