import {
  IconAssembly,
  IconChevronDown,
  IconChevronUp,
  IconNews,
  IconPlus,
} from '@tabler/icons-react';
import React, { useContext, useEffect, useRef, useState } from 'react';

import { useTranslation } from 'next-i18next';

import { Bot, bots } from '@/types/bots';

import HomeContext from '@/pages/api/home/home.context';

import BetaBadge from '@/components/Beta/Badge';

import { v4 as uuidv4 } from 'uuid';

const BotModal: React.FC = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [expandedBot, setExpandedBot] = useState<string | null>(null);
  const modalRef = useRef<HTMLDivElement>(null);
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
        setExpandedBot(null);
      }
    };

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isOpen]);

  const handleBotSelection = (bot: Bot) => {
    const newConversation = {
      id: uuidv4(),
      name: bot.name,
      messages: [],
      model: selectedConversation?.model ?? {
        id: 'gpt-4o',
        name: 'GPT-4o',
      },
      prompt: bot.prompt,
      temperature: selectedConversation?.temperature ?? 0.5,
      folderId: null,
      bot: bot.id,
    };

    const updatedConversations = [...conversations, newConversation];

    homeDispatch({ field: 'conversations', value: updatedConversations });
    homeDispatch({ field: 'selectedConversation', value: newConversation });

    setIsOpen(false);
  };

  const toggleDetails = (botId: string) => {
    setExpandedBot(expandedBot === botId ? null : botId);
  };

  return (
    <>
      <button
        className="text-sidebar mt-2 mx-2 flex w-full rounded cursor-pointer select-none items-center gap-3 p-3 text-black dark:text-white transition-colors duration-200 dark:hover:bg-gray-500/10 hover:bg-gray-300"
        onClick={() => setIsOpen(true)}
      >
        <IconAssembly size={20} className="text-black dark:text-white" />
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
                className="dark:border-netural-400 inline-block transform overflow-hidden rounded-lg border border-gray-300 bg-white text-left align-bottom shadow-xl transition-all dark:bg-[#171717] sm:my-8 w-full sm:max-w-[800px] sm:align-middle"
                role="dialog"
              >
                <div className="max-h-[90vh] overflow-y-auto px-4 pt-5 pb-4 sm:p-6">
                  <div className="text-xl font-semibold mb-4 text-black dark:text-white">
                    <BetaBadge />
                    <span className="pl-3">{t('Explore Bots')}</span>
                  </div>
                  <p className="text-gray-600 dark:text-gray-300 mb-4">
                    {t(
                      'Discover and interact with our specialized bots to assist you with various tasks.',
                    )}
                  </p>
                  <div className="space-y-4">
                    {bots.map((bot) => (
                      <div
                        key={bot.id}
                        className="border dark:border-neutral-700 rounded-lg p-4 transition-colors duration-200"
                      >
                        <div
                          className="cursor-pointer dark:hover:bg-gray-500/10 hover:bg-gray-300 flex items-start"
                          onClick={() => handleBotSelection(bot)}
                        >
                          <bot.icon
                            size={26}
                            className="mr-4 flex-shrink-0 mt-1"
                            style={{ color: bot.color }}
                          />
                          <div className="flex-grow">
                            <h3 className="text-lg font-semibold text-black dark:text-white mb-1">
                              {bot.name}
                            </h3>
                            <p className="text-gray-600 dark:text-gray-300 mb-2">
                              {bot.description}
                            </p>
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                toggleDetails(bot.id);
                              }}
                              className="flex items-center text-sm text-blue-500 hover:text-blue-600"
                            >
                              {expandedBot === bot.id ? (
                                <IconChevronUp size={16} />
                              ) : (
                                <IconChevronDown size={16} />
                              )}
                              <span className="ml-1">Details</span>
                            </button>
                          </div>
                        </div>
                        {expandedBot === bot.id && (
                          <div className="mt-3 p-3 bg-gray-100 dark:bg-gray-800 rounded text-sm">
                            <p className="text-gray-700 dark:text-gray-300 mb-2">
                              The MSF AI Assistant will search for relevant
                              information from the following sources but may
                              have limited responses if the query extends beyond
                              the scope of this data.
                              <br></br>
                              <br></br>
                              The latest information from these sources is
                              highlighted below.
                              <br></br>
                              <br></br>
                              Citations will be provided if this data is used.
                            </p>
                            <ul className="list-none pl-0">
                              {bot.sources?.map((source, index) => (
                                <li key={index} className="mb-1">
                                  <a
                                    href={source.url}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="text-blue-500 hover:underline"
                                  >
                                    {source.name}
                                  </a>
                                  {source?.updated && (
                                    <span className="text-gray-500 dark:text-gray-400 ml-2">
                                      Updated: {source.updated}
                                    </span>
                                  )}
                                </li>
                              ))}
                            </ul>
                          </div>
                        )}
                      </div>
                    ))}
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
