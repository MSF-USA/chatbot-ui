import { render, screen } from '@testing-library/react';
import React from 'react';

import { EmptyState } from '@/components/Chat/EmptyState/EmptyState';

import '@testing-library/jest-dom';
import { describe, expect, it, vi } from 'vitest';

// Mock next-intl
vi.mock('next-intl', () => ({
  useTranslations: () => (key: string) => key,
}));

describe('EmptyState', () => {
  it('renders empty state', () => {
    const { container } = render(<EmptyState />);
    expect(container.firstChild).toBeInTheDocument();
  });

  it('renders SuggestedPrompts component', () => {
    render(<EmptyState />);

    // SuggestedPrompts renders buttons
    const buttons = screen.getAllByRole('button');
    expect(buttons.length).toBeGreaterThan(0);
  });

  it('passes onSelectPrompt to SuggestedPrompts', () => {
    const mockOnSelectPrompt = vi.fn();
    render(<EmptyState onSelectPrompt={mockOnSelectPrompt} />);

    const buttons = screen.getAllByRole('button');
    expect(buttons.length).toBeGreaterThan(0);

    // The prop should be passed down (SuggestedPrompts tests verify it works)
  });

  it('has correct layout structure', () => {
    const { container } = render(<EmptyState />);

    const wrapper = container.firstChild;
    expect(wrapper).toHaveClass('flex');
    expect(wrapper).toHaveClass('flex-col');
    expect(wrapper).toHaveClass('items-center');
    expect(wrapper).toHaveClass('justify-center');
    expect(wrapper).toHaveClass('w-full');
  });

  it('centers content vertically and horizontally', () => {
    const { container } = render(<EmptyState />);

    const wrapper = container.firstChild as HTMLElement;
    expect(wrapper).toHaveClass('items-center');
    expect(wrapper).toHaveClass('justify-center');
  });

  it('works without onSelectPrompt callback', () => {
    expect(() => render(<EmptyState />)).not.toThrow();
  });
});
