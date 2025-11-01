'use client';

import {
  IconBolt,
  IconChevronDown,
  IconChevronRight,
  IconEdit,
  IconFolder,
  IconFolderPlus,
  IconLogout,
  IconMessage,
  IconPlus,
  IconSearch,
  IconSettings,
  IconTrash,
} from '@tabler/icons-react';
import { signOut, useSession } from 'next-auth/react';
import { useEffect, useRef, useState } from 'react';
import { PiSidebarSimple } from 'react-icons/pi';

import { useTranslations } from 'next-intl';
import Image from 'next/image';

import { useConversations } from '@/client/hooks/conversation/useConversations';
import { useSettings } from '@/client/hooks/settings/useSettings';
import { useFolderManagement } from '@/client/hooks/ui/useFolderManagement';
import { useUI } from '@/client/hooks/ui/useUI';

import { Conversation } from '@/types/chat';

import { CustomizationsModal } from '@/components/QuickActions/CustomizationsModal';
import Modal from '@/components/UI/Modal';

import { ConversationItem } from './ConversationItem';
import { UserMenu } from './UserMenu';

import lightTextLogo from '@/public/international_logo_black.png';
import darkTextLogo from '@/public/international_logo_white.png';
import { v4 as uuidv4 } from 'uuid';

/**
 * Sidebar with conversation list - migrated to use Zustand stores
 */
