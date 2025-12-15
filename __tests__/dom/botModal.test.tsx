import {
  act,
  cleanup,
  fireEvent,
  render,
  screen,
  waitFor,
} from '@testing-library/react';
import React from 'react';

import { useTranslation } from 'next-i18next';

import { Bot, bots } from '@/types/bots';

import HomeContext from '@/context/HomeContext';

import BotModal from '@/components/Chatbar/components/BotModal';

import '@testing-library/jest-dom';
import userEvent from '@testing-library/user-event';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

// Mock the next-i18next translation hook
vi.mock('next-i18next', () => ({
  useTranslation: () => ({
    t: (key: string) => key,
  }),
}));

// Mock useContext for HomeContext
const mockHomeDispatch = vi.fn();
const mockHomeState = {
  conversations: [],
  selectedConversation: {
    id: 'test-conversation',
    name: 'Test Conversation',
    messages: [],
    model: { id: 'gpt-4o', name: 'GPT-4o' },
    prompt: 'test prompt',
    temperature: 0.5,
    folderId: null,
  },
};

vi.mock('react', async () => {
  const actual = await vi.importActual('react');
  return {
    ...actual,
    useContext: () => ({
      state: mockHomeState,
      dispatch: mockHomeDispatch,
    }),
  };
});

// Mock UUID to return predictable values
vi.mock('uuid', () => ({
  v4: () => 'test-uuid',
}));

// Mock localStorage
const localStorageMock = (() => {
  let store: Record<string, string> = {};
  return {
    getItem: (key: string) => store[key] || null,
    setItem: (key: string, value: string) => {
      store[key] = value.toString();
    },
    clear: () => {
      store = {};
    },
  };
})();

Object.defineProperty(window, 'localStorage', {
  value: localStorageMock,
});

// Mock confirm dialog
global.confirm = vi.fn(() => true);

