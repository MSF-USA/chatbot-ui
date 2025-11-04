// components/Markdown/CitationStreamdown.tsx
import React, { FC, memo, useCallback, useRef, useState } from 'react';
import type { Components } from 'react-markdown';

import Link from 'next/link';

import { extractCitationsFromContent } from '@/lib/utils/app/stream/citation';

import { Conversation, Message } from '@/types/chat';
import { Citation } from '@/types/rag';

import { CitationItem } from '../Chat/Citations/CitationItem';

import { Streamdown } from 'streamdown';
import type { StreamdownProps } from 'streamdown';

interface CitationStreamdownProps extends Omit<StreamdownProps, 'components'> {
  message?: Message;
  conversation?: Conversation | null;
  citations?: Citation[];
  components?: Components;
}

type HoverState = {
  number: number;
  key: string;
} | null;

export const CitationStreamdown: FC<CitationStreamdownProps> = memo(
  ({
    message,
    conversation,
    citations = [],
    components = {},
    isAnimating = false,
    ...props
  }) => {
    const [displayContent, setDisplayContent] = useState('');
    const [hoveredCitation, setHoveredCitation] = useState<HoverState>(null);
    const [extractedCitations, setExtractedCitations] = useState<Citation[]>(
      [],
    );
    const [tooltipPosition, setTooltipPosition] = useState<{
      top: number;
      left: number;
    } | null>(null);

    const hoverTimeoutRef = useRef<number | null>(null);
    const activeElementRef = useRef<HTMLElement | null>(null);
    const citationsProcessed = useRef(false);

    // Process content to extract citations
    React.useEffect(() => {
      const processContent = () => {
        let mainContent = props.children?.toString() || '';
        let citationsData: Citation[] = [];

        // Check if we should process citations:
        // - If conversation has a bot (RAG/bot conversations)
        // - If citations are provided (from search results)
        // - If message has citations
        const shouldProcessCitations =
          !!conversation?.bot ||
          (citations && citations.length > 0) ||
          (message?.citations && message.citations.length > 0);

        if (!shouldProcessCitations) {
          setDisplayContent(mainContent);
          setExtractedCitations([]);
          citationsProcessed.current = true;
          return;
        }

        // Priority 1: Use citations from the message object
        if (message?.citations && message.citations.length > 0) {
          citationsData = [...message.citations];

          // Clean content from citation data
          if (mainContent) {
            const { text } = extractCitationsFromContent(mainContent);
            mainContent = text;
          }
        }
        // Priority 2: Use provided citations prop (for privacy-focused search mode)
        else if (citations && citations.length > 0) {
          citationsData = [...citations];
        }
        // Priority 3: Parse the content to extract citations (for bot conversations)
        else if (conversation?.bot) {
          const { text, citations: extractedCits } =
            extractCitationsFromContent(mainContent);
          if (extractedCits.length > 0) {
            mainContent = text;
            citationsData = extractedCits;
          }
        }

        setDisplayContent(mainContent);
        setExtractedCitations(citationsData);
        citationsProcessed.current = true;
      };

      processContent();
    }, [
      props.children,
      message,
      citations,
      conversation?.bot,
      conversation?.model,
    ]);

    // Global mouse tracking for citation tooltips
    React.useEffect(() => {
      const handleGlobalMouseMove = (e: MouseEvent) => {
        const target = e.target as HTMLElement;
        const isOverCitation = target.classList.contains('citation-number');
        const isOverTooltip = target.closest('.citation-tooltip');

        if (!isOverCitation && !isOverTooltip) {
          if (hoverTimeoutRef.current) {
            clearTimeout(hoverTimeoutRef.current);
          }
          hoverTimeoutRef.current = window.setTimeout(() => {
            setHoveredCitation(null);
            setTooltipPosition(null);
            activeElementRef.current = null;
          }, 100);
        }
      };

      document.addEventListener('mousemove', handleGlobalMouseMove);
      return () => {
        document.removeEventListener('mousemove', handleGlobalMouseMove);
        if (hoverTimeoutRef.current) {
          clearTimeout(hoverTimeoutRef.current);
        }
      };
    }, []);

    const handleCitationHover = useCallback(
      (number: number, key: string, element: HTMLElement) => {
        if (hoverTimeoutRef.current) {
          clearTimeout(hoverTimeoutRef.current);
        }

        setHoveredCitation({ number, key });
        activeElementRef.current = element;

        // Calculate tooltip position
        const rect = element.getBoundingClientRect();
        setTooltipPosition({
          top: rect.bottom + window.scrollY + 5,
          left: rect.left + window.scrollX,
        });
      },
      [],
    );

    const renderTooltip = useCallback(() => {
      if (!hoveredCitation || !tooltipPosition) return null;

      const citation = extractedCitations[hoveredCitation.number - 1];
      if (!citation) return null;

      return (
        <div
          className="citation-tooltip fixed z-50"
          style={{
            top: `${tooltipPosition.top}px`,
            left: `${tooltipPosition.left}px`,
          }}
          onMouseEnter={() => {
            if (hoverTimeoutRef.current) {
              clearTimeout(hoverTimeoutRef.current);
            }
          }}
        >
          <CitationItem citation={citation} />
        </div>
      );
    }, [hoveredCitation, tooltipPosition, extractedCitations]);

    // Custom component for text nodes to handle citation markers
    // Memoize to prevent unnecessary re-renders
    const enhancedComponents: Components = React.useMemo(() => {
      const processChildren = (children: any): any => {
        return React.Children.map(children, (child) => {
          if (typeof child === 'string') {
            return processTextWithCitations(
              child,
              extractedCitations,
              handleCitationHover,
            );
          }
          return child;
        });
      };

      return {
        ...components,
        p({ children, ...props }: any) {
          const processedChildren = processChildren(children);
          const CustomP = components.p as any;
          if (CustomP) {
            return <CustomP {...props}>{processedChildren}</CustomP>;
          }
          return <p {...props}>{processedChildren}</p>;
        },
        li({ children, ...props }: any) {
          const processedChildren = processChildren(children);
          const CustomLi = components.li as any;
          if (CustomLi) {
            return <CustomLi {...props}>{processedChildren}</CustomLi>;
          }
          return <li {...props}>{processedChildren}</li>;
        },
        strong({ children, ...props }: any) {
          const processedChildren = processChildren(children);
          const CustomStrong = components.strong as any;
          if (CustomStrong) {
            return <CustomStrong {...props}>{processedChildren}</CustomStrong>;
          }
          return <strong {...props}>{processedChildren}</strong>;
        },
        em({ children, ...props }: any) {
          const processedChildren = processChildren(children);
          const CustomEm = components.em as any;
          if (CustomEm) {
            return <CustomEm {...props}>{processedChildren}</CustomEm>;
          }
          return <em {...props}>{processedChildren}</em>;
        },
      };
    }, [components, extractedCitations, handleCitationHover]);

    return (
      <>
        <Streamdown
          components={enhancedComponents}
          isAnimating={isAnimating}
          {...props}
        >
          {displayContent}
        </Streamdown>
        {renderTooltip()}
      </>
    );
  },
);

