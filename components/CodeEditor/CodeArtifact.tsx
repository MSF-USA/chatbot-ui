'use client';

import {
  IconDeviceFloppy,
  IconDownload,
  IconMessagePlus,
  IconX,
} from '@tabler/icons-react';
import { useEffect } from 'react';
import { useState } from 'react';
import toast from 'react-hot-toast';

import { useCodeToChat } from '@/client/hooks/code/useCodeToChat';
import { useTheme } from '@/client/hooks/ui/useTheme';

import CodeEditor from './CodeEditor';

import { useCodeEditorStore } from '@/client/stores/codeEditorStore';

interface CodeArtifactProps {
  onClose: () => void;
}

/**
 * CodeArtifact - Claude Artifacts-style code viewer
 *
 * Appears as an overlay when clicking code blocks in chat.
 * Allows viewing and editing code with Monaco editor.
 */
export default function CodeArtifact({ onClose }: CodeArtifactProps) {
  const theme = useTheme();
  const {
    fileName,
    modifiedCode,
    isDirty,
    acceptChanges,
    downloadFile,
    setFileName,
    setIsEditorOpen,
  } = useCodeEditorStore();

  const { sendCodeToChat, canSendCode } = useCodeToChat();
  const [showPromptInput, setShowPromptInput] = useState(false);
  const [promptText, setPromptText] = useState('');

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

  const handleSave = () => {
    acceptChanges();
    toast.success('Saved');
  };

  const handleSendToChat = async () => {
    if (!canSendCode) return;
    await sendCodeToChat(promptText.trim());
    setPromptText('');
    setShowPromptInput(false);
    toast.success('Code sent to chat');
  };

  return (
    <div className="flex flex-col h-full w-full">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-neutral-200 dark:border-neutral-700 bg-neutral-50 dark:bg-neutral-800 flex-shrink-0">
        <div className="flex items-center gap-2 flex-1 min-w-0">
          <input
            type="text"
            value={fileName}
            onChange={(e) => setFileName(e.target.value)}
            className="text-sm font-medium bg-transparent border-none focus:outline-none focus:ring-1 focus:ring-blue-500 rounded px-2 py-1 dark:text-white w-48"
            placeholder="untitled.ts"
          />
          {isDirty && (
            <span className="text-xs text-amber-600 dark:text-amber-400 whitespace-nowrap">
              • Unsaved
            </span>
          )}
        </div>

        <div className="flex items-center gap-1.5">
          {isDirty && (
            <button
              onClick={handleSave}
              className="flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 rounded-lg transition-colors"
              title="Save changes"
            >
              <IconDeviceFloppy size={16} />
              <span className="hidden sm:inline">Save</span>
            </button>
          )}

          <button
            onClick={() => setShowPromptInput(!showPromptInput)}
            disabled={!modifiedCode}
            className="p-2 rounded-lg text-neutral-700 dark:text-neutral-300 hover:bg-neutral-200 dark:hover:bg-neutral-700 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
            title="Send to chat"
          >
            <IconMessagePlus size={18} />
          </button>

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

      {/* Send to Chat prompt (collapsible) */}
      {showPromptInput && (
        <div className="flex items-center gap-2 px-4 py-3 bg-blue-50 dark:bg-blue-950/20 border-b border-blue-200 dark:border-blue-900 flex-shrink-0">
          <input
            type="text"
            value={promptText}
            onChange={(e) => setPromptText(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                handleSendToChat();
              } else if (e.key === 'Escape') {
                setShowPromptInput(false);
                setPromptText('');
              }
            }}
            placeholder="Ask AI to modify this code... (Enter to send)"
            className="flex-1 px-3 py-2 text-sm border-none bg-white dark:bg-neutral-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500 rounded-md"
            autoFocus
          />
          <button
            onClick={handleSendToChat}
            disabled={!canSendCode}
            className="px-4 py-2 text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 disabled:bg-neutral-400 disabled:cursor-not-allowed rounded-md transition-colors"
          >
            Send
          </button>
          <button
            onClick={() => {
              setShowPromptInput(false);
              setPromptText('');
            }}
            className="p-2 text-neutral-700 dark:text-neutral-300 hover:text-neutral-900 dark:hover:text-neutral-100 rounded-md transition-colors"
          >
            <IconX size={18} />
          </button>
        </div>
      )}

      {/* Code Editor */}
      <div className="flex-1 overflow-hidden min-h-0">
        <CodeEditor theme={theme} showDiff={false} />
      </div>
    </div>
  );
}
