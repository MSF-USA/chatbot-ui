'use client';

import {
  IconBraces,
  IconBulb,
  IconCheck,
  IconFile,
  IconFileText,
  IconInfoCircle,
  IconLoader2,
  IconMusic,
  IconSparkles,
  IconUpload,
  IconVideo,
  IconX,
} from '@tabler/icons-react';
import { FC, useEffect, useState } from 'react';

import { useTranslations } from 'next-intl';

import { useTones } from '@/lib/hooks/settings/useTones';

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

interface Improvement {
  category: string;
  description: string;
}

interface RevisionResponse {
  success: boolean;
  revisedPrompt: string;
  improvements: Improvement[];
  suggestions: string[];
  error?: string;
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
  const [revisionResult, setRevisionResult] = useState<RevisionResponse | null>(
    null,
  );
  const [showVariableHelp, setShowVariableHelp] = useState(false);
  const [uploadedFiles, setUploadedFiles] = useState<File[]>([]);
  const [fileContents, setFileContents] = useState<string>('');

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
    setUploadedFiles((prev) => prev.filter((_, i) => i !== index));
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
      const response = await fetch('/api/prompts/revise', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          promptName: name || 'Untitled Prompt',
          promptDescription: description,
          promptContent: '',
          revisionGoal: revisionGoal || description,
          generateNew: true,
          additionalContext: fileContents || undefined,
        }),
      });

      const data: RevisionResponse = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to generate prompt');
      }

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
      const response = await fetch('/api/prompts/revise', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          promptName: name || 'Untitled Prompt',
          promptDescription: description,
          promptContent: content,
          revisionGoal: revisionGoal || undefined,
          generateNew: false,
          additionalContext: fileContents || undefined,
        }),
      });

      const data: RevisionResponse = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to revise prompt');
      }

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

  // Extract variables from content
  const extractVariables = (text: string): string[] => {
    const regex = /{{(.*?)}}/g;
    const matches = text.matchAll(regex);
    const vars = Array.from(matches, (m) => m[1]).filter(
      (v, i, arr) => arr.indexOf(v) === i,
    );
    return vars;
  };

  const variables = extractVariables(content);

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm animate-fade-in-fast"
      onClick={handleClose}
    >
      <div
        className="relative w-full max-w-6xl h-[90vh] mx-4 bg-white dark:bg-[#212121] rounded-xl shadow-2xl flex flex-col overflow-hidden animate-modal-in"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex-shrink-0 border-b border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-[#1a1a1a] px-6 py-4">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
                {initialName ? t('Edit Prompt') : t('Create Prompt')}
              </h2>
              <p className="text-sm text-gray-600 dark:text-gray-400">
                Build reusable prompts with AI assistance
              </p>
            </div>
            <button
              onClick={handleClose}
              className="p-2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800"
            >
              <IconX size={20} />
            </button>
          </div>
        </div>

        {/* Content Area */}
        <div className="flex-1 overflow-hidden flex">
          {/* Left Panel - Editor */}
          <div className="flex-1 flex flex-col overflow-hidden border-r border-gray-200 dark:border-gray-700">
            <div className="flex-1 overflow-y-auto p-6 space-y-6">
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
                    {t('Prompt Content')}{' '}
                    <span className="text-red-500">*</span>
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
                      <strong>Use variables</strong> to make your prompts
                      dynamic. Wrap variable names in double curly braces:
                    </p>
                    <code className="block bg-white dark:bg-gray-800 px-3 py-2 rounded border border-gray-200 dark:border-gray-700 mb-2">
                      Write a professional email to {`{{recipient}}`} about{' '}
                      {`{{topic}}`} with a {`{{tone}}`} tone.
                    </code>
                    <p className="text-gray-600 dark:text-gray-400">
                      You&apos;ll be prompted to fill in these values when using
                      the prompt in chat.
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
            </div>
          </div>

          {/* Right Panel - AI Assistant */}
          <div
            className={`flex flex-col bg-gray-50 dark:bg-[#1a1a1a] transition-all duration-300 ${
              revisionResult ? 'w-[600px]' : 'w-96'
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
                <div className="space-y-2">
                  <label className="flex items-center justify-center gap-2 w-full px-3 py-2 border-2 border-dashed border-gray-300 dark:border-gray-600 rounded-lg cursor-pointer hover:border-blue-500 dark:hover:border-blue-400 hover:bg-blue-50 dark:hover:bg-blue-900/10 transition-all">
                    <IconUpload
                      size={14}
                      className="text-gray-500 dark:text-gray-400"
                    />
                    <span className="text-xs text-gray-600 dark:text-gray-400">
                      Upload files (audio, video, text, docs)
                    </span>
                    <input
                      type="file"
                      multiple
                      accept="audio/*,video/*,text/*,.txt,.md,.pdf,.doc,.docx"
                      onChange={handleFileUpload}
                      className="hidden"
                      disabled={isRevising}
                    />
                  </label>

                  {uploadedFiles.length > 0 && (
                    <div className="space-y-1">
                      {uploadedFiles.map((file, index) => (
                        <div
                          key={index}
                          className="flex items-center justify-between p-2 bg-white dark:bg-[#2a2a2a] border border-gray-200 dark:border-gray-700 rounded-lg"
                        >
                          <div className="flex items-center gap-2 flex-1 min-w-0">
                            {file.type.startsWith('audio/') ? (
                              <IconMusic
                                size={14}
                                className="text-purple-500 flex-shrink-0"
                              />
                            ) : file.type.startsWith('video/') ? (
                              <IconVideo
                                size={14}
                                className="text-blue-500 flex-shrink-0"
                              />
                            ) : file.type.startsWith('text/') ||
                              file.name.endsWith('.txt') ||
                              file.name.endsWith('.md') ? (
                              <IconFileText
                                size={14}
                                className="text-green-500 flex-shrink-0"
                              />
                            ) : (
                              <IconFile
                                size={14}
                                className="text-gray-500 flex-shrink-0"
                              />
                            )}
                            <span className="text-xs text-gray-700 dark:text-gray-300 truncate">
                              {file.name}
                            </span>
                          </div>
                          <button
                            onClick={() => handleRemoveFile(index)}
                            className="p-1 hover:bg-gray-100 dark:hover:bg-gray-700 rounded transition-colors"
                          >
                            <IconX size={12} className="text-gray-500" />
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>

              <button
                onClick={
                  content.trim() ? handleRevisePrompt : handleGeneratePrompt
                }
                disabled={isRevising}
                className="w-full inline-flex items-center justify-center gap-2 rounded-lg bg-gradient-to-r from-purple-600 to-blue-600 px-4 py-2.5 text-sm font-medium text-white shadow-md transition-all hover:from-purple-700 hover:to-blue-700 hover:shadow-lg focus:outline-none focus:ring-2 focus:ring-purple-500/50 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isRevising ? (
                  <>
                    <IconLoader2 size={16} className="animate-spin" />
                    <span>
                      {content.trim() ? 'Revising...' : 'Generating...'}
                    </span>
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
                        {content.trim()
                          ? 'Revision Complete'
                          : 'Generation Complete'}
                      </h4>
                    </div>

                    {/* Revised Prompt Preview */}
                    <div className="mb-4">
                      <div className="text-xs font-medium text-gray-700 dark:text-gray-300 mb-2">
                        {content.trim()
                          ? 'Revised Prompt:'
                          : 'Generated Prompt:'}
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
                        {content.trim()
                          ? 'Apply This Revision'
                          : 'Use This Prompt'}
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
                            {revisionResult.improvements.map(
                              (improvement, index) => (
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
                              ),
                            )}
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
                            {revisionResult.suggestions.map(
                              (suggestion, index) => (
                                <li
                                  key={index}
                                  className="text-xs text-gray-600 dark:text-gray-400 pl-3 relative before:absolute before:left-0 before:top-1.5 before:w-1.5 before:h-1.5 before:bg-yellow-500 before:rounded-full"
                                >
                                  {suggestion}
                                </li>
                              ),
                            )}
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
        </div>

        {/* Footer */}
        <div className="flex-shrink-0 border-t border-gray-200 bg-gray-50 px-6 py-4 dark:border-gray-700 dark:bg-[#1a1a1a]">
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
        </div>
      </div>
    </div>
  );
};
