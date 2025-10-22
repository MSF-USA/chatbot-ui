'use client';

import {
  IconCheck,
  IconChevronDown,
  IconChevronRight,
  IconDots,
  IconEdit,
  IconFolder,
  IconFolderPlus,
  IconLogout,
  IconMenu2,
  IconMessage,
  IconPlus,
  IconSearch,
  IconSettings,
  IconTrash,
  IconX,
} from '@tabler/icons-react';
import { signOut, useSession } from 'next-auth/react';
import { useEffect, useRef, useState } from 'react';
import { PiSidebarSimple } from 'react-icons/pi';

import { useTranslations } from 'next-intl';
import Image from 'next/image';

import { useConversations } from '@/lib/hooks/conversation/useConversations';
import { useSettings } from '@/lib/hooks/settings/useSettings';
import { useUI } from '@/lib/hooks/ui/useUI';

import { Conversation } from '@/types/chat';
import { Prompt } from '@/types/prompt';

import Modal from '@/components/UI/Modal';

import lightTextLogo from '@/public/international_logo_black.png';
import darkTextLogo from '@/public/international_logo_white.png';
import { v4 as uuidv4 } from 'uuid';

/**
 * Conversation item component with dropdown menu for folder management
 */
function ConversationItem({
  conversation,
  selectedConversation,
  handleSelectConversation,
  handleDeleteConversation,
  handleMoveToFolder,
  handleRenameConversation,
  folders,
  t,
}: {
  conversation: Conversation;
  selectedConversation: Conversation | null;
  handleSelectConversation: (id: string) => void;
  handleDeleteConversation: (id: string, e: React.MouseEvent) => void;
  handleMoveToFolder: (conversationId: string, folderId: string | null) => void;
  handleRenameConversation: (id: string, currentName: string) => void;
  folders: any[];
  t: any;
}) {
  const [showMenu, setShowMenu] = useState(false);
  const [showFolderSubmenu, setShowFolderSubmenu] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [editingName, setEditingName] = useState(conversation.name);
  const menuRef = useRef<HTMLDivElement>(null);

  // Close menu when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setShowMenu(false);
        setShowFolderSubmenu(false);
      }
    };

    if (showMenu) {
      document.addEventListener('mousedown', handleClickOutside);
      return () => {
        document.removeEventListener('mousedown', handleClickOutside);
      };
    }
  }, [showMenu]);

  const handleDragStart = (e: React.DragEvent) => {
    e.dataTransfer.effectAllowed = 'move';
    e.dataTransfer.setData('conversationId', conversation.id);
  };

  const handleSaveName = () => {
    if (editingName.trim()) {
      handleRenameConversation(conversation.id, editingName.trim());
    }
    setIsEditing(false);
  };

  return (
    <div
      draggable={!isEditing}
      onDragStart={handleDragStart}
      className={`group flex items-center gap-2 rounded p-2 cursor-pointer ${
        selectedConversation?.id === conversation.id
          ? 'bg-neutral-200 dark:bg-neutral-700'
          : ''
      }`}
      onClick={() =>
        !isEditing && !showMenu && handleSelectConversation(conversation.id)
      }
    >
      {isEditing ? (
        <input
          type="text"
          value={editingName}
          onChange={(e) => setEditingName(e.target.value)}
          onBlur={handleSaveName}
          onKeyDown={(e) => {
            if (e.key === 'Enter') {
              handleSaveName();
            } else if (e.key === 'Escape') {
              setEditingName(conversation.name);
              setIsEditing(false);
            }
          }}
          autoFocus
          onClick={(e) => e.stopPropagation()}
          className="flex-1 rounded border border-neutral-300 bg-white px-2 py-1 text-sm text-neutral-900 focus:border-neutral-500 focus:outline-none dark:border-neutral-600 dark:bg-[#212121] dark:text-neutral-100"
        />
      ) : (
        <span className="flex-1 truncate text-sm text-neutral-900 dark:text-neutral-100">
          {conversation.name}
        </span>
      )}
      <div
        ref={menuRef}
        className={`relative shrink-0 transition-opacity ${showMenu ? 'opacity-100' : 'opacity-0 group-hover:opacity-100'}`}
      >
        {!isEditing && (
          <>
            <button
              className="rounded p-1 hover:bg-neutral-200 dark:hover:bg-neutral-700"
              onClick={(e) => {
                e.stopPropagation();
                setShowMenu(!showMenu);
              }}
              title={t('Options')}
            >
              <IconDots
                size={14}
                className="text-neutral-600 dark:text-neutral-400"
              />
            </button>
          </>
        )}

        {/* Dropdown menu */}
        {showMenu && (
          <div
            className="absolute right-0 top-full mt-1 z-10 w-48 rounded-md border border-neutral-300 bg-white shadow-lg dark:border-neutral-600 dark:bg-[#212121]"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="p-1">
              {/* Rename option */}
              <button
                className="w-full text-left px-3 py-2 text-sm text-neutral-900 hover:bg-neutral-100 dark:text-neutral-100 dark:hover:bg-neutral-800 rounded flex items-center gap-2"
                onClick={(e) => {
                  e.stopPropagation();
                  setShowMenu(false);
                  setIsEditing(true);
                  setEditingName(conversation.name);
                }}
              >
                <IconEdit
                  size={14}
                  className="text-neutral-600 dark:text-neutral-400"
                />
                {t('Rename')}
              </button>

              {/* Move to folder option with submenu */}
              <div>
                <button
                  className="w-full text-left px-3 py-2 text-sm text-neutral-900 hover:bg-neutral-100 dark:text-neutral-100 dark:hover:bg-neutral-800 rounded flex items-center justify-between"
                  onClick={(e) => {
                    e.stopPropagation();
                    setShowFolderSubmenu(!showFolderSubmenu);
                  }}
                >
                  <span className="flex items-center gap-2">
                    <IconFolder
                      size={14}
                      className="text-neutral-600 dark:text-neutral-400"
                    />
                    {t('Move to folder')}
                  </span>
                  {showFolderSubmenu ? (
                    <IconChevronDown
                      size={14}
                      className="text-neutral-600 dark:text-neutral-400"
                    />
                  ) : (
                    <IconChevronRight
                      size={14}
                      className="text-neutral-600 dark:text-neutral-400"
                    />
                  )}
                </button>

                {/* Folder submenu - inline expansion */}
                {showFolderSubmenu && (
                  <div className="pl-4 mt-1">
                    <button
                      className="w-full text-left px-3 py-2 text-xs text-neutral-900 hover:bg-neutral-100 dark:text-neutral-100 dark:hover:bg-neutral-800 rounded flex items-center justify-between"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleMoveToFolder(conversation.id, null);
                        setShowMenu(false);
                        setShowFolderSubmenu(false);
                      }}
                    >
                      {t('No folder')}
                      {!conversation.folderId && (
                        <IconCheck size={12} className="shrink-0" />
                      )}
                    </button>
                    {folders.map((folder) => (
                      <button
                        key={folder.id}
                        className="w-full text-left px-3 py-2 text-xs text-neutral-900 hover:bg-neutral-100 dark:text-neutral-100 dark:hover:bg-neutral-800 rounded flex items-center justify-between"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleMoveToFolder(conversation.id, folder.id);
                          setShowMenu(false);
                          setShowFolderSubmenu(false);
                        }}
                      >
                        <span className="truncate">{folder.name}</span>
                        {conversation.folderId === folder.id && (
                          <IconCheck size={12} className="shrink-0" />
                        )}
                      </button>
                    ))}
                  </div>
                )}
              </div>

              {/* Delete option */}
              <button
                className="w-full text-left px-3 py-2 text-sm text-red-600 hover:bg-neutral-100 dark:text-red-400 dark:hover:bg-neutral-800 rounded flex items-center gap-2"
                onClick={(e) => {
                  e.stopPropagation();
                  setShowMenu(false);
                  handleDeleteConversation(conversation.id, e);
                }}
              >
                <IconTrash size={14} />
                {t('Delete')}
              </button>
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
  } = useConversations();
  const {
    defaultModelId,
    models,
    temperature,
    systemPrompt,
    prompts,
    addPrompt,
    updatePrompt,
    deletePrompt,
  } = useSettings();

  const [collapsedFolders, setCollapsedFolders] = useState<Set<string>>(
    new Set(),
  );
  const [editingFolderId, setEditingFolderId] = useState<string | null>(null);
  const [editingFolderName, setEditingFolderName] = useState('');
  const [editingPromptId, setEditingPromptId] = useState<string | null>(null);
  const [editingPromptName, setEditingPromptName] = useState('');
  const [editingPromptContent, setEditingPromptContent] = useState('');
  const [dragOverFolderId, setDragOverFolderId] = useState<string | null>(null);
  const [isPromptModalOpen, setIsPromptModalOpen] = useState(false);
  const [promptModalName, setPromptModalName] = useState('');
  const [promptModalDescription, setPromptModalDescription] = useState('');
  const [promptModalContent, setPromptModalContent] = useState('');
  const [promptModalId, setPromptModalId] = useState<string | null>(null);
  const [isSearchModalOpen, setIsSearchModalOpen] = useState(false);
  const [isPromptsListOpen, setIsPromptsListOpen] = useState(false);
  const [userPhotoUrl, setUserPhotoUrl] = useState<string | null>(null);
  const [isLoadingPhoto, setIsLoadingPhoto] = useState(true);
  const [showUserMenu, setShowUserMenu] = useState(false);
  const userMenuRef = useRef<HTMLDivElement>(null);

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

  // Close user menu when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        userMenuRef.current &&
        !userMenuRef.current.contains(event.target as Node)
      ) {
        setShowUserMenu(false);
      }
    };

    if (showUserMenu) {
      document.addEventListener('mousedown', handleClickOutside);
      return () => {
        document.removeEventListener('mousedown', handleClickOutside);
      };
    }
  }, [showUserMenu]);

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

    // Enable agent mode by default if the model has agentId
    const modelWithAgent =
      defaultModel?.id === 'gpt-4o' && defaultModel.agentId
        ? {
            ...defaultModel,
            agentEnabled: true,
            agentId: defaultModel.agentId,
          }
        : defaultModel;

    const newConversation: Conversation = {
      id: uuidv4(),
      name: t('New Conversation'),
      messages: [],
      model: modelWithAgent,
      prompt: systemPrompt || '',
      temperature: temperature || 0.5,
      folderId: null,
    };

    addConversation(newConversation);
    selectConversation(newConversation.id);
  };

  const getInitials = (name: string) => {
    const cleanName = name
      .replace(/\(.*?\)/g, '')
      .replace(/[^a-zA-Z\s]/g, '')
      .replace(/\s+/g, ' ')
      .trim();
    const names = cleanName.split(' ');
    const firstInitial = names[0] ? names[0][0].toUpperCase() : '';
    const lastInitial =
      names.length > 1 ? names[names.length - 1][0].toUpperCase() : '';
    return firstInitial + lastInitial;
  };

  const handleNewPrompt = () => {
    setPromptModalId(null);
    setPromptModalName('');
    setPromptModalDescription('');
    setPromptModalContent('');
    setIsPromptModalOpen(true);
  };

  const handleSavePromptModal = () => {
    const defaultModel =
      models.find((m) => m.id === defaultModelId) || models[0];
    if (!defaultModel) return;

    if (promptModalId) {
      // Update existing prompt
      updatePrompt(promptModalId, {
        name: promptModalName.trim() || t('New Prompt'),
        description: promptModalDescription,
        content: promptModalContent.trim(),
      });
    } else {
      // Create new prompt
      const newPrompt: Prompt = {
        id: uuidv4(),
        name: promptModalName.trim() || t('New Prompt'),
        description: promptModalDescription,
        content: promptModalContent.trim(),
        model: defaultModel,
        folderId: null,
      };
      addPrompt(newPrompt);
    }

    setIsPromptModalOpen(false);
    setIsPromptsListOpen(true);
    setPromptModalId(null);
    setPromptModalName('');
    setPromptModalDescription('');
    setPromptModalContent('');
  };

  const handleDeletePrompt = (promptId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (window.confirm(t('Are you sure you want to delete this prompt?'))) {
      deletePrompt(promptId);
    }
  };

  const handleSavePrompt = () => {
    if (editingPromptId && editingPromptName.trim()) {
      updatePrompt(editingPromptId, {
        name: editingPromptName.trim(),
        content: editingPromptContent,
      });
    }
    setEditingPromptId(null);
    setEditingPromptName('');
    setEditingPromptContent('');
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

  const handleDrop = (e: React.DragEvent, folderId: string | null) => {
    e.preventDefault();
    e.stopPropagation();
    const conversationId = e.dataTransfer.getData('conversationId');
    if (conversationId) {
      handleMoveToFolder(conversationId, folderId);
    }
    setDragOverFolderId(null);
  };

  const handleDragOver = (e: React.DragEvent, folderId: string | null) => {
    e.preventDefault();
    e.stopPropagation();
    setDragOverFolderId(folderId);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragOverFolderId(null);
  };

  const displayConversations = searchTerm
    ? filteredConversations
    : conversations;

  // Group conversations by folder
  const conversationsInFolders = displayConversations.filter((c) => c.folderId);
  const conversationsWithoutFolder = displayConversations.filter(
    (c) => !c.folderId,
  );

  const folderGroups = folders.map((folder) => ({
    folder,
    conversations: conversationsInFolders.filter(
      (c) => c.folderId === folder.id,
    ),
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
        className={`fixed left-0 top-0 z-50 h-full flex flex-col border-r border-neutral-300 bg-white dark:border-neutral-700 dark:bg-[#171717] transition-all duration-300 ease-in-out overflow-hidden w-[260px] ${
          showChatbar
            ? 'translate-x-0'
            : '-translate-x-full md:translate-x-0 md:w-14'
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
          className={`py-2 space-y-1 border-b transition-all duration-300 ${showChatbar ? 'px-3 border-neutral-300 dark:border-neutral-700' : 'px-0 border-transparent'}`}
        >
          <button
            className={`flex items-center w-full rounded-lg text-sm font-medium text-neutral-900 hover:bg-neutral-100 dark:text-white dark:hover:bg-neutral-800 transition-all duration-300 ${showChatbar ? 'gap-2 px-3 py-2' : 'justify-center px-3 py-4'}`}
            onClick={handleNewConversation}
            title={t('New chat')}
          >
            <IconPlus size={20} stroke={2} className="shrink-0" />
            <span
              className={`whitespace-nowrap transition-all duration-300 ${showChatbar ? 'opacity-100 w-auto' : 'opacity-0 w-0 overflow-hidden'}`}
            >
              {t('New chat')}
            </span>
          </button>
          <div
            className={`transition-all duration-300 space-y-1 ${showChatbar ? 'opacity-100 max-h-[500px]' : 'opacity-0 max-h-0 overflow-hidden'}`}
          >
            <button
              className="flex items-center gap-2 w-full rounded-lg px-3 py-2 text-sm text-neutral-900 hover:bg-neutral-100 dark:text-white dark:hover:bg-neutral-800"
              onClick={() => setIsSearchModalOpen(true)}
              title={t('Search chats')}
            >
              <IconSearch size={16} />
              <span className="whitespace-nowrap">{t('Search chats')}</span>
              <span className="ml-auto text-xs text-neutral-500 dark:text-neutral-400 whitespace-nowrap">
                ⌘K
              </span>
            </button>
            <button
              className="flex items-center gap-2 w-full rounded-lg px-3 py-2 text-sm text-neutral-900 hover:bg-neutral-100 dark:text-white dark:hover:bg-neutral-800"
              onClick={() => setIsPromptsListOpen(true)}
              title={t('Prompts')}
            >
              <IconMessage size={16} />
              <span className="whitespace-nowrap">{t('Prompts')}</span>
            </button>
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
                : t('No conversations yet')}
            </div>
          ) : (
            <div className="space-y-1 p-2">
              {/* Render folders */}
              {folderGroups.map(
                ({ folder, conversations: folderConversations }) => (
                  <div
                    key={folder.id}
                    className="mb-2"
                    onDrop={(e) => handleDrop(e, folder.id)}
                    onDragOver={(e) => handleDragOver(e, folder.id)}
                    onDragLeave={handleDragLeave}
                  >
                    {/* Folder header */}
                    <div
                      className={`group flex items-center gap-2 rounded p-2 hover:bg-neutral-100 dark:hover:bg-neutral-800 ${
                        dragOverFolderId === folder.id
                          ? 'bg-blue-100 dark:bg-blue-900/30 ring-2 ring-blue-400'
                          : ''
                      }`}
                    >
                      <button
                        onClick={() => toggleFolder(folder.id)}
                        className="shrink-0"
                      >
                        {collapsedFolders.has(folder.id) ? (
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
                              onClick={() =>
                                handleRenameFolder(folder.id, folder.name)
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
                              onClick={(e) => handleDeleteFolder(folder.id, e)}
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
                            handleRenameConversation={handleRenameConversation}
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
                  onDrop={(e) => handleDrop(e, null)}
                  onDragOver={(e) => handleDragOver(e, null)}
                  onDragLeave={handleDragLeave}
                >
                  {conversationsWithoutFolder.map((conversation) => (
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
        <div
          ref={userMenuRef}
          className={`border-t transition-all duration-300 relative ${showChatbar ? 'border-neutral-300 dark:border-neutral-700' : 'border-transparent'}`}
        >
          <button
            className={`flex w-full items-center p-3 text-sm text-neutral-700 transition-all duration-300 hover:bg-neutral-100 dark:text-neutral-200 dark:hover:bg-neutral-800 ${showChatbar ? 'gap-3' : 'justify-center'}`}
            onClick={() => setShowUserMenu(!showUserMenu)}
            title={session?.user?.displayName || t('Settings')}
          >
            {isLoadingPhoto ? (
              <div
                className={`rounded-full bg-gray-300 dark:bg-gray-600 flex items-center justify-center shrink-0 animate-pulse transition-all duration-300 ${showChatbar ? 'h-10 w-10' : 'h-8 w-8'}`}
              >
                <div
                  className={`border-2 border-gray-400 dark:border-gray-500 border-t-transparent rounded-full animate-spin ${showChatbar ? 'w-5 h-5' : 'w-4 h-4'}`}
                />
              </div>
            ) : userPhotoUrl ? (
              <img
                src={userPhotoUrl}
                alt={session?.user?.displayName || 'User'}
                className={`rounded-full object-cover shrink-0 transition-all duration-300 ${showChatbar ? 'h-10 w-10' : 'h-8 w-8'}`}
              />
            ) : session?.user?.displayName ? (
              <div
                className={`rounded-full bg-[#D7211E] flex items-center justify-center text-white font-semibold shrink-0 transition-all duration-300 ${showChatbar ? 'h-10 w-10' : 'h-8 w-8'}`}
                style={{ fontSize: showChatbar ? '16px' : '14px' }}
              >
                {getInitials(session.user.displayName)}
              </div>
            ) : (
              <IconSettings size={18} />
            )}
            <span
              className={`whitespace-nowrap transition-all duration-300 flex-1 text-left truncate ${showChatbar ? 'opacity-100 w-auto' : 'opacity-0 w-0 overflow-hidden'}`}
            >
              {session?.user?.displayName || t('Settings')}
            </span>
            {showChatbar && (
              <IconChevronDown
                size={16}
                className={`transition-transform shrink-0 ${showUserMenu ? 'rotate-180' : ''}`}
              />
            )}
          </button>

          {/* User dropdown menu */}
          {showUserMenu && showChatbar && (
            <div className="absolute bottom-full left-0 right-0 mb-1 mx-2 rounded-lg border border-neutral-300 bg-white shadow-lg dark:border-neutral-600 dark:bg-[#212121] overflow-hidden">
              <button
                className="w-full text-left px-4 py-3 text-sm text-neutral-900 hover:bg-neutral-100 dark:text-neutral-100 dark:hover:bg-neutral-800 flex items-center gap-3"
                onClick={() => {
                  setShowUserMenu(false);
                  setIsSettingsOpen(true);
                }}
              >
                <IconSettings size={18} className="shrink-0" />
                <span>{t('Settings')}</span>
              </button>
              <button
                className="w-full text-left px-4 py-3 text-sm text-neutral-900 hover:bg-neutral-100 dark:text-neutral-100 dark:hover:bg-neutral-800 flex items-center gap-3"
                onClick={() => {
                  setShowUserMenu(false);
                  signOut();
                }}
              >
                <IconLogout size={18} className="shrink-0" />
                <span>{t('Sign Out')}</span>
              </button>
            </div>
          )}
        </div>

        {/* Prompt Modal */}
        <Modal
          isOpen={isPromptModalOpen}
          onClose={() => {
            setIsPromptModalOpen(false);
            setIsPromptsListOpen(true);
          }}
          title={promptModalId ? t('Edit Prompt') : t('New Prompt')}
          size="lg"
          footer={
            <div className="flex justify-end gap-2">
              <button
                className="px-4 py-2 text-sm font-medium text-neutral-700 hover:bg-neutral-100 dark:text-neutral-300 dark:hover:bg-neutral-800 rounded-md"
                onClick={() => {
                  setIsPromptModalOpen(false);
                  setIsPromptsListOpen(true);
                }}
              >
                {t('Cancel')}
              </button>
              <button
                className="px-4 py-2 text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 rounded-md"
                onClick={handleSavePromptModal}
              >
                {t('Save')}
              </button>
            </div>
          }
        >
          <div className="space-y-6">
            <div>
              <label className="block text-sm font-bold mb-2 text-black dark:text-white">
                {t('Name')}
              </label>
              <input
                type="text"
                value={promptModalName}
                onChange={(e) => setPromptModalName(e.target.value)}
                placeholder={t('A name for your prompt_')}
                className="w-full rounded-lg border border-neutral-200 dark:border-neutral-600 bg-transparent px-4 py-3 text-neutral-900 dark:text-neutral-100 focus:outline-none"
                autoFocus
              />
            </div>
            <div>
              <label className="block text-sm font-bold mb-2 text-black dark:text-white">
                {t('Description')}
                <span className="text-xs text-gray-500 dark:text-gray-400 ml-2 font-normal">
                  (Optional)
                </span>
              </label>
              <textarea
                value={promptModalDescription}
                onChange={(e) => setPromptModalDescription(e.target.value)}
                placeholder={t('A description for your prompt_')}
                rows={3}
                className="w-full rounded-lg border border-neutral-200 dark:border-neutral-600 bg-transparent px-4 py-3 text-neutral-900 dark:text-neutral-100 focus:outline-none resize-none"
              />
            </div>
            <div>
              <label className="block text-sm font-bold mb-2 text-black dark:text-white">
                {t('Prompt')}
              </label>
              <div className="mb-2 text-xs text-gray-500 dark:text-gray-400 bg-gray-50 dark:bg-gray-800/40 rounded-lg px-3 py-2 border border-gray-200 dark:border-gray-700">
                <span className="font-medium">Tip:</span> Use{' '}
                <code className="px-1.5 py-0.5 bg-gray-200 dark:bg-gray-700 rounded text-gray-700 dark:text-gray-300">
                  {'{{variable}}'}
                </code>{' '}
                for dynamic content. Example:{' '}
                <code className="px-1.5 py-0.5 bg-gray-200 dark:bg-gray-700 rounded text-gray-700 dark:text-gray-300">
                  {'{{name}}'}
                </code>{' '}
                is a{' '}
                <code className="px-1.5 py-0.5 bg-gray-200 dark:bg-gray-700 rounded text-gray-700 dark:text-gray-300">
                  {'{{adjective}}'}
                </code>{' '}
                <code className="px-1.5 py-0.5 bg-gray-200 dark:bg-gray-700 rounded text-gray-700 dark:text-gray-300">
                  {'{{noun}}'}
                </code>
              </div>
              <textarea
                value={promptModalContent}
                onChange={(e) => setPromptModalContent(e.target.value)}
                placeholder="Enter your prompt template..."
                rows={10}
                className="w-full rounded-lg border border-neutral-200 dark:border-neutral-600 bg-transparent px-4 py-3 text-neutral-900 dark:text-neutral-100 focus:outline-none resize-none font-mono"
              />
            </div>
          </div>
        </Modal>

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

        {/* Prompts List Modal */}
        <Modal
          isOpen={isPromptsListOpen}
          onClose={() => setIsPromptsListOpen(false)}
          className="z-[100]"
          closeWithButton={false}
          size="lg"
          contentClassName="-m-6"
        >
          {/* Header */}
          <div className="flex items-center justify-between px-6 py-4 pr-12 border-b border-neutral-300 dark:border-neutral-700">
            <h3 className="text-lg font-semibold text-neutral-900 dark:text-white">
              {t('Prompts')}
            </h3>
            <button
              onClick={() => {
                setPromptModalId(null);
                setPromptModalName('');
                setPromptModalDescription('');
                setPromptModalContent('');
                setIsPromptsListOpen(false);
                setIsPromptModalOpen(true);
              }}
              className="flex items-center gap-2 px-3 py-1.5 text-sm rounded-lg bg-neutral-900 text-white hover:bg-neutral-700 dark:bg-white dark:text-neutral-900 dark:hover:bg-neutral-200"
            >
              <IconPlus size={16} />
              {t('New prompt')}
            </button>
          </div>

          {/* Prompts list */}
          <div className="max-h-[60vh] overflow-y-auto">
            {prompts.length === 0 ? (
              <div className="p-8 text-center text-neutral-500 dark:text-neutral-400">
                {t('No prompts yet')}
              </div>
            ) : (
              <div className="py-2">
                {prompts.map((prompt) => (
                  <div
                    key={prompt.id}
                    className="group flex items-start gap-3 px-6 py-3 hover:bg-neutral-100 dark:hover:bg-neutral-800 transition-colors"
                  >
                    <div className="flex-1 min-w-0">
                      <div className="text-sm font-medium text-neutral-900 dark:text-neutral-100">
                        {prompt.name}
                      </div>
                      {prompt.content && (
                        <div className="text-xs text-neutral-500 dark:text-neutral-400 mt-1 line-clamp-2">
                          {prompt.content}
                        </div>
                      )}
                    </div>
                    <div className="shrink-0 flex gap-1 opacity-0 group-hover:opacity-100">
                      <button
                        className="rounded p-1.5 hover:bg-neutral-200 dark:hover:bg-neutral-700"
                        onClick={(e) => {
                          e.stopPropagation();
                          setPromptModalId(prompt.id);
                          setPromptModalName(prompt.name);
                          setPromptModalDescription(prompt.description || '');
                          setPromptModalContent(prompt.content);
                          setIsPromptsListOpen(false);
                          setIsPromptModalOpen(true);
                        }}
                        title={t('Edit')}
                      >
                        <IconEdit
                          size={16}
                          className="text-neutral-600 dark:text-neutral-400"
                        />
                      </button>
                      <button
                        className="rounded p-1.5 hover:bg-neutral-200 dark:hover:bg-neutral-700"
                        onClick={(e) => handleDeletePrompt(prompt.id, e)}
                        title={t('Delete')}
                      >
                        <IconTrash
                          size={16}
                          className="text-neutral-600 dark:text-neutral-400"
                        />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </Modal>
      </div>
    </>
  );
}
