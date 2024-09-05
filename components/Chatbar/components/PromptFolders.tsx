import { useContext, useEffect } from 'react';

import { FolderInterface } from '@/types/folder';

import Folder from '@/components/Folder';

import ChatbarContext from '../Chatbar.context';
import { PromptComponent } from './Prompt';

import HomeContext from '@/app/home.context';

export const PromptFolders = () => {
  const {
    state: { folders },
  } = useContext(HomeContext);

  const {
    state: { promptSearchTerm, filteredPrompts },
    handleUpdatePrompt,
  } = useContext(ChatbarContext);

  const handleDrop = (e: any, folder: FolderInterface) => {
    if (e.dataTransfer) {
      const prompt = JSON.parse(e.dataTransfer.getData('prompt'));

      const updatedPrompt = {
        ...prompt,
        folderId: folder.id,
      };

      handleUpdatePrompt(updatedPrompt);
    }
  };

  const PromptFolders = (currentFolder: FolderInterface) =>
    filteredPrompts
      .filter((p) => p.folderId)
      .map((prompt, index) => {
        if (prompt.folderId === currentFolder.id) {
          return (
            <div key={index} className="ml-5 gap-2 border-l pl-2">
              <PromptComponent prompt={prompt} />
            </div>
          );
        }
      });

  return (
    <div className="flex w-full flex-col pt-2">
      {folders
        .filter((folder) => folder.type === 'prompt')
        .sort((a, b) => a.name.localeCompare(b.name))
        .map((folder, index) => (
          <Folder
            key={index}
            searchTerm={promptSearchTerm}
            currentFolder={folder}
            handleDrop={handleDrop}
            folderComponent={PromptFolders(folder)}
          />
        ))}
    </div>
  );
};
