import {
  IconAssembly,
  IconChevronDown,
  IconChevronUp,
  IconHeadset,
  IconPlus,
} from '@tabler/icons-react';
import React, { useContext, useEffect, useRef, useState } from 'react';

import { useTranslation } from 'next-i18next';

import HomeContext from '@/pages/api/home/home.context';

import { v4 as uuidv4 } from 'uuid';

const bots = [
  {
    id: 1,
    name: 'Helpdesk Assistant',
    description: 'Provides technical support and answers IT-related questions',
    icon: 'IconHeadset',
    prompt:
      "You are a knowledgeable and patient Helpdesk Assistant. Your primary goals are to:\n\n1. Quickly identify the core issue from the user's description\n2. Break down complex problems into manageable components\n3. Provide clear, step-by-step instructions to resolve issues\n4. Use simple language, avoiding technical jargon unless necessary\n5. Confirm understanding at each step before proceeding\n6. Offer alternative solutions when appropriate\n\nFor each user inquiry:\n1. Summarize the problem to ensure you've understood correctly\n2. Ask clarifying questions if needed\n3. Outline the troubleshooting steps in a numbered list\n4. Explain the purpose of each step briefly\n5. Provide guidance on potential complications\n6. Conclude with a summary and offer further assistance if required\n\nAdapt your tone to be friendly yet professional, and tailor your explanations to the user's apparent technical expertise level. Provide clear and concise solutions to technical problems.",
  },
  // More bots can be added here in the future
];

