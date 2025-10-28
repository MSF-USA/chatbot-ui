import {
  IconCheck,
  IconChevronDown,
  IconChevronRight,
  IconDots,
  IconEdit,
  IconFolder,
  IconTrash,
} from '@tabler/icons-react';
import { FC, useEffect, useRef, useState } from 'react';

import { FolderInterface } from '@/types/folder';
import { Prompt } from '@/types/prompt';

interface PromptItemProps {
  prompt: Prompt;
  folders: FolderInterface[];
  isSelected?: boolean;
  onClick?: () => void;
  onEdit: () => void;
  onDelete: (e: React.MouseEvent) => void;
  onMoveToFolder: (promptId: string, folderId: string | null) => void;
  t: any;
}

export const PromptItem: FC<PromptItemProps> = ({
  prompt,
  folders,
  isSelected = false,
  onClick,
  onEdit,
  onDelete,
  onMoveToFolder,
  t,
}) => {
  const [showMenu, setShowMenu] = useState(false);
  const [showFolderSubmenu, setShowFolderSubmenu] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  // Close menu when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setShowMenu(false);
        setShowFolderSubmenu(false);
      }
    };

    if (showMenu) {
      document.addEventListener('mousedown', handleClickOutside);
      return () => {
        document.removeEventListener('mousedown', handleClickOutside);
      };
    }
  }, [showMenu]);

  return (
    <div
      onClick={onClick}
      className={`group relative flex items-center gap-2 px-4 py-2 transition-all duration-200 ease-in-out rounded cursor-pointer bg-white dark:bg-[#212121] ${
        isSelected
          ? 'ring-2 ring-blue-500 dark:ring-blue-400 ring-inset'
          : 'hover:bg-neutral-50 dark:hover:bg-neutral-800'
      }`}
    >
      <div className="flex-1 min-w-0">
        <div className="text-sm font-medium text-neutral-900 dark:text-neutral-100 truncate">
          {prompt.name}
        </div>
        {prompt.description && (
          <div className="text-xs text-neutral-500 dark:text-neutral-400 truncate mt-0.5">
            {prompt.description}
          </div>
        )}
      </div>

      <div className="shrink-0 flex gap-1 opacity-0 group-hover:opacity-100">
        <button
          className="rounded p-1 hover:bg-neutral-200 dark:hover:bg-neutral-700"
          onClick={onEdit}
          title={t('Edit')}
        >
          <IconEdit
            size={14}
            className="text-neutral-600 dark:text-neutral-400"
          />
        </button>

        <div className="relative" ref={menuRef}>
          <button
            className="rounded p-1 hover:bg-neutral-200 dark:hover:bg-neutral-700"
            onClick={(e) => {
              e.stopPropagation();
              setShowMenu(!showMenu);
            }}
            title={t('Options')}
          >
            <IconDots
              size={14}
              className="text-neutral-600 dark:text-neutral-400"
            />
          </button>

          {showMenu && (
            <div className="absolute right-0 mt-1 w-48 rounded-lg border border-neutral-200 dark:border-neutral-700 bg-white dark:bg-[#171717] shadow-lg z-50">
              <div>
                <button
                  className="flex items-center w-full px-3 py-2 text-sm text-neutral-900 dark:text-neutral-100 hover:bg-neutral-100 dark:hover:bg-neutral-800 rounded flex items-center justify-between"
                  onClick={(e) => {
                    e.stopPropagation();
                    setShowFolderSubmenu(!showFolderSubmenu);
                  }}
                >
                  <span className="flex items-center gap-2">
                    <IconFolder
                      size={14}
                      className="text-neutral-600 dark:text-neutral-400"
                    />
                    {t('Move to folder')}
                  </span>
                  {showFolderSubmenu ? (
                    <IconChevronDown
                      size={14}
                      className="text-neutral-600 dark:text-neutral-400"
                    />
                  ) : (
                    <IconChevronRight
                      size={14}
                      className="text-neutral-600 dark:text-neutral-400"
                    />
                  )}
                </button>

                {/* Folder submenu - inline expansion */}
                {showFolderSubmenu && (
                  <div className="pl-4 mt-1">
                    <button
                      className="w-full text-left px-3 py-2 text-xs text-neutral-900 hover:bg-neutral-100 dark:text-neutral-100 dark:hover:bg-neutral-800 rounded flex items-center justify-between"
                      onClick={(e) => {
                        e.stopPropagation();
                        onMoveToFolder(prompt.id, null);
                        setShowMenu(false);
                        setShowFolderSubmenu(false);
                      }}
                    >
                      {t('No folder')}
                      {!prompt.folderId && (
                        <IconCheck size={12} className="shrink-0" />
                      )}
                    </button>
                    {folders.map((folder) => (
                      <button
                        key={folder.id}
                        className="w-full text-left px-3 py-2 text-xs text-neutral-900 hover:bg-neutral-100 dark:text-neutral-100 dark:hover:bg-neutral-800 rounded flex items-center justify-between"
                        onClick={(e) => {
                          e.stopPropagation();
                          onMoveToFolder(prompt.id, folder.id);
                          setShowMenu(false);
                          setShowFolderSubmenu(false);
                        }}
                      >
                        <span className="truncate">{folder.name}</span>
                        {prompt.folderId === folder.id && (
                          <IconCheck size={12} className="shrink-0" />
                        )}
                      </button>
                    ))}
                  </div>
                )}
              </div>

              <button
                className="flex items-center w-full px-3 py-2 text-sm text-red-600 dark:text-red-400 hover:bg-neutral-100 dark:hover:bg-neutral-800 last:rounded-b-lg"
                onClick={(e) => {
                  e.stopPropagation();
                  onDelete(e);
                  setShowMenu(false);
                }}
              >
                <IconTrash size={14} className="mr-2" />
                {t('Delete')}
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
