import { IconRobot, IconLoader2 } from '@tabler/icons-react';
import { FC } from 'react';

interface Props {
    requestStatusMessage: string | null;
    progress: number | null; // Progress from 0 to 100
}

export const ChatLoader: FC<Props> = ({ requestStatusMessage, progress }) => {
    // Determine the loader to display (spinner or progress bar)
    let loader;

    if (progress === null || progress === undefined) {
        // Show spinner when progress is not available
        loader = <IconLoader2 className="animate-spin text-gray-500" size={24} />;
    } else if (progress === 0) {
        // Show indeterminate progress bar with animated stripes
        loader = (
            <div className={requestStatusMessage ? 'w-24 relative' : 'w-full max-w-xs relative'}>
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
            <div className={requestStatusMessage ? 'w-24' : 'w-full max-w-xs'}>
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
    const loaderElement = (
        <div className="flex items-center">
            {loader}
            {requestStatusMessage && (
                <span
                    className="ml-2 text-gray-700 italic dark:text-gray-300 p-2 text-xs"
                    aria-live="polite"
                >
                  {requestStatusMessage}
                </span>
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
