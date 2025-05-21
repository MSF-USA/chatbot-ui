import {
  IconClearAll,
  IconExternalLink,
  IconSettings,
  IconChevronDown,
} from '@tabler/icons-react';
import { useTranslation } from 'next-i18next';
import { isUSBased } from '@/utils/app/userAuth';
import { FEEDBACK_EMAIL, US_FEEDBACK_EMAIL } from '@/types/contact';

interface Props {
  botInfo: {
    id: string;
    name: string;
    color: string;
  } | null;
  selectedModelName: string | undefined;
  showSettings: boolean;
  onSettingsClick: () => void;
  onClearAll?: () => void;
  userEmail?: string;
  hasMessages?: boolean;
}

export const ChatTopbar = ({
  botInfo,
  selectedModelName,
  showSettings,
  onSettingsClick,
  onClearAll,
  userEmail,
  hasMessages = false,
}: Props) => {
  const { t } = useTranslation('chat');

  return (
    <div className="sticky top-0 z-10 border-b border-neutral-300 bg-neutral-100 py-2 text-sm text-neutral-500 dark:border-none dark:bg-[#2F2F2F] dark:text-neutral-200">
      <div className="mx-8 px-2 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
        {/* Bot/Model Info */}
        <div className="flex items-center min-w-0 justify-center sm:justify-start">
          {botInfo && (
            <div className="flex items-center mr-2 shrink-0">
              <span
                className="font-semibold truncate sm:max-w-[200px]"
                style={{ color: botInfo.color }}
                title={`${botInfo.name} Bot`}
              >
                {botInfo.name} Bot
              </span>
              <span className="mx-2 text-white dark:text-white">|</span>
            </div>
          )}
          <div className="truncate min-w-0">
            <button
              className="flex items-center justify-center rounded-md transition-colors px-2 py-1 hover:bg-neutral-200 dark:hover:bg-neutral-700 border border-transparent hover:border-neutral-300 dark:hover:border-neutral-600"
              onClick={onSettingsClick}
              aria-label="Model Settings"
              title="Model Settings"
            >
              <span className="truncate font-bold dark:text-blue-50 text-gray-800" title={selectedModelName}>
                {selectedModelName}
              </span>
              <IconChevronDown size={14} className="ml-1.5 opacity-60 text-black dark:text-white" />
            </button>
          </div>
        </div>

        {/* Controls */}
        <div className="flex items-center justify-center space-x-3">
          {/* Settings Button */}
          <div className="relative">
            <button
              className="flex items-center justify-center p-1.5 rounded-md hover:bg-neutral-200 dark:hover:bg-neutral-700 transition-colors"
              onClick={onSettingsClick}
              aria-label="Model Settings"
              title="Model Settings"
            >
              <IconSettings
                size={18}
                className={`${
                  showSettings
                    ? 'text-[#D7211E]'
                    : 'text-black dark:text-white'
                }`}
              />
            </button>
          </div>

          {hasMessages && (
            <button
              className="p-1.5 rounded-md hover:bg-neutral-200 dark:hover:bg-neutral-700 transition-colors"
              onClick={onClearAll}
              aria-label="Clear Conversation"
              title="Clear Conversation"
            >
              <IconClearAll
                size={18}
                className="text-black dark:text-white"
              />
            </button>
          )}

          {/* Feedback Link */}
          <a
            href={`mailto:${
              isUSBased(userEmail ?? '')
                ? US_FEEDBACK_EMAIL
                : FEEDBACK_EMAIL
            }`}
            className="flex items-center px-2 py-1 rounded-md hover:bg-neutral-200 dark:hover:bg-neutral-700 transition-colors text-black/50 dark:text-white/50 text-[12px]"
            title={t('sendFeedback')}
          >
            <IconExternalLink
              size={16}
              className="mr-1 text-black dark:text-white/50"
            />
            <span className="hidden sm:inline">{t('sendFeedback')}</span>
            <span className="sm:hidden">Feedback</span>
          </a>
        </div>
      </div>
    </div>
  );
};
