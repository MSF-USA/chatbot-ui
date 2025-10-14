'use client';

import React from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import remarkMath from 'remark-math';
import rehypeMathjax from 'rehype-mathjax/svg';

interface StreamingMessageProps {
  content: string;
}

/**
 * Streaming message display with markdown rendering
 */
export function StreamingMessage({ content }: StreamingMessageProps) {
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
              rehypePlugins={[rehypeMathjax]}
            >
              {content}
            </ReactMarkdown>
          </div>

          {/* Streaming Indicator */}
          <div className="mt-2 flex items-center space-x-1">
            <div className="h-2 w-2 animate-pulse rounded-full bg-blue-500" />
            <span className="text-xs text-gray-500 dark:text-gray-400">
              Generating...
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}
