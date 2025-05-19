import {
  IconCheck,
  IconCopy,
  IconLoader2,
  IconRobot,
  IconVolume,
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
  const [isPlaying, setIsPlaying] = useState<boolean>(false);
  const [audioUrl, setAudioUrl] = useState<string | null>(null);
  const [loadingMessage, setLoadingMessage] = useState<string | null>(null);
  const [remarkPlugins, setRemarkPlugins] = useState<any[]>([remarkGfm]);

  const citationsProcessed = useRef(false);
  const processingAttempts = useRef(0);

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

  const displayContentWithoutCitations = messageIsStreaming
    ? content.split(/(\{[\s\S]*\})$/)[0].split('\n\n---CITATIONS_DATA---\n')[0]
    : displayContent;

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
        {audioUrl && (
          <div className={'flex flex-row'}>
            <audio
              src={audioUrl}
              controls
              onPlay={() => setIsPlaying(true)}
              onPause={() => setIsPlaying(false)}
              onEnded={() => {
                setIsPlaying(false);
                URL.revokeObjectURL(audioUrl);
                setAudioUrl(null);
              }}
            />
          </div>
        )}
        <div className="flex flex-row">
          {selectedConversation?.bot ? (
            <CitationMarkdown
              className="prose dark:prose-invert flex-1"
              conversation={selectedConversation}
              citations={citations}
              remarkPlugins={remarkPlugins}
              rehypePlugins={[rehypeMathjax]}
              components={{
                code({ node, inline, className, children, ...props }) {
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
                table({ children }) {
                  return (
                    <div className="overflow-auto">
                      <table className="border-collapse border border-black px-3 py-1 dark:border-white">
                        {children}
                      </table>
                    </div>
                  );
                },
                th({ children }) {
                  return (
                    <th className="break-words border border-black bg-gray-500 px-3 py-1 text-white dark:border-white">
                      {children}
                    </th>
                  );
                },
                td({ children }) {
                  return (
                    <td className="break-words border border-black px-3 py-1 dark:border-white">
                      {children}
                    </td>
                  );
                },
              }}
            >
              {displayContentWithoutCitations}
            </CitationMarkdown>
          ) : (
            <MemoizedReactMarkdown
              className="prose dark:prose-invert flex-1"
              remarkPlugins={remarkPlugins}
              rehypePlugins={[rehypeMathjax]}
              components={{
                code({ node, inline, className, children, ...props }) {
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
                table({ children }) {
                  return (
                    <div className="overflow-auto">
                      <table className="border-collapse border border-black px-3 py-1 dark:border-white">
                        {children}
                      </table>
                    </div>
                  );
                },
                th({ children }) {
                  return (
                    <th className="break-words border border-black bg-gray-500 px-3 py-1 text-white dark:border-white">
                      {children}
                    </th>
                  );
                },
                td({ children }) {
                  return (
                    <td className="break-words border border-black px-3 py-1 dark:border-white">
                      {children}
                    </td>
                  );
                },
              }}
            >
              {displayContentWithoutCitations}
            </MemoizedReactMarkdown>
          )}

          <div className="md:-mr-8 ml-1 md:ml-0 flex flex-col md:flex-row gap-4 md:gap-1 items-center md:items-start justify-end md:justify-start">
            {messageCopied ? (
              <IconCheck
                size={20}
                className="text-green-500 dark:text-green-400"
              />
            ) : (
              <button
                className="invisible group-hover:visible focus:visible text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-300"
                onClick={copyOnClick}
              >
                <IconCopy size={20} />
              </button>
            )}
            {!audioUrl && (
              <button
                className="invisible group-hover:visible focus:visible text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-300"
                onClick={handleTTS}
                disabled={isGeneratingAudio}
              >
                {isGeneratingAudio ? (
                  <div className="flex items-center">
                    <IconLoader2 size={20} className="animate-spin mr-2" />
                    <span className="text-xs">{loadingMessage}</span>
                  </div>
                ) : (
                  <IconVolume size={20} />
                )}
              </button>
            )}
          </div>
        </div>
        {citations.length > 0 && <CitationList citations={citations} />}
      </div>
    </div>
  );
};

export default AssistantMessage;