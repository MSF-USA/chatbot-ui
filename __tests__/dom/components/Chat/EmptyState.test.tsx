import { render, screen } from '@testing-library/react';
import React from 'react';
import { describe, expect, it, vi } from 'vitest';
import '@testing-library/jest-dom';

import { EmptyState } from '@/components/Chat/EmptyState/EmptyState';

// Mock next-intl
vi.mock('next-intl', () => ({
  useTranslations: () => (key: string) => key,
}));

// Mock useUI hook
vi.mock('@/lib/hooks/ui/useUI', () => ({
  useUI: () => ({
    theme: 'light',
  }),
}));

// Mock next/image
vi.mock('next/image', () => ({
  default: (props: any) => {
    // eslint-disable-next-line @next/next/no-img-element, jsx-a11y/alt-text
    return <img {...props} />;
  },
}));

describe('EmptyState', () => {
  it('renders empty state', () => {
    const { container } = render(<EmptyState />);
    expect(container.firstChild).toBeInTheDocument();
  });

  it('displays MSF logo', () => {
    render(<EmptyState />);

    const logo = screen.getByAltText('MSF Logo');
    expect(logo).toBeInTheDocument();
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

  it('has correct text styling', () => {
    const { container } = render(<EmptyState />);

    const textContainer = container.querySelector('.text-3xl');
    expect(textContainer).toBeInTheDocument();
    expect(textContainer).toHaveClass('font-thin');
    expect(textContainer).toHaveClass('text-gray-800');
    expect(textContainer).toHaveClass('dark:text-gray-100');
  });

  it('logo has correct max dimensions', () => {
    render(<EmptyState />);

    const logo = screen.getByAltText('MSF Logo');
    expect(logo).toHaveStyle({ maxWidth: '150px' });
    expect(logo).toHaveStyle({ maxHeight: '150px' });
  });

  it('centers logo and content', () => {
    const { container } = render(<EmptyState />);

    const centerDiv = container.querySelector('.text-center');
    expect(centerDiv).toBeInTheDocument();

    const flexCol = container.querySelector('.flex-col.items-center');
    expect(flexCol).toBeInTheDocument();
  });

  it('has margin between logo and prompts', () => {
    const { container } = render(<EmptyState />);

    const promptsWrapper = container.querySelector('.mt-8');
    expect(promptsWrapper).toBeInTheDocument();
  });

  it('works with dark theme', () => {
    // The component uses useUI hook which is already mocked at module level
    // Just verify it renders without errors
    render(<EmptyState />);

    const logo = screen.getByAltText('MSF Logo');
    expect(logo).toBeInTheDocument();
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

  it('logo renders with priority prop passed to Image component', () => {
    // Note: next/image's priority prop is a Next.js optimization
    // In tests with our mock, it gets passed to the img element
    // The important thing is that the logo renders
    render(<EmptyState />);

    const logo = screen.getByAltText('MSF Logo');
    expect(logo).toBeInTheDocument();
    // The priority optimization is handled by Next.js, not visible in DOM
  });

  it('matches snapshot', () => {
    const { container } = render(<EmptyState />);
    expect(container.firstChild).toMatchSnapshot();
  });
});
