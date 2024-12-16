import {
  IconBulbFilled,
  IconCheck,
  IconTrash,
  IconX,
} from '@tabler/icons-react';
import {
  DragEvent,
  MouseEventHandler,
  useContext,
  useEffect,
  useState,
} from 'react';

import { Prompt } from '@/types/prompt';

import SidebarActionButton from '@/components/Buttons/SidebarActionButton';

import ChatbarContext from '../Chatbar.context';
import { PromptModal } from './PromptModal';

interface Props {
  prompt: Prompt;
}

export const PromptComponent = ({ prompt }: Props) => {
  const {
    dispatch: dispatch,
    handleUpdatePrompt,
    handleDeletePrompt,
  } = useContext(ChatbarContext);

  const [showModal, setShowModal] = useState<boolean>(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [isRenaming, setIsRenaming] = useState(false);
  const [renameValue, setRenameValue] = useState('');

  const handleUpdate = (prompt: Prompt) => {
    handleUpdatePrompt(prompt);
    dispatch({ field: 'searchTerm', value: '' });
  };

  const handleDelete: MouseEventHandler<HTMLButtonElement> = (e) => {
    e.stopPropagation();

    if (isDeleting) {
      handleDeletePrompt(prompt);
      dispatch({ field: 'searchTerm', value: '' });
    }

    setIsDeleting(false);
  };

  const handleCancelDelete: MouseEventHandler<HTMLButtonElement> = (e) => {
    e.stopPropagation();
    setIsDeleting(false);
  };

  const handleOpenDeleteModal: MouseEventHandler<HTMLButtonElement> = (e) => {
    e.stopPropagation();
    setIsDeleting(true);
  };

  const handleDragStart = (e: DragEvent<HTMLButtonElement>, prompt: Prompt) => {
    if (e.dataTransfer) {
      e.dataTransfer.setData('prompt', JSON.stringify(prompt));
    }
  };

  useEffect(() => {
    if (isRenaming) {
      setIsDeleting(false);
    } else if (isDeleting) {
      setIsRenaming(false);
    }
  }, [isRenaming, isDeleting]);

  return (
    <div className="relative flex items-center">
      <button
        className="flex w-full cursor-pointer items-center gap-3 rounded-lg p-3 text-sm transition-colors duration-200 dark:hover:bg-[#212121]/90 hover:bg-gray-300"
        draggable="true"
        onClick={(e) => {
          e.stopPropagation();
          setShowModal(true);
        }}
        onDragStart={(e) => handleDragStart(e, prompt)}
        onMouseLeave={() => {
          setIsDeleting(false);
          setIsRenaming(false);
          setRenameValue('');
        }}
      >
        <IconBulbFilled size={18} className='text-black dark:text-white'/>

        <div className="relative max-h-5 flex-1 overflow-hidden text-ellipsis whitespace-nowrap break-all pr-4 text-left text-[12.5px] leading-3">
          {prompt.name}
        </div>
      </button>

      {(isDeleting || isRenaming) && (
        <div className="absolute right-1 z-10 flex dark:text-gray-300 text-black">
          <SidebarActionButton handleClick={handleDelete} tooltipText='Confirm'>
            <IconCheck size={18} className='text-black dark:text-white'/>
          </SidebarActionButton>

          <SidebarActionButton handleClick={handleCancelDelete} tooltipText='Cancel'>
            <IconX size={18} className='text-black dark:text-white'/>
          </SidebarActionButton>
        </div>
      )}

      {!isDeleting && !isRenaming && (
        <div className="absolute right-1 z-10 flex dark:text-gray-300 text-black">
          <SidebarActionButton handleClick={handleOpenDeleteModal} tooltipText="Delete">
            <IconTrash size={18} className='text-black dark:text-white'/>
          </SidebarActionButton>
        </div>
      )}

      {showModal && (
        <PromptModal
          prompt={prompt}
          onClose={() => setShowModal(false)}
          onUpdatePrompt={handleUpdate}
        />
      )}
    </div>
  );
};
