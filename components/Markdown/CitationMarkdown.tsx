import React, { FC, memo, useCallback, useRef, useState } from 'react';
import ReactMarkdown, { Components, Options } from 'react-markdown';

import Link from 'next/link';

import { Conversation, Message } from '@/types/chat';
import { Citation } from '@/types/rag';

interface CitationMarkdownProps extends Options {
  message?: Message;
  conversation?: Conversation;
  citations?: Citation[];
}

type HoverState = {
  number: number;
  key: string;
} | null;

export const CitationMarkdown: FC<CitationMarkdownProps> = memo(
  ({ message, conversation, citations = [], components = {}, ...props }) => {
    const [displayContent, setDisplayContent] = useState('');
    const [hoveredCitation, setHoveredCitation] = useState<HoverState>(null);
    const [extractedCitations, setExtractedCitations] = useState<Citation[]>(
      [],
    );
    const [remarkPlugins, setRemarkPlugins] = useState<any[]>([]);

    const hoverTimeoutRef = useRef<number | null>(null);
    const activeElementRef = useRef<HTMLElement | null>(null);
    const citationsProcessed = useRef(false);

    // Process content to extract citations
    React.useEffect(() => {
      const processContent = () => {
        let mainContent = props.children?.toString() || '';
        let citationsData: Citation[] = [];

        // First look for the distinct citation marker
        const citationMarker = mainContent.indexOf(
          '\n\n---CITATIONS_DATA---\n',
        );
        if (citationMarker !== -1) {
          const contentBeforeMarker = mainContent.slice(0, citationMarker);
          const jsonStr = mainContent.slice(citationMarker + 22); // Length of "\n\n---CITATIONS_DATA---\n"

          try {
            const parsedData = JSON.parse(jsonStr);
            if (parsedData.citations) {
              citationsData = parsedData.citations;
              mainContent = contentBeforeMarker;
            }
          } catch (error) {
            console.error('Error parsing citations JSON with marker:', error);
          }
        } else {
          // Fall back to the legacy regex method
          const jsonMatch = mainContent.match(/(\{[\s\S]*\})$/);
          if (jsonMatch) {
            const jsonStr = jsonMatch[1];
            try {
              const parsedData = JSON.parse(jsonStr);
              if (parsedData.citations) {
                citationsData = parsedData.citations;
                mainContent = mainContent.slice(0, -jsonStr.length).trim();
              }
            } catch (error) {
              console.error('Error parsing legacy citations JSON:', error);
            }
          }
        }

        // Check for message-level stored citations if no citations found in content
        if (
          citationsData.length === 0 &&
          message?.citations &&
          message.citations.length > 0
        ) {
          citationsData = [...message.citations];
        }

        // Use provided citations as fallback if available
        if (citationsData.length === 0 && citations.length > 0) {
          citationsData = citations;
        }

        // Debug logging
        console.debug('Citation processing results:', {
          contentLength: mainContent.length,
          citationsFound: citationsData.length,
          hasMarker: citationMarker !== -1,
          hasLegacyMatch: !!mainContent.match(/(\{[\s\S]*\})$/),
          messageCitations: message?.citations ? message.citations.length : 0,
          providedCitations: citations.length,
        });

        setDisplayContent(mainContent);
        if (mainContent.includes('```math')) {
          setRemarkPlugins((prev) =>
            prev.some((p) => p === 'remark-math')
              ? prev
              : [...prev, ['remark-math', { singleDollar: false }]],
          );
        }
        setExtractedCitations(citationsData);
        citationsProcessed.current = true;
      };

      processContent();
    }, [props.children, message, citations]);

    // Global mouse tracking to ensure we catch all movements
    React.useEffect(() => {
      const handleGlobalMouseMove = (e: MouseEvent) => {
        const target = e.target as HTMLElement;
        const isOverCitation = target.classList.contains('citation-number');
        const isOverTooltip = target.closest('.citation-tooltip');

        // If we're not over either element and not in transition period
        if (!isOverCitation && !isOverTooltip && !hoverTimeoutRef.current) {
          setHoveredCitation(null);
        }
      };

      document.addEventListener('mousemove', handleGlobalMouseMove);
      return () => {
        document.removeEventListener('mousemove', handleGlobalMouseMove);
        if (hoverTimeoutRef.current) {
          window.clearTimeout(hoverTimeoutRef.current);
          hoverTimeoutRef.current = null;
        }
      };
    }, []);

    const createCitationElement = useCallback(
      (citationNumber: number, key: string) => {
        const citation = extractedCitations.find(
          (c) => c.number === citationNumber,
        );
        if (!citation) return `[${citationNumber}]`;

        let hostname = '';
        let cleanDomain = '';

        try {
          if (citation.url) {
            const url = new URL(citation.url);
            hostname = url.hostname;
            cleanDomain = hostname.replace(/^www\./, '').split('.')[0];
          }
        } catch (error) {
          console.error('Invalid URL:', citation.url);
        }

        const isHovered =
          hoveredCitation?.number === citationNumber &&
          hoveredCitation?.key === key;

        const handleMouseEnter = (e: React.MouseEvent<HTMLElement>) => {
          if (hoverTimeoutRef.current) {
            window.clearTimeout(hoverTimeoutRef.current);
            hoverTimeoutRef.current = null;
          }
          activeElementRef.current = e.currentTarget;
          setHoveredCitation({ number: citationNumber, key });
        };

        const handleMouseLeave = (e: React.MouseEvent<HTMLElement>) => {
          const relatedTarget = e.relatedTarget as HTMLElement;
          const isMovingToTooltip = relatedTarget?.closest('.citation-tooltip');

          if (!isMovingToTooltip) {
            if (hoverTimeoutRef.current) {
              window.clearTimeout(hoverTimeoutRef.current);
            }
            hoverTimeoutRef.current = window.setTimeout(() => {
              if (activeElementRef.current === e.currentTarget) {
                setHoveredCitation(null);
              }
              hoverTimeoutRef.current = null;
            }, 200);
          }
        };

        return (
          <span className="citation-wrapper relative inline-block" key={key}>
            <sup
              className="citation-number cursor-help mx-[1px] text-blue-600
                        dark:text-blue-400 hover:underline"
              onMouseEnter={handleMouseEnter}
              onMouseLeave={handleMouseLeave}
            >
              [{citationNumber}]
            </sup>
            {isHovered && (
              <div
                className="citation-tooltip absolute z-10 left-0 bg-gray-200
                          dark:bg-[#171717] rounded-lg transition-all duration-300
                          overflow-hidden text-xs border-2 border-transparent
                          hover:border-blue-500 hover:shadow-lg h-32 w-48 p-2"
                style={{
                  top: 'auto',
                  bottom: '100%',
                  transform: 'translateY(-8px)',
                }}
                onMouseEnter={handleMouseEnter}
                onMouseLeave={() => {
                  activeElementRef.current = null;
                  setHoveredCitation(null);
                }}
              >
                <Link
                  href={citation.url || ''}
                  target="_blank"
                  rel="noopener noreferrer"
                  title={citation.title || ''}
                  className="flex flex-col h-full no-underline justify-between"
                  onClick={(e) => e.stopPropagation()}
                >
                  <div className="flex-grow">
                    <div
                      className="text-[12.5px] line-clamp-3 text-gray-800
                                  dark:text-white mb-2"
                    >
                      {citation.title}
                    </div>
                  </div>
                  {citation.date && (
                    <div className="text-[11px] text-gray-600 dark:text-gray-400 mb-6">
                      {citation.date}
                    </div>
                  )}
                  <div
                    className="absolute bottom-0 left-0 right-0
                                dark:bg-[#1f1f1f] bg-gray-100 px-2 py-1
                                flex items-center dark:text-white text-gray-500
                                text-[11.5px] space-x-1"
                  >
                    <div className="flex items-center">
                      {hostname && (
                        <img
                          src={`https://www.google.com/s2/favicons?domain=${hostname}&size=16`}
                          alt={`${hostname} favicon`}
                          width={12}
                          height={12}
                          className="mr-1 my-0 p-0 align-middle"
                        />
                      )}
                    </div>
                    <span className="truncate">{cleanDomain}</span>
                    <span>|</span>
                    <span>{citation.number}</span>
                  </div>
                </Link>
              </div>
            )}
          </span>
        );
      },
      [hoveredCitation, extractedCitations],
    );

    const processTextWithCitations = useCallback(
      (text: string) => {
        const parts: React.ReactNode[] = [];
        let lastIndex = 0;
        const citationRegex = /\[(\d+)\]/g;
        let match;

        while ((match = citationRegex.exec(text)) !== null) {
          if (match.index > lastIndex) {
            parts.push(text.slice(lastIndex, match.index));
          }

          const citationNumber = parseInt(match[1], 10);
          parts.push(
            createCitationElement(
              citationNumber,
              `citation-${match.index}-${citationNumber}`,
            ),
          );

          lastIndex = match.index + match[0].length;
        }

        if (lastIndex < text.length) {
          parts.push(text.slice(lastIndex));
        }

        return <>{parts}</>;
      },
      [createCitationElement],
    );

    const ParagraphWithCitations: Components['p'] = ({
      children,
      ...props
    }) => {
      const hasCitationHandling =
        conversation?.bot || extractedCitations.length > 0;
      if (!hasCitationHandling) {
        return <p {...props}>{children}</p>;
      }

      return (
        <p {...props}>
          {React.Children.map(children, (child) => {
            if (typeof child === 'string') {
              return processTextWithCitations(child);
            }
            return child;
          })}
        </p>
      );
    };

    const ListItemWithCitations: Components['li'] = ({
      children,
      ...props
    }) => {
      const hasCitationHandling =
        conversation?.bot || extractedCitations.length > 0;
      if (!hasCitationHandling) {
        return <li {...props}>{children}</li>;
      }

      return (
        <li {...props}>
          {React.Children.map(children, (child) => {
            if (typeof child === 'string') {
              return processTextWithCitations(child);
            }
            return child;
          })}
        </li>
      );
    };

    return (
      <ReactMarkdown
        {...props}
        components={{
          ...components,
          p: ParagraphWithCitations,
          li: ListItemWithCitations,
        }}
      >
        {displayContent}
      </ReactMarkdown>
    );
  },
  (prevProps, nextProps) => {
    // Only re-render if these props change
    return (
      prevProps.children === nextProps.children &&
      prevProps.conversation?.bot === nextProps.conversation?.bot &&
      JSON.stringify(prevProps.citations) ===
        JSON.stringify(nextProps.citations) &&
      JSON.stringify(prevProps.message?.citations || []) ===
        JSON.stringify(nextProps.message?.citations || [])
    );
  },
);

CitationMarkdown.displayName = 'CitationMarkdown';
