'use client';

import React from 'react';

interface EmptyStateProps {
  userName?: string;
}

/**
 * Empty state header with greeting
 */
export function EmptyState({ userName }: EmptyStateProps) {
  return (
    <div className="flex items-center justify-center">
      {/* Heading */}
      <h1 className="text-2xl font-light text-gray-400 dark:text-gray-500">
        How can I help{userName ? `, ${userName}` : ''}?
      </h1>
    </div>
  );
}
