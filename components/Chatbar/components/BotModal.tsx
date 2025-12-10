import {
  IconAssembly,
  IconBrain,
  IconChevronDown,
  IconChevronUp,
  IconDeviceFloppy,
  IconEdit,
  IconPlus,
  IconUser,
  IconX,
} from '@tabler/icons-react';
import React, { useContext, useEffect, useRef, useState } from 'react';

import { useTranslation } from 'next-i18next';

import { Bot, bots } from '@/types/bots';

import HomeContext from '@/context/HomeContext';

import BetaBadge from '@/components/Beta/Badge';

import { v4 as uuidv4 } from 'uuid';

// Maximum character limit for system prompts
const MAX_PROMPT_LENGTH = 1000;

// Array of color combinations for bot icons
const BOT_COLORS = [
  {
    bg: 'bg-purple-100 dark:bg-purple-900',
    text: 'text-purple-600 dark:text-purple-400',
  },
  {
    bg: 'bg-blue-100 dark:bg-blue-900',
    text: 'text-blue-600 dark:text-blue-400',
  },
  {
    bg: 'bg-green-100 dark:bg-green-900',
    text: 'text-green-600 dark:text-green-400',
  },
  { bg: 'bg-red-100 dark:bg-red-900', text: 'text-red-600 dark:text-red-400' },
  {
    bg: 'bg-yellow-100 dark:bg-yellow-900',
    text: 'text-yellow-600 dark:text-yellow-400',
  },
  {
    bg: 'bg-indigo-100 dark:bg-indigo-900',
    text: 'text-indigo-600 dark:text-indigo-400',
  },
  {
    bg: 'bg-pink-100 dark:bg-pink-900',
    text: 'text-pink-600 dark:text-pink-400',
  },
  {
    bg: 'bg-teal-100 dark:bg-teal-900',
    text: 'text-teal-600 dark:text-teal-400',
  },
];

interface SavedCustomBot {
  id: string;
  name: string;
  prompt: string;
  createdAt: string;
  color?: number;
}

