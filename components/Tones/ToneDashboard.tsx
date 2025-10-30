'use client';

import {
  IconCheck,
  IconFile,
  IconFileText,
  IconInfoCircle,
  IconLoader2,
  IconMusic,
  IconSparkles,
  IconTag,
  IconUpload,
  IconVideo,
  IconVolume,
  IconX,
} from '@tabler/icons-react';
import { FC, useEffect, useState } from 'react';

import { useTranslations } from 'next-intl';

interface ToneDashboardProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (
    name: string,
    description: string,
    voiceRules: string,
    examples: string,
    tags: string[],
  ) => void;
  initialName?: string;
  initialDescription?: string;
  initialVoiceRules?: string;
  initialExamples?: string;
  initialTags?: string[];
}

interface ToneAnalysisResponse {
  success: boolean;
  voiceRules: string;
  examples: string;
  suggestedTags: string[];
  characteristics: {
    category: string;
    description: string;
  }[];
  error?: string;
}

export const ToneDashboard: FC<ToneDashboardProps> = ({
  isOpen,
  onClose,
  onSave,
  initialName = '',
  initialDescription = '',
  initialVoiceRules = '',
  initialExamples = '',
  initialTags = [],
}) => {
  const t = useTranslations();
  const [name, setName] = useState(initialName);
  const [description, setDescription] = useState(initialDescription);
  const [voiceRules, setVoiceRules] = useState(initialVoiceRules);
  const [examples, setExamples] = useState(initialExamples);
  const [tags, setTags] = useState<string[]>(initialTags);
  const [tagInput, setTagInput] = useState('');
  const [analysisGoal, setAnalysisGoal] = useState('');
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [analysisResult, setAnalysisResult] =
    useState<ToneAnalysisResponse | null>(null);
  const [showTagHelp, setShowTagHelp] = useState(false);
  const [uploadedFiles, setUploadedFiles] = useState<File[]>([]);
  const [fileContents, setFileContents] = useState<string>('');
  const [fileUrls, setFileUrls] = useState<string[]>([]);
  const [fileStatuses, setFileStatuses] = useState<{
    [fileName: string]: 'uploading' | 'transcribing' | 'completed' | 'failed';
  }>({});

  // Sync with initial values when modal opens or props change
  useEffect(() => {
    if (isOpen) {
      setName(initialName);
      setDescription(initialDescription);
      setVoiceRules(initialVoiceRules);
      setExamples(initialExamples);
      setTags(initialTags);
      setTagInput('');
      setAnalysisGoal('');
      setAnalysisResult(null);
      setShowTagHelp(false);
      setUploadedFiles([]);
      setFileContents('');
      setFileUrls([]);
      setFileStatuses({});
    }
  }, [
    isOpen,
    initialName,
    initialDescription,
    initialVoiceRules,
    initialExamples,
    initialTags,
  ]);

  const handleSave = () => {
    if (!name.trim()) return;
    onSave(
      name.trim(),
      description.trim(),
      voiceRules.trim(),
      examples.trim(),
      tags,
    );
    handleClose();
  };

  const handleClose = () => {
    setName('');
    setDescription('');
    setVoiceRules('');
    setExamples('');
    setTags([]);
    setTagInput('');
    setAnalysisGoal('');
    setAnalysisResult(null);
    setShowTagHelp(false);
    setUploadedFiles([]);
    setFileContents('');
    setFileUrls([]);
    setFileStatuses({});
    onClose();
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    if (files.length === 0) return;

    setUploadedFiles(files);

    // Initialize all files as uploading
    const initialStatuses: {
      [fileName: string]: 'uploading' | 'transcribing' | 'completed' | 'failed';
    } = {};
    files.forEach((file) => {
      initialStatuses[file.name] = 'uploading';
    });
    setFileStatuses(initialStatuses);

    const uploadedUrls: string[] = [];
    let textContent = '';

    for (const file of files) {
      try {
        if (
          file.type.startsWith('text/') ||
          file.name.endsWith('.md') ||
          file.name.endsWith('.txt')
        ) {
          // Text files - read directly for preview
          const text = await file.text();
          textContent += `\n\n=== ${file.name} ===\n${text}`;

          // Mark as completed
          setFileStatuses((prev) => ({
            ...prev,
            [file.name]: 'completed',
          }));
        } else {
          // All other files (PDF, DOCX, audio, video) - just upload
          const reader = new FileReader();
          const base64Data = await new Promise<string>((resolve, reject) => {
            reader.onloadend = () => {
              const result = reader.result as string;
              const base64 = result.split(',')[1];
              resolve(base64);
            };
            reader.onerror = reject;
            reader.readAsDataURL(file);
          });

          const encodedFileName = encodeURIComponent(file.name);
          const encodedMimeType = encodeURIComponent(file.type);

          // Upload to blob storage
          const uploadResponse = await fetch(
            `/api/file/upload?filename=${encodedFileName}&filetype=file&mime=${encodedMimeType}`,
            {
              method: 'POST',
              body: base64Data,
              headers: {
                'x-file-name': encodedFileName,
              },
            },
          );

          if (!uploadResponse.ok) {
            const errorData = await uploadResponse.json().catch(() => ({}));
            throw new Error(errorData.error || 'File upload failed');
          }

          const uploadData = await uploadResponse.json();
          uploadedUrls.push(uploadData.uri);

          // Mark as completed (processing will happen server-side during analysis)
          setFileStatuses((prev) => ({
            ...prev,
            [file.name]: 'completed',
          }));
        }
      } catch (error) {
        console.error(`Error processing file ${file.name}:`, error);

        // Mark as failed
        setFileStatuses((prev) => ({
          ...prev,
          [file.name]: 'failed',
        }));
      }
    }

    setFileContents(textContent);
    setFileUrls(uploadedUrls);
  };

  const handleRemoveFile = (index: number) => {
    const fileToRemove = uploadedFiles[index];
    setUploadedFiles((prev) => prev.filter((_, i) => i !== index));

    // Also remove from fileStatuses
    setFileStatuses((prev) => {
      const updated = { ...prev };
      delete updated[fileToRemove.name];
      return updated;
    });
  };

  const handleAddTag = () => {
    const trimmedTag = tagInput.trim().toLowerCase();
    if (trimmedTag && !tags.includes(trimmedTag)) {
      setTags([...tags, trimmedTag]);
      setTagInput('');
    }
  };

  const handleRemoveTag = (tagToRemove: string) => {
    setTags(tags.filter((tag) => tag !== tagToRemove));
  };

  const handleTagInputKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      handleAddTag();
    }
  };

  const handleAnalyzeTone = async () => {
    if (!fileContents.trim() && !analysisGoal.trim() && fileUrls.length === 0) {
      alert('Please upload some content or describe the tone you want');
      return;
    }

    setIsAnalyzing(true);
    setAnalysisResult(null);

    try {
      // Combine file contents and analysis goal if both are present
      let combinedContent = '';
      if (fileContents.trim() && analysisGoal.trim()) {
        combinedContent = `${analysisGoal}\n\n${fileContents}`;
      } else {
        combinedContent = fileContents || analysisGoal;
      }

      const response = await fetch('/api/tones/analyze', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          toneName: name || 'Untitled Tone',
          toneDescription: description,
          sampleContent: combinedContent,
          analysisGoal: analysisGoal || undefined,
          fileUrls: fileUrls.length > 0 ? fileUrls : undefined, // Pass file URLs for server-side processing
        }),
      });

      const data: ToneAnalysisResponse = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to analyze tone');
      }

      setAnalysisResult(data);
    } catch (error) {
      console.error('Analysis error:', error);
      alert(error instanceof Error ? error.message : 'Failed to analyze tone');
    } finally {
      setIsAnalyzing(false);
    }
  };

  const handleApplyAnalysis = () => {
    if (analysisResult) {
      if (analysisResult.voiceRules) {
        setVoiceRules(analysisResult.voiceRules);
      }
      if (analysisResult.examples) {
        setExamples(analysisResult.examples);
      }
      if (analysisResult.suggestedTags) {
        // Add suggested tags that aren't already in the list
        const newTags = analysisResult.suggestedTags.filter(
          (tag) => !tags.includes(tag.toLowerCase()),
        );
        setTags([...tags, ...newTags.map((t) => t.toLowerCase())]);
      }
      setAnalysisResult(null);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) {
      e.preventDefault();
      handleSave();
    }
  };

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
                {initialName ? t('Edit Tone') : t('Create Tone')}
              </h2>
              <p className="text-sm text-gray-600 dark:text-gray-400">
                Create a custom voice profile with AI assistance
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
                  {t('Tone Name')} <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  onKeyDown={handleKeyDown}
                  placeholder="e.g., Professional Business, Friendly Support, Technical Expert"
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
                  placeholder="Brief description of when to use this tone..."
                  rows={3}
                  className="w-full rounded-lg border border-gray-300 bg-white px-4 py-3 text-sm text-gray-900 shadow-sm transition-all placeholder:text-gray-400 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20 dark:border-gray-600 dark:bg-[#2a2a2a] dark:text-gray-100 dark:placeholder:text-gray-500 resize-none"
                />
              </div>

              {/* Voice Guidelines */}
              <div>
                <label className="block text-sm font-semibold mb-2 text-gray-900 dark:text-white">
                  {t('Voice Guidelines')}{' '}
                  <span className="text-red-500">*</span>
                </label>
                <textarea
                  value={voiceRules}
                  onChange={(e) => setVoiceRules(e.target.value)}
                  onKeyDown={handleKeyDown}
                  placeholder="Describe the writing style, tone, vocabulary, sentence structure, etc.&#10;&#10;Example:&#10;- Use clear, concise language&#10;- Maintain a professional but approachable tone&#10;- Avoid jargon unless technical accuracy requires it&#10;- Use active voice&#10;- Keep sentences under 20 words when possible"
                  rows={12}
                  className="w-full rounded-lg border border-gray-300 bg-white px-4 py-3 text-sm text-gray-900 shadow-sm transition-all placeholder:text-gray-400 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20 dark:border-gray-600 dark:bg-[#2a2a2a] dark:text-gray-100 dark:placeholder:text-gray-500 resize-none font-mono"
                />
              </div>

              {/* Examples */}
              <div>
                <label className="block text-sm font-semibold mb-2 text-gray-900 dark:text-white">
                  {t('Examples')}{' '}
                  <span className="text-xs text-gray-500 dark:text-gray-400 font-normal">
                    ({t('Optional')})
                  </span>
                </label>
                <textarea
                  value={examples}
                  onChange={(e) => setExamples(e.target.value)}
                  onKeyDown={handleKeyDown}
                  placeholder="Provide example sentences or paragraphs that demonstrate this tone..."
                  rows={6}
                  className="w-full rounded-lg border border-gray-300 bg-white px-4 py-3 text-sm text-gray-900 shadow-sm transition-all placeholder:text-gray-400 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20 dark:border-gray-600 dark:bg-[#2a2a2a] dark:text-gray-100 dark:placeholder:text-gray-500 resize-none"
                />
              </div>

              {/* Tags */}
              <div>
                <div className="flex items-center justify-between mb-2">
                  <label className="block text-sm font-semibold text-gray-900 dark:text-white">
                    {t('Tags')}{' '}
                    <span className="text-xs text-gray-500 dark:text-gray-400 font-normal">
                      ({t('Optional')})
                    </span>
                  </label>
                  <button
                    onClick={() => setShowTagHelp(!showTagHelp)}
                    className="flex items-center gap-1.5 text-xs text-blue-600 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300 transition-colors"
                  >
                    <IconInfoCircle size={14} />
                    <span>Tag Help</span>
                  </button>
                </div>

                {showTagHelp && (
                  <div className="mb-3 p-3 bg-blue-50 dark:bg-blue-900/10 border border-blue-100 dark:border-blue-900/30 rounded-lg text-xs text-gray-700 dark:text-gray-300">
                    <p className="mb-2">
                      <strong>Use tags</strong> to categorize and quickly find
                      your tones. Examples:
                    </p>
                    <div className="flex flex-wrap gap-2 text-xs">
                      <span className="px-2 py-1 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded">
                        professional
                      </span>
                      <span className="px-2 py-1 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded">
                        casual
                      </span>
                      <span className="px-2 py-1 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded">
                        technical
                      </span>
                      <span className="px-2 py-1 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded">
                        marketing
                      </span>
                    </div>
                  </div>
                )}

                <div className="flex gap-2 mb-2">
                  <input
                    type="text"
                    value={tagInput}
                    onChange={(e) => setTagInput(e.target.value)}
                    onKeyDown={handleTagInputKeyDown}
                    placeholder="Add a tag..."
                    className="flex-1 rounded-lg border border-gray-300 bg-white px-4 py-2 text-sm text-gray-900 shadow-sm transition-all placeholder:text-gray-400 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20 dark:border-gray-600 dark:bg-[#2a2a2a] dark:text-gray-100 dark:placeholder:text-gray-500"
                  />
                  <button
                    onClick={handleAddTag}
                    className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium rounded-lg transition-colors"
                  >
                    Add
                  </button>
                </div>

                {tags.length > 0 && (
                  <div className="flex flex-wrap gap-2">
                    {tags.map((tag, index) => (
                      <span
                        key={index}
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 rounded-md text-sm"
                      >
                        <IconTag size={14} />
                        {tag}
                        <button
                          onClick={() => handleRemoveTag(tag)}
                          className="ml-1 hover:text-blue-900 dark:hover:text-blue-100"
                        >
                          <IconX size={14} />
                        </button>
                      </span>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Right Panel - AI Assistant */}
          <div
            className={`flex flex-col bg-gray-50 dark:bg-[#1a1a1a] transition-all duration-300 ${
              analysisResult ? 'w-[600px]' : 'w-96'
            }`}
          >
            <div className="flex-shrink-0 px-4 py-3 border-b border-gray-200 dark:border-gray-700">
              <div className="flex items-center gap-2">
                <IconVolume size={16} className="text-purple-500" />
                <h3 className="text-sm font-semibold text-gray-900 dark:text-white">
                  AI Tone Analyzer
                </h3>
              </div>
            </div>

            <div className="flex-1 overflow-y-auto p-4 space-y-4">
              {/* Analysis Goal Input */}
              <div>
                <label className="block text-xs font-medium mb-2 text-gray-700 dark:text-gray-300">
                  Describe the tone you want to create{' '}
                  <span className="text-xs text-gray-500 dark:text-gray-400 font-normal">
                    (optional)
                  </span>
                </label>
                <textarea
                  value={analysisGoal}
                  onChange={(e) => setAnalysisGoal(e.target.value)}
                  placeholder="e.g., Create a professional but friendly customer support tone, or add additional context for uploaded files..."
                  rows={3}
                  className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-xs text-gray-900 placeholder:text-gray-400 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20 dark:border-gray-600 dark:bg-[#2a2a2a] dark:text-gray-100 resize-none"
                  disabled={isAnalyzing}
                />
              </div>

              {/* File Upload Section */}
              <div>
                <label className="block text-xs font-medium mb-2 text-gray-700 dark:text-gray-300">
                  Upload Content Samples{' '}
                  <span className="text-xs text-gray-500 dark:text-gray-400 font-normal">
                    (optional)
                  </span>
                </label>
                <div className="space-y-2">
                  <label className="flex items-center justify-center gap-2 w-full px-3 py-2 border-2 border-dashed border-gray-300 dark:border-gray-600 rounded-lg cursor-pointer hover:border-blue-500 dark:hover:border-blue-400 hover:bg-blue-50 dark:hover:bg-blue-900/10 transition-all">
                    <IconUpload
                      size={14}
                      className="text-gray-500 dark:text-gray-400"
                    />
                    <span className="text-xs text-gray-600 dark:text-gray-400">
                      Upload audio, video, text files, or docs
                    </span>
                    <input
                      type="file"
                      multiple
                      accept="audio/*,video/*,text/*,.txt,.md,.pdf,.doc,.docx"
                      onChange={handleFileUpload}
                      className="hidden"
                      disabled={isAnalyzing}
                    />
                  </label>

                  {uploadedFiles.length > 0 && (
                    <div className="space-y-1">
                      {uploadedFiles.map((file, index) => {
                        const status = fileStatuses[file.name];
                        return (
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
                              {/* Status indicator */}
                              {status === 'uploading' && (
                                <span className="flex items-center gap-1 text-xs text-blue-600 dark:text-blue-400 ml-auto flex-shrink-0">
                                  <IconLoader2
                                    size={12}
                                    className="animate-spin"
                                  />
                                  Uploading
                                </span>
                              )}
                              {status === 'transcribing' && (
                                <span className="flex items-center gap-1 text-xs text-purple-600 dark:text-purple-400 ml-auto flex-shrink-0">
                                  <IconLoader2
                                    size={12}
                                    className="animate-spin"
                                  />
                                  Processing
                                </span>
                              )}
                              {status === 'completed' && (
                                <span className="flex items-center gap-1 text-xs text-green-600 dark:text-green-400 ml-auto flex-shrink-0">
                                  <IconCheck size={12} />
                                  Complete
                                </span>
                              )}
                              {status === 'failed' && (
                                <span className="flex items-center gap-1 text-xs text-red-600 dark:text-red-400 ml-auto flex-shrink-0">
                                  <IconX size={12} />
                                  Failed
                                </span>
                              )}
                            </div>
                            <button
                              onClick={() => handleRemoveFile(index)}
                              className="p-1 hover:bg-gray-100 dark:hover:bg-gray-700 rounded transition-colors ml-2"
                              disabled={
                                status === 'uploading' ||
                                status === 'transcribing'
                              }
                            >
                              <IconX size={12} className="text-gray-500" />
                            </button>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              </div>

              <button
                onClick={handleAnalyzeTone}
                disabled={
                  isAnalyzing ||
                  (!fileContents && !analysisGoal && fileUrls.length === 0)
                }
                className="w-full inline-flex items-center justify-center gap-2 rounded-lg bg-gradient-to-r from-purple-600 to-blue-600 px-4 py-2.5 text-sm font-medium text-white shadow-md transition-all hover:from-purple-700 hover:to-blue-700 hover:shadow-lg focus:outline-none focus:ring-2 focus:ring-purple-500/50 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isAnalyzing ? (
                  <>
                    <IconLoader2 size={16} className="animate-spin" />
                    <span>Analyzing...</span>
                  </>
                ) : (
                  <>
                    <IconSparkles size={16} />
                    <span>Analyze Tone with AI</span>
                  </>
                )}
              </button>

              {/* Analysis Results */}
              {analysisResult && (
                <div className="space-y-4 animate-fade-in-fast">
                  <div className="border-t border-gray-200 dark:border-gray-700 pt-4">
                    <div className="flex items-center gap-2 mb-3">
                      <IconCheck size={16} className="text-green-500" />
                      <h4 className="text-sm font-semibold text-gray-900 dark:text-white">
                        Analysis Complete
                      </h4>
                    </div>

                    {/* Voice Rules Preview */}
                    {analysisResult.voiceRules && (
                      <div className="mb-4">
                        <div className="text-xs font-medium text-gray-700 dark:text-gray-300 mb-2">
                          Generated Voice Guidelines:
                        </div>
                        <div className="p-3 bg-white dark:bg-[#2a2a2a] border border-gray-200 dark:border-gray-700 rounded-lg max-h-48 overflow-y-auto">
                          <pre className="text-xs text-gray-900 dark:text-gray-100 whitespace-pre-wrap font-mono">
                            {analysisResult.voiceRules}
                          </pre>
                        </div>
                      </div>
                    )}

                    {/* Examples Preview */}
                    {analysisResult.examples && (
                      <div className="mb-4">
                        <div className="text-xs font-medium text-gray-700 dark:text-gray-300 mb-2">
                          Example Phrases:
                        </div>
                        <div className="p-3 bg-white dark:bg-[#2a2a2a] border border-gray-200 dark:border-gray-700 rounded-lg max-h-32 overflow-y-auto">
                          <pre className="text-xs text-gray-900 dark:text-gray-100 whitespace-pre-wrap">
                            {analysisResult.examples}
                          </pre>
                        </div>
                      </div>
                    )}

                    {/* Suggested Tags */}
                    {analysisResult.suggestedTags &&
                      analysisResult.suggestedTags.length > 0 && (
                        <div className="mb-4">
                          <div className="text-xs font-medium text-gray-700 dark:text-gray-300 mb-2">
                            Suggested Tags:
                          </div>
                          <div className="flex flex-wrap gap-2">
                            {analysisResult.suggestedTags.map((tag, index) => (
                              <span
                                key={index}
                                className="inline-flex items-center gap-1 px-2 py-1 bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 rounded text-xs"
                              >
                                <IconTag size={12} />
                                {tag}
                              </span>
                            ))}
                          </div>
                        </div>
                      )}

                    <button
                      onClick={handleApplyAnalysis}
                      className="w-full flex items-center justify-center gap-2 px-3 py-2 bg-green-600 hover:bg-green-700 text-white text-xs font-medium rounded-lg transition-colors"
                    >
                      <IconCheck size={14} />
                      Apply This Analysis
                    </button>

                    {/* Characteristics */}
                    {analysisResult.characteristics &&
                      analysisResult.characteristics.length > 0 && (
                        <div className="mt-4">
                          <div className="text-xs font-medium text-gray-700 dark:text-gray-300 mb-2">
                            Detected Characteristics:
                          </div>
                          <div className="space-y-2">
                            {analysisResult.characteristics.map(
                              (char, index) => (
                                <div
                                  key={index}
                                  className="p-2 bg-white dark:bg-[#2a2a2a] border border-gray-200 dark:border-gray-700 rounded-lg"
                                >
                                  <div className="text-xs font-semibold text-purple-600 dark:text-purple-400 mb-1">
                                    {char.category}
                                  </div>
                                  <div className="text-xs text-gray-600 dark:text-gray-400">
                                    {char.description}
                                  </div>
                                </div>
                              ),
                            )}
                          </div>
                        </div>
                      )}
                  </div>
                </div>
              )}

              {/* Help Section */}
              {!analysisResult && !isAnalyzing && (
                <div className="border border-gray-200 dark:border-gray-700 rounded-lg p-3">
                  <div className="flex items-center gap-2 mb-2">
                    <IconInfoCircle size={14} className="text-gray-400" />
                    <h4 className="text-xs font-semibold text-gray-700 dark:text-gray-300">
                      How AI Can Help
                    </h4>
                  </div>
                  <ul className="space-y-1.5 text-xs text-gray-600 dark:text-gray-400">
                    <li>• Transcribe audio/video content</li>
                    <li>• Analyze your content samples</li>
                    <li>• Extract tone and style patterns</li>
                    <li>• Generate voice guidelines</li>
                    <li>• Suggest relevant tags</li>
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
              disabled={!name.trim() || !voiceRules.trim()}
              className="inline-flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white shadow-sm transition-all hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500/50 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <IconCheck size={16} />
              <span>Save Tone</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
