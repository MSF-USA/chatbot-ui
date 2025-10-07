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
  IconFolder,
  IconChevronDown,
  IconCheck,
  IconDots,
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
 * Conversation item component with dropdown menu for folder management
 */
function ConversationItem({
  conversation,
  selectedConversation,
  handleSelectConversation,
  handleDeleteConversation,
  handleMoveToFolder,
  folders,
  t,
}: {
  conversation: Conversation;
  selectedConversation: Conversation | null;
  handleSelectConversation: (id: string) => void;
  handleDeleteConversation: (id: string, e: React.MouseEvent) => void;
  handleMoveToFolder: (conversationId: string, folderId: string | null) => void;
  folders: any[];
  t: any;
}) {
  const [showMenu, setShowMenu] = useState(false);

  return (
    <div
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
      <div className="relative shrink-0 flex gap-1 opacity-0 group-hover:opacity-100">
        <button
          className="rounded p-1 hover:bg-neutral-200 dark:hover:bg-neutral-700"
          onClick={(e) => {
            e.stopPropagation();
            setShowMenu(!showMenu);
          }}
          title={t('Move to folder')}
        >
          <IconDots size={14} className="text-neutral-600 dark:text-neutral-400" />
        </button>
        <button
          className="rounded p-1 hover:bg-neutral-200 dark:hover:bg-neutral-700"
          onClick={(e) => handleDeleteConversation(conversation.id, e)}
          title={t('Delete')}
        >
          <IconTrash size={14} className="text-neutral-600 dark:text-neutral-400" />
        </button>

        {/* Dropdown menu */}
        {showMenu && (
          <div
            className="absolute right-0 top-full mt-1 z-10 w-48 rounded-md border border-neutral-300 bg-white shadow-lg dark:border-neutral-600 dark:bg-[#212121]"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="p-1">
              <button
                className="w-full text-left px-3 py-2 text-sm text-neutral-900 hover:bg-neutral-100 dark:text-neutral-100 dark:hover:bg-neutral-800 rounded"
                onClick={(e) => {
                  e.stopPropagation();
                  handleMoveToFolder(conversation.id, null);
                  setShowMenu(false);
                }}
              >
                {t('No folder')}
                {!conversation.folderId && <IconCheck size={14} className="inline ml-2" />}
              </button>
              {folders.map((folder) => (
                <button
                  key={folder.id}
                  className="w-full text-left px-3 py-2 text-sm text-neutral-900 hover:bg-neutral-100 dark:text-neutral-100 dark:hover:bg-neutral-800 rounded"
                  onClick={(e) => {
                    e.stopPropagation();
                    handleMoveToFolder(conversation.id, folder.id);
                    setShowMenu(false);
                  }}
                >
                  {folder.name}
                  {conversation.folderId === folder.id && <IconCheck size={14} className="inline ml-2" />}
                </button>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
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
    updateConversation,
    searchTerm,
    setSearchTerm,
    filteredConversations,
    folders,
    addFolder,
    updateFolder,
    deleteFolder,
  } = useConversations();
  const { defaultModelId, models, temperature, systemPrompt, prompts } = useSettings();

  const [activeTab, setActiveTab] = useState<Tab>(Tab.CONVERSATIONS);
  const [collapsedFolders, setCollapsedFolders] = useState<Set<string>>(new Set());
  const [editingFolderId, setEditingFolderId] = useState<string | null>(null);
  const [editingFolderName, setEditingFolderName] = useState('');

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

  const handleCreateFolder = () => {
    const newFolder = {
      id: uuidv4(),
      name: t('New folder'),
      type: 'chat' as const,
    };
    addFolder(newFolder);
    setEditingFolderId(newFolder.id);
    setEditingFolderName(newFolder.name);
  };

  const handleRenameFolder = (folderId: string, currentName: string) => {
    setEditingFolderId(folderId);
    setEditingFolderName(currentName);
  };

  const handleSaveFolderName = () => {
    if (editingFolderId && editingFolderName.trim()) {
      updateFolder(editingFolderId, editingFolderName.trim());
    }
    setEditingFolderId(null);
    setEditingFolderName('');
  };

  const handleDeleteFolder = (folderId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (window.confirm(t('Are you sure you want to delete this folder?'))) {
      deleteFolder(folderId);
    }
  };

  const toggleFolder = (folderId: string) => {
    setCollapsedFolders((prev) => {
      const next = new Set(prev);
      if (next.has(folderId)) {
        next.delete(folderId);
      } else {
        next.add(folderId);
      }
      return next;
    });
  };

  const handleMoveToFolder = (conversationId: string, folderId: string | null) => {
    updateConversation(conversationId, { folderId });
  };

  const getInitials = (name: string) => {
    const cleanName = name.replace(/\(.*?\)/g, '').replace(/[^a-zA-Z\s]/g, '').replace(/\s+/g, ' ').trim();
    const names = cleanName.split(' ');
    const firstInitial = names[0] ? names[0][0].toUpperCase() : '';
    const lastInitial = names.length > 1 ? names[names.length - 1][0].toUpperCase() : '';
    return firstInitial + lastInitial;
  };

  const displayConversations = searchTerm ? filteredConversations : conversations;

  // Group conversations by folder
  const conversationsInFolders = displayConversations.filter((c) => c.folderId);
  const conversationsWithoutFolder = displayConversations.filter((c) => !c.folderId);

  const folderGroups = folders.map((folder) => ({
    folder,
    conversations: conversationsInFolders.filter((c) => c.folderId === folder.id),
  }));

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
          className="flex items-center gap-2 rounded px-3 py-2 text-sm text-neutral-900 hover:bg-neutral-100 dark:text-white dark:hover:bg-neutral-800"
          onClick={handleNewConversation}
        >
          <IconPlus size={18} className="text-neutral-900 dark:text-white" />
          <span>{activeTab === Tab.CONVERSATIONS ? t('New conversation') : t('New prompt')}</span>
        </button>
        {activeTab === Tab.CONVERSATIONS && (
          <button
            className="rounded p-2 text-neutral-900 hover:bg-neutral-100 dark:text-white dark:hover:bg-neutral-800"
            onClick={handleCreateFolder}
            title={t('New folder')}
          >
            <IconFolderPlus size={18} className="text-neutral-900 dark:text-white" />
          </button>
        )}
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
              {/* Render folders */}
              {folderGroups.map(({ folder, conversations: folderConversations }) => (
                <div key={folder.id} className="mb-2">
                  {/* Folder header */}
                  <div className="group flex items-center gap-2 rounded p-2 hover:bg-neutral-100 dark:hover:bg-neutral-800">
                    <button
                      onClick={() => toggleFolder(folder.id)}
                      className="shrink-0"
                    >
                      {collapsedFolders.has(folder.id) ? (
                        <IconChevronRight size={16} className="text-neutral-600 dark:text-neutral-400" />
                      ) : (
                        <IconChevronDown size={16} className="text-neutral-600 dark:text-neutral-400" />
                      )}
                    </button>
                    <IconFolder size={16} className="shrink-0 text-neutral-600 dark:text-neutral-400" />
                    {editingFolderId === folder.id ? (
                      <input
                        type="text"
                        value={editingFolderName}
                        onChange={(e) => setEditingFolderName(e.target.value)}
                        onBlur={handleSaveFolderName}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') {
                            handleSaveFolderName();
                          } else if (e.key === 'Escape') {
                            setEditingFolderId(null);
                            setEditingFolderName('');
                          }
                        }}
                        autoFocus
                        className="flex-1 rounded border border-neutral-300 bg-white px-2 py-1 text-sm text-neutral-900 focus:border-neutral-500 focus:outline-none dark:border-neutral-600 dark:bg-[#212121] dark:text-neutral-100"
                      />
                    ) : (
                      <span className="flex-1 truncate text-sm font-medium text-neutral-900 dark:text-neutral-100">
                        {folder.name} ({folderConversations.length})
                      </span>
                    )}
                    <div className="shrink-0 flex gap-1 opacity-0 group-hover:opacity-100">
                      {editingFolderId !== folder.id && (
                        <>
                          <button
                            className="rounded p-1 hover:bg-neutral-200 dark:hover:bg-neutral-700"
                            onClick={() => handleRenameFolder(folder.id, folder.name)}
                            title={t('Rename')}
                          >
                            <IconEdit size={14} className="text-neutral-600 dark:text-neutral-400" />
                          </button>
                          <button
                            className="rounded p-1 hover:bg-neutral-200 dark:hover:bg-neutral-700"
                            onClick={(e) => handleDeleteFolder(folder.id, e)}
                            title={t('Delete')}
                          >
                            <IconTrash size={14} className="text-neutral-600 dark:text-neutral-400" />
                          </button>
                        </>
                      )}
                    </div>
                  </div>

                  {/* Folder conversations */}
                  {!collapsedFolders.has(folder.id) && (
                    <div className="ml-6 space-y-1 mt-1">
                      {folderConversations.map((conversation) => (
                        <ConversationItem
                          key={conversation.id}
                          conversation={conversation}
                          selectedConversation={selectedConversation}
                          handleSelectConversation={handleSelectConversation}
                          handleDeleteConversation={handleDeleteConversation}
                          handleMoveToFolder={handleMoveToFolder}
                          folders={folders}
                          t={t}
                        />
                      ))}
                    </div>
                  )}
                </div>
              ))}

              {/* Conversations without folder */}
              {conversationsWithoutFolder.length > 0 && (
                <div>
                  {conversationsWithoutFolder.map((conversation) => (
                    <ConversationItem
                      key={conversation.id}
                      conversation={conversation}
                      selectedConversation={selectedConversation}
                      handleSelectConversation={handleSelectConversation}
                      handleDeleteConversation={handleDeleteConversation}
                      handleMoveToFolder={handleMoveToFolder}
                      folders={folders}
                      t={t}
                    />
                  ))}
                </div>
              )}
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
