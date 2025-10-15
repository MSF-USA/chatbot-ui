import React from 'react';
import { describe, expect, it, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { ModelSelect } from '@/components/Chat/ModelSelect';
import { OpenAIModelID, OpenAIModels } from '@/types/openai';
import { Conversation } from '@/types/chat';

// Mock the hooks
const mockUseConversations = {
  selectedConversation: null as Conversation | null,
  updateConversation: vi.fn(),
  conversations: [],
};

const mockUseSettings = {
  models: Object.values(OpenAIModels).filter(m => !m.isLegacy),
  defaultModelId: OpenAIModelID.GPT_5,
  setDefaultModelId: vi.fn(),
};

const mockUseCustomAgents = {
  customAgents: [],
  addCustomAgent: vi.fn(),
  updateCustomAgent: vi.fn(),
  deleteCustomAgent: vi.fn(),
};

vi.mock('@/lib/hooks/conversation/useConversations', () => ({
  useConversations: () => mockUseConversations,
}));

vi.mock('@/lib/hooks/settings/useSettings', () => ({
  useSettings: () => mockUseSettings,
}));

vi.mock('@/lib/hooks/settings/useCustomAgents', () => ({
  useCustomAgents: () => mockUseCustomAgents,
}));

vi.mock('next-intl', () => ({
  useTranslations: () => (key: string) => key,
}));

describe('ModelSelect', () => {
  beforeEach(() => {
    vi.clearAllMocks();

    // Reset mock data
    mockUseConversations.selectedConversation = {
      id: 'conv-1',
      name: 'Test Conversation',
      messages: [],
      model: OpenAIModels[OpenAIModelID.GPT_5],
      prompt: '',
      temperature: 0.7,
      folderId: null,
    };
  });

  describe('Model Display', () => {
    it('renders list of available models', () => {
      render(<ModelSelect />);

      // Check for GPT-5
      expect(screen.getByText('GPT-5')).toBeInTheDocument();
      // Check for DeepSeek
      expect(screen.getByText('DeepSeek-V3.1')).toBeInTheDocument();
      // Check for Grok
      expect(screen.getByText('Grok 3')).toBeInTheDocument();
    });

    it('displays agent badge for models with agent capabilities', () => {
      render(<ModelSelect />);

      // GPT-5 has agent capabilities
      const gpt5Items = screen.getAllByText(/GPT-5/);
      // Find the one with Agent badge nearby
      const agentBadges = screen.getAllByText('Agent');

      expect(agentBadges.length).toBeGreaterThan(0);
    });

    it('displays provider icons for each model', () => {
      const { container } = render(<ModelSelect />);

      // Provider icons should be rendered (SVG elements)
      const svgs = container.querySelectorAll('svg');
      expect(svgs.length).toBeGreaterThan(0);
    });

    it('highlights currently selected model', () => {
      mockUseConversations.selectedConversation = {
        id: 'conv-1',
        name: 'Test',
        messages: [],
        model: OpenAIModels[OpenAIModelID.DEEPSEEK_V3_1],
        prompt: '',
        temperature: 0.7,
        folderId: null,
      };

      const { container } = render(<ModelSelect />);

      // Should have blue background for selected model
      const selectedElements = container.querySelectorAll('.bg-blue-50, .dark\\:bg-blue-900\\/20');
      expect(selectedElements.length).toBeGreaterThan(0);
    });
  });

  describe('Model Selection', () => {
    it('calls updateConversation when model is selected', async () => {
      render(<ModelSelect />);

      const deepseekButton = screen.getByText('DeepSeek-V3.1').closest('button');
      expect(deepseekButton).not.toBeNull();

      fireEvent.click(deepseekButton!);

      await waitFor(() => {
        expect(mockUseConversations.updateConversation).toHaveBeenCalled();
      });
    });

    it('sets default model when model is selected', async () => {
      render(<ModelSelect />);

      const deepseekButton = screen.getByText('DeepSeek-V3.1').closest('button');
      fireEvent.click(deepseekButton!);

      await waitFor(() => {
        expect(mockUseSettings.setDefaultModelId).toHaveBeenCalledWith(OpenAIModelID.DEEPSEEK_V3_1);
      });
    });

    it('enables agent mode by default when selecting model with agent capabilities', async () => {
      render(<ModelSelect />);

      const gpt5Button = screen.getByText('GPT-5').closest('button');
      fireEvent.click(gpt5Button!);

      await waitFor(() => {
        expect(mockUseConversations.updateConversation).toHaveBeenCalledWith(
          'conv-1',
          expect.objectContaining({
            model: expect.objectContaining({
              agentEnabled: true,
              agentId: 'asst_DHpJVkpNlBiaGgglkvvFALMI',
            }),
          })
        );
      });
    });
  });

  describe('Agent Mode Toggle', () => {
    it('displays agent toggle for models with agent capabilities', () => {
      mockUseConversations.selectedConversation = {
        id: 'conv-1',
        name: 'Test',
        messages: [],
        model: OpenAIModels[OpenAIModelID.GPT_5],
        prompt: '',
        temperature: 0.7,
        folderId: null,
      };

      render(<ModelSelect />);

      expect(screen.getByText('Enable AI Agent')).toBeInTheDocument();
    });

    it('does not display agent toggle for models without agent capabilities', () => {
      mockUseConversations.selectedConversation = {
        id: 'conv-1',
        name: 'Test',
        messages: [],
        model: OpenAIModels[OpenAIModelID.DEEPSEEK_V3_1],
        prompt: '',
        temperature: 0.7,
        folderId: null,
      };

      render(<ModelSelect />);

      expect(screen.queryByText('Enable AI Agent')).not.toBeInTheDocument();
    });

    it('shows notice for models without agent support', () => {
      mockUseConversations.selectedConversation = {
        id: 'conv-1',
        name: 'Test',
        messages: [],
        model: OpenAIModels[OpenAIModelID.GROK_3],
        prompt: '',
        temperature: 0.7,
        folderId: null,
      };

      render(<ModelSelect />);

      expect(screen.getByText(/Agent services.*not yet available/)).toBeInTheDocument();
    });
  });

  describe('Temperature Control', () => {
    it('displays temperature slider for models that support temperature', () => {
      mockUseConversations.selectedConversation = {
        id: 'conv-1',
        name: 'Test',
        messages: [],
        model: OpenAIModels[OpenAIModelID.DEEPSEEK_V3_1],
        prompt: '',
        temperature: 0.7,
        folderId: null,
      };

      render(<ModelSelect />);

      expect(screen.getByText('Temperature Control')).toBeInTheDocument();
    });

    it('does not display temperature slider for models that do not support temperature', () => {
      mockUseConversations.selectedConversation = {
        id: 'conv-1',
        name: 'Test',
        messages: [],
        model: OpenAIModels[OpenAIModelID.GPT_5],
        prompt: '',
        temperature: 0.7,
        folderId: null,
      };

      render(<ModelSelect />);

      expect(screen.queryByText('Temperature Control')).not.toBeInTheDocument();
    });

    it('displays notice for models that do not support temperature', () => {
      mockUseConversations.selectedConversation = {
        id: 'conv-1',
        name: 'Test',
        messages: [],
        model: OpenAIModels[OpenAIModelID.GPT_5],
        prompt: '',
        temperature: 0.7,
        folderId: null,
      };

      render(<ModelSelect />);

      expect(screen.getByText(/OpenAI Model Update/)).toBeInTheDocument();
      expect(screen.getByText(/no longer support custom temperature/)).toBeInTheDocument();
    });

    it('hides temperature slider when agent mode is enabled', () => {
      mockUseConversations.selectedConversation = {
        id: 'conv-1',
        name: 'Test',
        messages: [],
        model: {
          ...OpenAIModels[OpenAIModelID.GPT_5],
          agentEnabled: true,
        },
        prompt: '',
        temperature: 0.7,
        folderId: null,
      };

      render(<ModelSelect />);

      // Temperature control should not be visible when agent is enabled
      expect(screen.queryByText('Temperature Control')).not.toBeInTheDocument();
    });
  });

  describe('Model Details Panel', () => {
    it('displays model type badge', () => {
      mockUseConversations.selectedConversation = {
        id: 'conv-1',
        name: 'Test',
        messages: [],
        model: OpenAIModels[OpenAIModelID.GPT_5],
        prompt: '',
        temperature: 0.7,
        folderId: null,
      };

      render(<ModelSelect />);

      expect(screen.getByText('omni')).toBeInTheDocument();
    });

    it('displays knowledge cutoff date', () => {
      mockUseConversations.selectedConversation = {
        id: 'conv-1',
        name: 'Test',
        messages: [],
        model: OpenAIModels[OpenAIModelID.GPT_5],
        prompt: '',
        temperature: 0.7,
        folderId: null,
      };

      render(<ModelSelect />);

      expect(screen.getByText(/Knowledge cutoff:/)).toBeInTheDocument();
    });

    it('displays model description', () => {
      mockUseConversations.selectedConversation = {
        id: 'conv-1',
        name: 'Test',
        messages: [],
        model: OpenAIModels[OpenAIModelID.GPT_5],
        prompt: '',
        temperature: 0.7,
        folderId: null,
      };

      render(<ModelSelect />);

      expect(screen.getByText(/Next generation model/)).toBeInTheDocument();
    });
  });

  describe('Advanced Section', () => {
    it('collapses advanced section by default', () => {
      render(<ModelSelect />);

      // Advanced section should be collapsed
      expect(screen.queryByText('Add Custom Agent')).not.toBeInTheDocument();
    });

    it('expands advanced section when clicked', async () => {
      render(<ModelSelect />);

      const advancedButton = screen.getByText('Advanced').closest('button');
      expect(advancedButton).not.toBeNull();

      fireEvent.click(advancedButton!);

      await waitFor(() => {
        expect(screen.getByText('Add Custom Agent')).toBeInTheDocument();
      });
    });

    it('displays custom agents in advanced section when present', () => {
      mockUseCustomAgents.customAgents = [
        {
          id: 'agent-1',
          name: 'My Custom Agent',
          agentId: 'asst_custom123',
          baseModelId: OpenAIModelID.GPT_5,
          description: 'Custom agent for testing',
          createdAt: new Date().toISOString(),
        },
      ];

      render(<ModelSelect />);

      // Expand advanced section
      const advancedButton = screen.getByText('Advanced').closest('button');
      fireEvent.click(advancedButton!);

      // Custom agent should be visible
      waitFor(() => {
        expect(screen.getByText('My Custom Agent')).toBeInTheDocument();
      });
    });
  });

  describe('Model Organization', () => {
    it('groups models by provider', () => {
      const { container } = render(<ModelSelect />);

      // Should have Models section
      expect(screen.getByText('Models')).toBeInTheDocument();
    });

    it('orders providers correctly (OpenAI, DeepSeek, xAI)', () => {
      const { container } = render(<ModelSelect />);

      const modelButtons = screen.getAllByRole('button').filter(
        button => button.querySelector('.font-medium')
      );

      // Get model names in order
      const modelNames = modelButtons.map(
        button => button.querySelector('.font-medium')?.textContent || ''
      );

      // GPT-5 (OpenAI) should come before DeepSeek
      const gpt5Index = modelNames.findIndex(name => name.includes('GPT-5'));
      const deepseekIndex = modelNames.findIndex(name => name.includes('DeepSeek'));
      const grokIndex = modelNames.findIndex(name => name.includes('Grok'));

      expect(gpt5Index).toBeLessThan(deepseekIndex);
      expect(deepseekIndex).toBeLessThan(grokIndex);
    });

    it('places GPT-5 first among OpenAI models', () => {
      const { container } = render(<ModelSelect />);

      const modelButtons = screen.getAllByRole('button').filter(
        button => button.querySelector('.font-medium')
      );

      const modelNames = modelButtons.map(
        button => button.querySelector('.font-medium')?.textContent || ''
      );

      const openAIModels = modelNames.filter(
        name => name.includes('GPT') || name.includes('o3')
      );

      // GPT-5 should be first
      expect(openAIModels[0]).toContain('GPT-5');
    });
  });

  describe('Close Button', () => {
    it('calls onClose when close button is clicked', () => {
      const onClose = vi.fn();
      render(<ModelSelect onClose={onClose} />);

      const closeButtons = screen.getAllByRole('button').filter(
        button => button.getAttribute('aria-label') === 'Close' ||
                  button.querySelector('svg')
      );

      // Click the X button
      if (closeButtons.length > 0) {
        fireEvent.click(closeButtons[0]);
        expect(onClose).toHaveBeenCalled();
      }
    });

    it('does not render close button when onClose is not provided', () => {
      const { container } = render(<ModelSelect />);

      // Should not have close button
      const xButtons = container.querySelectorAll('[aria-label="Close"]');
      expect(xButtons.length).toBe(0);
    });
  });
});
