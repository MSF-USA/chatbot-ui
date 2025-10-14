// components/Markdown/CitationMarkdown.tsx
import React, { FC, memo, useCallback, useRef, useState } from 'react';
import ReactMarkdown, { Components, Options } from 'react-markdown';

import Link from 'next/link';

import { extractCitationsFromContent } from '@/lib/utils/app/citation';

import { Conversation, Message } from '@/types/chat';
import { Citation } from '@/types/rag';

interface CitationMarkdownProps extends Options {
  message?: Message;
  conversation?: Conversation | null;
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
    const [tooltipPosition, setTooltipPosition] = useState<{ top: number; left: number } | null>(null);

    const hoverTimeoutRef = useRef<number | null>(null);
    const activeElementRef = useRef<HTMLElement | null>(null);
    const citationsProcessed = useRef(false);

    // Process content to extract citations
    React.useEffect(() => {
      const processContent = () => {
        let mainContent = props.children?.toString() || '';
        let citationsData: Citation[] = [];
        let source = 'none';

        // Process citations only if conversation has a bot associated with it
        const shouldProcessCitations = !!conversation?.bot;

        // Priority 1: Use citations from the message object (already extracted during streaming)
        if (shouldProcessCitations && message?.citations && message.citations.length > 0) {
          citationsData = [...message.citations];
          source = 'message';

          // If we're using pre-extracted citations, we need to make sure the content
          // doesn't still contain the citation data
          if (mainContent) {
            const { text } = extractCitationsFromContent(mainContent);
            mainContent = text;
          }
        }
        // Priority 2: Use provided citations prop
        else if (shouldProcessCitations && citations && citations.length > 0) {
          citationsData = [...citations];
          source = 'props';
        }
        // Priority 3: Parse the content to extract citations
        else if (shouldProcessCitations) {
          const {
            text,
            citations: extractedCits,
            extractionMethod,
          } = extractCitationsFromContent(mainContent);
          if (extractedCits.length > 0) {
            mainContent = text;
            citationsData = extractedCits;
            source = `parsed-${extractionMethod}`;
          }
        }

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
    
    const renderTooltip = useCallback((citation: Citation) => {
      if (!tooltipPosition) return null;

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

      return (
        <div
          className="citation-tooltip fixed z-[9999] rounded-lg transition-all duration-300
                    overflow-hidden text-xs border-2 border-transparent hover:border-blue-500 
                    hover:shadow-lg h-[132px] w-48 p-2 pointer-events-auto
                    bg-gray-200 dark:bg-[#171717]"
          style={{
            left: `${tooltipPosition.left}px`,
            top: `${Math.max(10, tooltipPosition.top)}px`,
          }}
          onMouseEnter={() => {
            if (hoverTimeoutRef.current) {
              window.clearTimeout(hoverTimeoutRef.current);
              hoverTimeoutRef.current = null;
            }
          }}
          onMouseLeave={() => {
            activeElementRef.current = null;
            setHoveredCitation(null);
            setTooltipPosition(null);
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
                className="text-[12.5px] line-clamp-3 text-gray-800 dark:text-white mb-2"
              >
                {citation.title}
              </div>
            </div>
            {citation.date && citation.date.trim() !== '' && (
              <div className="text-[11px] text-gray-600 dark:text-gray-400 mb-6">
                {new Date(citation.date).toLocaleDateString('en-US', {
                  year: 'numeric',
                  month: 'short',
                  day: 'numeric'
                })}
              </div>
            )}
            <div
              className="absolute bottom-0 left-0 right-0 dark:bg-[#1f1f1f] bg-gray-100 
                          px-2 py-1 flex items-center dark:text-white text-gray-500 
                          text-[11.5px] space-x-1"
            >
              <div className="flex items-center">
                {hostname && (
                  // eslint-disable-next-line @next/next/no-img-element
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
      );
    }, [tooltipPosition, hoverTimeoutRef, setHoveredCitation, setTooltipPosition]);

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
          const rect = e.currentTarget.getBoundingClientRect();
          setTooltipPosition({
            top: rect.top - 140,
            left: rect.left
          });
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
                setTooltipPosition(null);
              }
              hoverTimeoutRef.current = null;
            }, 200);
          }
        };

        return (
          <span key={key} className="relative inline-block">
            <sup
              className="citation-number cursor-help mx-[1px] text-blue-600
                        dark:text-blue-400 hover:underline"
              onMouseEnter={handleMouseEnter}
              onMouseLeave={handleMouseLeave}
            >
              [{citationNumber}]
            </sup>
          </span>
        );
      },
      [hoveredCitation, extractedCitations, renderTooltip],
    );

    const processTextWithCitations = useCallback(
      (text: string) => {
        // Process citations if we have any
        if (extractedCitations.length === 0) {
          return text;
        }

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
      [createCitationElement, extractedCitations],
    );

    const ParagraphWithCitations: Components['p'] = ({
      children,
      ...props
    }) => {
      // Process citations if we have any
      const hasCitationHandling = extractedCitations.length > 0;
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
      // Process citations if we have any
      const hasCitationHandling = extractedCitations.length > 0;
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

    // Find the citation for the tooltip
    const tooltipCitation = hoveredCitation
      ? extractedCitations.find((c) => c.number === hoveredCitation.number)
      : null;

    return (
      <>
        <ReactMarkdown
          {...props}
          components={{
            ...components,
            p: ParagraphWithCitations,
            li: ListItemWithCitations,
          } as any}
        >
          {displayContent}
        </ReactMarkdown>
        {hoveredCitation && tooltipCitation && renderTooltip(tooltipCitation)}
      </>
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
