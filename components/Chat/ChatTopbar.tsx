import {
  IconClearAll,
  IconExternalLink,
  IconChevronDown,
  IconTool,
  IconSettings,
} from '@tabler/icons-react';
import { useTranslations } from 'next-intl';
import { isUSBased } from '@/lib/utils/app/userAuth';
import { FEEDBACK_EMAIL, US_FEEDBACK_EMAIL } from '@/types/contact';
import { OpenAIIcon, DeepSeekIcon, XAIIcon } from '../Icons/providers';

interface Props {
  botInfo: {
    id: string;
    name: string;
    color: string;
  } | null;
  selectedModelName: string | undefined;
  selectedModelProvider?: string;
  showSettings: boolean;
  onSettingsClick: () => void;
  onModelClick?: () => void;
  onClearAll?: () => void;
  userEmail?: string;
  hasMessages?: boolean;
  agentEnabled?: boolean;
  showChatbar?: boolean;
}

export const ChatTopbar = ({
  botInfo,
  selectedModelName,
  selectedModelProvider,
  showSettings,
  onSettingsClick,
  onModelClick,
  onClearAll,
  userEmail,
  hasMessages = false,
  agentEnabled = false,
  showChatbar = false,
}: Props) => {
  const t = useTranslations();

  // Helper function to get provider icon
  const getProviderIcon = (provider?: string) => {
    const iconProps = { className: "w-4 h-4 flex-shrink-0" };
    switch (provider) {
      case 'openai':
        return <OpenAIIcon {...iconProps} />;
      case 'deepseek':
        return <DeepSeekIcon {...iconProps} />;
      case 'xai':
        return <XAIIcon {...iconProps} />;
      default:
        return null;
    }
  };

  return (
    <div className="sticky top-0 z-20 border-b border-neutral-300 py-2 text-sm text-neutral-500 dark:border-none dark:text-neutral-200 transition-all duration-300 ease-in-out bg-white dark:bg-[#212121]">
      <div className="mr-8 px-2 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 transition-all duration-300">
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
              onClick={onModelClick || onSettingsClick}
              aria-label="Select Model"
              title="Select Model"
            >
              {getProviderIcon(selectedModelProvider)}
              <span className="truncate font-bold dark:text-blue-50 text-gray-800 text-base ml-2" title={selectedModelName}>
                {selectedModelName || 'Select Model'}
              </span>
              {agentEnabled && (
                <IconTool size={14} className="ml-1.5 text-gray-600 dark:text-gray-400" title="Agent Tools Enabled" />
              )}
              <IconChevronDown size={16} className="ml-1.5 opacity-60 text-black dark:text-white" />
            </button>
          </div>
        </div>

        {/* Controls */}
        <div className="flex items-center justify-center space-x-3">
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
            <span className="hidden sm:inline">Request Support</span>
          </a>
        </div>
      </div>
    </div>
  );
};