describe('BotModal', () => {
  // Helper function to setup and open the modal
  const openModalAndWait = async (user: any) => {
    // Ensure we start with a clean DOM
    cleanup();

    render(<BotModal />);

    // Click the button to open the modal
    const exploreBotsButton = screen.getByTestId('explore-bots-button');
    await user.click(exploreBotsButton);

    // Wait for modal to appear
    await screen.findByTestId('bot-modal-dialog');
  };

  // Helper to setup a custom bot in localStorage
  const setupCustomBot = () => {
    const mockBot = {
      id: 'mock-bot-id',
      name: 'Mock Bot',
      prompt: 'You are a mock bot for testing',
      createdAt: new Date().toISOString(),
      color: 0,
    };
    localStorage.setItem('customPromptBots', JSON.stringify([mockBot]));
    return mockBot;
  };

  beforeEach(() => {
    vi.clearAllMocks();
    localStorage.clear();
  });

  afterEach(() => {
    vi.restoreAllMocks();
    cleanup(); // Clean up DOM after each test
  });

  it('renders the explore bots button', () => {
    render(<BotModal />);
    expect(screen.getByTestId('explore-bots-button')).toBeInTheDocument();
  });

  it('opens the modal when clicking the explore bots button', async () => {
    const user = userEvent.setup();
    await openModalAndWait(user);

    // Verify modal content is visible
    expect(screen.getByTestId('bot-modal-dialog')).toBeInTheDocument();
    expect(screen.getByTestId('official-bots-tab')).toBeInTheDocument();
    expect(screen.getByTestId('custom-bots-tab')).toBeInTheDocument();
  });

  describe('Official bots tab', () => {
    it('shows official bots by default and allows interaction with them', async () => {
      const user = userEvent.setup();
      await openModalAndWait(user);

      // Check that official bots tab is active and displays content
      expect(
        screen.getByText(
          'Discover and interact with our specialized bots to assist you with various tasks.',
        ),
      ).toBeInTheDocument();

      // Verify bot content
      const firstBotCard = screen.getByTestId(
        `official-bot-card-${bots[0].id}`,
      );
      expect(firstBotCard).toHaveTextContent(bots[0].name);
      expect(firstBotCard).toHaveTextContent(bots[0].description);

      // Test expanding details
      const detailsButton = screen.getByTestId(`details-button-${bots[0].id}`);
      await user.click(detailsButton);

      // Verify expanded content
      expect(
        screen.getByTestId(`bot-details-${bots[0].id}`),
      ).toBeInTheDocument();
      expect(
        screen.getByText(
          /The MSF AI Assistant will search for relevant information/,
        ),
      ).toBeInTheDocument();

      // Test collapsing details
      await user.click(detailsButton);
      await waitFor(() => {
        expect(
          screen.queryByTestId(`bot-details-${bots[0].id}`),
        ).not.toBeInTheDocument();
      });

      // Test selecting a bot
      await user.click(firstBotCard);

      // Verify correct actions triggered
      expect(mockHomeDispatch).toHaveBeenCalledWith({
        field: 'conversations',
        value: expect.arrayContaining([
          expect.objectContaining({
            id: 'test-uuid',
            name: bots[0].name,
            bot: bots[0].id,
          }),
        ]),
      });

      expect(mockHomeDispatch).toHaveBeenCalledWith({
        field: 'selectedConversation',
        value: expect.objectContaining({
          id: 'test-uuid',
          name: bots[0].name,
          bot: bots[0].id,
        }),
      });
    });
  });

  describe('Custom bots tab', () => {
    it('shows empty state and allows bot creation when no custom bots exist', async () => {
      const user = userEvent.setup();
      await openModalAndWait(user);

      // Switch to custom bots tab
      await user.click(screen.getByTestId('custom-bots-tab'));

      // Verify empty state
      expect(screen.getByTestId('empty-state')).toBeInTheDocument();
      expect(screen.getByText('No custom bots yet')).toBeInTheDocument();

      // Start creating a bot
      await user.click(screen.getByTestId('empty-state-create-button'));

      // Verify form appears
      expect(screen.getByTestId('bot-form')).toBeInTheDocument();

      // Test form validation
      const saveButton = screen.getByTestId('save-bot-button');
      expect(saveButton).toBeDisabled();

      // Test filling only name
      await user.type(screen.getByTestId('bot-name-input'), 'Test Bot');
      expect(saveButton).toBeDisabled();

      // Test filling only prompt
      await user.clear(screen.getByTestId('bot-name-input'));
      await user.type(screen.getByTestId('bot-prompt-input'), 'Test prompt');
      expect(saveButton).toBeDisabled();

      // Test filling both fields
      await user.type(screen.getByTestId('bot-name-input'), 'Test Bot');
      expect(saveButton).not.toBeDisabled();

      // Test saving bot
      await user.click(saveButton);

      // Verify localStorage was updated
      const savedBotsString = localStorage.getItem('customPromptBots');
      expect(savedBotsString).not.toBeNull();

      const savedBots = JSON.parse(savedBotsString!);
      expect(savedBots).toHaveLength(1);
      expect(savedBots[0]).toMatchObject({
        id: expect.any(String),
        name: 'Test Bot',
        prompt: 'Test prompt',
      });

      // Verify the new bot is displayed
      expect(screen.getByText('Test Bot')).toBeInTheDocument();
    });

    it('supports cancelling bot creation', async () => {
      const user = userEvent.setup();
      await openModalAndWait(user);

      // Switch to custom bots tab and start bot creation
      await user.click(screen.getByTestId('custom-bots-tab'));
      await user.click(screen.getByTestId('empty-state-create-button'));

      // Fill form
      await user.type(screen.getByTestId('bot-name-input'), 'Test Bot');
      await user.type(
        screen.getByTestId('bot-prompt-input'),
        'Test instructions',
      );

      // Cancel
      await user.click(screen.getByTestId('cancel-button'));

      // Verify we're back to list view
      await waitFor(() => {
        expect(screen.queryByTestId('bot-name-input')).not.toBeInTheDocument();
      });

      // Verify nothing was saved
      const savedBotsString = localStorage.getItem('customPromptBots');
      const savedBots = JSON.parse(savedBotsString || '[]');
      expect(savedBots).toHaveLength(0);
    });

    it('enforces character limit for prompts', async () => {
      const user = userEvent.setup();
      await openModalAndWait(user);

      // Switch to custom bots tab and start bot creation
      await user.click(screen.getByTestId('custom-bots-tab'));
      await user.click(screen.getByTestId('empty-state-create-button'));

      const maxLength = 1000;

      // Check that the maxLength attribute is set correctly
      const promptInput = screen.getByTestId('bot-prompt-input');
      expect(promptInput).toHaveAttribute('maxLength', maxLength.toString());

      // Test character counter when adding text
      await user.type(promptInput, 'a');
      expect(screen.getByTestId('prompt-char-count')).toHaveTextContent(
        `1/${maxLength}`,
      );

      // Use act to handle state updates properly
      await act(async () => {
        // Try entering a string at max length
        await user.clear(promptInput);
        await user.type(promptInput, 'a'.repeat(10)); // Type just a few to avoid test timing out

        // Then use fireEvent to set the full value at once
        fireEvent.change(promptInput, {
          target: { value: 'a'.repeat(maxLength) },
        });
      });

      // Verify the character count is updated
      await waitFor(() => {
        expect(screen.getByTestId('prompt-char-count')).toHaveTextContent(
          `${maxLength}/${maxLength}`,
        );
      });

      // Verify input value length
      expect((promptInput as HTMLInputElement).value.length).toBe(maxLength);
    });
  });

  describe('With existing custom bots', () => {
    it('displays saved custom bots', async () => {
      const mockBot = setupCustomBot();
      const user = userEvent.setup();
      await openModalAndWait(user);

      // Switch to custom bots tab
      await user.click(screen.getByTestId('custom-bots-tab'));

      // Verify bot is displayed
      const customBotCard = screen.getByTestId(`custom-bot-card-${mockBot.id}`);
      expect(customBotCard).toHaveTextContent('Mock Bot');
      expect(customBotCard).toHaveTextContent('You are a mock bot for testing');
    });

    it('expands and collapses custom bot details', async () => {
      const mockBot = setupCustomBot();
      const user = userEvent.setup();
      await openModalAndWait(user);

      // Switch to custom bots tab
      await user.click(screen.getByTestId('custom-bots-tab'));

      // Test expanding details
      const detailsButton = screen.getByTestId(
        `custom-bot-details-button-${mockBot.id}`,
      );
      await user.click(detailsButton);

      // Verify details are displayed
      expect(
        screen.getByTestId(`custom-bot-details-${mockBot.id}`),
      ).toBeInTheDocument();
      expect(screen.getByText('System Instructions')).toBeInTheDocument();

      // Test collapsing details
      await user.click(detailsButton);
      await waitFor(() => {
        expect(
          screen.queryByTestId(`custom-bot-details-${mockBot.id}`),
        ).not.toBeInTheDocument();
      });
    });

    it('edits an existing custom bot', async () => {
      const mockBot = setupCustomBot();
      const user = userEvent.setup();
      await openModalAndWait(user);

      // Switch to custom bots tab
      await user.click(screen.getByTestId('custom-bots-tab'));

      // Test editing
      await user.click(screen.getByTestId(`edit-bot-button-${mockBot.id}`));
      expect(screen.getByTestId('bot-form')).toBeInTheDocument();

      // Update fields
      const nameInput = screen.getByTestId('bot-name-input');
      const promptInput = screen.getByTestId('bot-prompt-input');

      await user.clear(nameInput);
      await user.type(nameInput, 'Updated Bot');

      await user.clear(promptInput);
      await user.type(promptInput, 'Updated instructions');

      // Save changes
      await user.click(screen.getByTestId('save-bot-button'));

      // Verify update in localStorage
      await waitFor(() => {
        const savedBotsString = localStorage.getItem('customPromptBots');
        const savedBots = JSON.parse(savedBotsString!);
        expect(savedBots[0]).toMatchObject({
          id: mockBot.id,
          name: 'Updated Bot',
          prompt: 'Updated instructions',
        });
      });

      // Verify the updated bot is displayed
      expect(screen.getByText('Updated Bot')).toBeInTheDocument();
    });

    it('deletes a custom bot', async () => {
      const mockBot = setupCustomBot();
      const user = userEvent.setup();
      await openModalAndWait(user);

      // Switch to custom bots tab
      await user.click(screen.getByTestId('custom-bots-tab'));

      // Test deletion
      await user.click(screen.getByTestId(`delete-bot-button-${mockBot.id}`));

      // Verify confirm was called
      expect(global.confirm).toHaveBeenCalled();

      // Verify deletion in localStorage and UI
      await waitFor(() => {
        const savedBotsString = localStorage.getItem('customPromptBots');
        const savedBots = JSON.parse(savedBotsString!);
        expect(savedBots).toHaveLength(0);

        // Verify empty state is shown
        expect(screen.getByTestId('empty-state')).toBeInTheDocument();
      });
    });

    it('selects a custom bot and creates a new conversation', async () => {
      const mockBot = setupCustomBot();
      const user = userEvent.setup();
      await openModalAndWait(user);

      // Switch to custom bots tab
      await user.click(screen.getByTestId('custom-bots-tab'));

      // Test selecting the bot
      await user.click(screen.getByTestId(`custom-bot-card-${mockBot.id}`));

      expect(mockHomeDispatch).toHaveBeenCalledWith({
        field: 'conversations',
        value: expect.arrayContaining([
          expect.objectContaining({
            id: 'test-uuid',
            name: 'Mock Bot',
            prompt: 'You are a mock bot for testing',
          }),
        ]),
      });

      expect(mockHomeDispatch).toHaveBeenCalledWith({
        field: 'selectedConversation',
        value: expect.objectContaining({
          id: 'test-uuid',
          name: 'Mock Bot',
          prompt: 'You are a mock bot for testing',
        }),
      });
    });
  });

  describe('Modal closing', () => {
    it('closes the modal when clicking the close button', async () => {
      const user = userEvent.setup();
      await openModalAndWait(user);

      // Test close button
      await user.click(screen.getByTestId('close-modal-button'));

      // Verify modal is closed
      await waitFor(() => {
        expect(
          screen.queryByTestId('bot-modal-dialog'),
        ).not.toBeInTheDocument();
      });
    });

    it('closes the modal when clicking outside', async () => {
      const user = userEvent.setup();
      await openModalAndWait(user);

      // Use act for state updates
      await act(async () => {
        // Create mousedown event on document
        const event = new MouseEvent('mousedown', {
          bubbles: true,
          cancelable: true,
        });

        Object.defineProperty(event, 'target', { value: document.body });
        document.dispatchEvent(event);
      });

      // Verify modal is closed
      await waitFor(() => {
        expect(
          screen.queryByTestId('bot-modal-dialog'),
        ).not.toBeInTheDocument();
      });
    });
  });
});
