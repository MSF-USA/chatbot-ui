import {
  IconCheck,
  IconCopy,
  IconLoader2,
  IconRefresh,
  IconSettings,
  IconVolume,
  IconVolumeOff,
} from '@tabler/icons-react';
import { FC, MouseEvent, useEffect, useRef, useState } from 'react';

import { useSmoothStreaming } from '@/lib/hooks/useSmoothStreaming';

import { parseThinkingContent } from '@/lib/utils/app/thinking';

import { Conversation, Message } from '@/types/chat';
import { Citation } from '@/types/rag';

import AudioPlayer from '@/components/Chat/AudioPlayer';
import { ThinkingBlock } from '@/components/Chat/ChatMessages/ThinkingBlock';
import { CitationList } from '@/components/Chat/Citations/CitationList';
import { CitationStreamdown } from '@/components/Markdown/CitationStreamdown';

import { useSettingsStore } from '@/lib/stores/settingsStore';
import type { MermaidConfig } from 'mermaid';

interface AssistantMessageProps {
  content: string;
  message?: Message;
  copyOnClick: (event: MouseEvent<any>) => void;
  messageIsStreaming: boolean;
  messageIndex: number;
  selectedConversation: Conversation | null;
  messageCopied: boolean;
  onRegenerate?: () => void;
}

