import { IconInfoCircle } from '@tabler/icons-react';
import React, { useState } from 'react';
import { createPortal } from 'react-dom';

export interface MenuItem {
  id: string;
  icon: React.ReactNode;
  label: string;
  tooltip?: string;
  infoTooltip?: string;
  onClick: () => void;
  category: 'web' | 'media' | 'transform';
}

interface DropdownMenuItemProps {
  item: MenuItem;
  isSelected: boolean;
}

/**
 * Individual menu item in the dropdown
 */
export const DropdownMenuItem: React.FC<DropdownMenuItemProps> = ({
  item,
  isSelected,
}) => {
  const [showInfo, setShowInfo] = useState(false);
  const infoIconRef = React.useRef<HTMLDivElement>(null);
  const timeoutRef = React.useRef<NodeJS.Timeout>();
  const [tooltipPos, setTooltipPos] = React.useState({ left: 0, top: 0 });

  const handleMouseEnter = () => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }
    if (infoIconRef.current) {
      const rect = infoIconRef.current.getBoundingClientRect();
      setTooltipPos({
        left: rect.right + 8,
        top: rect.top - 8,
      });
    }
    setShowInfo(true);
  };

  const handleMouseLeave = () => {
    timeoutRef.current = setTimeout(() => {
      setShowInfo(false);
    }, 150);
  };

  React.useEffect(() => {
    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, []);

  return (
    <div className="group relative">
      <button
        data-item-id={item.id}
        className={`flex items-center justify-between px-2 py-1.5 w-full text-left rounded-md text-gray-800 dark:text-gray-200 transition-colors duration-150 text-sm ${
          isSelected
            ? 'bg-gray-100 dark:bg-gray-700'
            : 'hover:bg-gray-100 dark:hover:bg-gray-700'
        }`}
        onClick={item.onClick}
        role="menuitem"
        aria-current={isSelected ? 'true' : undefined}
        tabIndex={isSelected ? 0 : -1}
      >
        <div className="flex items-center">
          {item.icon}
          <span>{item.label}</span>
        </div>
        {item.infoTooltip && (
          <div
            ref={infoIconRef}
            className="relative z-10"
            onMouseEnter={handleMouseEnter}
            onMouseLeave={handleMouseLeave}
            onClick={(e) => {
              e.stopPropagation();
              handleMouseEnter();
            }}
          >
            <IconInfoCircle
              size={16}
              className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 cursor-help"
            />
          </div>
        )}
      </button>
      {item.infoTooltip &&
        showInfo &&
        typeof document !== 'undefined' &&
        createPortal(
          <div
            className="fixed bg-gray-900 dark:bg-gray-800 text-white text-xs py-2 px-3 rounded-lg shadow-xl w-64 z-[10003] whitespace-pre-line border border-gray-700"
            style={{
              left: `${tooltipPos.left}px`,
              top: `${tooltipPos.top}px`,
            }}
            onMouseEnter={handleMouseEnter}
            onMouseLeave={handleMouseLeave}
          >
            {item.infoTooltip}
          </div>,
          document.body,
        )}
    </div>
  );
};
