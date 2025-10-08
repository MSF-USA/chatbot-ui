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
  IconMenu2,
} from '@tabler/icons-react';
import { PiSidebarSimple } from 'react-icons/pi';
import { useUI } from '@/lib/hooks/ui/useUI';
import { useConversations } from '@/lib/hooks/conversation/useConversations';
import { useSettings } from '@/lib/hooks/settings/useSettings';
import { Conversation } from '@/types/chat';
import { Prompt } from '@/types/prompt';
import { v4 as uuidv4 } from 'uuid';
import Modal from '@/components/UI/Modal';

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
  const [isEditing, setIsEditing] = useState(false);
  const [editingName, setEditingName] = useState(conversation.name);

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
      className={`group flex items-center gap-2 rounded p-2 cursor-pointer hover:bg-neutral-100 dark:hover:bg-neutral-800 ${
        selectedConversation?.id === conversation.id
          ? 'bg-neutral-100 dark:bg-neutral-800'
          : ''
      }`}
      onClick={() => !isEditing && handleSelectConversation(conversation.id)}
    >
      <IconMessage size={16} className="shrink-0 text-neutral-600 dark:text-neutral-400" />
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
      <div className="relative shrink-0 flex gap-1 opacity-0 group-hover:opacity-100">
        {!isEditing && (
          <>
            <button
              className="rounded p-1 hover:bg-neutral-200 dark:hover:bg-neutral-700"
              onClick={(e) => {
                e.stopPropagation();
                setIsEditing(true);
                setEditingName(conversation.name);
              }}
              title={t('Rename')}
            >
              <IconEdit size={14} className="text-neutral-600 dark:text-neutral-400" />
            </button>
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
          </>
        )}

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
  const { defaultModelId, models, temperature, systemPrompt, prompts, addPrompt, updatePrompt, deletePrompt } = useSettings();

  const [activeTab, setActiveTab] = useState<Tab>(Tab.CONVERSATIONS);
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
        <div className="flex flex-col items-center pt-4 space-y-2">
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
      {/* Tabs */}
      <div className="flex border-b border-neutral-300 dark:border-neutral-700 min-w-[260px]">
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
          title="Close sidebar"
        >
          <PiSidebarSimple size={18} />
        </button>
      </div>

      {/* Header with new button */}
      <div className="flex items-center justify-between p-3 border-b border-neutral-300 dark:border-neutral-700 min-w-[260px]">
        <button
          className="flex items-center gap-2 rounded px-3 py-2 text-sm text-neutral-900 hover:bg-neutral-100 dark:text-white dark:hover:bg-neutral-800"
          onClick={activeTab === Tab.CONVERSATIONS ? handleNewConversation : handleNewPrompt}
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
      <div className="p-3 min-w-[260px]">
        <input
          type="text"
          placeholder={t('Search conversations_ellipsis')}
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="w-full rounded border border-neutral-300 bg-white px-3 py-2 text-sm text-neutral-900 placeholder-neutral-500 focus:border-neutral-500 focus:outline-none dark:border-neutral-600 dark:bg-[#212121] dark:text-neutral-100 dark:placeholder-neutral-400"
        />
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto min-w-[260px]">
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
                  className={dragOverFolderId === null ? 'bg-blue-50 dark:bg-blue-900/20 rounded' : ''}
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
        ) : prompts.length === 0 ? (
          <div className="p-4 text-center text-sm text-neutral-500">
            {t('No prompts yet')}
          </div>
        ) : (
          <div className="space-y-1 p-2">
            {prompts.map((prompt) => (
              <div
                key={prompt.id}
                className="group flex items-start gap-2 rounded p-2 cursor-pointer hover:bg-neutral-100 dark:hover:bg-neutral-800"
              >
                <IconMessage size={16} className="shrink-0 mt-1 text-neutral-600 dark:text-neutral-400" />
                {editingPromptId === prompt.id ? (
                  <div className="flex-1 space-y-2">
                    <input
                      type="text"
                      value={editingPromptName}
                      onChange={(e) => setEditingPromptName(e.target.value)}
                      placeholder={t('Prompt name')}
                      className="w-full rounded border border-neutral-300 bg-white px-2 py-1 text-sm text-neutral-900 focus:border-neutral-500 focus:outline-none dark:border-neutral-600 dark:bg-[#212121] dark:text-neutral-100"
                    />
                    <textarea
                      value={editingPromptContent}
                      onChange={(e) => setEditingPromptContent(e.target.value)}
                      placeholder={t('Prompt content')}
                      rows={3}
                      className="w-full rounded border border-neutral-300 bg-white px-2 py-1 text-sm text-neutral-900 focus:border-neutral-500 focus:outline-none dark:border-neutral-600 dark:bg-[#212121] dark:text-neutral-100"
                    />
                    <div className="flex gap-2">
                      <button
                        onClick={handleSavePrompt}
                        className="px-3 py-1 text-xs rounded bg-neutral-900 text-white hover:bg-neutral-700 dark:bg-white dark:text-neutral-900 dark:hover:bg-neutral-200"
                      >
                        {t('Save')}
                      </button>
                      <button
                        onClick={() => {
                          setEditingPromptId(null);
                          setEditingPromptName('');
                          setEditingPromptContent('');
                        }}
                        className="px-3 py-1 text-xs rounded border border-neutral-300 text-neutral-900 hover:bg-neutral-100 dark:border-neutral-600 dark:text-neutral-100 dark:hover:bg-neutral-800"
                      >
                        {t('Cancel')}
                      </button>
                    </div>
                  </div>
                ) : (
                  <>
                    <div className="flex-1 min-w-0">
                      <div className="text-sm font-medium text-neutral-900 dark:text-neutral-100 truncate">
                        {prompt.name}
                      </div>
                      {prompt.content && (
                        <div className="text-xs text-neutral-500 dark:text-neutral-400 truncate mt-0.5">
                          {prompt.content}
                        </div>
                      )}
                    </div>
                    <div className="shrink-0 flex gap-1 opacity-0 group-hover:opacity-100">
                      <button
                        className="rounded p-1 hover:bg-neutral-200 dark:hover:bg-neutral-700"
                        onClick={(e) => {
                          e.stopPropagation();
                          setPromptModalId(prompt.id);
                          setPromptModalName(prompt.name);
                          setPromptModalDescription(prompt.description || '');
                          setPromptModalContent(prompt.content);
                          setIsPromptModalOpen(true);
                        }}
                        title={t('Edit')}
                      >
                        <IconEdit size={14} className="text-neutral-600 dark:text-neutral-400" />
                      </button>
                      <button
                        className="rounded p-1 hover:bg-neutral-200 dark:hover:bg-neutral-700"
                        onClick={(e) => handleDeletePrompt(prompt.id, e)}
                        title={t('Delete')}
                      >
                        <IconTrash size={14} className="text-neutral-600 dark:text-neutral-400" />
                      </button>
                    </div>
                  </>
                )}
              </div>
            ))}
          </div>
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
        onClose={() => setIsPromptModalOpen(false)}
        title={promptModalId ? t('Edit Prompt') : t('New Prompt')}
        size="lg"
        footer={
          <div className="flex justify-end gap-2">
            <button
              className="px-4 py-2 text-sm font-medium text-neutral-700 hover:bg-neutral-100 dark:text-neutral-300 dark:hover:bg-neutral-800 rounded-md"
              onClick={() => setIsPromptModalOpen(false)}
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
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-bold text-gray-700 dark:text-gray-300 mb-2">
              {t('Name')}
            </label>
            <input
              type="text"
              value={promptModalName}
              onChange={(e) => setPromptModalName(e.target.value)}
              placeholder={t('A name for your prompt_')}
              className="w-full rounded-md border border-neutral-500 bg-white px-4 py-2 text-neutral-900 shadow focus:outline-none dark:border-neutral-800 dark:border-opacity-50 dark:bg-[#40414F] dark:text-neutral-100"
            />
          </div>
          <div>
            <label className="block text-sm font-bold text-gray-700 dark:text-gray-300 mb-2">
              {t('Description')}
            </label>
            <textarea
              value={promptModalDescription}
              onChange={(e) => setPromptModalDescription(e.target.value)}
              placeholder={t('A description for your prompt_')}
              rows={3}
              className="w-full rounded-md border border-neutral-500 bg-white px-4 py-2 text-neutral-900 shadow focus:outline-none dark:border-neutral-800 dark:border-opacity-50 dark:bg-[#40414F] dark:text-neutral-100 resize-none"
            />
          </div>
          <div>
            <label className="block text-sm font-bold text-gray-700 dark:text-gray-300 mb-2">
              {t('Prompt')}
            </label>
            <textarea
              value={promptModalContent}
              onChange={(e) => setPromptModalContent(e.target.value)}
              placeholder={t('Prompt content_ Use {{}} to denote a variable_ Ex: {{name}} is a {{adjective}} {{noun}}')}
              rows={10}
              className="w-full rounded-md border border-neutral-500 bg-white px-4 py-2 text-neutral-900 shadow focus:outline-none dark:border-neutral-800 dark:border-opacity-50 dark:bg-[#40414F] dark:text-neutral-100 resize-none"
            />
          </div>
        </div>
      </Modal>
    </div>
  );
}
