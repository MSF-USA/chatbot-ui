'use client';

import { IconSparkles, IconVolume, IconX } from '@tabler/icons-react';
import { useState } from 'react';

import { useTranslations } from 'next-intl';

import { useConversations } from '@/lib/hooks/conversation/useConversations';
import { useSettings } from '@/lib/hooks/settings/useSettings';
import { useTones } from '@/lib/hooks/settings/useTones';

import { PromptsTab } from './PromptsTab';
import { TonesTab } from './TonesTab';

type CustomizationTab = 'prompts' | 'tones';

interface CustomizationsModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export function CustomizationsModal({
  isOpen,
  onClose,
}: CustomizationsModalProps) {
  const t = useTranslations();
  const [activeTab, setActiveTab] = useState<CustomizationTab>('prompts');

  // Get data directly from stores - no prop drilling!
  const { prompts } = useSettings();
  const { tones } = useTones();
  const { folders } = useConversations();

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm"
      onClick={onClose}
    >
      <div
        className="relative w-full h-[85vh] max-w-[1400px] bg-white dark:bg-[#212121] rounded-xl shadow-2xl overflow-hidden flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header with Tabs */}
        <div className="flex-shrink-0 px-6 py-4 border-b border-gray-200 dark:border-gray-700">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="text-xl font-semibold text-gray-900 dark:text-white">
                Quick Actions
              </h3>
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                Type{' '}
                <span className="font-mono bg-gray-100 dark:bg-gray-800 px-1.5 py-0.5 rounded">
                  /
                </span>{' '}
                in chat to access your prompts
              </p>
            </div>
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors"
            >
              <IconX size={20} />
            </button>
          </div>

          {/* Tabs */}
          <div className="flex border-b border-gray-200 dark:border-gray-700 -mb-px">
            <button
              onClick={() => setActiveTab('prompts')}
              className={`flex items-center gap-2 px-4 py-2 text-sm font-medium transition-colors border-b-2 ${
                activeTab === 'prompts'
                  ? 'border-blue-500 text-blue-600 dark:text-blue-400'
                  : 'border-transparent text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-200'
              }`}
            >
              <IconSparkles size={16} />
              Prompts ({prompts.length})
            </button>
            <button
              onClick={() => setActiveTab('tones')}
              className={`flex items-center gap-2 px-4 py-2 text-sm font-medium transition-colors border-b-2 ${
                activeTab === 'tones'
                  ? 'border-blue-500 text-blue-600 dark:text-blue-400'
                  : 'border-transparent text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-200'
              }`}
            >
              <IconVolume size={16} />
              Tones ({tones.length})
            </button>
          </div>
        </div>

        {/* Tab Content */}
        <div className="flex-1 overflow-hidden">
          {activeTab === 'prompts' && (
            <PromptsTab
              prompts={prompts}
              folders={folders.filter((f) => f.type === 'prompt')}
              onClose={onClose}
            />
          )}

          {activeTab === 'tones' && (
            <TonesTab
              tones={tones}
              folders={folders.filter((f) => f.type === 'tone')}
              onClose={onClose}
            />
          )}
        </div>
      </div>
    </div>
  );
}
