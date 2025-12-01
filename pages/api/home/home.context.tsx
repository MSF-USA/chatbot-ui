import { Dispatch, createContext } from 'react';

import { Session } from 'next-auth';

import { ActionType } from '@/hooks/useCreateReducer';

import { Conversation } from '@/types/chat';
import { KeyValuePair } from '@/types/data';
import { FolderType } from '@/types/folder';

import { SettingsSection } from '@/components/Settings/types';

import { HomeInitialState } from './home.state';

export interface HomeContextProps {
  user?: Session['user'];
  state: HomeInitialState;
  dispatch: Dispatch<ActionType<HomeInitialState>>;
  handleNewConversation: () => void;
  handleCreateFolder: (name: string, type: FolderType) => void;
  handleDeleteFolder: (folderId: string) => void;
  handleUpdateFolder: (folderId: string, name: string) => void;
  handleSelectConversation: (conversation: Conversation) => void;
  handleUpdateConversation: (
    conversation: Conversation,
    data: KeyValuePair,
  ) => void;
  handleOpenSettings: (section?: SettingsSection) => void;
  handleCloseSettings: () => void;
  showChatbar: boolean;
}

const HomeContext = createContext<HomeContextProps>(undefined!);

export default HomeContext;
