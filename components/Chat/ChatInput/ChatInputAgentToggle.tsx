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
    <button
      className={`flex h-[40px] w-[40px] items-center justify-center rounded-sm p-1 text-neutral-800 opacity-60 hover:bg-neutral-200 hover:text-neutral-900 dark:bg-opacity-50 dark:text-neutral-100 dark:hover:text-neutral-200 ${
        disabled ? 'cursor-not-allowed opacity-30' : ''
      } ${
        enabled 
          ? 'bg-blue-50 text-blue-600 dark:bg-blue-900/30 dark:text-blue-400' 
          : 'hover:opacity-100'
      }`}
      onClick={onToggle}
      disabled={disabled}
      title={enabled ? t('disableAgents') : t('enableAgents')}
      aria-label={enabled ? t('disableAgents') : t('enableAgents')}
    >
      {enabled ? <IconRobot size={20} /> : <IconRobotOff size={20} />}
    </button>
  );
};