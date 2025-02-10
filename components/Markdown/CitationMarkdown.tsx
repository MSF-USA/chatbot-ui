import React, { FC, memo, useRef, useState } from 'react';
import ReactMarkdown, { Components, Options } from 'react-markdown';

import Link from 'next/link';

import { Conversation, Message } from '@/types/chat';
import { Citation } from '@/types/rag';

interface CitationMarkdownProps extends Options {
  message?: Message;
  conversation?: Conversation;
  citations?: Citation[];
}

export const CitationMarkdown: FC<CitationMarkdownProps> = memo(
  ({ message, conversation, citations = [], components = {}, ...props }) => {
    const [hoveredCitation, setHoveredCitation] = useState<number | null>(null);
    const tooltipRefs = useRef<Record<number, HTMLSpanElement | null>>({});

    const ParagraphWithCitations: Components['p'] = ({ children }) => {
      const hasCitationHandling = conversation?.bot;
      if (!hasCitationHandling) {
        return <p>{children}</p>;
      }

      const childrenArray = React.Children.toArray(children);
      const processedChildren: React.ReactNode[] = [];

      childrenArray.forEach((child) => {
        if (typeof child === 'string') {
          const parts: React.ReactNode[] = [];
          let remainingText = child;
          const citationRegex = /(\[(\d+)\])+/g;
          let match;
          let lastIndex = 0;

          while ((match = citationRegex.exec(remainingText)) !== null) {
            if (match.index > lastIndex) {
              parts.push(remainingText.slice(lastIndex, match.index));
            }

            const citationsInMatch = match[0].match(/\[(\d+)\]/g) || [];
            const citationElements = citationsInMatch.map((citStr) => {
              const citationNumber = parseInt(citStr.slice(1, -1));
              const citation = citations.find(
                (c) => c.number === citationNumber,
              );

              if (!citation) return null;

              const processUrl = (
                url: string,
              ): { hostname: string; cleanDomain: string } => {
                try {
                  const { hostname } = new URL(url);
                  const cleanDomain = hostname
                    .replace(/^www\./, '')
                    .split('.')[0];
                  return { hostname, cleanDomain };
                } catch (error) {
                  console.error('Invalid URL:', url);
                  return {
                    hostname: 'Invalid URL',
                    cleanDomain: 'Invalid URL',
                  };
                }
              };

              const { hostname, cleanDomain } = processUrl(citation.url || '');

              return (
                <sup
                  key={`citation-${citationNumber}`}
                  className="cursor-help mx-[1px] text-blue-600 dark:text-blue-400 hover:underline relative inline-block"
                  onMouseEnter={() => setHoveredCitation(citationNumber)}
                  onMouseLeave={() =>
                    setTimeout(() => setHoveredCitation(null), 200)
                  }
                >
                  [{citationNumber}]
                  {citation && hoveredCitation === citationNumber && (
                    <span
                      className="absolute z-10 left-0 bg-gray-200 dark:bg-[#171717] rounded-lg transition-all duration-300 overflow-hidden text-xs border-2 border-transparent hover:border-blue-500 hover:shadow-lg h-[132px] w-48 p-2 mb-5"
                      style={{
                        top: 'auto',
                        bottom: '100%',
                        left: 0,
                        pointerEvents: 'none',
                        display: 'inline-block',
                      }}
                      ref={(el) => (tooltipRefs.current[citationNumber] = el)}
                    >
                      <Link
                        href={citation.url || ''}
                        target="_blank"
                        rel="noopener noreferrer"
                        title={citation.title || ''}
                        className="flex flex-col h-full no-underline justify-between"
                      >
                        <div className="flex-grow">
                          <div className="text-[12.5px] line-clamp-3 text-gray-800 dark:text-white mb-2">
                            {citation.title}
                          </div>
                        </div>
                        {citation.date && (
                          <div className="text-[11px] text-gray-600 dark:text-gray-400 mb-6">
                            {citation.date}
                          </div>
                        )}
                        <div className="absolute bottom-0 left-0 right-0 dark:bg-[#1f1f1f] bg-gray-100 px-2 py-1 flex items-center dark:text-white text-gray-500 text-[11.5px] space-x-1">
                          <div className="flex items-center">
                            <img
                              src={`https://www.google.com/s2/favicons?domain=${hostname}&size=16`}
                              alt={`${hostname} favicon`}
                              width={12}
                              height={12}
                              className="mr-1 my-0 p-0 align-middle"
                            />
                          </div>
                          <span className="truncate">{cleanDomain}</span>
                          <span>|</span>
                          <span>{citation.number}</span>
                        </div>
                      </Link>
                    </span>
                  )}
                </sup>
              );
            });

            parts.push(...citationElements);
            lastIndex = match.index + match[0].length;
          }

          if (lastIndex < remainingText.length) {
            parts.push(remainingText.slice(lastIndex));
          }

          processedChildren.push(...(parts.length > 0 ? parts : [child]));
        } else {
          processedChildren.push(child);
        }
      });

      return <p>{processedChildren}</p>;
    };

    return (
      <ReactMarkdown
        {...props}
        components={{
          ...components,
          ...(conversation?.bot ? { p: ParagraphWithCitations } : {}),
        }}
      />
    );
  },
  (prevProps, nextProps) =>
    prevProps.children === nextProps.children &&
    prevProps.conversation?.bot === nextProps.conversation?.bot &&
    prevProps.citations === nextProps.citations,
);

CitationMarkdown.displayName = 'CitationMarkdown';
