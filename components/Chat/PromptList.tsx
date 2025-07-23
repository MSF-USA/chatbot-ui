import { FC, MutableRefObject, useState } from 'react';
import { useTranslation } from 'next-i18next';
import { IconCommand, IconRobot, IconSettings, IconHelp } from '@tabler/icons-react';

import { Prompt } from '@/types/prompt';
import { CommandDefinition, CommandType } from '@/services/commandParser';

interface Props {
  prompts: Prompt[];
  activePromptIndex: number;
  onSelect: () => void;
  onMouseOver: (index: number) => void;
  promptListRef: MutableRefObject<HTMLUListElement | null>;
  commands?: CommandDefinition[];
  showCommands?: boolean;
  onImmediateCommandExecution?: (command: CommandDefinition) => void;
}

interface CommandItemProps {
  command: CommandDefinition;
  isActive: boolean;
  onClick: () => void;
  onMouseEnter: () => void;
  onImmediateExecution?: (command: CommandDefinition) => void;
}

const CommandItem: FC<CommandItemProps> = ({ command, isActive, onClick, onMouseEnter, onImmediateExecution }) => {
  const [isExecuting, setIsExecuting] = useState(false);
  const getCommandIcon = (type: CommandType) => {
    switch (type) {
      case CommandType.AGENT:
        return <IconRobot size={16} className="text-blue-500" />;
      case CommandType.SETTINGS:
        return <IconSettings size={16} className="text-green-500" />;
      case CommandType.UTILITY:
        return <IconHelp size={16} className="text-purple-500" />;
      default:
        return <IconCommand size={16} className="text-gray-500" />;
    }
  };

  const getCommandTypeLabel = (type: CommandType) => {
    switch (type) {
      case CommandType.AGENT:
        return 'Agent';
      case CommandType.SETTINGS:
        return 'Settings';
      case CommandType.UTILITY:
        return 'Utility';
      default:
        return 'Command';
    }
  };

  // Check if this command should execute immediately
  const shouldExecuteImmediately = ['enableAgents', 'disableAgents', 'settings', 'privacyPolicy'].includes(command.command);

  return (
    <li
      className={`${
        isActive
          ? 'bg-gray-200 dark:bg-[#171717]'
          : ''
      } ${
        isExecuting
          ? 'bg-green-100 dark:bg-green-900 border-green-300 dark:border-green-700'
          : ''
      } cursor-pointer px-3 py-2 text-sm text-black dark:text-white hover:bg-gray-100 dark:hover:bg-[#2a2a2a] transition-all duration-300`}
      onClick={async (e) => {
        e.preventDefault();
        e.stopPropagation();
        
        if (shouldExecuteImmediately && onImmediateExecution) {
          setIsExecuting(true);
          onImmediateExecution(command);
          // Brief visual feedback
          setTimeout(() => {
            setIsExecuting(false);
          }, 300);
        } else {
          onClick();
        }
      }}
      onMouseEnter={onMouseEnter}
    >
      <div className="flex items-start space-x-2">
        <div className="flex-shrink-0 mt-0.5">
          {getCommandIcon(command.type)}
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center space-x-2">
            <span className="font-medium text-blue-600 dark:text-blue-400">
              /{command.command}
            </span>
            <span className="px-2 py-0.5 text-xs rounded-full bg-gray-200 dark:bg-gray-700 text-gray-600 dark:text-gray-300">
              {getCommandTypeLabel(command.type)}
            </span>
          </div>
          <p className="text-xs text-gray-600 dark:text-gray-400 mt-1 truncate">
            {command.description}
          </p>
          {isActive && (
            <>
              <div className="text-xs text-gray-500 dark:text-gray-500 mt-1">
                <span className="font-mono bg-gray-100 dark:bg-gray-800 px-1 py-0.5 rounded">
                  {command.usage}
                </span>
              </div>
              {command.examples.length > 0 && (
                <div className="text-xs text-gray-500 dark:text-gray-500 mt-1">
                  <span className="text-gray-400">e.g. </span>
                  <span className="font-mono">{command.examples[0]}</span>
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </li>
  );
};

interface PromptItemProps {
  prompt: Prompt;
  isActive: boolean;
  onClick: () => void;
  onMouseEnter: () => void;
}

const PromptItem: FC<PromptItemProps> = ({ prompt, isActive, onClick, onMouseEnter }) => {
  return (
    <li
      className={`${
        isActive
          ? 'bg-gray-200 dark:bg-[#171717]'
          : ''
      } cursor-pointer px-3 py-2 text-sm text-black dark:text-white hover:bg-gray-100 dark:hover:bg-[#2a2a2a] transition-colors`}
      onClick={(e) => {
        e.preventDefault();
        e.stopPropagation();
        onClick();
      }}
      onMouseEnter={onMouseEnter}
    >
      <div className="flex items-center space-x-2">
        <IconCommand size={16} className="text-gray-400 flex-shrink-0" />
        <span className="truncate">{prompt.name}</span>
      </div>
    </li>
  );
};

export const PromptList: FC<Props> = ({
  prompts,
  activePromptIndex,
  onSelect,
  onMouseOver,
  promptListRef,
  commands = [],
  showCommands = false,
  onImmediateCommandExecution,
}) => {
  const { t } = useTranslation('chat');

  // Combine commands and prompts for display
  const totalItems = showCommands ? commands.length + prompts.length : prompts.length;
  const commandsCount = showCommands ? commands.length : 0;

  const handleItemClick = (index: number) => {
    if (showCommands && index < commandsCount) {
      // This is a command - handle command selection
      // For now, we'll just call onSelect, but this could be extended
      onSelect();
    } else {
      // This is a prompt
      onSelect();
    }
  };

  const handleItemMouseEnter = (index: number) => {
    onMouseOver(index);
  };

  return (
    <ul
      ref={promptListRef}
      className="z-10 max-h-80 w-full overflow-y-auto rounded border border-black/10 bg-white shadow-[0_0_10px_rgba(0,0,0,0.10)] dark:border-neutral-500 dark:bg-[#212121] dark:text-white dark:shadow-[0_0_15px_rgba(0,0,0,0.10)]"
    >
      {showCommands && commands.length > 0 && (
        <>
          {commands.map((command, index) => (
            <CommandItem
              key={`command-${command.command}`}
              command={command}
              isActive={index === activePromptIndex}
              onClick={() => handleItemClick(index)}
              onMouseEnter={() => handleItemMouseEnter(index)}
              onImmediateExecution={onImmediateCommandExecution}
            />
          ))}
          {prompts.length > 0 && (
            <li className="border-t border-gray-200 dark:border-gray-700 my-1" />
          )}
        </>
      )}
      
      {prompts.map((prompt, index) => {
        const adjustedIndex = showCommands ? commandsCount + index : index;
        return (
          <PromptItem
            key={prompt.id}
            prompt={prompt}
            isActive={adjustedIndex === activePromptIndex}
            onClick={() => handleItemClick(adjustedIndex)}
            onMouseEnter={() => handleItemMouseEnter(adjustedIndex)}
          />
        );
      })}
      
      {totalItems === 0 && (
        <li className="px-3 py-4 text-sm text-gray-500 dark:text-gray-400 text-center">
          {t('No commands or prompts found')}
        </li>
      )}
    </ul>
  );
};