export const AssistantMessage: FC<AssistantMessageProps> = ({
  content,
  message,
  copyOnClick,
  messageIsStreaming,
  messageIndex,
  selectedConversation,
  messageCopied,
  onRegenerate,
}) => {
  const [processedContent, setProcessedContent] = useState('');
  const [citations, setCitations] = useState<Citation[]>([]);
  const [thinking, setThinking] = useState<string>('');
  const [isGeneratingAudio, setIsGeneratingAudio] = useState<boolean>(false);
  const [audioUrl, setAudioUrl] = useState<string | null>(null);
  const [loadingMessage, setLoadingMessage] = useState<string | null>(null);
  const [showStreamingSettings, setShowStreamingSettings] =
    useState<boolean>(false);
  const [isDarkMode, setIsDarkMode] = useState<boolean>(false);

  // Get streaming settings from store
  const smoothStreamingEnabled = useSettingsStore(
    (state) => state.smoothStreamingEnabled,
  );
  const charsPerFrame = useSettingsStore((state) => state.charsPerFrame);
  const frameDelay = useSettingsStore((state) => state.frameDelay);
  const setSmoothStreamingEnabled = useSettingsStore(
    (state) => state.setSmoothStreamingEnabled,
  );
  const setCharsPerFrame = useSettingsStore((state) => state.setCharsPerFrame);
  const setFrameDelay = useSettingsStore((state) => state.setFrameDelay);

  // Use smooth streaming hook for animated text display
  const smoothContent = useSmoothStreaming({
    isStreaming: messageIsStreaming,
    content: processedContent,
    charsPerFrame: charsPerFrame,
    frameDelay: frameDelay,
    enabled: smoothStreamingEnabled,
  });

  // Detect dark mode
  useEffect(() => {
    const updateTheme = () => {
      const isDark = document.documentElement.classList.contains('dark');
      setIsDarkMode(isDark);
    };

    updateTheme();

    // Watch for theme changes
    const observer = new MutationObserver(updateTheme);
    observer.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ['class'],
    });

    return () => observer.disconnect();
  }, []);

  // Clean up resources when component unmounts
  useEffect(() => {
    return () => {
      if (audioUrl) {
        URL.revokeObjectURL(audioUrl);
      }
    };
  }, [audioUrl]);

  // Process content once per change - simplified logic
  useEffect(() => {
    // Parse thinking content from the raw content
    const { thinking: inlineThinking, content: contentWithoutThinking } =
      parseThinkingContent(content);

    let mainContent = contentWithoutThinking;
    let citationsData: Citation[] = [];
    let metadataThinking = '';

    // Priority 1: Citations from message object (already processed)
    if (message?.citations && message.citations.length > 0) {
      citationsData = message.citations;
    }
    // Priority 2: Parse metadata format (new approach)
    else {
      const metadataMatch = contentWithoutThinking.match(
        /\n\n<<<METADATA_START>>>(.*?)<<<METADATA_END>>>/s,
      );
      if (metadataMatch) {
        mainContent = contentWithoutThinking.replace(
          /\n\n<<<METADATA_START>>>.*?<<<METADATA_END>>>/s,
          '',
        );

        try {
          const parsedData = JSON.parse(metadataMatch[1]);
          if (parsedData.citations) {
            citationsData = deduplicateCitations(parsedData.citations);
          }
          if (parsedData.thinking) {
            metadataThinking = parsedData.thinking;
          }
        } catch (error) {
          // Silently ignore parsing errors during streaming
        }
      }
      // Priority 3: Legacy JSON at end (only when not streaming)
      else if (!messageIsStreaming) {
        const jsonMatch = contentWithoutThinking.match(/(\{[\s\S]*\})$/);
        if (jsonMatch && isValidJSON(jsonMatch[1])) {
          mainContent = contentWithoutThinking
            .slice(0, -jsonMatch[1].length)
            .trim();
          try {
            const parsedData = JSON.parse(jsonMatch[1].trim());
            if (parsedData.citations) {
              citationsData = deduplicateCitations(parsedData.citations);
            }
          } catch (error) {
            // Silently ignore parsing errors
          }
        }
      }
    }

    // Priority 4: Fallback to conversation-stored citations
    if (
      citationsData.length === 0 &&
      selectedConversation?.messages?.[messageIndex]?.citations
    ) {
      citationsData = deduplicateCitations(
        selectedConversation.messages[messageIndex].citations!,
      );
    }

    // Determine final thinking content (priority: message > metadata > inline)
    const finalThinking =
      message?.thinking || metadataThinking || inlineThinking || '';

    setProcessedContent(mainContent);
    setThinking(finalThinking);
    setCitations(citationsData);
  }, [
    content,
    message,
    messageIsStreaming,
    messageIndex,
    selectedConversation?.messages,
  ]);

  // Use smooth streaming if enabled, otherwise use processed content directly
  const contentToDisplay =
    smoothStreamingEnabled && messageIsStreaming
      ? smoothContent
      : processedContent;

  const handleTTS = async () => {
    try {
      setIsGeneratingAudio(true);
      setLoadingMessage('Generating audio...');

      const response = await fetch('/api/tts', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ text: processedContent }),
      });

      if (!response.ok) {
        throw new Error('TTS conversion failed');
      }

      setLoadingMessage('Processing audio...');
      const blob = await response.blob();
      const url = URL.createObjectURL(blob);
      setAudioUrl(url);
      setIsGeneratingAudio(false);
      setLoadingMessage(null);
    } catch (error) {
      console.error('Error in TTS:', error);
      setIsGeneratingAudio(false);
      setLoadingMessage('Error generating audio. Please try again.');
      setTimeout(() => setLoadingMessage(null), 3000); // Clear error message after 3 seconds
    }
  };

  // Close audio player and clean up resources
  const handleCloseAudio = () => {
    if (audioUrl) {
      URL.revokeObjectURL(audioUrl);
      setAudioUrl(null);
    }
  };

  // Custom components for Streamdown
  // Note: Streamdown handles code highlighting (Shiki), Mermaid, and math (KaTeX) built-in
  // We don't override the code component - let Streamdown handle it
  const customMarkdownComponents = {};

  // Mermaid configuration with dark mode support
  const mermaidConfig: MermaidConfig = {
    startOnLoad: false,
    theme: isDarkMode ? 'dark' : 'default',
    themeVariables: isDarkMode
      ? {
          // Dark mode colors - make everything visible on dark background
          primaryColor: '#3b82f6',
          primaryTextColor: '#e5e7eb',
          primaryBorderColor: '#60a5fa',
          lineColor: '#9ca3af',
          secondaryColor: '#1e293b',
          tertiaryColor: '#0f172a',
          background: '#1f2937',
          mainBkg: '#1f2937',
          secondBkg: '#111827',
          textColor: '#f3f4f6',
          border1: '#4b5563',
          border2: '#6b7280',
          arrowheadColor: '#e5e7eb', // White arrows
          fontFamily: 'ui-sans-serif, system-ui, sans-serif',
          fontSize: '14px',
          // Sequence diagram specific
          actorTextColor: '#f3f4f6',
          actorLineColor: '#9ca3af',
          signalColor: '#e5e7eb',
          signalTextColor: '#f3f4f6',
          labelBoxBkgColor: '#374151',
          labelBoxBorderColor: '#6b7280',
          labelTextColor: '#f3f4f6',
          loopTextColor: '#f3f4f6',
          activationBorderColor: '#60a5fa',
          activationBkgColor: '#1e3a8a',
          sequenceNumberColor: '#ffffff',
        }
      : {
          // Light mode colors
          primaryColor: '#3b82f6',
          fontFamily: 'ui-sans-serif, system-ui, sans-serif',
          fontSize: '14px',
        },
    logLevel: 'error', // Only log errors, don't crash
    securityLevel: 'loose', // More lenient parsing
    suppressErrorRendering: true, // Hide error messages from UI
  };

  return (
    <div className="relative flex px-4 py-3 text-base lg:px-0 w-full">
      <div className="mt-[-2px] w-full">
        {loadingMessage && (
          <div className="text-sm text-gray-500 dark:text-gray-400 mb-2 animate-pulse">
            {loadingMessage}
          </div>
        )}

        <div className="flex flex-col w-full">
          {/* Thinking block - displayed before main content */}
          {thinking && (
            <ThinkingBlock
              thinking={thinking}
              isStreaming={messageIsStreaming && !contentToDisplay}
            />
          )}

          <div className="flex-1 w-full">
            <div
              className="prose dark:prose-invert max-w-none w-full"
              style={{ maxWidth: 'none' }}
            >
              <CitationStreamdown
                conversation={selectedConversation}
                message={message}
                citations={citations}
                components={customMarkdownComponents}
                isAnimating={messageIsStreaming}
                controls={true}
                shikiTheme={['github-light', 'github-dark']}
                mermaidConfig={mermaidConfig}
              >
                {contentToDisplay}
              </CitationStreamdown>
            </div>
          </div>

          {/* Action buttons at the bottom of the message */}
          <div className="flex items-center gap-2 mt-1">
            {/* Copy button */}
            <button
              className="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-300 transition-colors"
              onClick={copyOnClick}
              aria-label={messageCopied ? 'Copied' : 'Copy message'}
            >
              {messageCopied ? <IconCheck size={18} /> : <IconCopy size={18} />}
            </button>

            {/* Regenerate button - only show on last assistant message */}
            {onRegenerate &&
              !messageIsStreaming &&
              selectedConversation &&
              messageIndex === selectedConversation.messages.length - 1 && (
                <button
                  className="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-300 transition-colors"
                  onClick={onRegenerate}
                  aria-label="Regenerate response"
                >
                  <IconRefresh size={18} />
                </button>
              )}

            {/* Listen button */}
            <button
              className={`transition-colors ${
                isGeneratingAudio
                  ? 'text-gray-400 dark:text-gray-500 cursor-not-allowed'
                  : 'text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-300'
              }`}
              onClick={audioUrl ? handleCloseAudio : handleTTS}
              disabled={isGeneratingAudio || messageIsStreaming}
              aria-label={
                audioUrl
                  ? 'Stop audio'
                  : isGeneratingAudio
                    ? 'Generating audio...'
                    : 'Listen'
              }
            >
              {isGeneratingAudio ? (
                <IconLoader2 size={18} className="animate-spin" />
              ) : audioUrl ? (
                <IconVolumeOff size={18} />
              ) : (
                <IconVolume size={18} />
              )}
            </button>
          </div>

          {/* Streaming Settings Modal */}
          {showStreamingSettings && (
            <div className="mt-3 p-4 bg-gray-100 dark:bg-gray-800 rounded-lg text-sm shadow-md border border-gray-200 dark:border-gray-700 transition-all">
              <h4 className="font-medium mb-3 text-gray-700 dark:text-gray-300 flex items-center">
                <IconSettings size={16} className="mr-2" />
                Text Streaming Settings
              </h4>
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <label className="cursor-pointer text-gray-700 dark:text-gray-300 flex items-center">
                    <span>Smooth streaming</span>
                    <div className="relative inline-block w-10 h-5 ml-2">
                      <input
                        type="checkbox"
                        className="opacity-0 w-0 h-0"
                        checked={smoothStreamingEnabled}
                        onChange={(e) =>
                          setSmoothStreamingEnabled(e.target.checked)
                        }
                      />
                      <span
                        className={`absolute cursor-pointer inset-0 rounded-full transition-all duration-300 ${
                          smoothStreamingEnabled
                            ? 'bg-blue-500 dark:bg-blue-600'
                            : 'bg-gray-300 dark:bg-gray-600'
                        }`}
                      >
                        <span
                          className={`absolute w-4 h-4 bg-white rounded-full transition-transform duration-300 transform ${
                            smoothStreamingEnabled
                              ? 'translate-x-5'
                              : 'translate-x-0.5'
                          } top-0.5 left-0`}
                        ></span>
                      </span>
                    </div>
                  </label>
                </div>

                <div>
                  <label className="block mb-2 text-gray-700 dark:text-gray-300 flex items-center">
                    <span>Speed (characters per frame)</span>
                    <span className="text-xs font-medium ml-2 px-2 py-0.5 bg-gray-200 dark:bg-gray-700 rounded-full">
                      {charsPerFrame}
                    </span>
                  </label>
                  <input
                    type="range"
                    min="1"
                    max="10"
                    value={charsPerFrame}
                    onChange={(e) => setCharsPerFrame(parseInt(e.target.value))}
                    className={`w-full h-2 rounded-lg appearance-none cursor-pointer ${
                      smoothStreamingEnabled
                        ? 'bg-gray-300 dark:bg-gray-600'
                        : 'bg-gray-200 dark:bg-gray-700 opacity-50'
                    }`}
                    disabled={!smoothStreamingEnabled}
                  />
                  <div className="text-xs text-gray-500 dark:text-gray-400 mt-1 flex justify-between">
                    <span>Slower</span>
                    <span>Faster</span>
                  </div>
                </div>

                <div>
                  <label className="block mb-2 text-gray-700 dark:text-gray-300 flex items-center">
                    <span>Delay between frames (ms)</span>
                    <span className="text-xs font-medium ml-2 px-2 py-0.5 bg-gray-200 dark:bg-gray-700 rounded-full">
                      {frameDelay}ms
                    </span>
                  </label>
                  <input
                    type="range"
                    min="5"
                    max="50"
                    step="5"
                    value={frameDelay}
                    onChange={(e) => setFrameDelay(parseInt(e.target.value))}
                    className={`w-full h-2 rounded-lg appearance-none cursor-pointer ${
                      smoothStreamingEnabled
                        ? 'bg-gray-300 dark:bg-gray-600'
                        : 'bg-gray-200 dark:bg-gray-700 opacity-50'
                    }`}
                    disabled={!smoothStreamingEnabled}
                  />
                  <div className="text-xs text-gray-500 dark:text-gray-400 mt-1 flex justify-between">
                    <span>Faster</span>
                    <span>Slower</span>
                  </div>
                </div>
              </div>
            </div>
          )}

          {audioUrl && (
            <AudioPlayer audioUrl={audioUrl} onClose={handleCloseAudio} />
          )}
        </div>

        {citations.length > 0 && <CitationList citations={citations} />}
      </div>
    </div>
  );
};

// Helper function to deduplicate citations by URL or title
function deduplicateCitations(citations: Citation[]): Citation[] {
  const uniqueCitationsMap = new Map();
  citations.forEach((citation: Citation) => {
    const key = citation.url || citation.title;
    if (key && !uniqueCitationsMap.has(key)) {
      uniqueCitationsMap.set(key, citation);
    }
  });
  return Array.from(uniqueCitationsMap.values());
}

// Helper function to validate JSON structure
function isValidJSON(jsonStr: string): boolean {
  const trimmed = jsonStr.trim();
  if (!trimmed.startsWith('{') || !trimmed.endsWith('}')) {
    return false;
  }
  const openBraces = (trimmed.match(/{/g) || []).length;
  const closeBraces = (trimmed.match(/}/g) || []).length;
  return openBraces === closeBraces;
}

export default AssistantMessage;
