'use client';

import {
  IconBolt,
  IconBraces,
  IconChevronDown,
  IconChevronRight,
  IconFileExport,
  IconFolder,
  IconFolderPlus,
  IconPlus,
  IconRepeat,
  IconSearch,
  IconSparkles,
  IconUpload,
} from '@tabler/icons-react';
import { useEffect, useRef, useState } from 'react';

import { useTranslations } from 'next-intl';

import { useConversations } from '@/lib/hooks/conversation/useConversations';
import { useSettings } from '@/lib/hooks/settings/useSettings';

import {
  exportPrompts,
  handlePromptFileImport,
  importPrompts,
} from '@/lib/utils/app/promptExport';

import { FolderInterface } from '@/types/folder';
import { Prompt } from '@/types/prompt';

import { PromptDashboard } from '../Prompts/PromptDashboard';
import { PromptItem } from '../Prompts/PromptItem';

import { v4 as uuidv4 } from 'uuid';

interface PromptsTabProps {
  prompts: Prompt[];
  folders: FolderInterface[];
  onClose: () => void;
}

export function PromptsTab({ prompts, folders, onClose }: PromptsTabProps) {
  const t = useTranslations();

  // Hooks
  const { addPrompt, updatePrompt, deletePrompt, defaultModelId, models } =
    useSettings();
  const { addFolder, updateFolder, deleteFolder } = useConversations();

  // PromptDashboard state
  const [isPromptModalOpen, setIsPromptModalOpen] = useState(false);
  const [promptModalName, setPromptModalName] = useState('');
  const [promptModalDescription, setPromptModalDescription] = useState('');
  const [promptModalContent, setPromptModalContent] = useState('');
  const [promptModalToneId, setPromptModalToneId] = useState<string | null>(
    null,
  );
  const [promptModalId, setPromptModalId] = useState<string | null>(null);

  // Local state
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedPromptId, setSelectedPromptId] = useState<string | null>(null);
  const [collapsedFolders, setCollapsedFolders] = useState<Set<string>>(
    new Set(),
  );
  const [dragOverFolderId, setDragOverFolderId] = useState<string | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [editingFolderId, setEditingFolderId] = useState<string | null>(null);
  const [editingFolderName, setEditingFolderName] = useState('');

  const fileInputRef = useRef<HTMLInputElement>(null);
  const editInputRef = useRef<HTMLInputElement>(null);

  // Focus editing input when folder editing starts
  useEffect(() => {
    if (editingFolderId && editInputRef.current) {
      setTimeout(() => {
        editInputRef.current?.focus();
        editInputRef.current?.select();
      }, 0);
    }
  }, [editingFolderId]);

  // Filter prompts by search
  const filteredPrompts = prompts.filter((prompt) =>
    prompt.name.toLowerCase().includes(searchQuery.toLowerCase()),
  );

  // Find selected prompt
  const selectedPrompt = prompts.find((p) => p.id === selectedPromptId);

  // Group prompts by folder
  const promptsByFolder: Record<string, Prompt[]> = {};
  const unfolderPrompts: Prompt[] = [];

  filteredPrompts.forEach((prompt) => {
    if (prompt.folderId) {
      if (!promptsByFolder[prompt.folderId]) {
        promptsByFolder[prompt.folderId] = [];
      }
      promptsByFolder[prompt.folderId].push(prompt);
    } else {
      unfolderPrompts.push(prompt);
    }
  });

  // Handlers
  const handleCreateFolder = () => {
    const newFolder: FolderInterface = {
      id: uuidv4(),
      name: t('New folder'),
      type: 'prompt',
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

  const handleMoveToFolder = (promptId: string, folderId: string | null) => {
    updatePrompt(promptId, { folderId });
  };

  const handleDeletePrompt = (promptId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (window.confirm(t('Are you sure you want to delete this prompt?'))) {
      deletePrompt(promptId);
      if (selectedPromptId === promptId) {
        setSelectedPromptId(null);
      }
    }
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
      handleMoveToFolder(promptId, folderId);
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
          `${conflicts.length} prompt(s) with similar names already exist: ${conflictNames}. Import anyway?`,
        );
        if (!proceed) {
          e.target.value = '';
          return;
        }
      }

      newPrompts.forEach((prompt) => addPrompt(prompt));
      alert(`Successfully imported ${newPrompts.length} prompt(s)`);
    } catch (error) {
      alert(
        `Failed to import: ${error instanceof Error ? error.message : 'Unknown error'}`,
      );
    }

    e.target.value = '';
  };

  return (
    <div className="flex h-full">
      {/* Left Panel - List */}
      <div className="w-1/2 border-r border-gray-200 dark:border-gray-700 flex flex-col">
        {/* Toolbar */}
        <div className="flex-shrink-0 px-4 py-3 bg-gray-50 dark:bg-[#1a1a1a] border-b border-gray-200 dark:border-gray-700">
          <div className="flex items-center justify-between gap-3">
            {/* Search */}
            <div className="flex-1 relative max-w-md">
              <IconSearch
                size={16}
                className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400"
              />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search prompts..."
                className="w-full pl-9 pr-3 py-2 text-sm rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500"
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
              <button
                onClick={handleImportClick}
                className="p-2 text-gray-600 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-700 rounded-lg"
                title="Import"
              >
                <IconUpload size={18} />
              </button>
              <button
                onClick={handleExportAll}
                className="p-2 text-gray-600 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-700 rounded-lg"
                title="Export all"
              >
                <IconFileExport size={18} />
              </button>
              <div className="h-6 w-px bg-gray-300 dark:bg-gray-600" />
              <button
                onClick={handleCreateFolder}
                className="p-2 text-gray-600 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-700 rounded-lg"
                title="New folder"
              >
                <IconFolderPlus size={18} />
              </button>
              <button
                onClick={() => {
                  setPromptModalId(null);
                  setPromptModalName('');
                  setPromptModalDescription('');
                  setPromptModalContent('');
                  setPromptModalToneId(null);
                  setIsPromptModalOpen(true);
                }}
                className="flex items-center gap-2 px-3 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 text-sm font-medium"
              >
                <IconPlus size={16} />
                New
              </button>
            </div>
          </div>
        </div>

        {/* List */}
        <div className="flex-1 overflow-y-auto p-4">
          {/* Folders */}
          {folders.map((folder) => {
            const folderPrompts = promptsByFolder[folder.id] || [];
            if (folderPrompts.length === 0 && !editingFolderId) return null;

            const isCollapsed = collapsedFolders.has(folder.id);

            return (
              <div key={folder.id} className="mb-4">
                <div
                  className={`flex items-center justify-between px-3 py-2 rounded-lg cursor-pointer transition-colors ${
                    dragOverFolderId === folder.id
                      ? 'bg-blue-100 dark:bg-blue-900/30'
                      : 'hover:bg-gray-100 dark:hover:bg-gray-800'
                  }`}
                  onClick={() => toggleFolder(folder.id)}
                  onDrop={(e) => handleDrop(e, folder.id)}
                  onDragOver={(e) => handleDragOver(e, folder.id)}
                  onDragLeave={handleDragLeave}
                >
                  <div className="flex items-center gap-2 flex-1 min-w-0">
                    {isCollapsed ? (
                      <IconChevronRight size={16} className="text-gray-500" />
                    ) : (
                      <IconChevronDown size={16} className="text-gray-500" />
                    )}
                    <IconFolder size={16} className="text-gray-500" />
                    {editingFolderId === folder.id ? (
                      <input
                        ref={editInputRef}
                        type="text"
                        value={editingFolderName}
                        onChange={(e) => setEditingFolderName(e.target.value)}
                        onBlur={handleSaveFolderName}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') handleSaveFolderName();
                          if (e.key === 'Escape') {
                            setEditingFolderId(null);
                            setEditingFolderName('');
                          }
                        }}
                        onClick={(e) => e.stopPropagation()}
                        className="flex-1 px-2 py-0.5 text-sm bg-white dark:bg-gray-800 border border-blue-500 rounded"
                      />
                    ) : (
                      <span className="text-sm font-medium text-gray-700 dark:text-gray-300 truncate">
                        {folder.name}
                      </span>
                    )}
                    <span className="text-xs text-gray-500">
                      {folderPrompts.length}
                    </span>
                  </div>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      handleRenameFolder(folder.id, folder.name);
                    }}
                    className="opacity-0 group-hover:opacity-100 p-1 hover:bg-gray-200 dark:hover:bg-gray-700 rounded"
                  >
                    ...
                  </button>
                </div>

                {!isCollapsed && folderPrompts.length > 0 && (
                  <div className="ml-4 mt-1 space-y-1">
                    {folderPrompts.map((prompt) => (
                      <div
                        key={prompt.id}
                        draggable
                        onDragStart={(e) => handleDragStart(e, prompt.id)}
                        onDragEnd={() => setIsDragging(false)}
                      >
                        <PromptItem
                          prompt={prompt}
                          folders={folders}
                          isSelected={selectedPromptId === prompt.id}
                          onClick={() => setSelectedPromptId(prompt.id)}
                          onEdit={() => {
                            setPromptModalId(prompt.id);
                            setPromptModalName(prompt.name);
                            setPromptModalDescription(prompt.description || '');
                            setPromptModalContent(prompt.content);
                            setPromptModalToneId(prompt.toneId || null);
                            setIsPromptModalOpen(true);
                          }}
                          onDelete={(e) => handleDeletePrompt(prompt.id, e)}
                          onMoveToFolder={handleMoveToFolder}
                          onExport={() => handleExportSingle(prompt)}
                        />
                      </div>
                    ))}
                  </div>
                )}
              </div>
            );
          })}

          {/* Unfolder prompts */}
          {unfolderPrompts.length > 0 && (
            <div
              className={`space-y-1 ${dragOverFolderId === null && isDragging ? 'bg-blue-50 dark:bg-blue-900/20 rounded-lg p-2' : ''}`}
              onDrop={(e) => handleDrop(e, null)}
              onDragOver={(e) => handleDragOver(e, null)}
              onDragLeave={handleDragLeave}
            >
              {unfolderPrompts.map((prompt) => (
                <div
                  key={prompt.id}
                  draggable
                  onDragStart={(e) => handleDragStart(e, prompt.id)}
                  onDragEnd={() => setIsDragging(false)}
                >
                  <PromptItem
                    prompt={prompt}
                    folders={folders}
                    isSelected={selectedPromptId === prompt.id}
                    onClick={() => setSelectedPromptId(prompt.id)}
                    onEdit={() => {
                      setPromptModalId(prompt.id);
                      setPromptModalName(prompt.name);
                      setPromptModalDescription(prompt.description || '');
                      setPromptModalContent(prompt.content);
                      setPromptModalToneId(prompt.toneId || null);
                      setIsPromptModalOpen(true);
                    }}
                    onDelete={(e) => handleDeletePrompt(prompt.id, e)}
                    onMoveToFolder={handleMoveToFolder}
                    onExport={() => handleExportSingle(prompt)}
                  />
                </div>
              ))}
            </div>
          )}

          {filteredPrompts.length === 0 && (
            <div className="p-8">
              {searchQuery ? (
                <div className="text-center text-neutral-500 dark:text-neutral-400">
                  {t('No prompts found')}
                </div>
              ) : (
                <div className="max-w-3xl mx-auto space-y-8">
                  {/* Header */}
                  <div className="text-center space-y-2">
                    <h3 className="text-2xl font-semibold text-gray-900 dark:text-white">
                      {t('Save Time with Reusable Prompts')}
                    </h3>
                    <p className="text-gray-600 dark:text-gray-400">
                      {t('Turn your repetitive tasks into one-click commands')}
                    </p>
                  </div>

                  {/* Example */}
                  <div className="border-t border-gray-200 dark:border-gray-700 pt-6">
                    <div className="flex items-center gap-2 mb-4">
                      <IconSparkles
                        size={18}
                        className="text-gray-600 dark:text-gray-400"
                      />
                      <h4 className="text-sm font-semibold text-gray-700 dark:text-gray-300">
                        {t('Example Prompt')}
                      </h4>
                    </div>

                    <div className="space-y-4">
                      {/* Prompt definition */}
                      <div className="rounded-lg border border-neutral-200 dark:border-neutral-700 overflow-hidden">
                        <div className="bg-neutral-100 dark:bg-neutral-800 px-4 py-2 border-b border-neutral-200 dark:border-neutral-700">
                          <p className="text-sm font-medium text-gray-900 dark:text-white">
                            {t('Email Response Template')}
                          </p>
                        </div>
                        <div className="p-4 bg-white dark:bg-neutral-900">
                          <pre className="text-sm text-gray-700 dark:text-gray-300 whitespace-pre-wrap font-mono">
                            {`Write an email response to {{recipient}} regarding {{topic}}.

Include:
- Response to their inquiry
- Clear next steps
- Action items or deadlines if applicable`}
                          </pre>
                        </div>
                      </div>

                      {/* How to use */}
                      <div className="flex items-start gap-3 p-3 rounded-lg bg-neutral-50 dark:bg-neutral-800/50">
                        <div className="shrink-0 w-6 h-6 flex items-center justify-center rounded bg-neutral-200 dark:bg-neutral-700 mt-0.5">
                          <span className="text-xs font-semibold text-neutral-600 dark:text-neutral-400">
                            /
                          </span>
                        </div>
                        <div className="flex-1">
                          <p className="text-sm text-gray-600 dark:text-gray-400">
                            {t(
                              'Type / in chat, select your prompt, and fill in the variables when prompted',
                            )}
                          </p>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Right Panel - Detail */}
      <div className="w-1/2 flex flex-col">
        {selectedPrompt ? (
          <div className="flex-1 overflow-y-auto p-6">
            <h2 className="text-2xl font-semibold text-gray-900 dark:text-white mb-2">
              {selectedPrompt.name}
            </h2>
            {selectedPrompt.description && (
              <p className="text-sm text-gray-600 dark:text-gray-400 mb-6">
                {selectedPrompt.description}
              </p>
            )}

            <div>
              <h3 className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-3">
                Content
              </h3>
              <div className="p-4 bg-gray-50 dark:bg-[#2a2a2a] rounded-lg border border-gray-200 dark:border-gray-700">
                <pre className="text-sm text-gray-900 dark:text-gray-100 whitespace-pre-wrap font-mono">
                  {selectedPrompt.content}
                </pre>
              </div>
            </div>

            <div className="flex gap-2 mt-6">
              <button
                onClick={() => {
                  setPromptModalId(selectedPrompt.id);
                  setPromptModalName(selectedPrompt.name);
                  setPromptModalDescription(selectedPrompt.description || '');
                  setPromptModalContent(selectedPrompt.content);
                  setPromptModalToneId(selectedPrompt.toneId || null);
                  setIsPromptModalOpen(true);
                }}
                className="px-4 py-2 text-sm font-medium rounded-lg bg-blue-600 text-white hover:bg-blue-700"
              >
                Edit
              </button>
              <button
                onClick={(e) => handleDeletePrompt(selectedPrompt.id, e)}
                className="px-4 py-2 text-sm font-medium text-red-600 dark:text-red-400 border border-red-300 dark:border-red-700 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg"
              >
                Delete
              </button>
            </div>
          </div>
        ) : (
          <div className="flex-1 flex items-center justify-center text-gray-400 dark:text-gray-600">
            <div className="text-center">
              <IconSearch size={48} className="mx-auto mb-3 opacity-50" />
              <p>Select a prompt to view details</p>
            </div>
          </div>
        )}
      </div>

      {/* Prompt Editor Modal */}
      <PromptDashboard
        isOpen={isPromptModalOpen}
        onClose={() => setIsPromptModalOpen(false)}
        onSave={(
          name: string,
          description: string,
          content: string,
          toneId?: string | null,
        ) => {
          if (promptModalId) {
            // Update existing prompt
            updatePrompt(promptModalId, {
              name,
              description,
              content,
              toneId,
            });
          } else {
            // Create new prompt
            const defaultModel =
              models.find((m) => m.id === defaultModelId) || models[0];
            const newPrompt: Prompt = {
              id: uuidv4(),
              name,
              description,
              content,
              model: defaultModel,
              folderId: null,
              toneId,
            };
            addPrompt(newPrompt);
          }
          setIsPromptModalOpen(false);
        }}
        initialName={promptModalName}
        initialDescription={promptModalDescription}
        initialContent={promptModalContent}
        initialToneId={promptModalToneId}
      />
    </div>
  );
}
