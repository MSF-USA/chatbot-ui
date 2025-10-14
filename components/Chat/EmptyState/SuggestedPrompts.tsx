'use client';

import React, { useMemo } from 'react';
import { suggestedPrompts } from '@/components/Chat/prompts';

interface SuggestedPromptsProps {
  onSelectPrompt?: (prompt: string) => void;
  count?: number;
}

/**
 * Display suggested prompts for new conversations
 */
export function SuggestedPrompts({
  onSelectPrompt,
  count = 3,
}: SuggestedPromptsProps) {
  // Use first N prompts to avoid hydration mismatch from randomization
  const displayedPrompts = useMemo(() => {
    return suggestedPrompts.slice(0, count);
  }, [count]);

  return (
    <div className="hidden sm:flex space-x-5">
      {displayedPrompts.map((prompt, index) => {
        const Icon = prompt.icon;

        return (
          <button
            key={index}
            className="bg-transparent text-black dark:text-white border border-[#E0E0E0] dark:border-[#444444] rounded-md px-2 py-1 text-sm hover:bg-[#F9F9F9] dark:hover:bg-[#2F2F2F] dark:hover:text-white transition"
            onClick={() => onSelectPrompt?.(prompt.prompt)}
            style={{
              width: '200px',
              height: '100px',
              textAlign: 'start',
              whiteSpace: 'normal',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'start',
              justifyContent: 'center',
              padding: '30px',
            }}
          >
            {Icon && (
              <div className="flex flex-col items-start">
                <Icon className="h-5 w-5 mb-2" />
                <div>
                  <span>{prompt.title}</span>
                </div>
              </div>
            )}
          </button>
        );
      })}
    </div>
  );
}
