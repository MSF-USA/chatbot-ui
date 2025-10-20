'use client';

import React from 'react';

import { Streamdown } from 'streamdown';

interface StreamingMessageProps {
  content: string;
}

/**
 * Streaming message display with Streamdown
 * Streamdown is optimized for AI streaming and handles incomplete markdown gracefully
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
            <Streamdown
              isAnimating={true}
              controls={true}
              shikiTheme={['github-light', 'github-dark']}
            >
              {content}
            </Streamdown>
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
