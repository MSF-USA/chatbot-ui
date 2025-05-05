import { IconFolderPlus, IconMistOff, IconPlus } from '@tabler/icons-react';
import React, { ReactNode } from 'react';
import { useTranslation } from 'react-i18next';

import BotModal from '@/components/Chatbar/components/BotModal';

import Search from '../Search';

interface Props<T> {
  addItemButtonTitle: string;
  items: T[];
  itemComponent: ReactNode;
  folderComponent: ReactNode;
  footerComponent?: ReactNode;
  searchTerm: string;
  handleSearchTerm: (searchTerm: string) => void;
  handleCreateItem: () => void;
  handleCreateFolder: () => void;
  handleDrop: (e: any) => void;
}

const Sidebar = <T,>({
  addItemButtonTitle,
  items,
  itemComponent,
  folderComponent,
  footerComponent,
  searchTerm,
  handleSearchTerm,
  handleCreateItem,
  handleCreateFolder,
  handleDrop,
}: Props<T>) => {
  const { t } = useTranslation('promptbar');

  const allowDrop = (e: any) => {
    e.preventDefault();
  };

  const highlightDrop = (e: any) => {
    e.target.style.background = '#212121';
  };

  const removeHighlight = (e: any) => {
    e.target.style.background = 'none';
  };

  return (
    <div>
      <div className="flex items-center">
        <button
          className="text-sidebar ml-2 mb-1 flex w-[190px] flex-shrink-0 cursor-pointer select-none items-center gap-3 rounded-md border border-white/20 p-3 text-black dark:text-white transition-colors duration-200 dark:hover:bg-gray-500/10 hover:bg-gray-300"
          onClick={() => {
            handleCreateItem();
            handleSearchTerm('');
          }}
        >
          <IconPlus size={16} className="text-black dark:text-white" />
          {addItemButtonTitle}
        </button>

        <button
          className="mx-2 mt-2 mb-3 flex flex-shrink-0 cursor-pointer items-center gap-3 rounded-md border border-white/20 p-3 text-sm text-white transition-colors duration-200 dark:hover:bg-gray-500/10 hover:bg-gray-300"
          onClick={handleCreateFolder}
        >
          <IconFolderPlus size={16} className="text-black dark:text-white" />
        </button>
      </div>
      <Search
        placeholder={t('Search...') || ''}
        searchTerm={searchTerm}
        onSearch={handleSearchTerm}
      />

      {/* <div className="flex items-center">
        <BotModal />
      </div> */}

      <div className="flex-grow overflow-auto">
        <div className="flex border-b border-white/20 pb-2 text-black dark:text-white">
          {folderComponent}
        </div>

        {items?.length > 0 ? (
          <div
            className="pt-2 text-black dark:text-white"
            onDrop={handleDrop}
            onDragOver={allowDrop}
            onDragEnter={highlightDrop}
            onDragLeave={removeHighlight}
          >
            {itemComponent}
          </div>
        ) : (
          <div className="mt-8 select-none text-center text-black dark:text-white opacity-50">
            <IconMistOff className="mx-auto mb-3 text-black dark:text-white" />
            <span className="text-[14px] leading-normal">{t('No data.')}</span>
          </div>
        )}
      </div>
      {footerComponent}
    </div>
  );
};

export default Sidebar;
