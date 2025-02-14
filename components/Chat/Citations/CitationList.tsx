import {
  IconBlockquote,
  IconChevronDown,
  IconChevronUp,
} from '@tabler/icons-react';
import React, { FC, MouseEvent, useEffect, useRef, useState } from 'react';

import { Citation } from '@/types/rag';

import { CitationItem } from './CitationItem';

interface CitationListProps {
  citations: Citation[];
}

export const CitationList: FC<{ citations: Citation[] }> = ({ citations }) => {
  const [isExpanded, setIsExpanded] = useState(false);
  const [isVisible, setIsVisible] = useState(false);
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const [scrollDirection, setScrollDirection] = useState<
    'left' | 'right' | null
  >(null);
  const scrollIntervalRef = useRef<number | null>(null);

  useEffect(() => {
    const timer = setTimeout(() => setIsVisible(true), 100);
    return () => clearTimeout(timer);
  }, []);

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (!scrollContainerRef.current) return;

      const container = scrollContainerRef.current;
      const containerRect = container.getBoundingClientRect();
      const mouseX = e.clientX - containerRect.left;
      const containerWidth = containerRect.width;

      if (mouseX > containerWidth * 0.9) {
        setScrollDirection('right');
      } else if (mouseX < containerWidth * 0.1) {
        setScrollDirection('left');
      } else {
        setScrollDirection(null);
      }
    };

    const handleMouseLeave = () => {
      setScrollDirection(null);
    };

    const container = scrollContainerRef.current;
    if (container) {
      container.addEventListener(
        'mousemove',
        handleMouseMove as unknown as EventListener,
      );
      container.addEventListener('mouseleave', handleMouseLeave);
    }

    return () => {
      if (container) {
        container.removeEventListener(
          'mousemove',
          handleMouseMove as unknown as EventListener,
        );
        container.removeEventListener('mouseleave', handleMouseLeave);
      }
    };
  }, []);

  useEffect(() => {
    const SCROLL_SPEED = 5; // Pixels per frame

    if (scrollDirection) {
      scrollIntervalRef.current = window.setInterval(() => {
        if (scrollContainerRef.current) {
          const container = scrollContainerRef.current;
          if (scrollDirection === 'right') {
            container.scrollLeft += SCROLL_SPEED;
          } else {
            container.scrollLeft -= SCROLL_SPEED;
          }
        }
      }, 16); // ~60fps
    } else {
      if (scrollIntervalRef.current !== null) {
        clearInterval(scrollIntervalRef.current);
        scrollIntervalRef.current = null;
      }
    }

    return () => {
      if (scrollIntervalRef.current !== null) {
        clearInterval(scrollIntervalRef.current);
      }
    };
  }, [scrollDirection]);

  const handleReactMouseMove = (e: MouseEvent<HTMLDivElement>) => {
    const container = scrollContainerRef.current;
    if (!container) return;

    const containerRect = container.getBoundingClientRect();
    const mouseX = e.clientX - containerRect.left;
    const containerWidth = containerRect.width;

    if (mouseX > containerWidth * 0.9) {
      setScrollDirection('right');
    } else if (mouseX < containerWidth * 0.1) {
      setScrollDirection('left');
    } else {
      setScrollDirection(null);
    }
  };

  const handleReactMouseLeave = () => {
    setScrollDirection(null);
  };

  const toggleExpand = () => {
    setIsExpanded(!isExpanded);
  };

  if (citations.length === 0) return null;

  return (
    <div
      className={`my-2 w-full transition-opacity duration-500 ease-in-out ${
        isVisible ? 'opacity-100' : 'opacity-0'
      }`}
    >
      <div
        className="flex items-center cursor-pointer group rounded-md px-3 h-7 dark:bg-[#1f1f1f] bg-gray-100 transition-colors duration-300 hover:text-blue-500"
        onClick={toggleExpand}
      >
        <div className="flex items-center">
          <IconBlockquote size={19} className="inline-block mb-0.5" />
          <div className="ml-1 w-6 h-6 flex items-center justify-center text-base">
            {citations.length}
          </div>
          {citations.length > 1 ? (
            <p className="text-base ml-1">Sources</p>
          ) : (
            <p className="text-base ml-1">Source</p>
          )}
        </div>
        <div className="ml-auto">
          {isExpanded ? (
            <IconChevronUp size={20} />
          ) : (
            <IconChevronDown size={20} />
          )}
        </div>
      </div>

      {isExpanded && (
        <div
          ref={scrollContainerRef}
          className="flex w-full overflow-x-auto gap-4 no-scrollbar pt-5"
          style={{ scrollBehavior: 'auto' }}
          onMouseMove={handleReactMouseMove}
          onMouseLeave={handleReactMouseLeave}
        >
          {citations.map((citation) => (
            <div key={citation.number} className="flex-shrink-0">
              <CitationItem key={citation.number} citation={citation} />
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
