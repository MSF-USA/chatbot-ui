import React from 'react';

/**
 * Loading screen shown during app initialization
 * Displays while data is being loaded from localStorage
 */
export function LoadingScreen() {
  return (
    <div className="flex h-full w-full items-center justify-center bg-white dark:bg-[#212121]">
      <div className="flex flex-col items-center space-y-4">
        <div className="flex space-x-2">
          <div
            className="h-3 w-3 animate-bounce rounded-full bg-gray-500 dark:bg-gray-400"
            style={{ animationDelay: '0ms' }}
          ></div>
          <div
            className="h-3 w-3 animate-bounce rounded-full bg-gray-500 dark:bg-gray-400"
            style={{ animationDelay: '150ms' }}
          ></div>
          <div
            className="h-3 w-3 animate-bounce rounded-full bg-gray-500 dark:bg-gray-400"
            style={{ animationDelay: '300ms' }}
          ></div>
        </div>
      </div>
    </div>
  );
}
