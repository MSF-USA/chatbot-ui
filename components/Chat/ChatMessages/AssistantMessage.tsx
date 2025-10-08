import {
  IconCheck,
  IconCopy,
  IconLoader2,
  IconSettings,
  IconVolume,
  IconVolumeOff,
  IconRefresh,
} from '@tabler/icons-react';
import {
  FC,
  MouseEvent,
  useEffect,
  useRef,
  useState,
} from 'react';

import { Conversation, Message } from '@/types/chat';
import { Citation } from '@/types/rag';

import { useSmoothStreaming } from '@/lib/hooks/useSmoothStreaming';
import { useStreamingSettings } from '@/lib/context/StreamingSettingsContext';

import AudioPlayer from '@/components/Chat/AudioPlayer';
import { CitationList } from '@/components/Chat/Citations/CitationList';
import { CitationMarkdown } from '@/components/Markdown/CitationMarkdown';
import { CodeBlock } from '@/components/Markdown/CodeBlock';
import { MemoizedReactMarkdown } from '@/components/Markdown/MemoizedReactMarkdown';

import rehypeMathjax from 'rehype-mathjax';
import remarkGfm from 'remark-gfm';
import remarkMath from 'remark-math';

interface AssistantMessageProps {
  content: string;
  message?: Message;
  copyOnClick: (event: MouseEvent<any>) => void;
  messageIsStreaming: boolean;
  messageIndex: number;
  selectedConversation: Conversation;
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
  const [citations, setCitations] = useState<Citation[]>([]);
  const [isGeneratingAudio, setIsGeneratingAudio] = useState<boolean>(false);
  const [audioUrl, setAudioUrl] = useState<string | null>(null);
  const [loadingMessage, setLoadingMessage] = useState<string | null>(null);
  const [remarkPlugins, setRemarkPlugins] = useState<any[]>([remarkGfm]);
  const [showStreamingSettings, setShowStreamingSettings] = useState<boolean>(false);

  // Get streaming settings from context
  const { settings, updateSettings } = useStreamingSettings();

  const citationsProcessed = useRef(false);
  const processingAttempts = useRef(0);

