import { render } from '@testing-library/react';
import React from 'react';
import { describe, expect, it } from 'vitest';
import '@testing-library/jest-dom';

import { LoadingScreen } from '@/components/Chat/LoadingScreen';

describe('LoadingScreen', () => {
  it('renders loading screen', () => {
    const { container } = render(<LoadingScreen />);
    expect(container.firstChild).toBeInTheDocument();
  });

  it('displays three animated dots', () => {
    const { container } = render(<LoadingScreen />);

    const dots = container.querySelectorAll('.animate-bounce');
    expect(dots).toHaveLength(3);
  });

  it('has correct animation delays', () => {
    const { container } = render(<LoadingScreen />);

    const dots = container.querySelectorAll('.animate-bounce');

    expect(dots[0]).toHaveStyle({ animationDelay: '0ms' });
    expect(dots[1]).toHaveStyle({ animationDelay: '150ms' });
    expect(dots[2]).toHaveStyle({ animationDelay: '300ms' });
  });

  it('has full height and width', () => {
    const { container } = render(<LoadingScreen />);

    const wrapper = container.firstChild;
    expect(wrapper).toHaveClass('h-full');
    expect(wrapper).toHaveClass('w-full');
  });

  it('centers content', () => {
    const { container } = render(<LoadingScreen />);

    const wrapper = container.firstChild;
    expect(wrapper).toHaveClass('items-center');
    expect(wrapper).toHaveClass('justify-center');
  });

  it('has correct background color classes', () => {
    const { container } = render(<LoadingScreen />);

    const wrapper = container.firstChild;
    expect(wrapper).toHaveClass('bg-white');
    expect(wrapper).toHaveClass('dark:bg-[#212121]');
  });

  it('dots have correct styling', () => {
    const { container } = render(<LoadingScreen />);

    const dots = container.querySelectorAll('.animate-bounce');

    dots.forEach(dot => {
      expect(dot).toHaveClass('h-3');
      expect(dot).toHaveClass('w-3');
      expect(dot).toHaveClass('rounded-full');
      expect(dot).toHaveClass('bg-gray-500');
      expect(dot).toHaveClass('dark:bg-gray-400');
    });
  });

  it('dots are arranged in a flex row', () => {
    const { container } = render(<LoadingScreen />);

    const dotsContainer = container.querySelector('.flex.space-x-2');
    expect(dotsContainer).toBeInTheDocument();
    expect(dotsContainer?.children).toHaveLength(3);
  });

  it('has nested flex column structure', () => {
    const { container } = render(<LoadingScreen />);

    const flexCol = container.querySelector('.flex-col');
    expect(flexCol).toBeInTheDocument();
    expect(flexCol).toHaveClass('items-center');
    expect(flexCol).toHaveClass('space-y-4');
  });

  it('matches snapshot', () => {
    const { container } = render(<LoadingScreen />);
    expect(container.firstChild).toMatchSnapshot();
  });
});
