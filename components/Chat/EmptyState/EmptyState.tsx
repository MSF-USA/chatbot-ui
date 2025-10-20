'use client';

import React from 'react';

import { SuggestedPrompts } from './SuggestedPrompts';

interface EmptyStateProps {
  onSelectPrompt?: (prompt: string) => void;
}

/**
 * Empty state shown when no messages in conversation
 */
export function EmptyState({ onSelectPrompt }: EmptyStateProps) {
  return (
    <div className="w-full flex flex-col items-center justify-center">
      <SuggestedPrompts onSelectPrompt={onSelectPrompt} />
    </div>
  );
}
