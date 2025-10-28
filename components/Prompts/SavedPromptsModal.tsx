'use client';

import {
  IconChevronDown,
  IconChevronRight,
  IconEdit,
  IconFolder,
  IconFolderPlus,
  IconPlus,
  IconSearch,
  IconTrash,
  IconX,
} from '@tabler/icons-react';
import { useEffect, useRef, useState } from 'react';

import { useTranslations } from 'next-intl';

import { FolderInterface } from '@/types/folder';
import { Prompt } from '@/types/prompt';

import { PromptItem } from './PromptItem';

interface SavedPromptsModalProps {
  isOpen: boolean;
  onClose: () => void;
  prompts: Prompt[];
  folders: FolderInterface[];
  collapsedFolders: Set<string>;
  onToggleFolder: (folderId: string) => void;
  onCreateFolder: () => void;
  onRenameFolder: (folderId: string, currentName: string) => void;
  onDeleteFolder: (folderId: string, e: React.MouseEvent) => void;
  onEditPrompt: (prompt: Prompt) => void;
  onDeletePrompt: (promptId: string, e: React.MouseEvent) => void;
  onMovePromptToFolder: (promptId: string, folderId: string | null) => void;
  onCreatePrompt: () => void;
  editingFolderId: string | null;
  editingFolderName: string;
  onEditingFolderNameChange: (name: string) => void;
  onSaveFolderName: () => void;
  onCancelEditFolder: () => void;
}

