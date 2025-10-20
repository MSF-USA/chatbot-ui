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
  const [displayContent, setDisplayContent] = useState('');
  const [streamingContent, setStreamingContent] = useState('');
  const [citations, setCitations] = useState<Citation[]>([]);
  const [thinking, setThinking] = useState<string>('');
  const [isGeneratingAudio, setIsGeneratingAudio] = useState<boolean>(false);
  const [audioUrl, setAudioUrl] = useState<string | null>(null);
  const [loadingMessage, setLoadingMessage] = useState<string | null>(null);
  const [showStreamingSettings, setShowStreamingSettings] =
    useState<boolean>(false);

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

  const citationsProcessed = useRef(false);
  const processingAttempts = useRef(0);

  // Use smooth streaming hook for animated text display
  const smoothContent = useSmoothStreaming({
    isStreaming: messageIsStreaming,
    content: streamingContent || displayContent,
    charsPerFrame: charsPerFrame,
    frameDelay: frameDelay,
    enabled: smoothStreamingEnabled,
  });

  // Clean up resources when component unmounts
  useEffect(() => {
    return () => {
      if (audioUrl) {
        URL.revokeObjectURL(audioUrl);
      }
    };
  }, [audioUrl]);

  useEffect(() => {
    const processContent = () => {
      // First, parse thinking content from the raw content
      const { thinking: inlineThinking, content: contentWithoutThinking } =
        parseThinkingContent(content);

      let mainContent = contentWithoutThinking;
      let citationsData: Citation[] = [];
      let metadataThinking = '';
      let extractionMethod = 'none';

      // First check if citations are in the message object
      if (message?.citations && message.citations.length > 0) {
        extractionMethod = 'message';
        citationsData = message.citations;
      }
      // Then check for the newer metadata format
      else {
        const metadataMatch = contentWithoutThinking.match(
          /\n\n<<<METADATA_START>>>(.*?)<<<METADATA_END>>>/s,
        );
        if (metadataMatch) {
          extractionMethod = 'metadata';
          mainContent = contentWithoutThinking.replace(
            /\n\n<<<METADATA_START>>>.*?<<<METADATA_END>>>/s,
            '',
          );

          try {
            const parsedData = JSON.parse(metadataMatch[1]);

            // Extract citations
            if (parsedData.citations) {
              // Deduplicate citations by URL or title
              const uniqueCitationsMap = new Map();
              parsedData.citations.forEach((citation: Citation) => {
                const key = citation.url || citation.title;
                if (key && !uniqueCitationsMap.has(key)) {
                  uniqueCitationsMap.set(key, citation);
                }
              });
              citationsData = Array.from(uniqueCitationsMap.values());
            }

            // Extract thinking from metadata (takes precedence over inline thinking)
            if (parsedData.thinking) {
              metadataThinking = parsedData.thinking;
            }
          } catch (error) {
            // Silently ignore parsing errors
          }
        }
        // Next try the legacy JSON detection at the end
        else if (!messageIsStreaming) {
          // Only try legacy JSON parsing when not streaming to avoid partial JSON
          const jsonMatch = contentWithoutThinking.match(/(\{[\s\S]*\})$/);
          if (jsonMatch) {
            const jsonStr = jsonMatch[1].trim();
            // Validate JSON structure before parsing
            if (jsonStr.startsWith('{') && jsonStr.endsWith('}')) {
              const openBraces = (jsonStr.match(/{/g) || []).length;
              const closeBraces = (jsonStr.match(/}/g) || []).length;

              if (openBraces === closeBraces) {
                extractionMethod = 'regex';
                mainContent = contentWithoutThinking
                  .slice(0, -jsonMatch[1].length)
                  .trim();
                try {
                  const parsedData = JSON.parse(jsonStr);
                  if (parsedData.citations) {
                    // Deduplicate citations by URL or title
                    const uniqueCitationsMap = new Map();
                    parsedData.citations.forEach((citation: Citation) => {
                      const key = citation.url || citation.title;
                      if (key && !uniqueCitationsMap.has(key)) {
                        uniqueCitationsMap.set(key, citation);
                      }
                    });
                    citationsData = Array.from(uniqueCitationsMap.values());
                  }
                } catch (error) {
                  // Silently ignore parsing errors
                }
              }
            }
          }
        }
      } // Close the outer else block

      // Check for message-stored citations in the conversation
      if (
        citationsData.length === 0 &&
        selectedConversation?.messages?.[messageIndex]?.citations &&
        selectedConversation.messages[messageIndex].citations!.length > 0
      ) {
        extractionMethod = 'message-stored';

        // Deduplicate citations by URL or title
        const uniqueCitationsMap = new Map();
        selectedConversation.messages[messageIndex].citations!.forEach(
          (citation: Citation) => {
            const key = citation.url || citation.title;
            if (key && !uniqueCitationsMap.has(key)) {
              uniqueCitationsMap.set(key, citation);
            }
          },
        );
        citationsData = Array.from(uniqueCitationsMap.values());
      }

      processingAttempts.current++;

      // Determine final thinking content (priority: message > metadata > inline)
      const finalThinking =
        message?.thinking || metadataThinking || inlineThinking || '';

      // For streaming, also compute content without metadata for display
      const streamingDisplay = contentWithoutThinking
        .replace(/\n\n<<<METADATA_START>>>.*?<<<METADATA_END>>>/s, '')
        .split(/(\{[\s\S]*\})$/)[0];

      setDisplayContent(mainContent);
      setStreamingContent(streamingDisplay);
      setThinking(finalThinking);
      // Streamdown handles math automatically, no need to configure plugins
      setCitations(citationsData);
      citationsProcessed.current = true;
    };

    processContent();

    // If we're streaming, reprocess when streaming stops to catch final citations
    if (!messageIsStreaming && processingAttempts.current <= 2) {
      const timer = setTimeout(processContent, 500);
      return () => clearTimeout(timer);
    }
  }, [
    content,
    message,
    messageIsStreaming,
    messageIndex,
    selectedConversation?.messages,
  ]);

  // Determine what to display - when streaming, use pre-processed streaming content
  // When not streaming, use the fully processed content
  const displayContentWithoutCitations = messageIsStreaming
    ? streamingContent
    : displayContent;

  // Use the smooth content for display when streaming and smooth streaming is enabled
  const contentToDisplay =
    smoothStreamingEnabled && messageIsStreaming
      ? smoothContent
      : displayContentWithoutCitations;

  const handleTTS = async () => {
    try {
      setIsGeneratingAudio(true);
      setLoadingMessage('Generating audio...');

      const response = await fetch('/api/tts', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ text: displayContentWithoutCitations }),
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

export default AssistantMessage;
