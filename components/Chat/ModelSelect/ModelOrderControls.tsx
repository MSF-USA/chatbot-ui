'use client';

import { IconRefresh } from '@tabler/icons-react';
import { FC } from 'react';

import { useTranslations } from 'next-intl';

import { ModelOrderMode } from '@/client/stores/settingsStore';

interface ModelOrderControlsProps {
  /** Current order mode */
  orderMode: ModelOrderMode;
  /** Callback when order mode changes */
  onOrderModeChange: (mode: ModelOrderMode) => void;
  /** Callback when reset is clicked */
  onReset: () => void;
}

/**
 * Controls for selecting model order mode in the model selection UI.
 * Provides a segmented control with Default, Most Used, and Custom options,
 * plus a reset button visible only in Custom mode.
 */
export const ModelOrderControls: FC<ModelOrderControlsProps> = ({
  orderMode,
  onOrderModeChange,
  onReset,
}) => {
  const t = useTranslations('modelSelect.orderMode');

  const modes: { id: ModelOrderMode; label: string }[] = [
    { id: 'default', label: t('default') },
    { id: 'usage', label: t('usage') },
    { id: 'custom', label: t('custom') },
  ];

  return (
    <div className="flex items-center justify-between gap-2 mb-3">
      <div className="flex items-center gap-2">
        <span className="text-xs text-gray-500 dark:text-gray-400">
          {t('label')}:
        </span>
        <div className="inline-flex rounded-md border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 p-0.5">
          {modes.map((mode) => (
            <button
              key={mode.id}
              type="button"
              onClick={() => onOrderModeChange(mode.id)}
              className={`
                px-2.5 py-1 text-xs font-medium rounded transition-colors
                ${
                  orderMode === mode.id
                    ? 'bg-white dark:bg-gray-700 text-gray-900 dark:text-white shadow-sm'
                    : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white'
                }
              `}
            >
              {mode.label}
            </button>
          ))}
        </div>
      </div>

      {orderMode === 'custom' && (
        <button
          type="button"
          onClick={onReset}
          className="flex items-center gap-1 px-2 py-1 text-xs text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 transition-colors"
          title={t('resetTooltip')}
        >
          <IconRefresh size={12} />
          {t('reset')}
        </button>
      )}
    </div>
  );
};