const BotModal: React.FC = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [customBotName, setCustomBotName] = useState('');
  const [customBotTask, setCustomBotTask] = useState('');
  const [isCustomBotExpanded, setIsCustomBotExpanded] = useState(false);
  const modalRef = useRef<HTMLDivElement>(null);
  const customBotRef = useRef<HTMLDivElement>(null);
  const { t } = useTranslation('sidebar');

  const {
    state: { conversations, selectedConversation },
    dispatch: homeDispatch,
  } = useContext(HomeContext);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        modalRef.current &&
        !modalRef.current.contains(event.target as Node)
      ) {
        setIsOpen(false);
        setIsCustomBotExpanded(false);
      }
    };

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isOpen]);

  useEffect(() => {
    const handleCustomBotClickOutside = (event: MouseEvent) => {
      if (
        customBotRef.current &&
        !customBotRef.current.contains(event.target as Node)
      ) {
        setIsCustomBotExpanded(false);
      }
    };

    if (isCustomBotExpanded) {
      document.addEventListener('mousedown', handleCustomBotClickOutside);
    }

    return () => {
      document.removeEventListener('mousedown', handleCustomBotClickOutside);
    };
  }, [isCustomBotExpanded]);

  const handleBotSelection = (bot: (typeof bots)[0]) => {
    const newConversation = {
      id: uuidv4(),
      name: bot.name,
      messages: [],
      model: selectedConversation?.model ?? {
        id: 'gpt-3.5-turbo',
        name: 'GPT-3.5',
      },
      prompt: bot.prompt,
      temperature: selectedConversation?.temperature ?? 0.5,
      folderId: null,
    };

    const updatedConversations = [...conversations, newConversation];

    homeDispatch({ field: 'conversations', value: updatedConversations });
    homeDispatch({ field: 'selectedConversation', value: newConversation });

    setIsOpen(false);
  };

  const handleCustomBotSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (customBotName.trim() && customBotTask.trim()) {
      const newConversation = {
        id: uuidv4(),
        name: customBotName,
        messages: [],
        model: selectedConversation?.model ?? {
          id: 'gpt-3.5-turbo',
          name: 'GPT-3.5',
        },
        prompt: `You are a custom AI assistant named ${customBotName}. Your task is: ${customBotTask}`,
        temperature: selectedConversation?.temperature ?? 0.5,
        folderId: null,
      };

      const updatedConversations = [...conversations, newConversation];

      homeDispatch({ field: 'conversations', value: updatedConversations });
      homeDispatch({ field: 'selectedConversation', value: newConversation });

      setCustomBotName('');
      setCustomBotTask('');
      setIsCustomBotExpanded(false);
      setIsOpen(false);
    }
  };

  return (
    <>
      <button
        className="text-sidebar mb-1 mt-2 mx-2 flex w-full rounded cursor-pointer select-none items-center gap-3 p-3 text-black dark:text-white transition-colors duration-200 dark:hover:bg-gray-500/10 hover:bg-gray-300"
        onClick={() => setIsOpen(true)}
      >
        <IconAssembly size={18} className="text-black dark:text-white" />
        {t('Explore Bots')}
      </button>

      {isOpen && (
        <div className="fixed inset-0 flex items-center justify-center bg-black bg-opacity-50 z-50">
          <div className="fixed inset-0 z-10 overflow-hidden">
            <div className="flex items-center justify-center min-h-screen px-4 pt-4 pb-20 text-center sm:block sm:p-0">
              <div
                className="hidden sm:inline-block sm:h-screen sm:align-middle"
                aria-hidden="true"
              />

              <div
                ref={modalRef}
                className="dark:border-netural-400 inline-block transform overflow-hidden rounded-lg border border-gray-300 bg-white text-left align-bottom shadow-xl transition-all dark:bg-[#171717] sm:my-8 w-full sm:max-w-[600px] sm:align-middle"
                role="dialog"
              >
                <div className="max-h-[80vh] overflow-y-auto px-4 pt-5 pb-4 sm:p-6">
                  <div className="text-xl font-semibold mb-4 text-black dark:text-white">
                    {t('Explore Bots')}
                  </div>
                  <p className="text-gray-600 dark:text-gray-300 mb-4">
                    {t(
                      'Discover and interact with our specialized bots or create a custom one to assist you with various tasks.',
                    )}
                  </p>
                  <div className="space-y-4">
                    {bots.map((bot) => (
                      <div
                        key={bot.id}
                        className="border dark:border-neutral-700 rounded-lg p-4 cursor-pointer dark:hover:bg-gray-500/10 hover:bg-gray-300 transition-colors duration-200 flex items-center"
                        onClick={() => handleBotSelection(bot)}
                      >
                        <bot.icon
                          size={24}
                          className="text-black dark:text-white mr-4 flex-shrink-0"
                        />
                        <div>
                          <h3 className="text-lg font-semibold text-black dark:text-white mb-1">
                            {bot.name}
                          </h3>
                          <p className="text-gray-600 dark:text-gray-300">
                            {bot.description}
                          </p>
                        </div>
                      </div>
                    ))}

                    {/* Custom Bot Option */}
                    <div ref={customBotRef} className="relative">
                      <div
                        className="border dark:border-neutral-700 rounded-lg p-4 cursor-pointer dark:hover:bg-gray-500/10 hover:bg-gray-300  transition-colors duration-200 flex items-center justify-between"
                        onClick={() =>
                          setIsCustomBotExpanded(!isCustomBotExpanded)
                        }
                      >
                        <div className="flex items-center">
                          <IconPlus
                            size={24}
                            className="text-black dark:text-white mr-4 flex-shrink-0"
                          />
                          <h3 className="text-lg font-semibold text-black dark:text-white">
                            {t('Create a Custom Bot')}
                          </h3>
                        </div>
                        {isCustomBotExpanded ? (
                          <IconChevronUp size={24} />
                        ) : (
                          <IconChevronDown size={24} />
                        )}
                      </div>
                      {isCustomBotExpanded && (
                        <div className="mt-2 p-4 border dark:border-neutral-700 rounded-lg shadow-lg">
                          <form
                            onSubmit={handleCustomBotSubmit}
                            className="space-y-4"
                          >
                            <div>
                              <label
                                htmlFor="customBotName"
                                className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1"
                              >
                                {t('Bot Name')}
                              </label>
                              <input
                                id="customBotName"
                                type="text"
                                value={customBotName}
                                onChange={(e) =>
                                  setCustomBotName(e.target.value)
                                }
                                placeholder={t('Enter custom bot name')}
                                className="w-full p-2 border rounded dark:border-neutral-700 bg-white dark:bg-gray-700 text-black dark:text-white"
                                autoFocus
                              />
                            </div>
                            <div>
                              <label
                                htmlFor="customBotTask"
                                className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1"
                              >
                                {t('Bot Task')}
                              </label>
                              <textarea
                                id="customBotTask"
                                value={customBotTask}
                                onChange={(e) =>
                                  setCustomBotTask(e.target.value)
                                }
                                placeholder={t(
                                  'Describe the task for your custom bot',
                                )}
                                className="w-full p-2 border rounded dark:border-neutral-700 bg-white dark:bg-gray-700 text-black dark:text-white"
                                rows={4}
                              />
                            </div>
                            <button
                              type="submit"
                              className="w-full p-2 bg-black dark:bg-white text-white dark:text-black rounded hover:bg-blue-600 transition-colors duration-200"
                            >
                              {t('Create')}
                            </button>
                          </form>
                        </div>
                      )}
                    </div>
                  </div>

                  {bots.length === 1 && (
                    <p className="text-gray-500 dark:text-gray-400 mt-4 text-sm italic">
                      {t('More bots coming soon!')}
                    </p>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export default BotModal;
