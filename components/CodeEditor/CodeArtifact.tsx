'use client';

import { IconDownload, IconX } from '@tabler/icons-react';
import { useEffect, useRef, useState } from 'react';
import toast from 'react-hot-toast';

import { useTheme } from '@/client/hooks/ui/useTheme';

import CodeEditor from './CodeEditor';

import { useCodeEditorStore } from '@/client/stores/codeEditorStore';

interface CodeArtifactProps {
  onClose: () => void;
}

/**
 * CodeArtifact - Claude Artifacts-style code viewer
 *
 * Appears as a split panel when clicking code blocks in chat.
 * Allows viewing and editing code with Monaco editor.
 * User edits update immediately. AI responses can be opened as new artifacts.
 */
export default function CodeArtifact({ onClose }: CodeArtifactProps) {
  const theme = useTheme();
  const {
    fileName,
    language,
    modifiedCode,
    downloadFile,
    setFileName,
    setIsEditorOpen,
  } = useCodeEditorStore();

  const [isEditing, setIsEditing] = useState(false);

  // Track that editor is open
  useEffect(() => {
    setIsEditorOpen(true);
    return () => setIsEditorOpen(false);
  }, [setIsEditorOpen]);

  const handleDownload = () => {
    try {
      downloadFile();
      toast.success('File downloaded');
    } catch (error) {
      toast.error('Failed to download');
    }
  };

  return (
    <div className="flex flex-col h-full w-full">
      {/* Toolbar */}
      <div className="relative flex items-center justify-between px-4 py-3 border-b border-neutral-200 dark:border-neutral-700 bg-neutral-50 dark:bg-neutral-800 flex-shrink-0">
        {/* Left: Filename and Language */}
        <div className="flex items-center gap-2">
          {isEditing ? (
            <input
              type="text"
              value={fileName}
              onChange={(e) => setFileName(e.target.value)}
              onBlur={() => setIsEditing(false)}
              onKeyDown={(e) => e.key === 'Enter' && setIsEditing(false)}
              className="text-sm font-medium bg-neutral-100 dark:bg-neutral-900/50 rounded px-2 py-1 border-none focus:outline-none focus:ring-1 focus:ring-blue-500 dark:text-white"
              autoFocus
            />
          ) : (
            <button
              onClick={() => setIsEditing(true)}
              className="text-sm font-medium bg-neutral-100 dark:bg-neutral-900/50 rounded px-2 py-1 hover:bg-neutral-200 dark:hover:bg-neutral-900 transition-colors dark:text-white"
            >
              {fileName}
            </button>
          )}
          <span className="text-xs text-neutral-500 dark:text-neutral-400">
            {language}
          </span>
        </div>

        {/* Center: Experimental Badge */}
        <div className="absolute left-1/2 transform -translate-x-1/2">
          <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300">
            Experimental
          </span>
        </div>

        {/* Right: Action Buttons */}
        <div className="flex items-center gap-1.5">
          <button
            onClick={handleDownload}
            disabled={!modifiedCode}
            className="p-2 rounded-lg text-neutral-700 dark:text-neutral-300 hover:bg-neutral-200 dark:hover:bg-neutral-700 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
            title="Download"
          >
            <IconDownload size={18} />
          </button>

          <div className="w-px h-5 bg-neutral-300 dark:bg-neutral-700 mx-1" />

          <button
            onClick={onClose}
            className="p-2 rounded-lg text-neutral-700 dark:text-neutral-300 hover:bg-red-50 dark:hover:bg-red-900/20 hover:text-red-600 dark:hover:text-red-400 transition-colors"
            title="Close"
          >
            <IconX size={18} />
          </button>
        </div>
      </div>

      {/* Code Editor */}
      <div className="flex-1 overflow-hidden min-h-0">
        <CodeEditor theme={theme} />
      </div>
    </div>
  );
}
