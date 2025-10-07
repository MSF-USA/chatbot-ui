'use client';

import { useState } from 'react';
import { useTranslations } from 'next-intl';
import { useSession } from 'next-auth/react';
import {
  IconPlus,
  IconFolderPlus,
  IconX,
  IconChevronRight,
  IconMessage,
  IconTrash,
  IconEdit,
  IconSettings,
} from '@tabler/icons-react';
import { useUI } from '@/lib/hooks/ui/useUI';
import { useConversations } from '@/lib/hooks/conversation/useConversations';
import { useSettings } from '@/lib/hooks/settings/useSettings';
import { Conversation } from '@/types/chat';
import { v4 as uuidv4 } from 'uuid';

enum Tab {
  CONVERSATIONS = 'CONVERSATIONS',
  PROMPTS = 'PROMPTS',
}

/**
 * Sidebar with conversation list - migrated to use Zustand stores
 */
export function Sidebar() {
  const t = useTranslations();
  const { data: session } = useSession();
  const { showChatbar, toggleChatbar, setIsSettingsOpen } = useUI();
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
  const { defaultModelId, models, temperature, systemPrompt, prompts } = useSettings();

  const [activeTab, setActiveTab] = useState<Tab>(Tab.CONVERSATIONS);
  const [isCreating, setIsCreating] = useState(false);

  if (!showChatbar) {
    return (
      <button
        className="fixed left-0 top-1/2 z-50 h-12 w-8 -translate-y-1/2 rounded-r-md border-r border-t border-b border-neutral-300 bg-white text-neutral-700 hover:bg-neutral-100 dark:border-neutral-700 dark:bg-[#171717] dark:text-neutral-200 dark:hover:bg-neutral-800"
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
      name: t('New Conversation'),
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
    if (window.confirm(t('Are you sure you want to delete this conversation?'))) {
      deleteConversation(conversationId);
    }
  };

  const getInitials = (name: string) => {
    const cleanName = name.replace(/\(.*?\)/g, '').replace(/[^a-zA-Z\s]/g, '').replace(/\s+/g, ' ').trim();
    const names = cleanName.split(' ');
    const firstInitial = names[0] ? names[0][0].toUpperCase() : '';
    const lastInitial = names.length > 1 ? names[names.length - 1][0].toUpperCase() : '';
    return firstInitial + lastInitial;
  };

  const displayConversations = searchTerm ? filteredConversations : conversations;

  return (
    <div className="relative flex h-full w-[260px] flex-col border-r border-neutral-300 bg-white dark:border-neutral-700 dark:bg-[#171717]">
      {/* Tabs */}
      <div className="flex border-b border-neutral-300 dark:border-neutral-700">
        <button
          className={`flex-1 p-3 text-sm font-semibold text-black dark:text-white ${
            activeTab === Tab.CONVERSATIONS
              ? 'border-b-2 border-black dark:border-white'
              : 'border-b-2 border-transparent'
          }`}
          onClick={() => setActiveTab(Tab.CONVERSATIONS)}
        >
          {t('Conversations')}
        </button>
        <button
          className={`flex-1 p-3 text-sm font-semibold text-black dark:text-white ${
            activeTab === Tab.PROMPTS
              ? 'border-b-2 border-black dark:border-white'
              : 'border-b-2 border-transparent'
          }`}
          onClick={() => setActiveTab(Tab.PROMPTS)}
        >
          {t('Prompts')}
        </button>
        <button
          className="p-3 hover:bg-neutral-100 dark:hover:bg-neutral-800 text-black dark:text-white"
          onClick={toggleChatbar}
          title={t('Close sidebar')}
        >
          <IconX size={18} />
        </button>
      </div>

      {/* Header with new button */}
      <div className="flex items-center justify-between p-3 border-b border-neutral-300 dark:border-neutral-700">
        <button
          className="flex items-center gap-2 rounded px-3 py-2 text-sm hover:bg-neutral-100 dark:hover:bg-neutral-800"
          onClick={handleNewConversation}
        >
          <IconPlus size={18} />
          <span>{activeTab === Tab.CONVERSATIONS ? t('New conversation') : t('New prompt')}</span>
        </button>
      </div>

      {/* Search */}
      <div className="p-3">
        <input
          type="text"
          placeholder={t('Search conversations_ellipsis')}
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="w-full rounded border border-neutral-300 bg-white px-3 py-2 text-sm text-neutral-900 placeholder-neutral-500 focus:border-neutral-500 focus:outline-none dark:border-neutral-600 dark:bg-[#212121] dark:text-neutral-100 dark:placeholder-neutral-400"
        />
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto">
        {activeTab === Tab.CONVERSATIONS ? (
          displayConversations.length === 0 ? (
            <div className="p-4 text-center text-sm text-neutral-500">
              {searchTerm
                ? t('No conversations found')
                : t('No conversations yet')}
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
                    title={t('Delete')}
                  >
                    <IconTrash size={14} className="text-neutral-600 dark:text-neutral-400" />
                  </button>
                </div>
              ))}
            </div>
          )
        ) : (
          <div className="p-4 text-center text-sm text-neutral-500">
            {prompts.length === 0 ? t('No prompts yet') : 'Prompts coming soon'}
          </div>
        )}
      </div>

      {/* Footer with user initials/settings */}
      <div className="border-t border-neutral-300 dark:border-neutral-700">
        <button
          className="flex w-full items-center gap-3 p-3 text-sm text-neutral-700 transition-colors duration-200 hover:bg-neutral-100 dark:text-neutral-200 dark:hover:bg-neutral-800"
          onClick={() => setIsSettingsOpen(true)}
        >
          {session?.user?.displayName ? (
            <div
              className="rounded-full bg-[#D7211E] h-10 w-10 flex items-center justify-center text-white font-semibold"
              style={{ fontSize: '16px' }}
            >
              {getInitials(session.user.displayName)}
            </div>
          ) : (
            <IconSettings size={18} />
          )}
          <span>{t('Settings')}</span>
        </button>
      </div>
    </div>
  );
}
