import { IconPlus } from '@tabler/icons-react';
import { FC } from 'react';

import { Conversation } from '@/types/chat';

interface Props {
  selectedConversation: Conversation;
  onNewConversation: () => void;
}

export const Navbar: FC<Props> = ({
  onNewConversation,
}) => {
  return (
    <nav className="flex w-full justify-between bg-[#171717] py-3 px-4">
      <div></div>
      <IconPlus
        className="cursor-pointer hover:text-neutral-400 ml-auto"
        onClick={onNewConversation}
      />
    </nav>
  );
};
