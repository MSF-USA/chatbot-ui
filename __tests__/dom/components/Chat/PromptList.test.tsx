import {
  act,
  cleanup,
  fireEvent,
  render,
  screen,
  waitFor,
} from '@testing-library/react';
import React from 'react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import '@testing-library/jest-dom/vitest';
import userEvent from '@testing-library/user-event';

import { PromptList } from '@/components/Chat/PromptList';
import { CommandDefinition, CommandType } from '@/services/commandParser';
import { Prompt } from '@/types/prompt';

// Mock icons
vi.mock('@tabler/icons-react', () => ({
  IconCommand: (props: any) => <svg data-testid="icon-command" {...props} />,
  IconRobot: (props: any) => <svg data-testid="icon-robot" {...props} />,
  IconSettings: (props: any) => <svg data-testid="icon-settings" {...props} />,
  IconHelp: (props: any) => <svg data-testid="icon-help" {...props} />,
}));

// Mock next-i18next
vi.mock('next-i18next', () => ({
  useTranslation: () => ({ t: (key: string) => key }),
}));

describe('PromptList Component', () => {
  const mockOnSelect = vi.fn();
  const mockOnMouseOver = vi.fn();
  const mockOnImmediateCommandExecution = vi.fn();
  const mockPromptListRef = { current: null };

  const mockPrompts: Prompt[] = [
    {
      id: '1',
      name: 'Test Prompt 1',
      description: 'Description 1',
      content: 'Content 1',
      model: { id: 'model1', name: 'Model 1' } as any,
      folderId: null,
    },
    {
      id: '2',
      name: 'Test Prompt 2',
      description: 'Description 2',
      content: 'Content with {{variable}}',
      model: { id: 'model2', name: 'Model 2' } as any,
      folderId: null,
    },
  ];

  const mockCommands: CommandDefinition[] = [
    {
      command: 'search',
      type: CommandType.AGENT,
      description: 'Search the web',
      usage: '/search <query>',
      examples: ['/search weather today'],
      execute: vi.fn(),
    },
    {
      command: 'settings',
      type: CommandType.SETTINGS,
      description: 'Open settings',
      usage: '/settings',
      examples: ['/settings'],
      execute: vi.fn(),
    },
    {
      command: 'help',
      type: CommandType.UTILITY,
      description: 'Show help',
      usage: '/help',
      examples: ['/help'],
      execute: vi.fn(),
    },
  ];

  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    cleanup();
  });

  describe('Rendering', () => {
    it('renders only prompts when showCommands is false', () => {
      render(
        <PromptList
          prompts={mockPrompts}
          activePromptIndex={0}
          onSelect={mockOnSelect}
          onMouseOver={mockOnMouseOver}
          promptListRef={mockPromptListRef}
          showCommands={false}
        />
      );

      expect(screen.getByText('Test Prompt 1')).toBeInTheDocument();
      expect(screen.getByText('Test Prompt 2')).toBeInTheDocument();
      expect(screen.queryByText('/search')).not.toBeInTheDocument();
    });

    it('renders both commands and prompts when showCommands is true', () => {
      render(
        <PromptList
          prompts={mockPrompts}
          commands={mockCommands}
          activePromptIndex={0}
          onSelect={mockOnSelect}
          onMouseOver={mockOnMouseOver}
          promptListRef={mockPromptListRef}
          showCommands={true}
        />
      );

      // Commands should be rendered
      expect(screen.getByText('/search')).toBeInTheDocument();
      expect(screen.getByText('/settings')).toBeInTheDocument();
      expect(screen.getByText('/help')).toBeInTheDocument();

      // Prompts should also be rendered
      expect(screen.getByText('Test Prompt 1')).toBeInTheDocument();
      expect(screen.getByText('Test Prompt 2')).toBeInTheDocument();
    });

    it('shows active item with correct styling', () => {
      const { rerender } = render(
        <PromptList
          prompts={mockPrompts}
          commands={mockCommands}
          activePromptIndex={0}
          onSelect={mockOnSelect}
          onMouseOver={mockOnMouseOver}
          promptListRef={mockPromptListRef}
          showCommands={true}
        />
      );

      // First command should be active
      const firstCommand = screen.getByText('/search').closest('li');
      expect(firstCommand).toHaveClass('bg-gray-200');

      // Change active index to a prompt (index 3 = first prompt when 3 commands shown)
      rerender(
        <PromptList
          prompts={mockPrompts}
          commands={mockCommands}
          activePromptIndex={3}
          onSelect={mockOnSelect}
          onMouseOver={mockOnMouseOver}
          promptListRef={mockPromptListRef}
          showCommands={true}
        />
      );

      const firstPrompt = screen.getByText('Test Prompt 1').closest('li');
      expect(firstPrompt).toHaveClass('bg-gray-200');
    });
  });

  describe('Click Handling', () => {
    it('calls onSelect with correct index when clicking a command', async () => {
      render(
        <PromptList
          prompts={mockPrompts}
          commands={mockCommands}
          activePromptIndex={0}
          onSelect={mockOnSelect}
          onMouseOver={mockOnMouseOver}
          promptListRef={mockPromptListRef}
          showCommands={true}
        />
      );

      const searchCommand = screen.getByText('/search').closest('li');
      await userEvent.click(searchCommand!);

      expect(mockOnSelect).toHaveBeenCalledWith(0);
    });

    it('calls onSelect with correct index when clicking a prompt after commands', async () => {
      render(
        <PromptList
          prompts={mockPrompts}
          commands={mockCommands}
          activePromptIndex={0}
          onSelect={mockOnSelect}
          onMouseOver={mockOnMouseOver}
          promptListRef={mockPromptListRef}
          showCommands={true}
        />
      );

      const firstPrompt = screen.getByText('Test Prompt 1').closest('li');
      await userEvent.click(firstPrompt!);

      // Should be called with index 3 (after 3 commands)
      expect(mockOnSelect).toHaveBeenCalledWith(3);
    });

    it('calls onSelect with correct index when clicking a prompt without commands', async () => {
      render(
        <PromptList
          prompts={mockPrompts}
          activePromptIndex={0}
          onSelect={mockOnSelect}
          onMouseOver={mockOnMouseOver}
          promptListRef={mockPromptListRef}
          showCommands={false}
        />
      );

      const secondPrompt = screen.getByText('Test Prompt 2').closest('li');
      await userEvent.click(secondPrompt!);

      expect(mockOnSelect).toHaveBeenCalledWith(1);
    });

    it('executes immediate commands directly', async () => {
      render(
        <PromptList
          prompts={mockPrompts}
          commands={mockCommands}
          activePromptIndex={0}
          onSelect={mockOnSelect}
          onMouseOver={mockOnMouseOver}
          promptListRef={mockPromptListRef}
          showCommands={true}
          onImmediateCommandExecution={mockOnImmediateCommandExecution}
        />
      );

      const settingsCommand = screen.getByText('/settings').closest('li');
      await userEvent.click(settingsCommand!);

      // Settings is an immediate execution command
      expect(mockOnImmediateCommandExecution).toHaveBeenCalledWith(
        expect.objectContaining({ command: 'settings' })
      );
      expect(mockOnSelect).not.toHaveBeenCalled();
    });
  });

  describe('Mouse Hover', () => {
    it('calls onMouseOver with correct index when hovering over command', async () => {
      render(
        <PromptList
          prompts={mockPrompts}
          commands={mockCommands}
          activePromptIndex={0}
          onSelect={mockOnSelect}
          onMouseOver={mockOnMouseOver}
          promptListRef={mockPromptListRef}
          showCommands={true}
        />
      );

      const helpCommand = screen.getByText('/help').closest('li');
      await userEvent.hover(helpCommand!);

      expect(mockOnMouseOver).toHaveBeenCalledWith(2); // Third command, index 2
    });

    it('calls onMouseOver with correct index when hovering over prompt', async () => {
      render(
        <PromptList
          prompts={mockPrompts}
          commands={mockCommands}
          activePromptIndex={0}
          onSelect={mockOnSelect}
          onMouseOver={mockOnMouseOver}
          promptListRef={mockPromptListRef}
          showCommands={true}
        />
      );

      const secondPrompt = screen.getByText('Test Prompt 2').closest('li');
      await userEvent.hover(secondPrompt!);

      expect(mockOnMouseOver).toHaveBeenCalledWith(4); // After 3 commands, second prompt
    });
  });

  describe('Empty State', () => {
    it('shows empty message when no commands or prompts', () => {
      render(
        <PromptList
          prompts={[]}
          commands={[]}
          activePromptIndex={0}
          onSelect={mockOnSelect}
          onMouseOver={mockOnMouseOver}
          promptListRef={mockPromptListRef}
          showCommands={true}
        />
      );

      expect(screen.getByText('No commands or prompts found')).toBeInTheDocument();
    });
  });

  describe('Command Type Icons', () => {
    it('shows correct icons for different command types', () => {
      render(
        <PromptList
          prompts={mockPrompts}
          commands={mockCommands}
          activePromptIndex={0}
          onSelect={mockOnSelect}
          onMouseOver={mockOnMouseOver}
          promptListRef={mockPromptListRef}
          showCommands={true}
        />
      );

      // Check that icons are rendered for commands
      const robotIcons = screen.getAllByTestId('icon-robot');
      const settingsIcons = screen.getAllByTestId('icon-settings');
      const helpIcons = screen.getAllByTestId('icon-help');

      expect(robotIcons.length).toBeGreaterThan(0); // Agent command
      expect(settingsIcons.length).toBeGreaterThan(0); // Settings command
      expect(helpIcons.length).toBeGreaterThan(0); // Utility command
    });
  });
});
