import {
  IconCheck,
  IconCopy,
  IconLoader2,
  IconRobot,
  IconSettings,
  IconVolume,
  IconVolumeOff,
} from '@tabler/icons-react';
import {
  FC,
  MouseEvent,
  useEffect,
  useRef,
  useState,
} from 'react';

import { Conversation } from '@/types/chat';
import { Citation } from '@/types/rag';

import { useSmoothStreaming } from '@/hooks/useSmoothStreaming';
import { useStreamingSettings } from '@/context/StreamingSettingsContext';

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
  copyOnClick: (event: MouseEvent<any>) => void;
  messageIsStreaming: boolean;
  messageIndex: number;
  selectedConversation: Conversation;
  messageCopied: boolean;
}

export const AssistantMessage: FC<AssistantMessageProps> = ({
  content,
  copyOnClick,
  messageIsStreaming,
  messageIndex,
  selectedConversation,
  messageCopied,
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

      // First check for the newer citation marker format
      const citationMarker = content.indexOf('\n\n---CITATIONS_DATA---\n');
      if (citationMarker !== -1) {
        extractionMethod = 'marker';
        mainContent = content.slice(0, citationMarker);
        const jsonStr = content.slice(citationMarker + 22); // Length of marker

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
          console.error('Error parsing citations JSON with marker:', error);
        }
      }
      // Next try the legacy JSON detection at the end
      else {
        const jsonMatch = content.match(/(\{[\s\S]*\})$/);
        if (jsonMatch) {
          extractionMethod = 'regex';
          const jsonStr = jsonMatch[1];
          mainContent = content.slice(0, -jsonStr.length).trim();
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
            console.error('Error parsing citations JSON:', error);
          }
        }
      }

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

      // Debug logging
      console.debug(`[Message ${messageIndex}] Citation extraction:`, {
        method: extractionMethod,
        count: citationsData.length,
        contentLength: content.length,
        displayContentLength: mainContent.length,
        processingAttempts: processingAttempts.current,
        streamingActive: messageIsStreaming,
      });

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
    messageIsStreaming,
    messageIndex,
    selectedConversation?.messages,
  ]);

  // Determine what to display - when streaming, use the raw content with citations stripped
  // When not streaming, use the processed content
  const displayContentWithoutCitations = messageIsStreaming
    ? content.split(/(\{[\s\S]*\})$/)[0].split('\n\n---CITATIONS_DATA---\n')[0]
    : displayContent;
    
  // Use the smooth content for display when streaming and smooth streaming is enabled
  const contentToDisplay = settings.smoothStreamingEnabled && messageIsStreaming
    ? smoothContent
    : displayContentWithoutCitations;

  const handleTTS = async () => {
    try {
      setIsGeneratingAudio(true);
      setLoadingMessage('Generating audio...');

      const response = await fetch('/api/v2/tts', {
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

  const StreamingIndicator = () => (
    <span className="animate-pulse cursor-default inline-flex items-center ml-1 text-gray-500">
      <IconLoader2 size={16} className="animate-spin mr-1" />
    </span>
  );

  // Custom components for markdown processing
  const customMarkdownComponents = {
    code({ node, inline, className, children, ...props }: {
      node: any;
      inline?: boolean;
      className?: string;
      children: React.ReactNode[];
      [key: string]: any;
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
          key={Math.random()}
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
    p({ children, ...props }: { children: React.ReactNode; [key: string]: any }) {
      return (
        <p {...props}>
          {children}
        </p>
      );
    }
  };

  return (
    <div className="relative m-auto flex p-4 text-base md:max-w-2xl md:gap-6 md:py-6 lg:max-w-2xl lg:px-0 xl:max-w-3xl">
      <div className="min-w-[40px] text-right font-bold">
        <IconRobot size={30} />
      </div>

      <div className="prose mt-[-2px] w-full dark:prose-invert">
        {loadingMessage && (
          <div className="text-sm text-gray-500 dark:text-gray-400 mb-2 animate-pulse">
            {loadingMessage}
          </div>
        )}

        <div className="flex flex-col">
          <div className="flex-1 overflow-hidden">
            {selectedConversation?.bot ? (
              <>
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
                {/* Add streaming indicator at the end if content is streaming */}
                {messageIsStreaming && contentToDisplay.length > 0 && (
                  <StreamingIndicator />
                )}
              </>
            ) : (
              <>
                <MemoizedReactMarkdown
                  className="prose dark:prose-invert flex-1"
                  remarkPlugins={remarkPlugins}
                  rehypePlugins={[rehypeMathjax]}
                  components={customMarkdownComponents}
                >
                  {contentToDisplay}
                </MemoizedReactMarkdown>
                {/* Add streaming indicator at the end if content is streaming */}
                {messageIsStreaming && contentToDisplay.length > 0 && (
                  <StreamingIndicator />
                )}
              </>
            )}
          </div>

          {/* Fixed action buttons at the bottom of the message */}
          <div className="flex justify-end items-center mt-3 sm:mt-4 space-x-2">
            {/* Copy button */}
            <button
              className={`px-2 py-1 text-sm rounded-md flex items-center ${
                messageCopied 
                  ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200 dark:bg-gray-800 dark:text-gray-300 dark:hover:bg-gray-700'
              }`}
              onClick={copyOnClick}
              aria-label={messageCopied ? "Copied" : "Copy message"}
              title={messageCopied ? "Copied" : "Copy message"}
            >
              {messageCopied ? (
                <>
                  <IconCheck size={16} className="mr-1" />
                </>
              ) : (
                <>
                  <IconCopy size={16} className="mr-1" />
                </>
              )}
            </button>

            {/* Streaming Settings button */}
            <button
              className={`px-2 py-1 text-sm rounded-md flex items-center ${
                showStreamingSettings
                  ? 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200 dark:bg-gray-800 dark:text-gray-300 dark:hover:bg-gray-700'
              }`}
              onClick={() => setShowStreamingSettings(!showStreamingSettings)}
              aria-label="Text streaming settings"
              title="Text streaming settings"
            >
              <IconSettings size={16} className="mr-1" />
            </button>

            {/* Listen button */}
            <button
              className={`px-2 py-1 text-sm rounded-md flex items-center ${
                audioUrl
                  ? 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400'
                  : isGeneratingAudio
                    ? 'bg-gray-200 text-gray-500 dark:bg-gray-700 dark:text-gray-400 cursor-not-allowed'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200 dark:bg-gray-800 dark:text-gray-300 dark:hover:bg-gray-700'
              }`}
              onClick={audioUrl ? handleCloseAudio : handleTTS}
              disabled={isGeneratingAudio || messageIsStreaming}
              aria-label={audioUrl ? "Stop audio" : isGeneratingAudio ? "Generating audio..." : "Listen"}
              title={audioUrl ? "Stop audio" : isGeneratingAudio ? "Generating audio..." : "Listen to this message"}
            >
              {isGeneratingAudio ? (
                <>
                  <IconLoader2 size={16} className="animate-spin mr-1" />
                </>
              ) : audioUrl ? (
                <>
                  <IconVolumeOff size={16} className="mr-1" />
                </>
              ) : (
                <>
                  <IconVolume size={16} className="mr-1" />
                </>
              )}
            </button>
          </div>

          {/* Streaming Settings Modal */}
          {showStreamingSettings && (
            <div className="mt-3 p-3 bg-gray-100 dark:bg-gray-800 rounded-md text-sm">
              <h4 className="font-medium mb-2 text-gray-700 dark:text-gray-300">Text Streaming Settings</h4>
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <label className="cursor-pointer text-gray-700 dark:text-gray-300">
                    Smooth streaming
                    <input
                      type="checkbox"
                      className="ml-2"
                      checked={settings.smoothStreamingEnabled}
                      onChange={(e) => 
                        updateSettings({ smoothStreamingEnabled: e.target.checked })
                      }
                    />
                  </label>
                </div>
                
                <div>
                  <label className="block mb-1 text-gray-700 dark:text-gray-300">
                    Speed (characters per frame)
                  </label>
                  <input
                    type="range"
                    min="1"
                    max="10"
                    value={settings.charsPerFrame}
                    onChange={(e) => 
                      updateSettings({ charsPerFrame: parseInt(e.target.value) })
                    }
                    className="w-full"
                    disabled={!settings.smoothStreamingEnabled}
                  />
                  <div className="text-xs text-gray-500 dark:text-gray-400 mt-1 flex justify-between">
                    <span>Slower</span>
                    <span>{settings.charsPerFrame}</span>
                    <span>Faster</span>
                  </div>
                </div>
                
                <div>
                  <label className="block mb-1 text-gray-700 dark:text-gray-300">
                    Delay between frames (ms)
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
                    className="w-full"
                    disabled={!settings.smoothStreamingEnabled}
                  />
                  <div className="text-xs text-gray-500 dark:text-gray-400 mt-1 flex justify-between">
                    <span>Faster</span>
                    <span>{settings.frameDelay}ms</span>
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