const BotModal: React.FC = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [expandedBot, setExpandedBot] = useState<string | null>(null);
  const [isCreatingBot, setIsCreatingBot] = useState(false);
  const [isEditingBot, setIsEditingBot] = useState(false);
  const [editingBotId, setEditingBotId] = useState<string | null>(null);
  const [savedBots, setSavedBots] = useState<SavedCustomBot[]>([]);
  const [newBotName, setNewBotName] = useState('');
  const [newBotPrompt, setNewBotPrompt] = useState('');
  const [promptCharCount, setPromptCharCount] = useState(0);
  const [selectedTab, setSelectedTab] = useState<'official' | 'custom'>(
    'official',
  );

  const modalRef = useRef<HTMLDivElement>(null);
  const { t } = useTranslation('sidebar');

  const {
    state: { conversations, selectedConversation },
    dispatch: homeDispatch,
  } = useContext(HomeContext);

  // Function to assign a unique color to a bot
  const assignUniqueColor = (existingBots: SavedCustomBot[]) => {
    // Get all currently used colors
    const usedColors = existingBots.map((bot) => bot.color);

    // Find the first unused color
    for (let i = 0; i < BOT_COLORS.length; i++) {
      if (!usedColors.includes(i)) {
        return i;
      }
    }

    // If all colors are used, find the least used one
    const colorCounts = Array(BOT_COLORS.length).fill(0);
    usedColors.forEach((color) => {
      if (color !== undefined) {
        colorCounts[color]++;
      }
    });

    // Find index of the least used color
    return colorCounts.indexOf(Math.min(...colorCounts));
  };

  // Load saved bots from localStorage on initial render
  useEffect(() => {
    const loadSavedBots = () => {
      const savedBotsString = localStorage.getItem('customPromptBots');
      if (savedBotsString) {
        try {
          const parsedBots = JSON.parse(savedBotsString);

          const updatedBots = parsedBots.map(
            (bot: SavedCustomBot, index: number) => {
              // Assign sequential colors to ensure no duplicates
              bot.color = index % BOT_COLORS.length;
              return bot;
            },
          );

          setSavedBots(updatedBots);
          localStorage.setItem('customPromptBots', JSON.stringify(updatedBots));
        } catch (e) {
          console.error('Error parsing saved bots', e);
        }
      }
    };

    loadSavedBots();
  }, []);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        modalRef.current &&
        !modalRef.current.contains(event.target as Node)
      ) {
        setIsOpen(false);
        setExpandedBot(null);
        setIsCreatingBot(false);
        setIsEditingBot(false);
        setEditingBotId(null);
        resetForm();
      }
    };

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isOpen]);

  const handleBotSelection = (bot: Bot | SavedCustomBot) => {
    // For official bots, use their ID; for custom bots use the standard approach with a custom prompt
    const botId = 'id' in bot && 'icon' in bot ? bot.id : undefined;

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
      bot: botId, // Only set bot ID for official bots
    };

    const updatedConversations = [...conversations, newConversation];

    homeDispatch({ field: 'conversations', value: updatedConversations });
    homeDispatch({ field: 'selectedConversation', value: newConversation });

    setIsOpen(false);
  };

  const toggleDetails = (botId: string) => {
    setExpandedBot(expandedBot === botId ? null : botId);
  };

  const resetForm = () => {
    setNewBotName('');
    setNewBotPrompt('');
    setPromptCharCount(0);
    setEditingBotId(null);
  };

  const handlePromptChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const value = e.target.value;
    setPromptCharCount(value.length);

    if (value.length <= MAX_PROMPT_LENGTH) {
      setNewBotPrompt(value);
    }
  };

  const handleEditBot = (botId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    const botToEdit = savedBots.find((bot) => bot.id === botId);

    if (botToEdit) {
      setNewBotName(botToEdit.name);
      setNewBotPrompt(botToEdit.prompt);
      setPromptCharCount(botToEdit.prompt.length);
      setEditingBotId(botId);
      setIsEditingBot(true);
      setIsCreatingBot(false);
    }
  };

  const handleSaveBot = () => {
    if (!newBotName.trim() || !newBotPrompt.trim()) {
      alert('Please provide both a name and instructions for your bot');
      return;
    }

    let updatedBots: SavedCustomBot[];

    if (isEditingBot && editingBotId) {
      // Editing existing bot
      updatedBots = savedBots.map((bot) => {
        if (bot.id === editingBotId) {
          return {
            ...bot,
            name: newBotName.trim(),
            prompt: newBotPrompt.trim(),
          };
        }
        return bot;
      });
    } else {
      // Creating new bot
      const newBot: SavedCustomBot = {
        id: uuidv4(),
        name: newBotName.trim(),
        prompt: newBotPrompt.trim(),
        createdAt: new Date().toISOString(),
        color: assignUniqueColor(savedBots), // Assign unique color
      };
      updatedBots = [...savedBots, newBot];
    }

    setSavedBots(updatedBots);

    // Save to localStorage
    localStorage.setItem('customPromptBots', JSON.stringify(updatedBots));

    // Reset form and return to list view
    resetForm();
    setIsCreatingBot(false);
    setIsEditingBot(false);
    setSelectedTab('custom');
  };

  const handleDeleteBot = (botId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (confirm('Are you sure you want to delete this bot?')) {
      const updatedBots = savedBots.filter((bot) => bot.id !== botId);
      setSavedBots(updatedBots);
      localStorage.setItem('customPromptBots', JSON.stringify(updatedBots));
    }
  };

  return (
    <>
      <button
        data-testid="explore-bots-button"
        className="text-sidebar mt-2 mx-2 flex w-full rounded-md cursor-pointer select-none items-center gap-3 p-3 text-black dark:text-white transition-colors duration-200 dark:hover:bg-gray-500/10 hover:bg-gray-200"
        onClick={() => setIsOpen(true)}
      >
        <IconAssembly size={20} className="text-black dark:text-white" />
        {t('Explore Bots')}
      </button>

      {isOpen && (
        <div
          data-testid="bot-modal-overlay"
          className="fixed inset-0 flex items-center justify-center bg-black/50 backdrop-blur-sm z-50 transition-opacity duration-300"
        >
          <div className="fixed inset-0 z-10 overflow-hidden">
            <div className="flex items-center justify-center min-h-screen px-4 pt-4 pb-20 text-center sm:block sm:p-0">
              <div
                className="hidden sm:inline-block sm:h-screen sm:align-middle"
                aria-hidden="true"
              />

              <div
                ref={modalRef}
                data-testid="bot-modal-dialog"
                className="inline-block transform overflow-hidden rounded-lg border border-neutral-300 bg-white text-left align-bottom shadow-xl transition-all dark:border-neutral-700 dark:bg-[#212121] sm:my-8 w-full sm:max-w-[800px] sm:align-middle"
                role="dialog"
              >
                {/* Header */}
                <div className="flex justify-between items-center border-b border-neutral-300 dark:border-neutral-700 px-6 py-4">
                  <div className="flex items-center">
                    <BetaBadge />
                    <h2 className="text-xl font-semibold ml-3 text-black dark:text-white">
                      {isCreatingBot
                        ? t('Create Custom Bot')
                        : isEditingBot
                        ? t('Edit Custom Bot')
                        : t('Explore Bots')}
                    </h2>
                  </div>
                  <button
                    data-testid="close-modal-button"
                    onClick={() => {
                      setIsOpen(false);
                      setIsCreatingBot(false);
                      setIsEditingBot(false);
                      resetForm();
                    }}
                    className="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200 transition-colors duration-200"
                  >
                    <IconX size={20} />
                  </button>
                </div>

                {isCreatingBot || isEditingBot ? (
                  /* Bot Creation/Editing Form */
                  <div data-testid="bot-form" className="p-6">
                    <div className="mb-4">
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                        Bot Name
                      </label>
                      <input
                        data-testid="bot-name-input"
                        type="text"
                        value={newBotName}
                        onChange={(e) => setNewBotName(e.target.value)}
                        placeholder="e.g., Shakespeare Bot, Sci-Fi Assistant"
                        className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-800 dark:border-gray-600 dark:text-white"
                      />
                    </div>

                    <div className="mb-4">
                      <div className="flex justify-between">
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                          System Instructions
                        </label>
                        <span
                          data-testid="prompt-char-count"
                          className={`text-xs ${
                            promptCharCount > MAX_PROMPT_LENGTH * 0.9
                              ? 'text-red-500'
                              : 'text-gray-500'
                          }`}
                        >
                          {promptCharCount}/{MAX_PROMPT_LENGTH}
                        </span>
                      </div>
                      <textarea
                        data-testid="bot-prompt-input"
                        value={newBotPrompt}
                        onChange={handlePromptChange}
                        placeholder="Enter detailed instructions for how the AI should behave, what role it should play, and any specific knowledge or style it should use..."
                        rows={12}
                        maxLength={MAX_PROMPT_LENGTH}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-800 dark:border-gray-600 dark:text-white"
                      />
                      <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
                        Keep your instructions clear and concise. Maximum{' '}
                        {MAX_PROMPT_LENGTH} characters to ensure optimal
                        performance.
                      </p>
                    </div>

                    <div className="flex justify-end space-x-3">
                      <button
                        data-testid="cancel-button"
                        onClick={() => {
                          setIsCreatingBot(false);
                          setIsEditingBot(false);
                          resetForm();
                        }}
                        className="px-4 py-2 border border-gray-300 rounded-md text-gray-700 bg-white hover:bg-gray-50 dark:border-gray-600 dark:bg-gray-700 dark:text-white dark:hover:bg-gray-600"
                      >
                        Cancel
                      </button>
                      <button
                        data-testid="save-bot-button"
                        onClick={handleSaveBot}
                        disabled={!newBotName.trim() || !newBotPrompt.trim()}
                        className="px-4 py-2 rounded-md bg-blue-600 text-white hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center"
                      >
                        <IconDeviceFloppy size={18} className="mr-1" />
                        {isEditingBot ? 'Update Bot' : 'Save Bot'}
                      </button>
                    </div>
                  </div>
                ) : (
                  /* Bot List View */
                  <>
                    {/* Tabs */}
                    <div className="flex border-b border-neutral-300 dark:border-neutral-700">
                      <button
                        data-testid="official-bots-tab"
                        className={`px-6 py-3 text-sm font-medium ${
                          selectedTab === 'official'
                            ? 'text-blue-600 border-b-2 border-blue-600 dark:text-blue-400 dark:border-blue-400'
                            : 'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300'
                        }`}
                        onClick={() => setSelectedTab('official')}
                      >
                        Official Bots
                      </button>
                      <button
                        data-testid="custom-bots-tab"
                        className={`px-6 py-3 text-sm font-medium ${
                          selectedTab === 'custom'
                            ? 'text-blue-600 border-b-2 border-blue-600 dark:text-blue-400 dark:border-blue-400'
                            : 'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300'
                        }`}
                        onClick={() => setSelectedTab('custom')}
                      >
                        Custom Bots{' '}
                        {savedBots.length > 0 && `(${savedBots.length})`}
                      </button>
                    </div>

                    {/* Content */}
                    <div className="max-h-[70vh] overflow-y-auto px-6 py-5">
                      {selectedTab === 'official' ? (
                        <>
                          <p className="text-gray-600 dark:text-gray-300 mb-6">
                            {t(
                              'Discover and interact with our specialized bots to assist you with various tasks.',
                            )}
                          </p>

                          <div className="space-y-4">
                            {bots.map((bot) => (
                              <div
                                key={bot.id}
                                data-testid={`official-bot-${bot.id}`}
                                className="border border-neutral-200 dark:border-neutral-700 rounded-lg overflow-hidden transition-all duration-200 hover:shadow-md"
                              >
                                <div
                                  data-testid={`official-bot-card-${bot.id}`}
                                  className="cursor-pointer p-4 flex items-start transition-colors duration-200 hover:bg-neutral-100 dark:hover:bg-neutral-800"
                                  onClick={() => handleBotSelection(bot)}
                                >
                                  <div
                                    className="flex-shrink-0 w-12 h-12 rounded-full flex items-center justify-center mr-4"
                                    style={{
                                      backgroundColor: `${bot.color}20`,
                                    }}
                                  >
                                    <bot.icon
                                      size={26}
                                      className="flex-shrink-0"
                                      style={{ color: bot.color }}
                                    />
                                  </div>

                                  <div className="flex-grow">
                                    <h3 className="text-lg font-semibold text-black dark:text-white mb-1">
                                      {bot.name}
                                    </h3>
                                    <p className="text-gray-600 dark:text-gray-300 mb-2">
                                      {bot.description}
                                    </p>

                                    <button
                                      data-testid={`details-button-${bot.id}`}
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        toggleDetails(bot.id);
                                      }}
                                      className="flex items-center text-sm text-blue-500 hover:text-blue-600 transition-colors duration-200"
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
                                  <div
                                    data-testid={`bot-details-${bot.id}`}
                                    className="p-4 bg-neutral-50 dark:bg-neutral-800 border-t border-neutral-200 dark:border-neutral-700"
                                  >
                                    <p className="text-gray-700 dark:text-gray-300 mb-4 text-sm">
                                      The MSF AI Assistant will search for
                                      relevant information from the following
                                      sources but may have limited responses if
                                      the query extends beyond the scope of this
                                      data.
                                      <br />
                                      <br />
                                      The latest information from these sources
                                      is highlighted below.
                                      <br />
                                      <br />
                                      Citations will be provided if this data is
                                      used.
                                    </p>

                                    <ul className="space-y-2 pl-0">
                                      {bot.sources?.map((source, index) => (
                                        <li
                                          key={index}
                                          className="flex items-center text-sm"
                                        >
                                          <span className="w-2 h-2 bg-blue-500 rounded-full mr-2"></span>
                                          <a
                                            href={source.url}
                                            target="_blank"
                                            rel="noopener noreferrer"
                                            className="text-blue-500 hover:underline"
                                          >
                                            {source.name}
                                          </a>
                                          {source?.updated && (
                                            <span className="text-gray-500 dark:text-gray-400 ml-2 text-xs">
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
                        </>
                      ) : (
                        <>
                          <div className="flex justify-between items-center mb-6">
                            <p className="text-gray-600 dark:text-gray-300">
                              {savedBots.length > 0
                                ? 'Your specialized AI assistants.'
                                : 'Create custom instructions to define specialized AI assistants.'}
                            </p>
                            {/* Only show this button if there are already bots */}
                            {savedBots.length > 0 && (
                              <button
                                data-testid="create-custom-bot-button"
                                onClick={() => setIsCreatingBot(true)}
                                className="flex items-center px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors"
                              >
                                <IconPlus size={18} className="mr-1" />
                                Create Bot
                              </button>
                            )}
                          </div>

                          {savedBots.length === 0 ? (
                            <div
                              data-testid="empty-state"
                              className="text-center py-12 border-2 border-dashed border-gray-300 dark:border-gray-700 rounded-lg"
                            >
                              <IconBrain
                                size={48}
                                className="mx-auto text-gray-400 dark:text-gray-600 mb-3"
                              />
                              <h3 className="text-lg font-medium text-gray-900 dark:text-gray-100 mb-1">
                                No custom bots yet
                              </h3>
                              <p className="text-gray-500 dark:text-gray-400 mb-4">
                                Create your first custom bot to get started
                              </p>
                              <button
                                data-testid="empty-state-create-button"
                                onClick={() => setIsCreatingBot(true)}
                                className="inline-flex items-center px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors"
                              >
                                <IconPlus size={18} className="mr-1" />
                                Create Bot
                              </button>
                            </div>
                          ) : (
                            <div className="space-y-4">
                              {savedBots.map((bot) => (
                                <div
                                  key={bot.id}
                                  data-testid={`custom-bot-${bot.id}`}
                                  className="border border-neutral-200 dark:border-neutral-700 rounded-lg overflow-hidden transition-all duration-200 hover:shadow-md"
                                >
                                  <div
                                    data-testid={`custom-bot-card-${bot.id}`}
                                    className="cursor-pointer p-4 flex items-start transition-colors duration-200 hover:bg-neutral-100 dark:hover:bg-neutral-800"
                                    onClick={() => handleBotSelection(bot)}
                                  >
                                    <div
                                      className={`flex-shrink-0 w-12 h-12 rounded-full flex items-center justify-center mr-4 ${
                                        BOT_COLORS[bot.color || 0].bg
                                      }`}
                                    >
                                      <IconUser
                                        size={26}
                                        className={`flex-shrink-0 ${
                                          BOT_COLORS[bot.color || 0].text
                                        }`}
                                      />
                                    </div>

                                    <div className="flex-grow">
                                      <div className="flex items-center mb-1">
                                        <h3 className="text-lg font-semibold text-black dark:text-white">
                                          {bot.name}
                                        </h3>
                                      </div>
                                      <p className="text-gray-600 dark:text-gray-300 mb-2">
                                        {bot.prompt.length > 100
                                          ? `${bot.prompt.substring(0, 100)}...`
                                          : bot.prompt}
                                      </p>

                                      <div className="flex items-center text-sm">
                                        <button
                                          data-testid={`custom-bot-details-button-${bot.id}`}
                                          onClick={(e) => {
                                            e.stopPropagation();
                                            toggleDetails(bot.id);
                                          }}
                                          className="flex items-center text-sm text-blue-500 hover:text-blue-600 transition-colors duration-200 mr-4"
                                        >
                                          {expandedBot === bot.id ? (
                                            <IconChevronUp size={16} />
                                          ) : (
                                            <IconChevronDown size={16} />
                                          )}
                                          <span className="ml-1">Details</span>
                                        </button>

                                        <button
                                          data-testid={`edit-bot-button-${bot.id}`}
                                          onClick={(e) =>
                                            handleEditBot(bot.id, e)
                                          }
                                          className="flex items-center text-sm text-green-500 hover:text-green-600 transition-colors duration-200 mr-4"
                                        >
                                          <IconEdit size={16} />
                                          <span className="ml-1">Edit</span>
                                        </button>

                                        <button
                                          data-testid={`delete-bot-button-${bot.id}`}
                                          onClick={(e) =>
                                            handleDeleteBot(bot.id, e)
                                          }
                                          className="flex items-center text-sm text-red-500 hover:text-red-600 transition-colors duration-200"
                                        >
                                          <IconX size={16} />
                                          <span className="ml-1">Delete</span>
                                        </button>
                                      </div>
                                    </div>
                                  </div>

                                  {expandedBot === bot.id && (
                                    <div
                                      data-testid={`custom-bot-details-${bot.id}`}
                                      className="p-4 bg-neutral-50 dark:bg-neutral-800 border-t border-neutral-200 dark:border-neutral-700"
                                    >
                                      <h4 className="font-medium text-black dark:text-white mb-2">
                                        System Instructions
                                      </h4>
                                      <p className="text-gray-700 dark:text-gray-300 text-sm whitespace-pre-wrap mb-4">
                                        {bot.prompt}
                                      </p>
                                    </div>
                                  )}
                                </div>
                              ))}
                            </div>
                          )}
                        </>
                      )}
                    </div>
                  </>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export default BotModal;