export function SavedPromptsModal({
  isOpen,
  onClose,
  prompts,
  folders,
  collapsedFolders,
  onToggleFolder,
  onCreateFolder,
  onRenameFolder,
  onDeleteFolder,
  onEditPrompt,
  onDeletePrompt,
  onMovePromptToFolder,
  onCreatePrompt,
  editingFolderId,
  editingFolderName,
  onEditingFolderNameChange,
  onSaveFolderName,
  onCancelEditFolder,
}: SavedPromptsModalProps) {
  const t = useTranslations();
  const [promptSearchQuery, setPromptSearchQuery] = useState('');
  const [selectedPromptId, setSelectedPromptId] = useState<string | null>(null);
  const [dragOverFolderId, setDragOverFolderId] = useState<string | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const editInputRef = useRef<HTMLInputElement>(null);
  const justStartedEditingRef = useRef(false);

  // Focus input when editing starts
  useEffect(() => {
    if (editingFolderId && editInputRef.current) {
      justStartedEditingRef.current = true;
      setTimeout(() => {
        editInputRef.current?.focus();
        editInputRef.current?.select();
        // Allow blur to work after a short delay
        setTimeout(() => {
          justStartedEditingRef.current = false;
        }, 100);
      }, 0);
    }
  }, [editingFolderId]);

  if (!isOpen) return null;

  const handleToggleSelection = (promptId: string) => {
    setSelectedPromptId((prev) => (prev === promptId ? null : promptId));
  };

  const handleDragStart = (e: React.DragEvent, promptId: string) => {
    e.stopPropagation();
    e.dataTransfer.effectAllowed = 'move';
    e.dataTransfer.setData('promptId', promptId);
    setIsDragging(true);
  };

  const handleDrop = (e: React.DragEvent, folderId: string | null) => {
    e.preventDefault();
    e.stopPropagation();
    const promptId = e.dataTransfer.getData('promptId');
    if (promptId) {
      onMovePromptToFolder(promptId, folderId);
    }
    setDragOverFolderId(null);
    setIsDragging(false);
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

  const handleDragEnd = () => {
    setIsDragging(false);
    setDragOverFolderId(null);
  };

  const handleClose = () => {
    setPromptSearchQuery('');
    setSelectedPromptId(null);
    onClose();
  };

  // Filter prompts based on search query
  const searchLower = promptSearchQuery.toLowerCase().trim();
  const filteredPrompts = prompts.filter((prompt) => {
    if (!searchLower) return true;
    return (
      prompt.name.toLowerCase().includes(searchLower) ||
      (prompt.description &&
        prompt.description.toLowerCase().includes(searchLower)) ||
      prompt.content.toLowerCase().includes(searchLower)
    );
  });

  // Filter folders that either match the search or contain matching prompts
  const filteredFolders = folders
    .filter((folder) => folder.type === 'prompt')
    .filter((folder) => {
      if (!searchLower) return true;
      const folderPrompts = filteredPrompts.filter(
        (p) => p.folderId === folder.id,
      );
      return (
        folder.name.toLowerCase().includes(searchLower) ||
        folderPrompts.length > 0
      );
    });

  const hasResults = filteredPrompts.length > 0 || filteredFolders.length > 0;

  const selectedPrompt = prompts.find((p) => p.id === selectedPromptId);

  return (
    <div
      className="fixed inset-0 flex items-center justify-center bg-black/50 backdrop-blur-sm z-[150] animate-fade-in-fast"
      onClick={handleClose}
    >
      <div
        className="max-w-5xl w-full h-[90vh] mx-4 rounded-lg bg-white dark:bg-[#212121] p-6 shadow-xl animate-modal-in flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex-shrink-0 flex justify-between items-start mb-6">
          <div>
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
              {t('Saved Prompts')}
            </h3>
            <p className="text-sm text-gray-600 dark:text-gray-400">
              Manage and organize your reusable prompt templates. Type{' '}
              <span className="font-mono text-xs bg-gray-100 dark:bg-gray-800 px-1.5 py-0.5 rounded">
                /
              </span>{' '}
              in chat to access them.
            </p>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={onCreateFolder}
              className="p-2 text-gray-700 dark:text-gray-300 border border-gray-300 dark:border-gray-600 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg transition-colors"
              title={t('New folder')}
            >
              <IconFolderPlus size={18} />
            </button>
            <button
              onClick={onCreatePrompt}
              className="flex items-center gap-2 px-4 py-2 text-sm font-medium rounded-lg transition-colors bg-neutral-900 text-white hover:bg-neutral-700 dark:bg-white dark:text-neutral-900 dark:hover:bg-neutral-200"
            >
              <IconPlus size={16} />
              {t('New prompt')}
            </button>
            <button
              onClick={handleClose}
              className="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200 transition-colors"
            >
              <IconX size={24} />
            </button>
          </div>
        </div>

        {/* Master-Detail Layout */}
        <div className="flex-1 flex gap-6 min-h-0">
          {/* Left: Prompts List */}
          <div
            className={`flex-shrink-0 overflow-y-auto transition-all duration-200 ease-in-out border-r pr-4 min-h-0 will-change-[width] [&::-webkit-scrollbar]:w-2 [&::-webkit-scrollbar-track]:bg-transparent [&::-webkit-scrollbar-thumb]:bg-gray-300 [&::-webkit-scrollbar-thumb]:rounded-full [&::-webkit-scrollbar-thumb]:hover:bg-gray-400 dark:[&::-webkit-scrollbar-thumb]:bg-gray-600 dark:[&::-webkit-scrollbar-thumb]:hover:bg-gray-500 ${
              selectedPromptId
                ? 'w-80 border-gray-200 dark:border-gray-700'
                : 'w-full border-transparent pr-0'
            }`}
            style={{
              scrollbarWidth: 'thin',
            }}
          >
            <div className="space-y-3">
              {/* Search */}
              <div className="relative">
                <IconSearch
                  size={16}
                  className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400"
                />
                <input
                  type="text"
                  value={promptSearchQuery}
                  onChange={(e) => setPromptSearchQuery(e.target.value)}
                  placeholder={t('Search prompts_ellipsis')}
                  className="w-full pl-9 pr-3 py-2 text-sm rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 placeholder-gray-400 focus:outline-none focus:border-gray-400 dark:focus:border-gray-500"
                />
              </div>

              {/* List */}
              <div>
                {!hasResults ? (
                  <div className="p-8 text-center text-neutral-500 dark:text-neutral-400">
                    {searchLower ? t('No prompts found') : t('No prompts yet')}
                  </div>
                ) : (
                  <div className="p-2">
                    {/* Prompt Folders */}
                    {filteredFolders.map((folder) => {
                      const folderPrompts = filteredPrompts.filter(
                        (p) => p.folderId === folder.id,
                      );
                      return (
                        <div
                          key={folder.id}
                          className="mb-1"
                          onDrop={(e) => handleDrop(e, folder.id)}
                          onDragOver={(e) => handleDragOver(e, folder.id)}
                          onDragLeave={handleDragLeave}
                        >
                          <div
                            className={`group flex items-center gap-2 px-4 py-2 hover:bg-neutral-100 dark:hover:bg-neutral-800 transition-colors rounded ${
                              isDragging && dragOverFolderId === folder.id
                                ? 'bg-blue-100 dark:bg-blue-900/30 ring-2 ring-blue-400'
                                : ''
                            }`}
                          >
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                onToggleFolder(folder.id);
                              }}
                              className="shrink-0 text-neutral-600 dark:text-neutral-400"
                            >
                              {collapsedFolders.has(folder.id) ? (
                                <IconChevronRight size={14} />
                              ) : (
                                <IconChevronDown size={14} />
                              )}
                            </button>
                            <IconFolder
                              size={16}
                              className="shrink-0 text-neutral-600 dark:text-neutral-400"
                            />
                            {editingFolderId === folder.id ? (
                              <input
                                ref={editInputRef}
                                type="text"
                                value={editingFolderName}
                                onChange={(e) =>
                                  onEditingFolderNameChange(e.target.value)
                                }
                                onKeyDown={(e) => {
                                  if (e.key === 'Enter') {
                                    e.preventDefault();
                                    onSaveFolderName();
                                  }
                                  if (e.key === 'Escape') {
                                    e.preventDefault();
                                    onCancelEditFolder();
                                  }
                                }}
                                onBlur={(e) => {
                                  // Prevent blur from firing immediately after the input is created
                                  if (justStartedEditingRef.current) {
                                    return;
                                  }
                                  // Only save if clicking outside, not on other buttons
                                  if (
                                    !e.relatedTarget ||
                                    !e.currentTarget.parentElement?.contains(
                                      e.relatedTarget as Node,
                                    )
                                  ) {
                                    onSaveFolderName();
                                  }
                                }}
                                onClick={(e) => e.stopPropagation()}
                                className="flex-1 bg-transparent border-b border-neutral-400 dark:border-neutral-600 focus:outline-none text-sm text-neutral-900 dark:text-neutral-100"
                              />
                            ) : (
                              <span className="flex-1 truncate text-sm font-medium text-neutral-900 dark:text-neutral-100">
                                {folder.name} ({folderPrompts.length})
                              </span>
                            )}
                            <div className="shrink-0 flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                              {editingFolderId !== folder.id && (
                                <>
                                  <button
                                    className="rounded p-1 hover:bg-neutral-200 dark:hover:bg-neutral-700 cursor-pointer"
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      e.preventDefault();
                                      onRenameFolder(folder.id, folder.name);
                                    }}
                                    title={t('Rename')}
                                    type="button"
                                  >
                                    <IconEdit
                                      size={14}
                                      className="text-neutral-600 dark:text-neutral-400"
                                    />
                                  </button>
                                  <button
                                    className="rounded p-1 hover:bg-neutral-200 dark:hover:bg-neutral-700"
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      onDeleteFolder(folder.id, e);
                                    }}
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

                          {/* Folder prompts */}
                          {!collapsedFolders.has(folder.id) && (
                            <div className="ml-6 space-y-2 mt-1 p-1">
                              {folderPrompts.map((prompt) => (
                                <div
                                  key={prompt.id}
                                  draggable
                                  onDragStart={(e) =>
                                    handleDragStart(e, prompt.id)
                                  }
                                  onDragEnd={handleDragEnd}
                                  className="cursor-move"
                                >
                                  <PromptItem
                                    prompt={prompt}
                                    folders={folders.filter(
                                      (f) => f.type === 'prompt',
                                    )}
                                    isSelected={selectedPromptId === prompt.id}
                                    onClick={() =>
                                      handleToggleSelection(prompt.id)
                                    }
                                    onEdit={() => onEditPrompt(prompt)}
                                    onDelete={(e) =>
                                      onDeletePrompt(prompt.id, e)
                                    }
                                    onMoveToFolder={onMovePromptToFolder}
                                    t={t}
                                  />
                                </div>
                              ))}
                            </div>
                          )}
                        </div>
                      );
                    })}

                    {/* Prompts without folder */}
                    <div
                      onDrop={(e) => handleDrop(e, null)}
                      onDragOver={(e) => handleDragOver(e, null)}
                      onDragLeave={handleDragLeave}
                      className={
                        isDragging && dragOverFolderId === null
                          ? 'bg-blue-100 dark:bg-blue-900/30 ring-2 ring-blue-400 rounded p-2 space-y-2'
                          : 'space-y-2'
                      }
                    >
                      {filteredPrompts
                        .filter((p) => !p.folderId)
                        .map((prompt) => (
                          <div
                            key={prompt.id}
                            draggable
                            onDragStart={(e) => handleDragStart(e, prompt.id)}
                            onDragEnd={handleDragEnd}
                            className="cursor-move"
                          >
                            <PromptItem
                              prompt={prompt}
                              folders={folders.filter(
                                (f) => f.type === 'prompt',
                              )}
                              isSelected={selectedPromptId === prompt.id}
                              onClick={() => handleToggleSelection(prompt.id)}
                              onEdit={() => onEditPrompt(prompt)}
                              onDelete={(e) => onDeletePrompt(prompt.id, e)}
                              onMoveToFolder={onMovePromptToFolder}
                              t={t}
                            />
                          </div>
                        ))}
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Right: Prompt Details */}
          {selectedPromptId && selectedPrompt && (
            <div
              className="flex-1 overflow-y-auto min-h-0 w-0 [&::-webkit-scrollbar]:w-2 [&::-webkit-scrollbar-track]:bg-transparent [&::-webkit-scrollbar-thumb]:bg-gray-300 [&::-webkit-scrollbar-thumb]:rounded-full [&::-webkit-scrollbar-thumb]:hover:bg-gray-400 dark:[&::-webkit-scrollbar-thumb]:bg-gray-600 dark:[&::-webkit-scrollbar-thumb]:hover:bg-gray-500"
              style={{
                scrollbarWidth: 'thin',
              }}
            >
              <div className="space-y-6">
                {/* Prompt Header */}
                <div>
                  <div className="mb-2">
                    <h2 className="text-2xl font-semibold text-gray-900 dark:text-white">
                      {selectedPrompt.name}
                    </h2>
                  </div>
                  {selectedPrompt.description && (
                    <p className="text-gray-600 dark:text-gray-400">
                      {selectedPrompt.description}
                    </p>
                  )}
                </div>

                {/* Prompt Content */}
                <div>
                  <h3 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    {t('Content')}
                  </h3>
                  <div className="p-4 bg-gray-50 dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700">
                    <pre className="text-sm text-gray-900 dark:text-gray-100 whitespace-pre-wrap font-mono">
                      {selectedPrompt.content}
                    </pre>
                  </div>
                </div>

                {/* Actions */}
                <div className="flex gap-2">
                  <button
                    onClick={() => onEditPrompt(selectedPrompt)}
                    className="px-4 py-2 text-sm font-medium rounded-lg transition-colors bg-neutral-900 text-white hover:bg-neutral-700 dark:bg-white dark:text-neutral-900 dark:hover:bg-neutral-200"
                  >
                    {t('Edit')}
                  </button>
                  <button
                    onClick={(e) => onDeletePrompt(selectedPrompt.id, e)}
                    className="px-4 py-2 text-sm font-medium text-red-600 dark:text-red-400 border border-red-300 dark:border-red-800 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors"
                  >
                    {t('Delete')}
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
