import React from 'react';
import { MenuItem } from './DropdownMenuItem';
import { DropdownMenuItem } from './DropdownMenuItem';

interface DropdownCategoryGroupProps {
  category: string;
  items: MenuItem[];
  flattenedItems: MenuItem[];
  selectedIndex: number;
}

/**
 * Renders a category section in the dropdown with header and items
 */
export const DropdownCategoryGroup: React.FC<DropdownCategoryGroupProps> = ({
  category,
  items,
  flattenedItems,
  selectedIndex,
}) => {
  const categoryTitle = category.charAt(0).toUpperCase() + category.slice(1);

  return (
    <div className="px-1 py-1" role="group" aria-label={category}>
      <h3 className="px-3 py-1 text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
        {categoryTitle}
      </h3>
      {items.map((item) => {
        const itemIndex = flattenedItems.findIndex((i) => i.id === item.id);
        const isSelected = itemIndex === selectedIndex;

        return (
          <DropdownMenuItem key={item.id} item={item} isSelected={isSelected} />
        );
      })}
    </div>
  );
};
