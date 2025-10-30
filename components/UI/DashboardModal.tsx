import { IconX } from '@tabler/icons-react';
import { FC, ReactNode } from 'react';

interface DashboardModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  subtitle?: string;
  leftPanel: ReactNode;
  rightPanel: ReactNode;
  footer?: ReactNode;
}

/**
 * Reusable two-panel dashboard modal layout
 * Used by ToneDashboard and PromptDashboard
 */
export const DashboardModal: FC<DashboardModalProps> = ({
  isOpen,
  onClose,
  title,
  subtitle,
  leftPanel,
  rightPanel,
  footer,
}) => {
  if (!isOpen) return null;

  const handleOverlayClick = () => {
    onClose();
  };

  const handleContentClick = (e: React.MouseEvent) => {
    e.stopPropagation();
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm animate-fade-in-fast"
      onClick={handleOverlayClick}
    >
      <div
        className="relative w-full max-w-6xl h-[90vh] mx-4 bg-white dark:bg-[#212121] rounded-xl shadow-2xl flex flex-col overflow-hidden animate-modal-in"
        onClick={handleContentClick}
      >
        {/* Header */}
        <div className="flex-shrink-0 border-b border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-[#1a1a1a] px-6 py-4">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
                {title}
              </h2>
              {subtitle && (
                <p className="text-sm text-gray-600 dark:text-gray-400">
                  {subtitle}
                </p>
              )}
            </div>
            <button
              onClick={onClose}
              className="p-2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800"
            >
              <IconX size={20} />
            </button>
          </div>
        </div>

        {/* Content Area - Two Panel Layout */}
        <div className="flex-1 overflow-hidden flex">
          {/* Left Panel */}
          <div className="flex-1 flex flex-col overflow-hidden border-r border-gray-200 dark:border-gray-700">
            <div className="flex-1 overflow-y-auto p-6 space-y-6">
              {leftPanel}
            </div>
          </div>

          {/* Right Panel */}
          {rightPanel}
        </div>

        {/* Footer */}
        {footer && (
          <div className="flex-shrink-0 border-t border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-[#1a1a1a] px-6 py-4">
            {footer}
          </div>
        )}
      </div>
    </div>
  );
};
