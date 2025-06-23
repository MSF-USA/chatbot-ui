import { IconLoader2, IconRobot } from '@tabler/icons-react';
import { FC } from 'react';

import { useSmoothLoadingMessage } from '@/hooks/useSmoothLoadingMessage';

import { useStreamingSettings } from '@/context/StreamingSettingsContext';

interface Props {
  requestStatusMessage: string | null;
  requestStatusSecondLine?: string | null; // Optional second line for dynamic details
  progress: number | null; // Progress from 0 to 100
}

export const ChatLoader: FC<Props> = ({
  requestStatusMessage,
  requestStatusSecondLine,
  progress,
}) => {
  // Get streaming settings from context
  const { settings } = useStreamingSettings();

  // Use smooth loading message hook for enhanced loading states
  // Note: skipFirstMessage=true because first message often doesn't display properly in loading chains
  const smoothRequestStatusMessage = useSmoothLoadingMessage({
    message: requestStatusMessage,
    enabled: settings.smoothStreamingEnabled,
    skipFirstMessage: false, // Skip first message animation for cleaner loading sequences
  });

  // Second line smooth loading message with slight delay for better UX
  const smoothRequestStatusSecondLine = useSmoothLoadingMessage({
    message: requestStatusSecondLine ?? null,
    enabled: settings.smoothStreamingEnabled,
    skipFirstMessage: false, // Show second line animations
    streamInDelay: 60, // Slightly slower for readability
  });

  // Determine the loader to display (spinner or progress bar)
  let loader;

  if (progress === null || progress === undefined) {
    // Show spinner when progress is not available
    loader = <IconLoader2 className="animate-spin text-gray-500" size={24} />;
  } else if (progress === 0) {
    // Show indeterminate progress bar with animated stripes
    loader = (
      <div
        className={
          requestStatusMessage ||
          smoothRequestStatusMessage ||
          requestStatusSecondLine ||
          smoothRequestStatusSecondLine
            ? 'w-24 relative'
            : 'w-full max-w-xs relative'
        }
      >
        <div className="w-full bg-gray-200 dark:bg-gray-600 rounded-full h-2 overflow-hidden relative">
          <div className="bg-blue-600 h-2 absolute animate-indeterminate"></div>
        </div>
        <span className="ml-2 text-gray-700 italic dark:text-gray-300 p-2 text-xs">
          Loading...
        </span>
      </div>
    );
  } else {
    // Show determinate progress bar with percentage and animated stripes
    loader = (
      <div
        className={
          requestStatusMessage ||
          smoothRequestStatusMessage ||
          requestStatusSecondLine ||
          smoothRequestStatusSecondLine
            ? 'w-24'
            : 'w-full max-w-xs'
        }
      >
        <div className="w-full bg-gray-200 dark:bg-gray-600 rounded-full h-2 overflow-hidden">
          <div
            className="
                              bg-blue-600
                              h-2
                              rounded-full
                              transition-all
                              duration-500
                              ease-in-out
                              animate-progress-bar-stripes
                              bg-[length:1rem_1rem]
                              bg-gradient-to-r
                              from-blue-600
                              to-blue-600
                              via-blue-500
                              bg-[linear-gradient(45deg,_rgba(255,255,255,0.15)_25%,_transparent_25%,_transparent_50%,_rgba(255,255,255,0.15)_50%,_rgba(255,255,255,0.15)_75%,_transparent_75%,_transparent)]
                            "
            style={{ width: `${progress}%` }}
          ></div>
        </div>
        <span className="ml-2 text-gray-700 italic dark:text-gray-300 p-2 text-xs">
          {progress.toFixed(1)}%
        </span>
      </div>
    );
  }

  // Arrange the loader and message based on whether the message exists
  const hasAnyMessage =
    requestStatusMessage ||
    smoothRequestStatusMessage ||
    requestStatusSecondLine ||
    smoothRequestStatusSecondLine;

  const loaderElement = (
    <div className="flex items-start">
      {loader}
      {hasAnyMessage && (
        <div className="ml-2 flex flex-col gap-1">
          {(requestStatusMessage || smoothRequestStatusMessage) && (
            <span
              className="text-gray-700 italic dark:text-gray-300 p-2 text-xs"
              aria-live="polite"
            >
              {smoothRequestStatusMessage}
            </span>
          )}
          {(requestStatusSecondLine || smoothRequestStatusSecondLine) && (
            <span
              className="text-gray-600 italic dark:text-gray-400 p-2 text-xs opacity-90"
              aria-live="polite"
            >
              {smoothRequestStatusSecondLine}
            </span>
          )}
        </div>
      )}
    </div>
  );

  return (
    <div
      className="group border-b border-black/10 bg-gray-50 text-gray-800 dark:border-gray-900/50 dark:bg-[#2f2f2f] dark:text-gray-100"
      style={{ overflowWrap: 'anywhere' }}
    >
      <div className="m-auto flex gap-4 p-4 text-base md:max-w-2xl md:gap-6 md:py-6 lg:max-w-2xl lg:px-0 xl:max-w-3xl">
        <div className="min-w-[40px] items-end">
          <IconRobot size={30} />
        </div>
        <div className="flex flex-col mt-1 w-full">{loaderElement}</div>
      </div>
    </div>
  );
};
