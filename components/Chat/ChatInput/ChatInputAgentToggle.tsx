import { IconRobot, IconRobotOff } from '@tabler/icons-react';

import { useTranslation } from 'next-i18next';

interface ChatInputAgentToggleProps {
  enabled: boolean;
  onToggle: () => void;
  disabled?: boolean;
}

export const ChatInputAgentToggle = ({
  enabled,
  onToggle,
  disabled = false,
}: ChatInputAgentToggleProps) => {
  const { t } = useTranslation('chat');

  return (
    <div className="relative pb-2">
      <button
        className={`flex h-[40px] w-[40px] items-center justify-center rounded-sm p-1 transition-all ${
          disabled
            ? 'cursor-not-allowed opacity-30 text-neutral-400 dark:text-neutral-600'
            : enabled
              ? 'bg-blue-100 border border-blue-300 text-blue-600 hover:bg-blue-200 dark:bg-blue-900/30 dark:border-blue-600 dark:text-blue-400 dark:hover:bg-blue-900/50'
              : 'text-neutral-600 hover:bg-neutral-200 hover:text-neutral-900 dark:text-neutral-400 dark:hover:bg-neutral-700 dark:hover:text-neutral-200'
        }`}
        onClick={onToggle}
        disabled={disabled}
        title={`${enabled ? t('disableAgents') : t('enableAgents')} (Beta)`}
        aria-label={`${enabled ? t('disableAgents') : t('enableAgents')} (Beta)`}
      >
        {enabled ? <IconRobot size={20} /> : <IconRobotOff size={20} />}
      </button>
      <span className="absolute -top-0.5 -right-0.5 pointer-events-none px-1 py-0.5 rounded-full text-[10px] font-medium bg-yellow-100/70 text-yellow-700 dark:bg-yellow-900/40 dark:text-yellow-400">
        Beta
      </span>
    </div>
  );
};
