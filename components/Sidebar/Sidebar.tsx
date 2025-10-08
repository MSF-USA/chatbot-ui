'use client';

import { useState, useEffect, useRef } from 'react';
import { useTranslations } from 'next-intl';
import { useSession } from 'next-auth/react';
import Image from 'next/image';
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
  IconMenu2,
  IconSearch,
} from '@tabler/icons-react';
import { PiSidebarSimple } from 'react-icons/pi';
import { useUI } from '@/lib/hooks/ui/useUI';
import { useConversations } from '@/lib/hooks/conversation/useConversations';
import { useSettings } from '@/lib/hooks/settings/useSettings';
import { Conversation } from '@/types/chat';
import { Prompt } from '@/types/prompt';
import { v4 as uuidv4 } from 'uuid';
import Modal from '@/components/UI/Modal';
import lightTextLogo from '@/public/international_logo_black.png';
import darkTextLogo from '@/public/international_logo_white.png';

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
      onClick={() => !isEditing && !showMenu && handleSelectConversation(conversation.id)}
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
      <div ref={menuRef} className={`relative shrink-0 transition-opacity ${showMenu ? 'opacity-100' : 'opacity-0 group-hover:opacity-100'}`}>
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
              <IconDots size={14} className="text-neutral-600 dark:text-neutral-400" />
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
                <IconEdit size={14} className="text-neutral-600 dark:text-neutral-400" />
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
                    <IconFolder size={14} className="text-neutral-600 dark:text-neutral-400" />
                    {t('Move to folder')}
                  </span>
                  {showFolderSubmenu ? (
                    <IconChevronDown size={14} className="text-neutral-600 dark:text-neutral-400" />
                  ) : (
                    <IconChevronRight size={14} className="text-neutral-600 dark:text-neutral-400" />
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
                      {!conversation.folderId && <IconCheck size={12} className="shrink-0" />}
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
                        {conversation.folderId === folder.id && <IconCheck size={12} className="shrink-0" />}
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
  const { defaultModelId, models, temperature, systemPrompt, prompts, addPrompt, updatePrompt, deletePrompt } = useSettings();

  const [collapsedFolders, setCollapsedFolders] = useState<Set<string>>(new Set());
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
    const defaultModel = models.find((m) => m.id === defaultModelId) || models[0];
    if (!defaultModel) return;

    // Enable agent mode by default if the model has agentId
    const modelWithAgent = defaultModel?.id === 'gpt-4o' && defaultModel.agentId ? {
      ...defaultModel,
      agentEnabled: true,
      agentId: defaultModel.agentId
    } : defaultModel;

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
    const cleanName = name.replace(/\(.*?\)/g, '').replace(/[^a-zA-Z\s]/g, '').replace(/\s+/g, ' ').trim();
    const names = cleanName.split(' ');
    const firstInitial = names[0] ? names[0][0].toUpperCase() : '';
    const lastInitial = names.length > 1 ? names[names.length - 1][0].toUpperCase() : '';
    return firstInitial + lastInitial;
  };

  if (!showChatbar) {
    return (
      <div className="fixed left-0 top-0 z-50 h-full w-14 flex flex-col border-r border-neutral-300 bg-white dark:border-neutral-700 dark:bg-[#171717] transition-all duration-300 ease-in-out">
        {/* Top section with icons */}
        <div className="flex flex-col items-center pt-2 space-y-2">
          {/* Expand sidebar button */}
          <button
            className="p-2 rounded-lg text-neutral-700 hover:bg-neutral-100 dark:text-neutral-200 dark:hover:bg-neutral-800 transition-colors"
            onClick={toggleChatbar}
            title="Open sidebar"
          >
            <PiSidebarSimple size={24} />
          </button>

          {/* New conversation button */}
          <button
            className="p-2 rounded-lg text-neutral-700 hover:bg-neutral-100 dark:text-neutral-200 dark:hover:bg-neutral-800 transition-colors"
            onClick={handleNewConversation}
            title={t('New conversation')}
          >
            <IconPlus size={24} />
          </button>
        </div>

        {/* Bottom section with settings */}
        <div className="mt-auto pb-4 flex flex-col items-center">
          <button
            className="p-2 rounded-lg hover:bg-neutral-100 dark:hover:bg-neutral-800 transition-colors"
            onClick={() => setIsSettingsOpen(true)}
            title={t('Settings')}
          >
            {session?.user?.displayName ? (
              <div
                className="rounded-full bg-[#D7211E] h-8 w-8 flex items-center justify-center text-white font-semibold"
                style={{ fontSize: '12px' }}
              >
                {getInitials(session.user.displayName)}
              </div>
            ) : (
              <IconSettings size={24} className="text-neutral-700 dark:text-neutral-200" />
            )}
          </button>
        </div>
      </div>
    );
  }

  const handleNewPrompt = () => {
    setPromptModalId(null);
    setPromptModalName('');
    setPromptModalDescription('');
    setPromptModalContent('');
    setIsPromptModalOpen(true);
  };

  const handleSavePromptModal = () => {
    const defaultModel = models.find((m) => m.id === defaultModelId) || models[0];
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

  const handleRenameConversation = (conversationId: string, newName: string) => {
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

  const displayConversations = searchTerm ? filteredConversations : conversations;

  // Group conversations by folder
  const conversationsInFolders = displayConversations.filter((c) => c.folderId);
  const conversationsWithoutFolder = displayConversations.filter((c) => !c.folderId);

  const folderGroups = folders.map((folder) => ({
    folder,
    conversations: conversationsInFolders.filter((c) => c.folderId === folder.id),
  }));

  return (
    <div className="fixed left-0 top-0 z-50 h-full w-[260px] flex flex-col border-r border-neutral-300 bg-white dark:border-neutral-700 dark:bg-[#171717] transition-all duration-300 ease-in-out overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between px-3 py-2 border-b border-neutral-300 dark:border-neutral-700 min-w-[260px]">
        <Image
          src={theme === 'dark' ? darkTextLogo : lightTextLogo}
          alt="MSF Logo"
          priority
          style={{
            maxWidth: '75px',
            height: 'auto',
          }}
        />
        <button
          className="p-1 hover:bg-neutral-100 dark:hover:bg-neutral-800 rounded text-black dark:text-white"
          onClick={toggleChatbar}
          title="Close sidebar"
        >
          <PiSidebarSimple size={22} />
        </button>
      </div>

      {/* Action buttons */}
      <div className="px-3 py-2 border-b border-neutral-300 dark:border-neutral-700 min-w-[260px] space-y-1">
        <button
          className="flex items-center gap-2 w-full rounded-lg px-3 py-2 text-sm font-medium text-neutral-900 hover:bg-neutral-100 dark:text-white dark:hover:bg-neutral-800"
          onClick={handleNewConversation}
        >
          <IconPlus size={16} />
          <span>{t('New chat')}</span>
        </button>
        <button
          className="flex items-center gap-2 w-full rounded-lg px-3 py-2 text-sm text-neutral-900 hover:bg-neutral-100 dark:text-white dark:hover:bg-neutral-800"
          onClick={() => setIsSearchModalOpen(true)}
        >
          <IconSearch size={16} />
          <span>{t('Search chats')}</span>
          <span className="ml-auto text-xs text-neutral-500 dark:text-neutral-400">⌘K</span>
        </button>
        <button
          className="flex items-center gap-2 w-full rounded-lg px-3 py-2 text-sm text-neutral-900 hover:bg-neutral-100 dark:text-white dark:hover:bg-neutral-800"
          onClick={() => setIsPromptsListOpen(true)}
        >
          <IconMessage size={16} />
          <span>{t('Prompts')}</span>
        </button>
        <button
          className="flex items-center gap-2 w-full rounded-lg px-3 py-2 text-sm text-neutral-900 hover:bg-neutral-100 dark:text-white dark:hover:bg-neutral-800"
          onClick={handleCreateFolder}
        >
          <IconFolderPlus size={16} />
          <span>{t('New folder')}</span>
        </button>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto min-w-[260px]">
        {(
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
                <div
                  key={folder.id}
                  className="mb-2"
                  onDrop={(e) => handleDrop(e, folder.id)}
                  onDragOver={(e) => handleDragOver(e, folder.id)}
                  onDragLeave={handleDragLeave}
                >
                  {/* Folder header */}
                  <div className={`group flex items-center gap-2 rounded p-2 hover:bg-neutral-100 dark:hover:bg-neutral-800 ${
                    dragOverFolderId === folder.id ? 'bg-blue-100 dark:bg-blue-900/30 ring-2 ring-blue-400' : ''
                  }`}>
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
                          handleRenameConversation={handleRenameConversation}
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
          )
        )}
      </div>

      {/* Footer with user initials/settings */}
      <div className="border-t border-neutral-300 dark:border-neutral-700 min-w-[260px]">
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
              <span className="text-xs text-gray-500 dark:text-gray-400 ml-2 font-normal">(Optional)</span>
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
              <span className="font-medium">Tip:</span> Use <code className="px-1.5 py-0.5 bg-gray-200 dark:bg-gray-700 rounded text-gray-700 dark:text-gray-300">{'{{variable}}'}</code> for dynamic content. Example: <code className="px-1.5 py-0.5 bg-gray-200 dark:bg-gray-700 rounded text-gray-700 dark:text-gray-300">{'{{name}}'}</code> is a <code className="px-1.5 py-0.5 bg-gray-200 dark:bg-gray-700 rounded text-gray-700 dark:text-gray-300">{'{{adjective}}'}</code> <code className="px-1.5 py-0.5 bg-gray-200 dark:bg-gray-700 rounded text-gray-700 dark:text-gray-300">{'{{noun}}'}</code>
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
      {isSearchModalOpen && (
        <div
          className="fixed inset-0 z-[100] flex items-start justify-center bg-black/50 pt-20"
          onClick={() => {
            setIsSearchModalOpen(false);
            setSearchTerm('');
          }}
        >
          <div
            className="w-full max-w-2xl bg-white dark:bg-[#212121] rounded-lg shadow-xl overflow-hidden"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Search input */}
            <div className="flex items-center gap-3 px-4 py-3 border-b border-neutral-300 dark:border-neutral-700">
              <IconSearch size={20} className="text-neutral-500 dark:text-neutral-400" />
              <input
                type="text"
                placeholder={t('Search...')}
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                autoFocus
                className="flex-1 bg-transparent text-neutral-900 dark:text-white placeholder-neutral-500 dark:placeholder-neutral-400 focus:outline-none"
              />
              <button
                onClick={() => {
                  setIsSearchModalOpen(false);
                  setSearchTerm('');
                }}
                className="text-neutral-500 hover:text-neutral-700 dark:text-neutral-400 dark:hover:text-neutral-300"
              >
                <IconX size={20} />
              </button>
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
                      className="w-full flex items-center gap-3 px-4 py-3 hover:bg-neutral-100 dark:hover:bg-neutral-800 transition-colors text-left"
                      onClick={() => {
                        selectConversation(conversation.id);
                        setIsSearchModalOpen(false);
                        setSearchTerm('');
                      }}
                    >
                      <IconMessage size={16} className="text-neutral-600 dark:text-neutral-400 shrink-0" />
                      <span className="flex-1 truncate text-sm text-neutral-900 dark:text-neutral-100">
                        {conversation.name}
                      </span>
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Prompts List Modal */}
      {isPromptsListOpen && (
        <div
          className="fixed inset-0 z-[100] flex items-start justify-center bg-black/50 pt-20"
          onClick={() => setIsPromptsListOpen(false)}
        >
          <div
            className="w-full max-w-2xl bg-white dark:bg-[#212121] rounded-lg shadow-xl overflow-hidden"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div className="flex items-center justify-between px-4 py-3 border-b border-neutral-300 dark:border-neutral-700">
              <h3 className="text-lg font-semibold text-neutral-900 dark:text-white">{t('Prompts')}</h3>
              <div className="flex items-center gap-2">
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
                <button
                  onClick={() => setIsPromptsListOpen(false)}
                  className="text-neutral-500 hover:text-neutral-700 dark:text-neutral-400 dark:hover:text-neutral-300"
                >
                  <IconX size={20} />
                </button>
              </div>
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
                      className="group flex items-start gap-3 px-4 py-3 hover:bg-neutral-100 dark:hover:bg-neutral-800 transition-colors"
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
                          <IconEdit size={16} className="text-neutral-600 dark:text-neutral-400" />
                        </button>
                        <button
                          className="rounded p-1.5 hover:bg-neutral-200 dark:hover:bg-neutral-700"
                          onClick={(e) => handleDeletePrompt(prompt.id, e)}
                          title={t('Delete')}
                        >
                          <IconTrash size={16} className="text-neutral-600 dark:text-neutral-400" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
