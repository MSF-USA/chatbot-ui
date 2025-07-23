import { IconArrowBarLeft, IconArrowBarRight } from '@tabler/icons-react';

interface Props {
  onClick: any;
  side: 'left' | 'right';
}

export const CloseSidebarButton = ({ onClick, side }: Props) => {
  return (
    <button
      className="h-8 w-8 flex items-center justify-center rounded-md hover:bg-gray-300 dark:hover:bg-gray-700 text-gray-600 dark:text-gray-300 hover:text-gray-800 dark:hover:text-white transition-all duration-200"
      onClick={onClick}
      aria-label="Close sidebar"
    >
      {side === 'right' ? <IconArrowBarRight size={20} /> : <IconArrowBarLeft size={20} />}
    </button>
  );
};

export const OpenSidebarButton = ({ onClick, side }: Props) => {
  return (
    <button
      className={`fixed top-3 ${
        side === 'right' ? 'right-3' : 'left-3'
      } z-40 h-8 w-8 flex items-center justify-center rounded-md bg-gray-100 dark:bg-transparent hover:bg-gray-200 dark:hover:bg-gray-700 text-gray-600 dark:text-gray-300 hover:text-gray-800 dark:hover:text-white transition-all duration-200 shadow-sm`}
      onClick={onClick}
      aria-label="Open sidebar"
    >
      {side === 'right' ? <IconArrowBarLeft size={20} /> : <IconArrowBarRight size={20} />}
    </button>
  );
};
