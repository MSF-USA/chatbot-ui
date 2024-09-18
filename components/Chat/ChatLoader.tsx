import { IconRobot, IconLoader2 } from '@tabler/icons-react';
import { FC } from 'react';

interface Props {
  requestStatusMessage: string | null;
  progress?: number; // Progress from 0 to 100
}

export const ChatLoader: FC<Props> = ({ requestStatusMessage, progress }) => {
  // Determine the loader to display (spinner or progress bar)
  const loader = progress !== undefined ? (
      // Progress bar
      <div className={requestStatusMessage ? 'w-24' : 'w-full max-w-xs'}>
        <div className="w-full bg-gray-200 dark:bg-gray-600 rounded-full h-2">
          <div
              className="bg-blue-600 h-2 rounded-full"
              style={{ width: `${progress}%` }}
          ></div>
        </div>
      </div>
  ) : (
      <IconLoader2 className="animate-spin text-gray-500" size={24} />
  );

  // Arrange the loader and message based on whether the message exists
  const loaderElement = requestStatusMessage ? (
      <div className="flex items-center">
        {loader}
        <span
            className="ml-2 text-gray-700 dark:text-gray-300 bg-gray-100 dark:bg-gray-700 p-2 text-xs"
            aria-live="polite"
        >
        {requestStatusMessage}
      </span>
      </div>
  ) : (
      <div className="flex items-center">
        {loader}
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
