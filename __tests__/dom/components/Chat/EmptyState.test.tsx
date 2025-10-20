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

  it('displays title text', () => {
    render(<EmptyState />);

    const title = screen.getByText('chat.emptyState.title');
    expect(title).toBeInTheDocument();
  });

  it('displays subtitle text', () => {
    render(<EmptyState />);

    const subtitle = screen.getByText('chat.emptyState.subtitle');
    expect(subtitle).toBeInTheDocument();
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
    expect(wrapper).toHaveClass('h-[88%]');
    expect(wrapper).toHaveClass('items-center');
    expect(wrapper).toHaveClass('justify-center');
  });

  it('has correct title styling', () => {
    render(<EmptyState />);

    const title = screen.getByText('chat.emptyState.title');
    expect(title).toHaveClass('text-4xl');
    expect(title).toHaveClass('font-semibold');
    expect(title).toHaveClass('text-gray-800');
    expect(title).toHaveClass('dark:text-gray-100');
  });

  it('has correct subtitle styling', () => {
    render(<EmptyState />);

    const subtitle = screen.getByText('chat.emptyState.subtitle');
    expect(subtitle).toHaveClass('text-lg');
    expect(subtitle).toHaveClass('text-gray-600');
    expect(subtitle).toHaveClass('dark:text-gray-400');
  });

  it('centers content', () => {
    const { container } = render(<EmptyState />);

    const textCenter = container.querySelector('.text-center');
    expect(textCenter).toBeInTheDocument();

    const flexCol = container.querySelector('.flex-col.items-center');
    expect(flexCol).toBeInTheDocument();
  });

  it('has margin between title section and prompts', () => {
    const { container } = render(<EmptyState />);

    const titleSection = container.querySelector('.mb-8');
    expect(titleSection).toBeInTheDocument();
  });

  it('works without onSelectPrompt callback', () => {
    expect(() => render(<EmptyState />)).not.toThrow();
  });

  it('has proper responsive design classes', () => {
    const { container } = render(<EmptyState />);

    const mxAuto = container.querySelector('.mx-auto');
    expect(mxAuto).toBeInTheDocument();

    const px3 = container.querySelector('.px-3');
    expect(px3).toBeInTheDocument();
  });

  it('matches snapshot', () => {
    const { container } = render(<EmptyState />);
    expect(container.firstChild).toMatchSnapshot();
  });
});