export function Sidebar() {
  const t = useTranslations();
  const { data: session } = useSession();
  const { showChatbar, toggleChatbar, setIsSettingsOpen, theme } = useUI();
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
    isLoaded,
  } = useConversations();
  const { defaultModelId, models, temperature, systemPrompt } = useSettings();

  const [isSearchModalOpen, setIsSearchModalOpen] = useState(false);
  const [isCustomizationsOpen, setIsCustomizationsOpen] = useState(false);
  const [userPhotoUrl, setUserPhotoUrl] = useState<string | null>(null);
  const [isLoadingPhoto, setIsLoadingPhoto] = useState(true);

  // Determine which conversations to display (search results or all)
  const displayConversations = searchTerm
    ? filteredConversations
    : conversations;

  // Folder management
  const folderManager = useFolderManagement({
    items: displayConversations,
  });

  // Fetch user photo on mount (with localStorage caching)
  useEffect(() => {
    const fetchUserPhoto = async () => {
      if (!session?.user?.id) {
        setIsLoadingPhoto(false);
        return;
      }

      // Check if we have a cached photo for this user
      const cacheKey = `user_photo_${session.user.id}`;
      const cachedPhoto = localStorage.getItem(cacheKey);

      if (cachedPhoto) {
        setUserPhotoUrl(cachedPhoto);
        setIsLoadingPhoto(false);
        return;
      }

      setIsLoadingPhoto(true);
      try {
        const response = await fetch('/api/user/profile');
        if (response.ok) {
          const profile = await response.json();
          if (profile.photoUrl) {
            setUserPhotoUrl(profile.photoUrl);
            // Cache the photo URL in localStorage
            localStorage.setItem(cacheKey, profile.photoUrl);
          }
        }
      } catch (error) {
        console.error('Failed to fetch user photo:', error);
      } finally {
        setIsLoadingPhoto(false);
      }
    };

    fetchUserPhoto();
  }, [session?.user?.id]);

  // Keyboard shortcut for search (⌘K / Ctrl+K)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        setIsSearchModalOpen(true);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  const handleNewConversation = () => {
    const defaultModel =
      models.find((m) => m.id === defaultModelId) || models[0];
    if (!defaultModel) return;

    // Set default mode configuration
    const modelWithDefaults = {
      ...defaultModel,
      azureAgentMode: false, // Azure Agent Mode OFF by default (privacy-first)
      searchModeEnabled: true, // Search Mode ON by default
      ...(defaultModel.agentId && { agentId: defaultModel.agentId }),
    };

    const newConversation: Conversation = {
      id: uuidv4(),
      name: t('New Conversation'),
      messages: [],
      model: modelWithDefaults,
      prompt: systemPrompt || '',
      temperature: temperature || 0.5,
      folderId: null,
    };

    addConversation(newConversation);
    selectConversation(newConversation.id);
  };

  const handleSelectConversation = (conversationId: string) => {
    selectConversation(conversationId);
  };

  const handleDeleteConversation = (
    conversationId: string,
    e: React.MouseEvent,
  ) => {
    e.stopPropagation();
    if (
      window.confirm(t('Are you sure you want to delete this conversation?'))
    ) {
      deleteConversation(conversationId);
    }
  };

  const handleCreateFolder = () => {
    folderManager.handleCreateFolder('chat', t('New folder'), addFolder);
  };

  const handleCreatePromptFolder = () => {
    folderManager.handleCreateFolder('prompt', t('New folder'), addFolder);
  };

  const handleMoveToFolder = (
    conversationId: string,
    folderId: string | null,
  ) => {
    updateConversation(conversationId, { folderId });
  };

  const handleRenameConversation = (
    conversationId: string,
    newName: string,
  ) => {
    updateConversation(conversationId, { name: newName });
  };

  // Group conversations by folder using the hook's grouped items
  const conversationsByFolder = folderManager.groupedItems.byFolder;
  const conversationsWithoutFolder = folderManager.groupedItems.unfolderedItems;

  const folderGroups = folders.map((folder) => ({
    folder,
    conversations: conversationsByFolder[folder.id] || [],
  }));

  return (
    <>
      {/* Mobile backdrop */}
      {showChatbar && (
        <div
          className="md:hidden fixed inset-0 bg-black/50 z-40 transition-opacity"
          onClick={toggleChatbar}
        />
      )}

      {/* Sidebar - hidden on mobile by default, overlay when open */}
      <div
        className={`fixed left-0 top-0 z-50 h-full flex flex-col border-r border-neutral-300 bg-white dark:border-neutral-700 dark:bg-[#171717] transition-all duration-300 ease-in-out w-[260px] ${
          showChatbar
            ? 'translate-x-0 overflow-hidden'
            : '-translate-x-full md:translate-x-0 md:w-14 overflow-visible'
        }`}
      >
        {/* Header */}
        <div
          className={`flex items-center px-3 py-2 border-b transition-all duration-300 ${showChatbar ? 'justify-between border-neutral-300 dark:border-neutral-700' : 'justify-center border-transparent'}`}
        >
          {showChatbar && (
            <Image
              src={theme === 'dark' ? darkTextLogo : lightTextLogo}
              alt="MSF Logo"
              priority
              style={{
                maxWidth: '75px',
                height: 'auto',
              }}
            />
          )}
          <button
            className="p-1 hover:bg-neutral-100 dark:hover:bg-neutral-800 rounded text-black dark:text-white"
            onClick={toggleChatbar}
            title={showChatbar ? 'Collapse sidebar' : 'Expand sidebar'}
          >
            <PiSidebarSimple size={22} />
          </button>
        </div>

        {/* Action buttons */}
        <div
          className={`border-b transition-all duration-300 ${showChatbar ? 'py-2 px-3 space-y-1 border-neutral-300 dark:border-neutral-700 overflow-hidden' : 'py-3 px-0 space-y-2 border-transparent overflow-visible'}`}
        >
          <button
            className={`group relative flex items-center w-full rounded-lg text-sm font-medium text-neutral-900 hover:bg-neutral-100 dark:text-white dark:hover:bg-neutral-800 transition-all duration-300 ${showChatbar ? 'gap-2 px-3 py-2' : 'justify-center px-2 py-3'}`}
            onClick={handleNewConversation}
            title={t('New chat')}
          >
            <IconPlus size={20} stroke={2} className="shrink-0" />
            <span
              className={`whitespace-nowrap transition-all duration-300 ${showChatbar ? 'opacity-100 w-auto' : 'opacity-0 w-0 overflow-hidden'}`}
            >
              {t('New chat')}
            </span>
            {!showChatbar && (
              <span className="absolute left-full ml-2 px-2 py-1 bg-neutral-900 dark:bg-neutral-100 text-white dark:text-neutral-900 text-xs rounded opacity-0 group-hover:opacity-100 pointer-events-none whitespace-nowrap z-[100] transition-opacity shadow-lg">
                {t('New chat')}
              </span>
            )}
          </button>

          {/* Search button - visible in both states */}
          <button
            className={`group relative flex items-center w-full rounded-lg text-sm text-neutral-900 hover:bg-neutral-100 dark:text-white dark:hover:bg-neutral-800 transition-all duration-300 ${showChatbar ? 'gap-2 px-3 py-2' : 'justify-center px-2 py-3'}`}
            onClick={() => setIsSearchModalOpen(true)}
            title={t('Search chats')}
          >
            <IconSearch size={showChatbar ? 16 : 20} className="shrink-0" />
            <span
              className={`whitespace-nowrap transition-all duration-300 ${showChatbar ? 'opacity-100 w-auto' : 'opacity-0 w-0 overflow-hidden'}`}
            >
              {t('Search chats')}
            </span>
            {showChatbar && (
              <span className="ml-auto text-xs text-neutral-500 dark:text-neutral-400 whitespace-nowrap">
                ⌘K
              </span>
            )}
            {!showChatbar && (
              <span className="absolute left-full ml-2 px-2 py-1 bg-neutral-900 dark:bg-neutral-100 text-white dark:text-neutral-900 text-xs rounded opacity-0 group-hover:opacity-100 pointer-events-none whitespace-nowrap z-[100] transition-opacity shadow-lg">
                {t('Search chats')}
              </span>
            )}
          </button>

          {/* Quick Actions button - visible in both states */}
          <button
            className={`group relative flex items-center w-full rounded-lg text-sm text-neutral-900 hover:bg-neutral-100 dark:text-white dark:hover:bg-neutral-800 transition-all duration-300 ${showChatbar ? 'gap-2 px-3 py-2' : 'justify-center px-2 py-3'}`}
            onClick={() => setIsCustomizationsOpen(true)}
            title="Quick Actions"
          >
            <IconBolt size={showChatbar ? 16 : 20} className="shrink-0" />
            <span
              className={`whitespace-nowrap transition-all duration-300 ${showChatbar ? 'opacity-100 w-auto' : 'opacity-0 w-0 overflow-hidden'}`}
            >
              Quick Actions
            </span>
            {!showChatbar && (
              <span className="absolute left-full ml-2 px-2 py-1 bg-neutral-900 dark:bg-neutral-100 text-white dark:text-neutral-900 text-xs rounded opacity-0 group-hover:opacity-100 pointer-events-none whitespace-nowrap z-[100] transition-opacity shadow-lg">
                Quick Actions
              </span>
            )}
          </button>

          {/* New folder button - only in expanded state */}
          <div
            className={`transition-all duration-300 ${showChatbar ? 'opacity-100 max-h-[100px]' : 'opacity-0 max-h-0 overflow-hidden'}`}
          >
            <button
              className="flex items-center gap-2 w-full rounded-lg px-3 py-2 text-sm text-neutral-900 hover:bg-neutral-100 dark:text-white dark:hover:bg-neutral-800"
              onClick={handleCreateFolder}
              title={t('New folder')}
            >
              <IconFolderPlus size={16} />
              <span className="whitespace-nowrap">{t('New folder')}</span>
            </button>
          </div>
        </div>

        {/* Content */}
        <div
          className={`flex-1 overflow-y-auto transition-all duration-300 ${showChatbar ? 'opacity-100' : 'opacity-0 pointer-events-none'}`}
        >
          {displayConversations.length === 0 ? (
            <div className="p-4 text-center text-sm text-neutral-500">
              {searchTerm
                ? t('No conversations found')
                : isLoaded
                  ? t('No conversations yet')
                  : null}
            </div>
          ) : (
            <div className="space-y-1 p-2">
              {/* Render folders */}
              {folderGroups.map(
                ({ folder, conversations: folderConversations }) => (
                  <div
                    key={folder.id}
                    className="mb-2"
                    onDrop={(e) =>
                      folderManager.handleDrop(
                        e,
                        folder.id,
                        handleMoveToFolder,
                        'conversationId',
                      )
                    }
                    onDragOver={(e) =>
                      folderManager.handleDragOver(e, folder.id)
                    }
                    onDragLeave={folderManager.handleDragLeave}
                  >
                    {/* Folder header */}
                    <div
                      className={`group flex items-center gap-2 rounded p-2 hover:bg-neutral-100 dark:hover:bg-neutral-800 ${
                        folderManager.dragOverFolderId === folder.id
                          ? 'bg-blue-100 dark:bg-blue-900/30 ring-2 ring-blue-400'
                          : ''
                      }`}
                    >
                      <button
                        onClick={() => folderManager.toggleFolder(folder.id)}
                        className="shrink-0"
                      >
                        {folderManager.collapsedFolders.has(folder.id) ? (
                          <IconChevronRight
                            size={16}
                            className="text-neutral-600 dark:text-neutral-400"
                          />
                        ) : (
                          <IconChevronDown
                            size={16}
                            className="text-neutral-600 dark:text-neutral-400"
                          />
                        )}
                      </button>
                      <IconFolder
                        size={16}
                        className="shrink-0 text-neutral-600 dark:text-neutral-400"
                      />
                      {folderManager.editingFolderId === folder.id &&
                      !isCustomizationsOpen ? (
                        <input
                          ref={folderManager.editInputRef}
                          type="text"
                          value={folderManager.editingFolderName}
                          onChange={(e) =>
                            folderManager.setEditingFolderName(e.target.value)
                          }
                          onBlur={() =>
                            folderManager.handleSaveFolderName(updateFolder)
                          }
                          onKeyDown={(e) => {
                            if (e.key === 'Enter') {
                              folderManager.handleSaveFolderName(updateFolder);
                            } else if (e.key === 'Escape') {
                              folderManager.setEditingFolderId(null);
                              folderManager.setEditingFolderName('');
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
                        {folderManager.editingFolderId !== folder.id && (
                          <>
                            <button
                              className="rounded p-1 hover:bg-neutral-200 dark:hover:bg-neutral-700"
                              onClick={() =>
                                folderManager.handleRenameFolder(
                                  folder.id,
                                  folder.name,
                                )
                              }
                              title={t('Rename')}
                            >
                              <IconEdit
                                size={14}
                                className="text-neutral-600 dark:text-neutral-400"
                              />
                            </button>
                            <button
                              className="rounded p-1 hover:bg-neutral-200 dark:hover:bg-neutral-700"
                              onClick={(e) =>
                                folderManager.handleDeleteFolder(
                                  folder.id,
                                  e,
                                  deleteFolder,
                                  t(
                                    'Are you sure you want to delete this folder?',
                                  ),
                                )
                              }
                              title={t('Delete')}
                            >
                              <IconTrash
                                size={14}
                                className="text-neutral-600 dark:text-neutral-400"
                              />
                            </button>
                          </>
                        )}
                      </div>
                    </div>

                    {/* Folder conversations */}
                    {!folderManager.collapsedFolders.has(folder.id) && (
                      <div className="ml-6 space-y-1 mt-1">
                        {folderConversations
                          .slice()
                          .reverse()
                          .map((conversation) => (
                            <ConversationItem
                              key={conversation.id}
                              conversation={conversation}
                              selectedConversation={selectedConversation}
                              handleSelectConversation={
                                handleSelectConversation
                              }
                              handleDeleteConversation={
                                handleDeleteConversation
                              }
                              handleMoveToFolder={handleMoveToFolder}
                              handleRenameConversation={
                                handleRenameConversation
                              }
                              folders={folders}
                              t={t}
                            />
                          ))}
                      </div>
                    )}
                  </div>
                ),
              )}

              {/* Conversations without folder */}
              {conversationsWithoutFolder.length > 0 && (
                <div
                  onDrop={(e) =>
                    folderManager.handleDrop(
                      e,
                      null,
                      handleMoveToFolder,
                      'conversationId',
                    )
                  }
                  onDragOver={(e) => folderManager.handleDragOver(e, null)}
                  onDragLeave={folderManager.handleDragLeave}
                >
                  {conversationsWithoutFolder
                    .slice()
                    .reverse()
                    .map((conversation) => (
                      <ConversationItem
                        key={conversation.id}
                        conversation={conversation}
                        selectedConversation={selectedConversation}
                        handleSelectConversation={handleSelectConversation}
                        handleDeleteConversation={handleDeleteConversation}
                        handleMoveToFolder={handleMoveToFolder}
                        handleRenameConversation={handleRenameConversation}
                        folders={folders}
                        t={t}
                      />
                    ))}
                </div>
              )}
            </div>
          )}
        </div>

        {/* Footer with user menu */}
        <UserMenu
          showChatbar={showChatbar}
          onSettingsClick={() => setIsSettingsOpen(true)}
          t={t}
          userPhotoUrl={userPhotoUrl}
          isLoadingPhoto={isLoadingPhoto}
        />

        {/* Search Modal */}
        <Modal
          isOpen={isSearchModalOpen}
          onClose={() => {
            setIsSearchModalOpen(false);
            setSearchTerm('');
          }}
          className="z-[100]"
          closeWithButton={false}
          size="lg"
          contentClassName="-m-6"
        >
          {/* Search input */}
          <div className="flex items-center gap-3 px-6 py-4 border-b border-neutral-300 dark:border-neutral-700">
            <IconSearch
              size={20}
              className="text-neutral-500 dark:text-neutral-400"
            />
            <input
              type="text"
              placeholder={t('Search_ellipsis')}
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              autoFocus
              className="flex-1 bg-transparent text-neutral-900 dark:text-white placeholder-neutral-500 dark:placeholder-neutral-400 focus:outline-none"
            />
          </div>

          {/* Results */}
          <div className="max-h-[60vh] overflow-y-auto">
            {filteredConversations.length === 0 && searchTerm && (
              <div className="p-8 text-center text-neutral-500 dark:text-neutral-400">
                {t('No conversations found')}
              </div>
            )}
            {filteredConversations.length > 0 && (
              <div className="py-2">
                {filteredConversations.map((conversation) => (
                  <button
                    key={conversation.id}
                    className="w-full flex items-center gap-3 px-6 py-3 hover:bg-neutral-100 dark:hover:bg-neutral-800 transition-colors text-left"
                    onClick={() => {
                      selectConversation(conversation.id);
                      setIsSearchModalOpen(false);
                      setSearchTerm('');
                    }}
                  >
                    <IconMessage
                      size={16}
                      className="text-neutral-600 dark:text-neutral-400 shrink-0"
                    />
                    <span className="flex-1 truncate text-sm text-neutral-900 dark:text-neutral-100">
                      {conversation.name}
                    </span>
                  </button>
                ))}
              </div>
            )}
          </div>
        </Modal>
      </div>

      {/* Customizations Modal */}
      <CustomizationsModal
        isOpen={isCustomizationsOpen}
        onClose={() => setIsCustomizationsOpen(false)}
      />
    </>
  );
}
