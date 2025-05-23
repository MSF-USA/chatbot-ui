import {
  IconLoader2,
  IconRobot, IconSettings,
  IconLanguage,
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
import { getAutonym } from '@/utils/app/locales';

import AudioPlayer from '@/components/Chat/AudioPlayer';
import { CitationList } from '@/components/Chat/Citations/CitationList';
import { CitationMarkdown } from '@/components/Markdown/CitationMarkdown';
import { CodeBlock } from '@/components/Markdown/CodeBlock';
import { MemoizedReactMarkdown } from '@/components/Markdown/MemoizedReactMarkdown';
import { AssistantMessageActionButtons } from '@/components/Chat/ChatMessages/AssistantMessageActionButtons';

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
  const [isTranslating, setIsTranslating] = useState<boolean>(false);
  const [translations, setTranslations] = useState<Record<string, string>>({});
  const [currentLanguage, setCurrentLanguage] = useState<string | null>(null);

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
  // If translated content is available, use that instead of the original content
  const contentToDisplay = currentLanguage && translations[currentLanguage]
    ? translations[currentLanguage]
    : (settings.smoothStreamingEnabled && messageIsStreaming
        ? smoothContent
        : displayContentWithoutCitations);

  const handleTTS = async () => {
    try {
      setIsGeneratingAudio(true);
      setLoadingMessage('Generating audio...');

      const response = await fetch('/api/v2/tts', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ text: contentToDisplay }),
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

  const handleTranslate = async (targetLocale: string) => {
    try {
      // If we already have this translation, just switch to it
      if (translations[targetLocale]) {
        setCurrentLanguage(targetLocale);
        return;
      }

      setIsTranslating(true);
      setLoadingMessage('Translating...');

      const response = await fetch('/api/v2/translation', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          sourceText: displayContentWithoutCitations,
          targetLocale,
          modelId: selectedConversation.model?.id,
        }),
      });

      if (!response.ok) {
        throw new Error('Translation failed');
      }

      const data = await response.json();

      // Store the translation and set it as current
      setTranslations(prev => ({
        ...prev,
        [targetLocale]: data.translatedText
      }));
      setCurrentLanguage(targetLocale);

      setIsTranslating(false);
      setLoadingMessage(null);
    } catch (error) {
      console.error('Error in translation:', error);
      setIsTranslating(false);
      setLoadingMessage('Error translating text. Please try again.');
      setTimeout(() => setLoadingMessage(null), 3000); // Clear error message after 3 seconds
    }
  };

  // Function to switch back to original text
  const handleResetTranslation = () => {
    setCurrentLanguage(null);
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

          {/* Action buttons at the bottom of the message */}
          <AssistantMessageActionButtons
            messageCopied={messageCopied}
            copyOnClick={copyOnClick}
            isGeneratingAudio={isGeneratingAudio}
            audioUrl={audioUrl}
            handleTTS={handleTTS}
            handleCloseAudio={handleCloseAudio}
            messageIsStreaming={messageIsStreaming}
            showStreamingSettings={showStreamingSettings}
            setShowStreamingSettings={setShowStreamingSettings}
            onTranslate={handleTranslate}
            isTranslating={isTranslating}
          />

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

          {/* Translation indicator */}
          {(currentLanguage || Object.keys(translations).length > 0) && (
              <div className="mb-2 flex items-center text-sm text-gray-500 dark:text-gray-400">
                <IconLanguage size={16} className="mr-1" />
                <span className="mr-2">
                {currentLanguage
                    ? `${getAutonym(currentLanguage)}`
                    : "Original text"}
              </span>

                {/* Translation selector dropdown */}
                <div className="relative inline-block">
                  <button
                      className="text-blue-500 hover:text-blue-700 dark:text-blue-400 dark:hover:text-blue-300 underline text-xs"
                      onClick={(e) => {
                        e.preventDefault();
                        e.stopPropagation();
                        const dropdown = document.getElementById(`translation-dropdown-${messageIndex}`);
                        if (dropdown) {
                          dropdown.classList.toggle('hidden');
                        }
                      }}
                  >
                    Change
                  </button>

                  <div
                      id={`translation-dropdown-${messageIndex}`}
                      className="hidden absolute left-0 bottom-full mb-1 w-48 bg-white dark:bg-gray-800 rounded-md shadow-lg z-10 max-h-60 overflow-y-auto"
                  >
                    <div className="py-1">
                      <button
                          className={`w-full text-left px-4 py-2 text-sm ${
                              currentLanguage === null
                                  ? 'bg-gray-100 dark:bg-gray-700 font-medium'
                                  : 'text-gray-700 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-700'
                          }`}
                          onClick={() => {
                            handleResetTranslation();
                            document.getElementById(`translation-dropdown-${messageIndex}`)?.classList.add('hidden');
                          }}
                      >
                        Original text
                      </button>

                      {Object.keys(translations).map((locale) => (
                          <button
                              key={locale}
                              className={`w-full text-left px-4 py-2 text-sm ${
                                  currentLanguage === locale
                                      ? 'bg-gray-100 dark:bg-gray-700 font-medium'
                                      : 'text-gray-700 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-700'
                              }`}
                              onClick={() => {
                                setCurrentLanguage(locale);
                                document.getElementById(`translation-dropdown-${messageIndex}`)?.classList.add('hidden');
                              }}
                          >
                            {getAutonym(locale)}
                          </button>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
          )}
        </div>

        {citations.length > 0 && <CitationList citations={citations} />}
      </div>
    </div>
  );
};

export default AssistantMessage;
