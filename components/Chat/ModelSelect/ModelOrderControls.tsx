'use client';

import { IconCheck, IconPencil, IconRefresh } from '@tabler/icons-react';
import { FC, useEffect, useRef, useState } from 'react';

import { useTranslations } from 'next-intl';

import { ModelOrderMode } from '@/client/stores/settingsStore';

interface ModelOrderControlsProps {
  /** Current order mode */
  orderMode: ModelOrderMode;
  /** Callback when order mode changes */
  onOrderModeChange: (mode: ModelOrderMode) => void;
  /** Callback when reset is clicked */
  onReset: () => void;
  /** Whether edit mode is active */
  isEditing: boolean;
  /** Callback to toggle edit mode */
  onToggleEdit: () => void;
}

/**
 * Controls for selecting model order mode in the model selection UI.
 * Provides a dropdown for sort selection, an edit button for custom ordering,
 * and a reset button visible only when editing.
 */
export const ModelOrderControls: FC<ModelOrderControlsProps> = ({
  orderMode,
  onOrderModeChange,
  onReset,
  isEditing,
  onToggleEdit,
}) => {
  const t = useTranslations('modelSelect.orderMode');
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(event.target as Node)
      ) {
        setIsDropdownOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const modes: { id: ModelOrderMode; label: string }[] = [
    { id: 'usage', label: t('usage') },
    { id: 'name', label: t('name') },
    { id: 'cutoff', label: t('cutoff') },
    { id: 'custom', label: t('custom') },
  ];

  const currentModeLabel =
    modes.find((m) => m.id === orderMode)?.label ?? t('usage');

  const handleModeSelect = (mode: ModelOrderMode) => {
    onOrderModeChange(mode);
    setIsDropdownOpen(false);
  };

  return (
    <div className="flex items-center justify-between gap-2 mb-3">
      <div className="flex items-center gap-2">
        <span className="text-xs text-gray-500 dark:text-gray-400">
          {t('label')}:
        </span>

        {/* Dropdown */}
        <div className="relative" ref={dropdownRef}>
          <button
            type="button"
            onClick={() => setIsDropdownOpen(!isDropdownOpen)}
            className="flex items-center gap-1.5 px-2.5 py-1 text-xs font-medium rounded border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-750 transition-colors"
          >
            {currentModeLabel}
            <svg
              className={`w-3 h-3 transition-transform ${isDropdownOpen ? 'rotate-180' : ''}`}
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M19 9l-7 7-7-7"
              />
            </svg>
          </button>

          {isDropdownOpen && (
            <div className="absolute z-10 mt-1 w-36 rounded-md border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 shadow-lg">
              {modes.map((mode) => (
                <button
                  key={mode.id}
                  type="button"
                  onClick={() => handleModeSelect(mode.id)}
                  className={`
                    w-full px-3 py-1.5 text-xs text-left transition-colors
                    ${
                      orderMode === mode.id
                        ? 'bg-gray-100 dark:bg-gray-700 text-gray-900 dark:text-white'
                        : 'text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-750'
                    }
                  `}
                >
                  {mode.label}
                </button>
              ))}
            </div>
          )}
        </div>
      </div>

      <div className="flex items-center gap-1">
        {/* Edit/Done button */}
        <button
          type="button"
          onClick={onToggleEdit}
          className={`
            flex items-center gap-1 px-2 py-1 text-xs rounded transition-colors
            ${
              isEditing
                ? 'bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400'
                : 'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-700'
            }
          `}
          title={isEditing ? t('done') : t('edit')}
        >
          {isEditing ? (
            <>
              <IconCheck size={12} />
              {t('done')}
            </>
          ) : (
            <>
              <IconPencil size={12} />
              {t('edit')}
            </>
          )}
        </button>

        {/* Reset button - only visible when editing */}
        {isEditing && (
          <button
            type="button"
            onClick={onReset}
            className="flex items-center gap-1 px-2 py-1 text-xs text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-700 rounded transition-colors"
            title={t('resetTooltip')}
          >
            <IconRefresh size={12} />
            {t('reset')}
          </button>
        )}
      </div>
    </div>
  );
};