CitationStreamdown.displayName = 'CitationStreamdown';

// Helper function to process text and replace citation markers
function processTextWithCitations(
  text: string,
  citations: Citation[],
  onHover: (number: number, key: string, element: HTMLElement) => void,
): React.ReactNode[] {
  const citationRegex = /\[(\d+)\]/g;
  const parts: React.ReactNode[] = [];
  let lastIndex = 0;
  let match;

  while ((match = citationRegex.exec(text)) !== null) {
    // Add text before citation
    if (match.index > lastIndex) {
      parts.push(text.slice(lastIndex, match.index));
    }

    // Add citation marker
    const citationNumber = parseInt(match[1], 10);
    const citationKey = `citation-${citationNumber}-${match.index}`;

    if (citationNumber <= citations.length) {
      parts.push(
        <sup
          key={citationKey}
          className="citation-number cursor-pointer text-xs text-blue-600 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300 hover:underline font-bold mx-0.5 transition-colors duration-150"
          onMouseEnter={(e) =>
            onHover(citationNumber, citationKey, e.currentTarget)
          }
          style={{
            textDecoration: 'none',
            fontSize: '0.7em',
            lineHeight: 0,
            position: 'relative',
            verticalAlign: 'baseline',
            top: '-0.5em',
          }}
        >
          [{citationNumber}]
        </sup>,
      );
    } else {
      // Citation number out of range, render as plain text
      parts.push(match[0]);
    }

    lastIndex = match.index + match[0].length;
  }

  // Add remaining text
  if (lastIndex < text.length) {
    parts.push(text.slice(lastIndex));
  }

  return parts.length > 0 ? parts : [text];
}
