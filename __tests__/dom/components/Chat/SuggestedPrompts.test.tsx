import { fireEvent, render, screen } from '@testing-library/react';
import React from 'react';
import { describe, expect, it, vi } from 'vitest';
import '@testing-library/jest-dom';

import { SuggestedPrompts } from '@/components/Chat/EmptyState/SuggestedPrompts';
import { suggestedPrompts } from '@/components/Chat/prompts';

describe('SuggestedPrompts', () => {
  it('renders suggested prompts', () => {
    const { container } = render(<SuggestedPrompts />);
    expect(container.firstChild).toBeInTheDocument();
  });

  it('displays default 3 prompts', () => {
    render(<SuggestedPrompts />);

    const buttons = screen.getAllByRole('button');
    expect(buttons).toHaveLength(3);
  });

  it('displays custom number of prompts', () => {
    render(<SuggestedPrompts count={5} />);

    const buttons = screen.getAllByRole('button');
    expect(buttons).toHaveLength(5);
  });

  it('displays correct prompt titles', () => {
    render(<SuggestedPrompts count={3} />);

    expect(screen.getByText(suggestedPrompts[0].title)).toBeInTheDocument();
    expect(screen.getByText(suggestedPrompts[1].title)).toBeInTheDocument();
    expect(screen.getByText(suggestedPrompts[2].title)).toBeInTheDocument();
  });

  it('calls onSelectPrompt when prompt is clicked', () => {
    const mockOnSelectPrompt = vi.fn();
    render(<SuggestedPrompts onSelectPrompt={mockOnSelectPrompt} />);

    const buttons = screen.getAllByRole('button');
    fireEvent.click(buttons[0]);

    expect(mockOnSelectPrompt).toHaveBeenCalledTimes(1);
    expect(mockOnSelectPrompt).toHaveBeenCalledWith(suggestedPrompts[0].prompt);
  });

  it('calls onSelectPrompt with correct prompt for each button', () => {
    const mockOnSelectPrompt = vi.fn();
    render(<SuggestedPrompts onSelectPrompt={mockOnSelectPrompt} count={3} />);

    const buttons = screen.getAllByRole('button');

    fireEvent.click(buttons[0]);
    expect(mockOnSelectPrompt).toHaveBeenLastCalledWith(suggestedPrompts[0].prompt);

    fireEvent.click(buttons[1]);
    expect(mockOnSelectPrompt).toHaveBeenLastCalledWith(suggestedPrompts[1].prompt);

    fireEvent.click(buttons[2]);
    expect(mockOnSelectPrompt).toHaveBeenLastCalledWith(suggestedPrompts[2].prompt);

    expect(mockOnSelectPrompt).toHaveBeenCalledTimes(3);
  });

  it('works without onSelectPrompt callback', () => {
    const { container } = render(<SuggestedPrompts />);
    const buttons = screen.getAllByRole('button');

    expect(() => fireEvent.click(buttons[0])).not.toThrow();
  });

  it('renders icons for each prompt', () => {
    const { container } = render(<SuggestedPrompts count={3} />);

    // Each button should have an icon inside
    const buttons = container.querySelectorAll('button');
    buttons.forEach(button => {
      const icon = button.querySelector('svg');
      expect(icon).toBeInTheDocument();
    });
  });

  it('has correct styling classes', () => {
    const { container } = render(<SuggestedPrompts />);

    const wrapper = container.firstChild;
    expect(wrapper).toHaveClass('hidden');
    expect(wrapper).toHaveClass('sm:flex');
    expect(wrapper).toHaveClass('space-x-5');
  });

  it('buttons have correct styling', () => {
    render(<SuggestedPrompts />);

    const buttons = screen.getAllByRole('button');

    buttons.forEach(button => {
      expect(button).toHaveClass('bg-transparent');
      expect(button).toHaveClass('text-black');
      expect(button).toHaveClass('dark:text-white');
      expect(button).toHaveClass('border');
      expect(button).toHaveClass('rounded-md');
    });
  });

  it('buttons have correct inline styles', () => {
    render(<SuggestedPrompts />);

    const buttons = screen.getAllByRole('button');

    buttons.forEach(button => {
      expect(button).toHaveStyle({ width: '200px' });
      expect(button).toHaveStyle({ height: '100px' });
      expect(button).toHaveStyle({ textAlign: 'start' });
    });
  });

  it('limits prompts to available count', () => {
    // If we ask for more prompts than exist
    render(<SuggestedPrompts count={100} />);

    const buttons = screen.getAllByRole('button');
    // Should only show as many as exist in suggestedPrompts
    expect(buttons.length).toBeLessThanOrEqual(suggestedPrompts.length);
  });

  it('displays prompts with flex column layout', () => {
    const { container } = render(<SuggestedPrompts count={2} />);

    const buttons = container.querySelectorAll('button');
    buttons.forEach(button => {
      const flexDiv = button.querySelector('.flex-col');
      expect(flexDiv).toBeInTheDocument();
      expect(flexDiv).toHaveClass('items-start');
    });
  });

  it('icons have correct sizing', () => {
    const { container } = render(<SuggestedPrompts count={2} />);

    const icons = container.querySelectorAll('svg');
    icons.forEach(icon => {
      expect(icon).toHaveClass('h-5');
      expect(icon).toHaveClass('w-5');
      expect(icon).toHaveClass('mb-2');
    });
  });

  it('uses useMemo to avoid hydration mismatch', () => {
    // Test that rendering twice gives same prompts
    const { rerender } = render(<SuggestedPrompts count={3} />);

    const firstPrompts = screen.getAllByRole('button').map(b => b.textContent);

    rerender(<SuggestedPrompts count={3} />);

    const secondPrompts = screen.getAllByRole('button').map(b => b.textContent);

    expect(firstPrompts).toEqual(secondPrompts);
  });
});