  // Use smooth streaming hook for animated text display
  const smoothContent = useSmoothStreaming({
    isStreaming: messageIsStreaming,
    content: displayContent,
    charsPerFrame: settings.charsPerFrame,
    frameDelay: settings.frameDelay,
    enabled: settings.smoothStreamingEnabled,
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
      let mainContent = content;
      let citationsData: Citation[] = [];
      let extractionMethod = 'none';

      // First check if citations are in the message object
      if (message?.citations && message.citations.length > 0) {
        extractionMethod = 'message';
        citationsData = message.citations;
      }
      // Then check for the newer metadata format
      else {
        const metadataMatch = content.match(/\n\n<<<METADATA_START>>>(.*?)<<<METADATA_END>>>/s);
        if (metadataMatch) {
          extractionMethod = 'metadata';
          mainContent = content.replace(/\n\n<<<METADATA_START>>>.*?<<<METADATA_END>>>/s, '');
          
          try {
            const parsedData = JSON.parse(metadataMatch[1]);
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
      // Next try the legacy JSON detection at the end
      else if (!messageIsStreaming) {
        // Only try legacy JSON parsing when not streaming to avoid partial JSON
        const jsonMatch = content.match(/(\{[\s\S]*\})$/);
        if (jsonMatch) {
          const jsonStr = jsonMatch[1].trim();
          // Validate JSON structure before parsing
          if (jsonStr.startsWith('{') && jsonStr.endsWith('}')) {
            const openBraces = (jsonStr.match(/{/g) || []).length;
            const closeBraces = (jsonStr.match(/}/g) || []).length;
            
            if (openBraces === closeBraces) {
              extractionMethod = 'regex';
              mainContent = content.slice(0, -jsonMatch[1].length).trim();
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

      setDisplayContent(mainContent);
      if (mainContent.includes('```math')) {
        setRemarkPlugins([remarkGfm, [remarkMath, { singleDollar: false }]]);
      }
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

  // Determine what to display - when streaming, use the raw content with metadata stripped
  // When not streaming, use the processed content
  const displayContentWithoutCitations = messageIsStreaming
    ? content.replace(/\n\n<<<METADATA_START>>>.*?<<<METADATA_END>>>/s, '').split(/(\{[\s\S]*\})$/)[0]
    : displayContent;

  // Use the smooth content for display when streaming and smooth streaming is enabled
  const contentToDisplay = settings.smoothStreamingEnabled && messageIsStreaming
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


  // Custom components for markdown processing
  const customMarkdownComponents = {
    code({ inline, className, children, ...props }: {
      inline?: boolean;
      className?: string;
      children: React.ReactNode[];
    }) {
      if (children.length) {
        if (children[0] == '▍') {
          return (
            <span className="animate-pulse cursor-default mt-1">
              ▍
            </span>
          );
        }
      }

      const match = /language-(\w+)/.exec(className || '');

      return !inline ? (
        <CodeBlock
          language={(match && match[1]) || ''}
          value={String(children).replace(/\n$/, '')}
          {...props}
        />
      ) : (
        <code className={className} {...props}>
          {children}
        </code>
      );
    },
    table({ children }: { children: React.ReactNode }) {
      return (
        <div className="overflow-auto">
          <table className="border-collapse border border-black px-3 py-1 dark:border-white">
            {children}
          </table>
        </div>
      );
    },
    th({ children }: { children: React.ReactNode }) {
      return (
        <th className="break-words border border-black bg-gray-500 px-3 py-1 text-white dark:border-white">
          {children}
        </th>
      );
    },
    td({ children }: { children: React.ReactNode }) {
      return (
        <td className="break-words border border-black px-3 py-1 dark:border-white">
          {children}
        </td>
      );
    },
    p({ children }: { children: React.ReactNode }) {
      return (
        <p>
          {children}
        </p>
      );
    }
  };

  return (
    <div className="relative flex p-4 text-base md:py-6 lg:px-0 w-full">
      <div className="prose mt-[-2px] w-full dark:prose-invert max-w-none">
        {loadingMessage && (
          <div className="text-sm text-gray-500 dark:text-gray-400 mb-2 animate-pulse">
            {loadingMessage}
          </div>
        )}

        <div className="flex flex-col">
          <div className="flex-1 overflow-hidden">
            <CitationMarkdown
              className="prose dark:prose-invert flex-1"
              conversation={selectedConversation}
              citations={citations}
              remarkPlugins={remarkPlugins}
              rehypePlugins={[rehypeMathjax]}
              components={customMarkdownComponents}
            >
              {contentToDisplay}
            </CitationMarkdown>
          </div>

          {/* Action buttons at the bottom of the message */}
          <div className="flex items-center gap-2 mt-2">
            {/* Copy button */}
            <button
              className="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-300 transition-colors"
              onClick={copyOnClick}
              aria-label={messageCopied ? "Copied" : "Copy message"}
            >
              {messageCopied ? (
                <IconCheck size={18} />
              ) : (
                <IconCopy size={18} />
              )}
            </button>

            {/* Regenerate button - only show on last assistant message */}
            {onRegenerate && !messageIsStreaming && messageIndex === selectedConversation.messages.length - 1 && (
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
              aria-label={audioUrl ? "Stop audio" : isGeneratingAudio ? "Generating audio..." : "Listen"}
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
                        checked={settings.smoothStreamingEnabled}
                        onChange={(e) =>
                          updateSettings({ smoothStreamingEnabled: e.target.checked })
                        }
                      />
                      <span className={`absolute cursor-pointer inset-0 rounded-full transition-all duration-300 ${
                        settings.smoothStreamingEnabled 
                          ? 'bg-blue-500 dark:bg-blue-600' 
                          : 'bg-gray-300 dark:bg-gray-600'
                      }`}>
                        <span className={`absolute w-4 h-4 bg-white rounded-full transition-transform duration-300 transform ${
                          settings.smoothStreamingEnabled 
                            ? 'translate-x-5' 
                            : 'translate-x-0.5'
                        } top-0.5 left-0`}></span>
                      </span>
                    </div>
                  </label>
                </div>

                <div>
                  <label className="block mb-2 text-gray-700 dark:text-gray-300 flex items-center">
                    <span>Speed (characters per frame)</span>
                    <span className="text-xs font-medium ml-2 px-2 py-0.5 bg-gray-200 dark:bg-gray-700 rounded-full">
                      {settings.charsPerFrame}
                    </span>
                  </label>
                  <input
                    type="range"
                    min="1"
                    max="10"
                    value={settings.charsPerFrame}
                    onChange={(e) =>
                      updateSettings({ charsPerFrame: parseInt(e.target.value) })
                    }
                    className={`w-full h-2 rounded-lg appearance-none cursor-pointer ${
                      settings.smoothStreamingEnabled
                        ? 'bg-gray-300 dark:bg-gray-600'
                        : 'bg-gray-200 dark:bg-gray-700 opacity-50'
                    }`}
                    disabled={!settings.smoothStreamingEnabled}
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
                      {settings.frameDelay}ms
                    </span>
                  </label>
                  <input
                    type="range"
                    min="5"
                    max="50"
                    step="5"
                    value={settings.frameDelay}
                    onChange={(e) =>
                      updateSettings({ frameDelay: parseInt(e.target.value) })
                    }
                    className={`w-full h-2 rounded-lg appearance-none cursor-pointer ${
                      settings.smoothStreamingEnabled
                        ? 'bg-gray-300 dark:bg-gray-600'
                        : 'bg-gray-200 dark:bg-gray-700 opacity-50'
                    }`}
                    disabled={!settings.smoothStreamingEnabled}
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
              <AudioPlayer
                  audioUrl={audioUrl}
                  onClose={handleCloseAudio}
              />
          )}
        </div>

        {citations.length > 0 && <CitationList citations={citations} />}
      </div>
    </div>
  );
};

export default AssistantMessage;
