'use client';

import {
  IconChevronDown,
  IconChevronRight,
  IconFileExport,
  IconFileText,
  IconFolder,
  IconFolderPlus,
  IconInfoCircle,
  IconPlus,
  IconSearch,
  IconSparkles,
  IconUpload,
  IconVolume,
} from '@tabler/icons-react';
import { useEffect, useRef, useState } from 'react';

import { useTranslations } from 'next-intl';

import { useConversations } from '@/lib/hooks/conversation/useConversations';
import { useTones } from '@/lib/hooks/settings/useTones';

import {
  exportTones,
  handleToneFileImport,
  importTones,
} from '@/lib/utils/app/toneExport';

import { FolderInterface } from '@/types/folder';
import { Tone } from '@/types/tone';

import { ToneDashboard } from '../Tones/ToneDashboard';
import { ToneItem } from '../Tones/ToneItem';

import { v4 as uuidv4 } from 'uuid';

interface TonesTabProps {
  tones: Tone[];
  folders: FolderInterface[];
  onClose: () => void;
}

export function TonesTab({ tones, folders, onClose }: TonesTabProps) {
  const t = useTranslations();

  // Hooks
  const { addTone, updateTone, deleteTone } = useTones();
  const { addFolder, updateFolder, deleteFolder } = useConversations();

  // ToneDashboard state
  const [isToneModalOpen, setIsToneModalOpen] = useState(false);
  const [toneModalName, setToneModalName] = useState('');
  const [toneModalDescription, setToneModalDescription] = useState('');
  const [toneModalVoiceRules, setToneModalVoiceRules] = useState('');
  const [toneModalExamples, setToneModalExamples] = useState('');
  const [toneModalTags, setToneModalTags] = useState<string[]>([]);
  const [toneModalId, setToneModalId] = useState<string | null>(null);

  // Local state
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedToneId, setSelectedToneId] = useState<string | null>(null);
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

  // Filter tones by search
  const filteredTones = tones.filter(
    (tone) =>
      tone.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      tone.description?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      tone.tags?.some((tag) =>
        tag.toLowerCase().includes(searchQuery.toLowerCase()),
      ),
  );

  // Find selected tone
  const selectedTone = tones.find((t) => t.id === selectedToneId);

  // Group tones by folder
  const tonesByFolder: Record<string, Tone[]> = {};
  const unfolderTones: Tone[] = [];

  filteredTones.forEach((tone) => {
    if (tone.folderId) {
      if (!tonesByFolder[tone.folderId]) {
        tonesByFolder[tone.folderId] = [];
      }
      tonesByFolder[tone.folderId].push(tone);
    } else {
      unfolderTones.push(tone);
    }
  });

  // Handlers
  const handleCreateFolder = () => {
    const newFolder: FolderInterface = {
      id: uuidv4(),
      name: t('New folder'),
      type: 'tone',
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

  const handleMoveToFolder = (toneId: string, folderId: string | null) => {
    updateTone(toneId, { folderId });
  };

  const handleDeleteTone = (toneId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (window.confirm(t('Are you sure you want to delete this tone?'))) {
      deleteTone(toneId);
      if (selectedToneId === toneId) {
        setSelectedToneId(null);
      }
    }
  };

  const handleDragStart = (e: React.DragEvent, toneId: string) => {
    e.stopPropagation();
    e.dataTransfer.effectAllowed = 'move';
    e.dataTransfer.setData('toneId', toneId);
    setIsDragging(true);
  };

  const handleDrop = (e: React.DragEvent, folderId: string | null) => {
    e.preventDefault();
    e.stopPropagation();
    const toneId = e.dataTransfer.getData('toneId');
    if (toneId) {
      handleMoveToFolder(toneId, folderId);
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
    if (tones.length === 0) {
      alert(t('No tones to export'));
      return;
    }
    exportTones(tones);
  };

  const handleExportSingle = (tone: Tone) => {
    exportTones([tone]);
  };

  const handleImportClick = () => {
    fileInputRef.current?.click();
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      const data = await handleToneFileImport(file);
      const { tones: newTones, conflicts } = importTones(data, tones);

      if (conflicts.length > 0) {
        const conflictNames = conflicts.map((c) => c.imported.name).join(', ');
        const proceed = confirm(
          `${conflicts.length} tone(s) with similar names already exist: ${conflictNames}. Import anyway?`,
        );
        if (!proceed) {
          e.target.value = '';
          return;
        }
      }

      newTones.forEach((tone) => addTone(tone));
      alert(`Successfully imported ${newTones.length} tone(s)`);
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
                placeholder="Search tones..."
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
                  setToneModalId(null);
                  setToneModalName('');
                  setToneModalDescription('');
                  setToneModalVoiceRules('');
                  setToneModalExamples('');
                  setToneModalTags([]);
                  setIsToneModalOpen(true);
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
            const folderTones = tonesByFolder[folder.id] || [];
            if (folderTones.length === 0 && !editingFolderId) return null;

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
                      {folderTones.length}
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

                {!isCollapsed && folderTones.length > 0 && (
                  <div className="ml-4 mt-1 space-y-1">
                    {folderTones.map((tone) => (
                      <div
                        key={tone.id}
                        draggable
                        onDragStart={(e) => handleDragStart(e, tone.id)}
                        onDragEnd={() => setIsDragging(false)}
                      >
                        <ToneItem
                          tone={tone}
                          folders={folders}
                          isSelected={selectedToneId === tone.id}
                          onClick={() => setSelectedToneId(tone.id)}
                          onEdit={() => {
                            setToneModalId(tone.id);
                            setToneModalName(tone.name);
                            setToneModalDescription(tone.description || '');
                            setToneModalVoiceRules(tone.voiceRules);
                            setToneModalExamples(tone.examples || '');
                            setToneModalTags(tone.tags || []);
                            setIsToneModalOpen(true);
                          }}
                          onDelete={(e) => handleDeleteTone(tone.id, e)}
                          onMoveToFolder={handleMoveToFolder}
                          onExport={() => handleExportSingle(tone)}
                        />
                      </div>
                    ))}
                  </div>
                )}
              </div>
            );
          })}

          {/* Unfolder tones */}
          {unfolderTones.length > 0 && (
            <div
              className={`space-y-1 ${dragOverFolderId === null && isDragging ? 'bg-blue-50 dark:bg-blue-900/20 rounded-lg p-2' : ''}`}
              onDrop={(e) => handleDrop(e, null)}
              onDragOver={(e) => handleDragOver(e, null)}
              onDragLeave={handleDragLeave}
            >
              {unfolderTones.map((tone) => (
                <div
                  key={tone.id}
                  draggable
                  onDragStart={(e) => handleDragStart(e, tone.id)}
                  onDragEnd={() => setIsDragging(false)}
                >
                  <ToneItem
                    tone={tone}
                    folders={folders}
                    isSelected={selectedToneId === tone.id}
                    onClick={() => setSelectedToneId(tone.id)}
                    onEdit={() => {
                      setToneModalId(tone.id);
                      setToneModalName(tone.name);
                      setToneModalDescription(tone.description || '');
                      setToneModalVoiceRules(tone.voiceRules);
                      setToneModalExamples(tone.examples || '');
                      setToneModalTags(tone.tags || []);
                      setIsToneModalOpen(true);
                    }}
                    onDelete={(e) => handleDeleteTone(tone.id, e)}
                    onMoveToFolder={handleMoveToFolder}
                    onExport={() => handleExportSingle(tone)}
                  />
                </div>
              ))}
            </div>
          )}

          {filteredTones.length === 0 && (
            <div className="text-center py-12">
              {searchQuery ? (
                <div className="text-center text-neutral-500 dark:text-neutral-400">
                  {t('No tones found')}
                </div>
              ) : (
                <div className="max-w-3xl mx-auto space-y-8">
                  {/* Header */}
                  <div className="text-center space-y-2">
                    <h3 className="text-2xl font-semibold text-gray-900 dark:text-white">
                      {t('Control Your Voice with Custom Tones')}
                    </h3>
                    <p className="text-gray-600 dark:text-gray-400">
                      {t('Create voice profiles for consistent writing style')}
                    </p>
                  </div>

                  {/* Example */}
                  <div className="border-t border-gray-200 dark:border-gray-700 pt-6">
                    <div className="flex items-center gap-2 mb-4">
                      <IconInfoCircle
                        size={18}
                        className="text-gray-600 dark:text-gray-400"
                      />
                      <h4 className="text-sm font-semibold text-gray-700 dark:text-gray-300">
                        {t('What Tones Capture')}
                      </h4>
                    </div>

                    <div className="space-y-3">
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                        <div className="p-3 rounded-lg border border-neutral-200 dark:border-neutral-700 bg-white dark:bg-neutral-900">
                          <p className="text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1">
                            {t('Writing Style')}
                          </p>
                          <p className="text-xs text-gray-600 dark:text-gray-400">
                            {t(
                              'Sentence length, complexity, active vs passive voice',
                            )}
                          </p>
                        </div>
                        <div className="p-3 rounded-lg border border-neutral-200 dark:border-neutral-700 bg-white dark:bg-neutral-900">
                          <p className="text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1">
                            {t('Vocabulary')}
                          </p>
                          <p className="text-xs text-gray-600 dark:text-gray-400">
                            {t('Preferred words, phrases to use or avoid')}
                          </p>
                        </div>
                        <div className="p-3 rounded-lg border border-neutral-200 dark:border-neutral-700 bg-white dark:bg-neutral-900">
                          <p className="text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1">
                            {t('Formality')}
                          </p>
                          <p className="text-xs text-gray-600 dark:text-gray-400">
                            {t(
                              'Professional, casual, conversational, technical',
                            )}
                          </p>
                        </div>
                        <div className="p-3 rounded-lg border border-neutral-200 dark:border-neutral-700 bg-white dark:bg-neutral-900">
                          <p className="text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1">
                            {t('Personality')}
                          </p>
                          <p className="text-xs text-gray-600 dark:text-gray-400">
                            {t('Friendly, authoritative, empathetic, direct')}
                          </p>
                        </div>
                      </div>

                      {/* How to use */}
                      <div className="flex items-start gap-3 p-3 rounded-lg bg-neutral-50 dark:bg-neutral-800/50">
                        <div className="shrink-0 w-6 h-6 flex items-center justify-center rounded bg-neutral-200 dark:bg-neutral-700 mt-0.5">
                          <IconVolume
                            size={14}
                            className="text-neutral-600 dark:text-neutral-400"
                          />
                        </div>
                        <div className="flex-1">
                          <p className="text-sm text-gray-600 dark:text-gray-400">
                            {t(
                              'Apply tones in chat via Expand Actions to ensure all responses match your desired voice',
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
        {selectedTone ? (
          <div className="flex-1 overflow-y-auto p-6">
            <div className="flex items-start justify-between mb-4">
              <div className="flex-1 min-w-0">
                <h2 className="text-2xl font-semibold text-gray-900 dark:text-white mb-2">
                  {selectedTone.name}
                </h2>
                {selectedTone.description && (
                  <p className="text-sm text-gray-600 dark:text-gray-400 mb-3">
                    {selectedTone.description}
                  </p>
                )}
                {selectedTone.tags && selectedTone.tags.length > 0 && (
                  <div className="flex flex-wrap gap-2 mb-4">
                    {selectedTone.tags.map((tag) => (
                      <span
                        key={tag}
                        className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 dark:bg-blue-900/30 text-blue-800 dark:text-blue-300"
                      >
                        {tag}
                      </span>
                    ))}
                  </div>
                )}
              </div>
            </div>

            {/* Voice Rules */}
            <div className="mb-6">
              <h3 className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-3">
                Voice Guidelines
              </h3>
              <div className="p-4 bg-gray-50 dark:bg-[#2a2a2a] rounded-lg border border-gray-200 dark:border-gray-700">
                <pre className="text-sm text-gray-900 dark:text-gray-100 whitespace-pre-wrap font-sans">
                  {selectedTone.voiceRules}
                </pre>
              </div>
            </div>

            {/* Examples (if any) */}
            {selectedTone.examples && (
              <div className="mb-6">
                <h3 className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-3">
                  Examples
                </h3>
                <div className="p-4 bg-gray-50 dark:bg-[#2a2a2a] rounded-lg border border-gray-200 dark:border-gray-700">
                  <pre className="text-sm text-gray-900 dark:text-gray-100 whitespace-pre-wrap font-sans">
                    {selectedTone.examples}
                  </pre>
                </div>
              </div>
            )}

            <div className="flex gap-2">
              <button
                onClick={() => {
                  setToneModalId(selectedTone.id);
                  setToneModalName(selectedTone.name);
                  setToneModalDescription(selectedTone.description || '');
                  setToneModalVoiceRules(selectedTone.voiceRules);
                  setToneModalExamples(selectedTone.examples || '');
                  setToneModalTags(selectedTone.tags || []);
                  setIsToneModalOpen(true);
                }}
                className="px-4 py-2 text-sm font-medium rounded-lg bg-blue-600 text-white hover:bg-blue-700"
              >
                Edit
              </button>
              <button
                onClick={(e) => handleDeleteTone(selectedTone.id, e)}
                className="px-4 py-2 text-sm font-medium text-red-600 dark:text-red-400 border border-red-300 dark:border-red-700 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg"
              >
                Delete
              </button>
            </div>
          </div>
        ) : (
          <div className="flex-1 flex items-center justify-center text-gray-400 dark:text-gray-600">
            <div className="text-center">
              <IconVolume size={48} className="mx-auto mb-3 opacity-50" />
              <p>Select a tone to view details</p>
            </div>
          </div>
        )}
      </div>

      {/* Tone Editor Modal */}
      <ToneDashboard
        isOpen={isToneModalOpen}
        onClose={() => setIsToneModalOpen(false)}
        onSave={(
          name: string,
          description: string,
          voiceRules: string,
          examples: string,
          tags: string[],
        ) => {
          if (toneModalId) {
            // Update existing tone
            updateTone(toneModalId, {
              name,
              description,
              voiceRules,
              examples,
              tags,
              updatedAt: new Date().toISOString(),
            });
          } else {
            // Create new tone
            const newTone: Tone = {
              id: uuidv4(),
              name,
              description,
              voiceRules,
              examples,
              tags,
              createdAt: new Date().toISOString(),
              folderId: null,
            };
            addTone(newTone);
          }
          setIsToneModalOpen(false);
        }}
        initialName={toneModalName}
        initialDescription={toneModalDescription}
        initialVoiceRules={toneModalVoiceRules}
        initialExamples={toneModalExamples}
        initialTags={toneModalTags}
      />
    </div>
  );
}
