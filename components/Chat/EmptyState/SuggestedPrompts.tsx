'use client';

import { useState, useMemo } from 'react';
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
  count = 4,
}: SuggestedPromptsProps) {
  const randomPrompts = useMemo(() => {
    const shuffled = [...suggestedPrompts].sort(() => 0.5 - Math.random());
    return shuffled.slice(0, count);
  }, [count]);

  return (
    <div className="grid w-full max-w-2xl grid-cols-1 gap-3 sm:grid-cols-2">
      {randomPrompts.map((prompt, index) => {
        const Icon = prompt.icon;

        return (
          <button
            key={index}
            onClick={() => onSelectPrompt?.(prompt.prompt)}
            className="flex items-start space-x-3 rounded-lg border border-neutral-300 bg-white p-4 text-left transition-colors hover:border-neutral-400 hover:bg-neutral-50 dark:border-neutral-700 dark:bg-neutral-800 dark:hover:border-neutral-600 dark:hover:bg-neutral-700"
          >
            {Icon && (
              <div className="shrink-0">
                <Icon size={24} className="text-blue-500" />
              </div>
            )}
            <div className="flex-1">
              <h3 className="font-medium text-gray-800 dark:text-white">
                {prompt.title}
              </h3>
              <p className="mt-1 text-sm text-gray-600 dark:text-gray-400">
                {prompt.prompt}
              </p>
            </div>
          </button>
        );
      })}
    </div>
  );
}
