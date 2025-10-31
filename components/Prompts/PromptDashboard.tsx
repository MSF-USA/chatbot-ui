'use client';

import {
  IconBraces,
  IconBulb,
  IconCheck,
  IconInfoCircle,
  IconLoader2,
  IconSparkles,
  IconX,
} from '@tabler/icons-react';
import { FC, useEffect, useState } from 'react';

import { useTranslations } from 'next-intl';

import { useTones } from '@/client/hooks/settings/useTones';

import {
  PromptRevisionResponse,
  generatePrompt,
  revisePrompt,
} from '@/lib/services/prompts/promptRevisionService';

import { extractVariables } from '@/lib/utils/chat/variables';

import { DashboardModal } from '@/components/UI/DashboardModal';
import {
  FileStatus,
  FileUploadSection,
} from '@/components/UI/FileUploadSection';

interface PromptDashboardProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (
    name: string,
    description: string,
    content: string,
    toneId?: string | null,
  ) => void;
  initialName?: string;
  initialDescription?: string;
  initialContent?: string;
  initialToneId?: string | null;
}

export const PromptDashboard: FC<PromptDashboardProps> = ({
  isOpen,
  onClose,
  onSave,
  initialName = '',
  initialDescription = '',
  initialContent = '',
  initialToneId = null,
}) => {
  const t = useTranslations();
  const { tones } = useTones();
  const [name, setName] = useState(initialName);
  const [description, setDescription] = useState(initialDescription);
  const [content, setContent] = useState(initialContent);
  const [selectedToneId, setSelectedToneId] = useState<string | null>(
    initialToneId,
  );
  const [revisionGoal, setRevisionGoal] = useState('');
  const [isRevising, setIsRevising] = useState(false);
  const [revisionResult, setRevisionResult] =
    useState<PromptRevisionResponse | null>(null);
  const [showVariableHelp, setShowVariableHelp] = useState(false);
  const [uploadedFiles, setUploadedFiles] = useState<File[]>([]);
  const [fileContents, setFileContents] = useState<string>('');
  const [fileStatuses, setFileStatuses] = useState<{
    [fileName: string]: FileStatus;
  }>({});

  // Sync with initial values when modal opens or props change
  useEffect(() => {
    if (isOpen) {
      setName(initialName);
      setDescription(initialDescription);
      setContent(initialContent);
      setSelectedToneId(initialToneId);
      setRevisionGoal('');
      setRevisionResult(null);
      setShowVariableHelp(false);
    }
  }, [isOpen, initialName, initialDescription, initialContent, initialToneId]);

  const handleSave = () => {
    if (!name.trim()) return;
    onSave(name.trim(), description.trim(), content, selectedToneId);
    handleClose();
  };

  const handleClose = () => {
    setName('');
    setDescription('');
    setContent('');
    setSelectedToneId(null);
    setRevisionGoal('');
    setRevisionResult(null);
    setShowVariableHelp(false);
    setUploadedFiles([]);
    setFileContents('');
    onClose();
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    if (files.length === 0) return;

    setUploadedFiles(files);

    // Initialize file statuses
    const initialStatuses: { [fileName: string]: FileStatus } = {};
    files.forEach((file) => {
      initialStatuses[file.name] = 'completed'; // Mark as completed immediately for simple handling
    });
    setFileStatuses(initialStatuses);

    // Process files to extract text content
    let extractedContent = '';
    for (const file of files) {
      if (
        file.type.startsWith('text/') ||
        file.name.endsWith('.md') ||
        file.name.endsWith('.txt')
      ) {
        // Text files - read directly
        const text = await file.text();
        extractedContent += `\n\n=== ${file.name} ===\n${text}`;
      } else if (
        file.type.startsWith('audio/') ||
        file.type.startsWith('video/')
      ) {
        // Audio/Video - will be transcribed by backend
        extractedContent += `\n\n[Transcribe: ${file.name}]`;
      }
    }

    setFileContents(extractedContent);
  };

  const handleRemoveFile = (index: number) => {
    const fileToRemove = uploadedFiles[index];
    setUploadedFiles((prev) => prev.filter((_, i) => i !== index));

    // Remove from fileStatuses
    setFileStatuses((prev) => {
      const updated = { ...prev };
      delete updated[fileToRemove.name];
      return updated;
    });
  };

  const handleGeneratePrompt = async () => {
    if (!revisionGoal.trim() && !description.trim()) {
      alert(
        'Please provide either a description or goal for prompt generation',
      );
      return;
    }

    setIsRevising(true);
    setRevisionResult(null);

    try {
      const data = await generatePrompt({
        promptName: name || 'Untitled Prompt',
        promptDescription: description,
        revisionGoal: revisionGoal || description,
        additionalContext: fileContents || undefined,
      });

      setRevisionResult(data);
    } catch (error) {
      console.error('Generation error:', error);
      alert(
        error instanceof Error ? error.message : 'Failed to generate prompt',
      );
    } finally {
      setIsRevising(false);
    }
  };

  const handleRevisePrompt = async () => {
    if (!content.trim()) {
      alert('Please enter prompt content first');
      return;
    }

    setIsRevising(true);
    setRevisionResult(null);

    try {
      const data = await revisePrompt({
        promptName: name || 'Untitled Prompt',
        promptDescription: description,
        promptContent: content,
        revisionGoal: revisionGoal || undefined,
        generateNew: false,
        additionalContext: fileContents || undefined,
      });

      setRevisionResult(data);
    } catch (error) {
      console.error('Revision error:', error);
      alert(error instanceof Error ? error.message : 'Failed to revise prompt');
    } finally {
      setIsRevising(false);
    }
  };

  const handleApplyRevision = () => {
    if (revisionResult?.revisedPrompt) {
      setContent(revisionResult.revisedPrompt);
      setRevisionResult(null);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) {
      e.preventDefault();
      handleSave();
    }
  };

  const variables = extractVariables(content);

  if (!isOpen) return null;

  // Left Panel - Form Fields
  const leftPanel = (
    <>
      {/* Name */}
      <div>
        <label className="block text-sm font-semibold mb-2 text-gray-900 dark:text-white">
          {t('Prompt Name')} <span className="text-red-500">*</span>
        </label>
        <input
          type="text"
          value={name}
          onChange={(e) => setName(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="e.g., Email Response Template"
          className="w-full rounded-lg border border-gray-300 bg-white px-4 py-3 text-sm text-gray-900 shadow-sm transition-all placeholder:text-gray-400 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20 dark:border-gray-600 dark:bg-[#2a2a2a] dark:text-gray-100 dark:placeholder:text-gray-500"
          autoFocus
        />
      </div>

      {/* Description */}
      <div>
        <label className="block text-sm font-semibold mb-2 text-gray-900 dark:text-white">
          {t('Description')}{' '}
          <span className="text-xs text-gray-500 dark:text-gray-400 font-normal">
            ({t('Optional')})
          </span>
        </label>
        <textarea
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="Brief description of what this prompt does..."
          rows={3}
          className="w-full rounded-lg border border-gray-300 bg-white px-4 py-3 text-sm text-gray-900 shadow-sm transition-all placeholder:text-gray-400 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20 dark:border-gray-600 dark:bg-[#2a2a2a] dark:text-gray-100 dark:placeholder:text-gray-500 resize-none"
        />
      </div>

      {/* Tone Selection */}
      <div>
        <label className="block text-sm font-semibold mb-2 text-gray-900 dark:text-white">
          {t('Tone')}{' '}
          <span className="text-xs text-gray-500 dark:text-gray-400 font-normal">
            ({t('Optional')})
          </span>
        </label>
        <select
          value={selectedToneId || ''}
          onChange={(e) => setSelectedToneId(e.target.value || null)}
          className="w-full rounded-lg border border-gray-300 bg-white px-4 py-3 text-sm text-gray-900 shadow-sm transition-all focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20 dark:border-gray-600 dark:bg-[#2a2a2a] dark:text-gray-100"
        >
          <option value="">No tone (use default)</option>
          {tones.map((tone) => (
            <option key={tone.id} value={tone.id}>
              {tone.name}
            </option>
          ))}
        </select>
        {selectedToneId && (
          <p className="mt-2 text-xs text-gray-600 dark:text-gray-400">
            {tones.find((t) => t.id === selectedToneId)?.description}
          </p>
        )}
      </div>

      {/* Prompt Content */}
      <div>
        <div className="flex items-center justify-between mb-2">
          <label className="block text-sm font-semibold text-gray-900 dark:text-white">
            {t('Prompt Content')} <span className="text-red-500">*</span>
          </label>
          <button
            onClick={() => setShowVariableHelp(!showVariableHelp)}
            className="flex items-center gap-1.5 text-xs text-blue-600 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300 transition-colors"
          >
            <IconInfoCircle size={14} />
            <span>Variable Help</span>
          </button>
        </div>

        {showVariableHelp && (
          <div className="mb-3 p-3 bg-blue-50 dark:bg-blue-900/10 border border-blue-100 dark:border-blue-900/30 rounded-lg text-xs text-gray-700 dark:text-gray-300">
            <p className="mb-2">
              <strong>Use variables</strong> to make your prompts dynamic. Wrap
              variable names in double curly braces:
            </p>
            <code className="block bg-white dark:bg-gray-800 px-3 py-2 rounded border border-gray-200 dark:border-gray-700 mb-2">
              Write a professional email to {`{{recipient}}`} about{' '}
              {`{{topic}}`} with a {`{{tone}}`} tone.
            </code>
            <p className="text-gray-600 dark:text-gray-400">
              You&apos;ll be prompted to fill in these values when using the
              prompt in chat.
            </p>
          </div>
        )}

        <textarea
          value={content}
          onChange={(e) => setContent(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="Enter your prompt here... Use {{variableName}} for dynamic placeholders."
          rows={12}
          className="w-full rounded-lg border border-gray-300 bg-white px-4 py-3 text-sm text-gray-900 shadow-sm transition-all placeholder:text-gray-400 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20 dark:border-gray-600 dark:bg-[#2a2a2a] dark:text-gray-100 dark:placeholder:text-gray-500 resize-none font-mono"
        />

        {/* Variables Preview */}
        {variables.length > 0 && (
          <div className="mt-3 p-3 bg-gray-50 dark:bg-gray-800/50 rounded-lg">
            <div className="flex items-center gap-2 text-xs font-semibold text-gray-700 dark:text-gray-300 mb-2">
              <IconBraces size={14} />
              <span>Detected Variables ({variables.length})</span>
            </div>
            <div className="flex flex-wrap gap-2">
              {variables.map((variable, index) => (
                <span
                  key={index}
                  className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 rounded-md text-xs font-mono"
                >
                  {`{{${variable}}}`}
                </span>
              ))}
            </div>
          </div>
        )}
      </div>
    </>
  );

  // Right Panel - AI Assistant
  const rightPanel = (
    <div
      className={`flex flex-col bg-gray-50 dark:bg-[#1a1a1a] transition-all duration-300 w-full ${
        revisionResult ? 'md:w-[600px]' : 'md:w-96'
      }`}
    >
      <div className="flex-shrink-0 px-4 py-3 border-b border-gray-200 dark:border-gray-700">
        <div className="flex items-center gap-2">
          <IconSparkles size={16} className="text-purple-500" />
          <h3 className="text-sm font-semibold text-gray-900 dark:text-white">
            AI Assistant
          </h3>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {/* Revision Goal Input */}
        <div>
          <label className="block text-xs font-medium mb-2 text-gray-700 dark:text-gray-300">
            {content.trim()
              ? 'What would you like to improve?'
              : 'What should this prompt do?'}
          </label>
          <textarea
            value={revisionGoal}
            onChange={(e) => setRevisionGoal(e.target.value)}
            placeholder={
              content.trim()
                ? 'e.g., Make it more professional, add examples, improve clarity...'
                : 'e.g., Generate a professional email template with variables for recipient and topic...'
            }
            rows={3}
            className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-xs text-gray-900 placeholder:text-gray-400 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20 dark:border-gray-600 dark:bg-[#2a2a2a] dark:text-gray-100 resize-none"
            disabled={isRevising}
          />
        </div>

        {/* File Upload Section */}
        <div>
          <label className="block text-xs font-medium mb-2 text-gray-700 dark:text-gray-300">
            Add Context (Optional)
          </label>
          <FileUploadSection
            uploadedFiles={uploadedFiles}
            fileStatuses={fileStatuses}
            isProcessing={isRevising}
            onFileUpload={handleFileUpload}
            onRemoveFile={handleRemoveFile}
            acceptedFileTypes="audio/*,video/*,text/*,.txt,.md,.pdf,.doc,.docx"
          />
        </div>

        <button
          onClick={content.trim() ? handleRevisePrompt : handleGeneratePrompt}
          disabled={isRevising}
          className="w-full inline-flex items-center justify-center gap-2 rounded-lg bg-gradient-to-r from-purple-600 to-blue-600 px-4 py-2.5 text-sm font-medium text-white shadow-md transition-all hover:from-purple-700 hover:to-blue-700 hover:shadow-lg focus:outline-none focus:ring-2 focus:ring-purple-500/50 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {isRevising ? (
            <>
              <IconLoader2 size={16} className="animate-spin" />
              <span>{content.trim() ? 'Revising...' : 'Generating...'}</span>
            </>
          ) : (
            <>
              <IconSparkles size={16} />
              <span>
                {content.trim() ? 'Revise with AI' : 'Generate Prompt'}
              </span>
            </>
          )}
        </button>

        {/* Revision Results */}
        {revisionResult && (
          <div className="space-y-4 animate-fade-in-fast">
            <div className="border-t border-gray-200 dark:border-gray-700 pt-4">
              <div className="flex items-center gap-2 mb-3">
                <IconCheck size={16} className="text-green-500" />
                <h4 className="text-sm font-semibold text-gray-900 dark:text-white">
                  {content.trim() ? 'Revision Complete' : 'Generation Complete'}
                </h4>
              </div>

              {/* Revised Prompt Preview */}
              <div className="mb-4">
                <div className="text-xs font-medium text-gray-700 dark:text-gray-300 mb-2">
                  {content.trim() ? 'Revised Prompt:' : 'Generated Prompt:'}
                </div>
                <div className="p-3 bg-white dark:bg-[#2a2a2a] border border-gray-200 dark:border-gray-700 rounded-lg max-h-48 overflow-y-auto">
                  <pre className="text-xs text-gray-900 dark:text-gray-100 whitespace-pre-wrap font-mono">
                    {revisionResult.revisedPrompt}
                  </pre>
                </div>
                <button
                  onClick={handleApplyRevision}
                  className="mt-2 w-full flex items-center justify-center gap-2 px-3 py-2 bg-green-600 hover:bg-green-700 text-white text-xs font-medium rounded-lg transition-colors"
                >
                  <IconCheck size={14} />
                  {content.trim() ? 'Apply This Revision' : 'Use This Prompt'}
                </button>
              </div>

              {/* Improvements */}
              {revisionResult.improvements &&
                revisionResult.improvements.length > 0 && (
                  <div className="mb-4">
                    <div className="text-xs font-medium text-gray-700 dark:text-gray-300 mb-2">
                      Improvements Made:
                    </div>
                    <div className="space-y-2">
                      {revisionResult.improvements.map((improvement, index) => (
                        <div
                          key={index}
                          className="p-2 bg-white dark:bg-[#2a2a2a] border border-gray-200 dark:border-gray-700 rounded-lg"
                        >
                          <div className="text-xs font-semibold text-blue-600 dark:text-blue-400 mb-1">
                            {improvement.category}
                          </div>
                          <div className="text-xs text-gray-600 dark:text-gray-400">
                            {improvement.description}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

              {/* Suggestions */}
              {revisionResult.suggestions &&
                revisionResult.suggestions.length > 0 && (
                  <div>
                    <div className="flex items-center gap-1.5 text-xs font-medium text-gray-700 dark:text-gray-300 mb-2">
                      <IconBulb size={14} className="text-yellow-500" />
                      <span>Tips:</span>
                    </div>
                    <ul className="space-y-1.5">
                      {revisionResult.suggestions.map((suggestion, index) => (
                        <li
                          key={index}
                          className="text-xs text-gray-600 dark:text-gray-400 pl-3 relative before:absolute before:left-0 before:top-1.5 before:w-1.5 before:h-1.5 before:bg-yellow-500 before:rounded-full"
                        >
                          {suggestion}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
            </div>
          </div>
        )}

        {/* Help Section */}
        {!revisionResult && !isRevising && (
          <div className="border border-gray-200 dark:border-gray-700 rounded-lg p-3">
            <div className="flex items-center gap-2 mb-2">
              <IconBulb size={14} className="text-gray-400" />
              <h4 className="text-xs font-semibold text-gray-700 dark:text-gray-300">
                How AI Can Help
              </h4>
            </div>
            <ul className="space-y-1.5 text-xs text-gray-600 dark:text-gray-400">
              <li>• Improve clarity and structure</li>
              <li>• Suggest useful variables</li>
              <li>• Add context and examples</li>
              <li>• Optimize for better results</li>
            </ul>
          </div>
        )}
      </div>
    </div>
  );

  // Footer - Action Buttons
  const footer = (
    <div className="flex items-center justify-end gap-2">
      <button
        onClick={handleClose}
        className="rounded-lg border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 shadow-sm transition-colors hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-500/20 dark:border-gray-600 dark:bg-gray-800 dark:text-gray-300 dark:hover:bg-gray-700"
      >
        Cancel
      </button>
      <button
        onClick={handleSave}
        disabled={!name.trim()}
        className="inline-flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white shadow-sm transition-all hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500/50 disabled:opacity-50 disabled:cursor-not-allowed"
      >
        <IconCheck size={16} />
        <span>Save Prompt</span>
      </button>
    </div>
  );

  return (
    <DashboardModal
      isOpen={isOpen}
      onClose={handleClose}
      title={initialName ? t('Edit Prompt') : t('Create Prompt')}
      subtitle="Build reusable prompts with AI assistance"
      leftPanel={leftPanel}
      rightPanel={rightPanel}
      footer={footer}
    />
  );
};
