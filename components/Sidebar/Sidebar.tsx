'use client';

import { useState } from 'react';
import { useTranslation } from 'next-i18next';
import {
  IconPlus,
  IconFolderPlus,
  IconX,
  IconChevronRight,
  IconMessage,
  IconTrash,
  IconEdit,
} from '@tabler/icons-react';
import { useUI } from '@/lib/hooks/ui/useUI';
import { useConversations } from '@/lib/hooks/conversation/useConversations';
import { useSettings } from '@/lib/hooks/settings/useSettings';
import { Conversation } from '@/types/chat';
import { v4 as uuidv4 } from 'uuid';

/**
 * Sidebar with conversation list - migrated to use Zustand stores
 */
export function Sidebar() {
  const { t } = useTranslation('sidebar');
  const { showChatbar, toggleChatbar } = useUI();
  const {
    conversations,
    selectedConversation,
    selectConversation,
    addConversation,
    deleteConversation,
    searchTerm,
    setSearchTerm,
    filteredConversations,
  } = useConversations();
  const { defaultModelId, models, temperature, systemPrompt } = useSettings();

  const [isCreating, setIsCreating] = useState(false);

  if (!showChatbar) {
    return (
      <button
        className="fixed left-0 top-1/2 z-50 h-12 w-8 -translate-y-1/2 rounded-r-md border-r border-t border-b border-neutral-300 bg-white text-neutral-700 hover:bg-neutral-100 dark:border-neutral-700 dark:bg-[#2F2F2F] dark:text-neutral-200 dark:hover:bg-neutral-800"
        onClick={toggleChatbar}
      >
        <IconChevronRight size={18} className="ml-1" />
      </button>
    );
  }

  const handleNewConversation = () => {
    const defaultModel = models.find((m) => m.id === defaultModelId) || models[0];
    if (!defaultModel) return;

    const newConversation: Conversation = {
      id: uuidv4(),
      name: t('New Conversation') || 'New Conversation',
      messages: [],
      model: defaultModel,
      prompt: systemPrompt || '',
      temperature: temperature || 0.5,
      folderId: null,
    };

    addConversation(newConversation);
    selectConversation(newConversation.id);
    setIsCreating(false);
  };

  const handleSelectConversation = (conversationId: string) => {
    selectConversation(conversationId);
  };

  const handleDeleteConversation = (conversationId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (window.confirm(t('Are you sure you want to delete this conversation?') || 'Delete this conversation?')) {
      deleteConversation(conversationId);
    }
  };

  const displayConversations = searchTerm ? filteredConversations : conversations;

  return (
    <div className="relative flex h-full w-[260px] flex-col border-r border-neutral-300 bg-white dark:border-neutral-700 dark:bg-[#2F2F2F]">
      {/* Header */}
      <div className="flex items-center justify-between p-3 border-b border-neutral-300 dark:border-neutral-700">
        <span className="text-sm font-semibold text-neutral-900 dark:text-neutral-100">
          {t('Conversations') || 'Conversations'}
        </span>
        <div className="flex items-center gap-1">
          <button
            className="rounded p-1 hover:bg-neutral-100 dark:hover:bg-neutral-800"
            onClick={handleNewConversation}
            title={t('New conversation') || 'New conversation'}
          >
            <IconPlus size={18} />
          </button>
          <button
            className="rounded p-1 hover:bg-neutral-100 dark:hover:bg-neutral-800"
            onClick={toggleChatbar}
            title={t('Close sidebar') || 'Close sidebar'}
          >
            <IconX size={18} />
          </button>
        </div>
      </div>

      {/* Search */}
      <div className="p-3">
        <input
          type="text"
          placeholder={t('Search conversations...') || 'Search conversations...'}
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="w-full rounded border border-neutral-300 bg-white px-3 py-2 text-sm text-neutral-900 placeholder-neutral-500 focus:border-neutral-500 focus:outline-none dark:border-neutral-600 dark:bg-[#212121] dark:text-neutral-100 dark:placeholder-neutral-400"
        />
      </div>

      {/* Conversation List */}
      <div className="flex-1 overflow-y-auto">
        {displayConversations.length === 0 ? (
          <div className="p-4 text-center text-sm text-neutral-500">
            {searchTerm
              ? t('No conversations found') || 'No conversations found'
              : t('No conversations yet') || 'No conversations yet'}
          </div>
        ) : (
          <div className="space-y-1 p-2">
            {displayConversations.map((conversation) => (
              <div
                key={conversation.id}
                className={`group flex items-center gap-2 rounded p-2 cursor-pointer hover:bg-neutral-100 dark:hover:bg-neutral-800 ${
                  selectedConversation?.id === conversation.id
                    ? 'bg-neutral-100 dark:bg-neutral-800'
                    : ''
                }`}
                onClick={() => handleSelectConversation(conversation.id)}
              >
                <IconMessage size={16} className="shrink-0 text-neutral-600 dark:text-neutral-400" />
                <span className="flex-1 truncate text-sm text-neutral-900 dark:text-neutral-100">
                  {conversation.name}
                </span>
                <button
                  className="shrink-0 rounded p-1 opacity-0 hover:bg-neutral-200 group-hover:opacity-100 dark:hover:bg-neutral-700"
                  onClick={(e) => handleDeleteConversation(conversation.id, e)}
                  title={t('Delete') || 'Delete'}
                >
                  <IconTrash size={14} className="text-neutral-600 dark:text-neutral-400" />
                </button>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Footer with settings info */}
      <div className="border-t border-neutral-300 p-3 text-xs text-neutral-500 dark:border-neutral-700">
        <div className="truncate">
          Model: {models.find((m) => m.id === defaultModelId)?.name || 'None'}
        </div>
        <div>Temp: {temperature}</div>
      </div>
    </div>
  );
}
