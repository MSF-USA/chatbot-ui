'use client';

import {
  IconChevronDown,
  IconChevronRight,
  IconEdit,
  IconFileExport,
  IconFolder,
  IconFolderPlus,
  IconPlus,
  IconSearch,
  IconTrash,
  IconUpload,
  IconX,
} from '@tabler/icons-react';
import { useEffect, useRef, useState } from 'react';

import { useTranslations } from 'next-intl';

import {
  exportPrompts,
  handlePromptFileImport,
  importPrompts,
} from '@/lib/utils/app/promptExport';

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
  onImportPrompts: (newPrompts: Prompt[]) => void;
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
  onImportPrompts,
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
  const fileInputRef = useRef<HTMLInputElement>(null);

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

  const handleExportAll = () => {
    if (prompts.length === 0) {
      alert(t('No prompts to export'));
      return;
    }
    exportPrompts(prompts);
  };

  const handleExportSingle = (prompt: Prompt) => {
    exportPrompts([prompt]);
  };

  const handleImportClick = () => {
    fileInputRef.current?.click();
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      const data = await handlePromptFileImport(file);
      const { prompts: newPrompts, conflicts } = importPrompts(data, prompts);

      if (conflicts.length > 0) {
        const conflictNames = conflicts.map((c) => c.imported.name).join(', ');
        const proceed = confirm(
          `${conflicts.length} prompt(s) with similar names already exist: ${conflictNames}. Import anyway? They will be created as duplicates.`,
        );
        if (!proceed) {
          e.target.value = '';
          return;
        }
      }

      onImportPrompts(newPrompts);
      alert(`Successfully imported ${newPrompts.length} prompt(s)`);
    } catch (error) {
      alert(
        `Failed to import prompts: ${error instanceof Error ? error.message : 'Unknown error'}`,
      );
    } finally {
      e.target.value = '';
    }
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
        className="max-w-6xl w-full h-[90vh] mx-4 rounded-lg bg-white dark:bg-[#212121] shadow-xl animate-modal-in flex flex-col overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex-shrink-0 px-6 py-4 border-b border-gray-200 dark:border-gray-700">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-xl font-semibold text-gray-900 dark:text-white">
                {t('Saved Prompts')}
              </h3>
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                Type{' '}
                <span className="font-mono bg-gray-100 dark:bg-gray-800 px-1.5 py-0.5 rounded">
                  /
                </span>{' '}
                in chat to access your prompts
              </p>
            </div>
            <button
              onClick={handleClose}
              className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors"
            >
              <IconX size={20} />
            </button>
          </div>
        </div>

        {/* Toolbar */}
        <div className="flex-shrink-0 px-6 py-3 bg-gray-50 dark:bg-[#1a1a1a] border-b border-gray-200 dark:border-gray-700">
          <div className="flex items-center justify-between gap-4">
            {/* Search */}
            <div className="flex-1 relative max-w-md">
              <IconSearch
                size={16}
                className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400"
              />
              <input
                type="text"
                value={promptSearchQuery}
                onChange={(e) => setPromptSearchQuery(e.target.value)}
                placeholder={t('Search prompts_ellipsis')}
                className="w-full pl-9 pr-3 py-2 text-sm rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400 focus:border-transparent"
              />
            </div>

            {/* Actions */}
            <div className="flex items-center gap-2">
              <input
                ref={fileInputRef}
                type="file"
                accept=".json"
                onChange={handleFileChange}
                className="hidden"
              />

              <div className="relative group">
                <button
                  onClick={handleImportClick}
                  className="p-2 text-gray-600 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-700 rounded-lg transition-colors"
                  aria-label={t('Import prompts')}
                >
                  <IconUpload size={18} />
                </button>
                <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 px-2 py-1 bg-gray-900 dark:bg-gray-700 text-white text-xs rounded whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none z-10">
                  {t('Import prompts')}
                </div>
              </div>

              <div className="relative group">
                <button
                  onClick={handleExportAll}
                  className="p-2 text-gray-600 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-700 rounded-lg transition-colors"
                  aria-label={t('Export all prompts')}
                >
                  <IconFileExport size={18} />
                </button>
                <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 px-2 py-1 bg-gray-900 dark:bg-gray-700 text-white text-xs rounded whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none z-10">
                  {t('Export all prompts')}
                </div>
              </div>

              <div className="h-6 w-px bg-gray-300 dark:bg-gray-600"></div>

              <div className="relative group">
                <button
                  onClick={onCreateFolder}
                  className="p-2 text-gray-600 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-700 rounded-lg transition-colors"
                  aria-label={t('New folder')}
                >
                  <IconFolderPlus size={18} />
                </button>
                <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 px-2 py-1 bg-gray-900 dark:bg-gray-700 text-white text-xs rounded whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none z-10">
                  {t('New folder')}
                </div>
              </div>

              <button
                onClick={onCreatePrompt}
                className="flex items-center gap-2 px-3 py-2 text-sm font-medium rounded-lg transition-colors bg-blue-600 text-white hover:bg-blue-700 dark:bg-blue-600 dark:hover:bg-blue-700"
              >
                <IconPlus size={16} />
                {t('New')}
              </button>
            </div>
          </div>
        </div>

        {/* Master-Detail Layout */}
        <div className="flex-1 flex min-h-0">
          {/* Left: Prompts List */}
          <div
            className={`flex-shrink-0 overflow-y-auto transition-all duration-200 ease-in-out min-h-0 will-change-[width] [&::-webkit-scrollbar]:w-2 [&::-webkit-scrollbar-track]:bg-transparent [&::-webkit-scrollbar-thumb]:bg-gray-300 [&::-webkit-scrollbar-thumb]:rounded-full [&::-webkit-scrollbar-thumb]:hover:bg-gray-400 dark:[&::-webkit-scrollbar-thumb]:bg-gray-600 dark:[&::-webkit-scrollbar-thumb]:hover:bg-gray-500 ${
              selectedPromptId
                ? 'w-96 border-r border-gray-200 dark:border-gray-700'
                : 'w-full'
            }`}
            style={{
              scrollbarWidth: 'thin',
            }}
          >
            <div className="p-4">
              {/* List */}
              <div>
                {!hasResults ? (
                  <div className="p-8 text-center text-neutral-500 dark:text-neutral-400">
                    {searchLower ? t('No prompts found') : t('No prompts yet')}
                  </div>
                ) : (
                  <div
                    className={!selectedPromptId ? 'space-y-2' : 'space-y-1'}
                  >
                    {/* Prompt Folders */}
                    {filteredFolders.map((folder) => {
                      const folderPrompts = filteredPrompts.filter(
                        (p) => p.folderId === folder.id,
                      );
                      const isCollapsed = collapsedFolders.has(folder.id);
                      return (
                        <div
                          key={folder.id}
                          className="mb-1"
                          onDrop={(e) => handleDrop(e, folder.id)}
                          onDragOver={(e) => handleDragOver(e, folder.id)}
                          onDragLeave={handleDragLeave}
                        >
                          <div
                            className={`group flex items-center gap-3 px-3 hover:bg-neutral-100 dark:hover:bg-neutral-800 transition-colors rounded-lg ${
                              isDragging && dragOverFolderId === folder.id
                                ? 'bg-blue-100 dark:bg-blue-900/30 ring-2 ring-blue-400'
                                : ''
                            } ${!selectedPromptId ? 'py-3.5' : 'py-2.5'}`}
                          >
                            <div className="relative group/chevron">
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  onToggleFolder(folder.id);
                                }}
                                className="shrink-0 p-1 text-neutral-600 dark:text-neutral-400 hover:text-neutral-900 dark:hover:text-neutral-200 hover:bg-neutral-200 dark:hover:bg-neutral-700 rounded transition-colors"
                                aria-label={
                                  isCollapsed
                                    ? t('Expand folder')
                                    : t('Collapse folder')
                                }
                              >
                                {isCollapsed ? (
                                  <IconChevronRight
                                    size={!selectedPromptId ? 22 : 18}
                                  />
                                ) : (
                                  <IconChevronDown
                                    size={!selectedPromptId ? 22 : 18}
                                  />
                                )}
                              </button>
                              <div className="absolute top-full left-1/2 -translate-x-1/2 mt-1 px-2 py-1 bg-gray-900 dark:bg-gray-700 text-white text-xs rounded whitespace-nowrap opacity-0 group-hover/chevron:opacity-100 transition-opacity pointer-events-none z-10">
                                {isCollapsed
                                  ? t('Expand folder')
                                  : t('Collapse folder')}
                              </div>
                            </div>
                            <IconFolder
                              size={!selectedPromptId ? 22 : 18}
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
                                className={`flex-1 bg-transparent border-b border-neutral-400 dark:border-neutral-600 focus:outline-none text-neutral-900 dark:text-neutral-100 mr-2 ${!selectedPromptId ? 'text-lg' : 'text-base'}`}
                              />
                            ) : (
                              <>
                                <span
                                  className={`truncate font-medium text-neutral-900 dark:text-neutral-100 ${!selectedPromptId ? 'text-lg' : 'text-base'}`}
                                >
                                  {folder.name}
                                </span>
                                <span
                                  className={`shrink-0 text-neutral-500 dark:text-neutral-400 font-medium ml-2 ${!selectedPromptId ? 'text-base' : 'text-sm'}`}
                                >
                                  {folderPrompts.length}
                                </span>
                              </>
                            )}
                            <div className="flex-1"></div>
                            <div className="shrink-0 flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                              {editingFolderId !== folder.id && (
                                <>
                                  <button
                                    className="rounded p-1.5 hover:bg-neutral-200 dark:hover:bg-neutral-700 cursor-pointer"
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      e.preventDefault();
                                      onRenameFolder(folder.id, folder.name);
                                    }}
                                    title={t('Rename')}
                                    type="button"
                                  >
                                    <IconEdit
                                      size={!selectedPromptId ? 18 : 16}
                                      className="text-neutral-600 dark:text-neutral-400"
                                    />
                                  </button>
                                  <button
                                    className="rounded p-1.5 hover:bg-neutral-200 dark:hover:bg-neutral-700"
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      onDeleteFolder(folder.id, e);
                                    }}
                                    title={t('Delete')}
                                  >
                                    <IconTrash
                                      size={!selectedPromptId ? 18 : 16}
                                      className="text-neutral-600 dark:text-neutral-400"
                                    />
                                  </button>
                                </>
                              )}
                            </div>
                          </div>

                          {/* Folder prompts */}
                          {!isCollapsed && (
                            <div
                              className={`mt-1 ml-8 pl-2 border-l-2 border-neutral-200 dark:border-neutral-700 ${!selectedPromptId ? 'space-y-2' : 'space-y-1'}`}
                            >
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
                                    isExpanded={!selectedPromptId}
                                    onClick={() =>
                                      handleToggleSelection(prompt.id)
                                    }
                                    onEdit={() => onEditPrompt(prompt)}
                                    onDelete={(e) =>
                                      onDeletePrompt(prompt.id, e)
                                    }
                                    onMoveToFolder={onMovePromptToFolder}
                                    onExport={() => handleExportSingle(prompt)}
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
                          ? `bg-blue-100 dark:bg-blue-900/30 ring-2 ring-blue-400 rounded p-2 ${!selectedPromptId ? 'space-y-2' : 'space-y-1'}`
                          : !selectedPromptId
                            ? 'space-y-2'
                            : 'space-y-1'
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
                              isExpanded={!selectedPromptId}
                              onClick={() => handleToggleSelection(prompt.id)}
                              onEdit={() => onEditPrompt(prompt)}
                              onDelete={(e) => onDeletePrompt(prompt.id, e)}
                              onMoveToFolder={onMovePromptToFolder}
                              onExport={() => handleExportSingle(prompt)}
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
              className="flex-1 overflow-y-auto min-h-0 w-0 bg-gray-50 dark:bg-[#1a1a1a] [&::-webkit-scrollbar]:w-2 [&::-webkit-scrollbar-track]:bg-transparent [&::-webkit-scrollbar-thumb]:bg-gray-300 [&::-webkit-scrollbar-thumb]:rounded-full [&::-webkit-scrollbar-thumb]:hover:bg-gray-400 dark:[&::-webkit-scrollbar-thumb]:bg-gray-600 dark:[&::-webkit-scrollbar-thumb]:hover:bg-gray-500"
              style={{
                scrollbarWidth: 'thin',
              }}
            >
              <div className="p-6 space-y-6">
                {/* Prompt Header */}
                <div>
                  <h2 className="text-2xl font-semibold text-gray-900 dark:text-white mb-2">
                    {selectedPrompt.name}
                  </h2>
                  {selectedPrompt.description && (
                    <p className="text-sm text-gray-600 dark:text-gray-400">
                      {selectedPrompt.description}
                    </p>
                  )}
                </div>

                {/* Prompt Content */}
                <div>
                  <h3 className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-3">
                    {t('Content')}
                  </h3>
                  <div className="p-4 bg-white dark:bg-[#212121] rounded-lg border border-gray-200 dark:border-gray-700">
                    <pre className="text-sm text-gray-900 dark:text-gray-100 whitespace-pre-wrap font-mono leading-relaxed">
                      {selectedPrompt.content}
                    </pre>
                  </div>
                </div>

                {/* Actions */}
                <div className="flex gap-2 pt-2">
                  <button
                    onClick={() => onEditPrompt(selectedPrompt)}
                    className="px-4 py-2 text-sm font-medium rounded-lg transition-colors bg-blue-600 text-white hover:bg-blue-700"
                  >
                    {t('Edit')}
                  </button>
                  <button
                    onClick={(e) => onDeletePrompt(selectedPrompt.id, e)}
                    className="px-4 py-2 text-sm font-medium text-red-600 dark:text-red-400 border border-red-300 dark:border-red-700 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors"
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
