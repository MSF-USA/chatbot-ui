'use client';

import React from 'react';
import ReactMarkdown from 'react-markdown';

import { useDebounce } from '@/lib/hooks/useDebounce';

import rehypeKatex from 'rehype-katex';
import remarkGfm from 'remark-gfm';
import remarkMath from 'remark-math';

interface StreamingMessageProps {
  content: string;
}

/**
 * Streaming message display with markdown rendering and debouncing for performance
 * Debouncing reduces re-renders during rapid streaming updates
 */
export function StreamingMessage({ content }: StreamingMessageProps) {
  // Debounce content updates to reduce markdown parsing overhead during streaming
  // Use 50ms delay for smooth streaming while preventing excessive re-renders
  const debouncedContent = useDebounce(content, 50);

  return (
    <div className="group relative">
      <div className="flex items-start space-x-3">
        {/* Assistant Avatar */}
        <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-blue-500">
          <span className="text-sm font-semibold text-white">AI</span>
        </div>

        {/* Message Content */}
        <div className="flex-1 overflow-hidden">
          <div className="prose dark:prose-invert max-w-none">
            <ReactMarkdown
              remarkPlugins={[remarkGfm, remarkMath]}
              rehypePlugins={[rehypeKatex]}
            >
              {debouncedContent}
            </ReactMarkdown>
          </div>

          {/* Streaming Indicator - Breathing Circle Animation */}
          <div className="mt-2 flex items-center space-x-2">
            <div className="h-3 w-3 rounded-full bg-blue-500 dark:bg-blue-400 animate-breathing" />
            <span className="text-xs text-gray-500 dark:text-gray-400">
              Generating...
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}
