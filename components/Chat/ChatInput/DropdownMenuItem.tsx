import React from 'react';

export interface MenuItem {
  id: string;
  icon: React.ReactNode;
  label: string;
  tooltip: string;
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
  return (
    <div className="group relative">
      <button
        className={`flex items-center px-3 py-2.5 w-full text-left rounded-md text-gray-800 dark:text-gray-200 transition-colors duration-150 ${
          isSelected
            ? 'bg-gray-100 dark:bg-gray-700'
            : 'hover:bg-gray-100 dark:hover:bg-gray-700'
        }`}
        onClick={item.onClick}
        role="menuitem"
        aria-current={isSelected ? 'true' : undefined}
        tabIndex={isSelected ? 0 : -1}
      >
        {item.icon}
        <span>{item.label}</span>
      </button>
      <div className="absolute left-1/2 transform -translate-x-1/2 bottom-full mb-2 hidden group-hover:block bg-black text-white text-xs py-1 px-2 rounded shadow-md text-nowrap z-20">
        {item.tooltip}
      </div>
    </div>
  );
};
