import { render, screen } from '@testing-library/react';
import React from 'react';

import { StreamingMessage } from '@/components/Chat/MessageList/StreamingMessage';

import '@testing-library/jest-dom';
import { describe, expect, it, vi } from 'vitest';

// Mock streamdown
vi.mock('streamdown', () => ({
  Streamdown: ({ children }: { children: string }) => (
    <div data-testid="markdown-content">{children}</div>
  ),
}));

describe('StreamingMessage', () => {
  describe('Rendering', () => {
    it('renders streaming message', () => {
      render(<StreamingMessage content="Hello world" />);

      const markdownContent = screen.getByTestId('markdown-content');
      expect(markdownContent).toBeInTheDocument();
      expect(markdownContent).toHaveTextContent('Hello world');
    });

    it('renders AI avatar', () => {
      render(<StreamingMessage content="Test" />);

      expect(screen.getByText('AI')).toBeInTheDocument();
    });

    it('renders generating indicator', () => {
      render(<StreamingMessage content="Test" />);

      expect(screen.getByText('Generating...')).toBeInTheDocument();
    });

    it('renders with empty content', () => {
      render(<StreamingMessage content="" />);

      const markdownContent = screen.getByTestId('markdown-content');
      expect(markdownContent).toBeInTheDocument();
    });

    it('renders with multiline content', () => {
      const content = 'Line 1\nLine 2\nLine 3';
      render(<StreamingMessage content={content} />);

      const markdownContent = screen.getByTestId('markdown-content');
      expect(markdownContent.textContent).toContain('Line 1');
      expect(markdownContent.textContent).toContain('Line 2');
      expect(markdownContent.textContent).toContain('Line 3');
    });

    it('renders with markdown content', () => {
      const content = '# Heading\n\n**Bold text**';
      render(<StreamingMessage content={content} />);

      const markdownContent = screen.getByTestId('markdown-content');
      expect(markdownContent.textContent).toContain('Heading');
      expect(markdownContent.textContent).toContain('Bold text');
    });

    it('renders with code blocks', () => {
      const content = '```javascript\nconst x = 1;\n```';
      render(<StreamingMessage content={content} />);

      const markdownContent = screen.getByTestId('markdown-content');
      expect(markdownContent).toBeInTheDocument();
    });
  });

  describe('Avatar Styling', () => {
    it('avatar has correct classes', () => {
      const { container } = render(<StreamingMessage content="Test" />);

      const avatar = screen.getByText('AI').closest('div');
      expect(avatar).toHaveClass('h-8');
      expect(avatar).toHaveClass('w-8');
      expect(avatar).toHaveClass('rounded-full');
      expect(avatar).toHaveClass('bg-blue-500');
    });

    it('avatar text has correct styling', () => {
      render(<StreamingMessage content="Test" />);

      const avatarText = screen.getByText('AI');
      expect(avatarText).toHaveClass('text-sm');
      expect(avatarText).toHaveClass('font-semibold');
      expect(avatarText).toHaveClass('text-white');
    });
  });

  describe('Streaming Indicator', () => {
    it('has breathing animation', () => {
      const { container } = render(<StreamingMessage content="Test" />);

      const breathingDot = container.querySelector('.animate-breathing');
      expect(breathingDot).toBeInTheDocument();
    });

    it('indicator has correct styling', () => {
      const { container } = render(<StreamingMessage content="Test" />);

      const breathingDot = container.querySelector('.animate-breathing');
      expect(breathingDot).toHaveClass('h-3');
      expect(breathingDot).toHaveClass('w-3');
      expect(breathingDot).toHaveClass('rounded-full');
      expect(breathingDot).toHaveClass('bg-blue-500');
    });

    it('indicator text has correct styling', () => {
      render(<StreamingMessage content="Test" />);

      const indicatorText = screen.getByText('Generating...');
      expect(indicatorText).toHaveClass('text-xs');
      expect(indicatorText).toHaveClass('text-gray-500');
      expect(indicatorText).toHaveClass('dark:text-gray-400');
    });
  });

  describe('Layout', () => {
    it('has correct container structure', () => {
      const { container } = render(<StreamingMessage content="Test" />);

      const wrapper = container.firstChild as HTMLElement;
      expect(wrapper).toHaveClass('group');
      expect(wrapper).toHaveClass('relative');
    });

    it('has flex layout for avatar and content', () => {
      const { container } = render(<StreamingMessage content="Test" />);

      const flexContainer = container.querySelector(
        '.flex.items-start.space-x-3',
      );
      expect(flexContainer).toBeInTheDocument();
    });

    it('content area is flex-1', () => {
      const { container } = render(<StreamingMessage content="Test" />);

      const contentArea = container.querySelector('.flex-1');
      expect(contentArea).toBeInTheDocument();
      expect(contentArea).toHaveClass('overflow-hidden');
    });

    it('has prose styling for markdown', () => {
      const { container } = render(<StreamingMessage content="Test" />);

      const proseContainer = container.querySelector('.prose');
      expect(proseContainer).toBeInTheDocument();
      expect(proseContainer).toHaveClass('dark:prose-invert');
      expect(proseContainer).toHaveClass('max-w-none');
    });
  });

  describe('Content Variations', () => {
    it('handles very long content', () => {
      const longContent = 'a'.repeat(10000);
      render(<StreamingMessage content={longContent} />);

      const markdownContent = screen.getByTestId('markdown-content');
      expect(markdownContent).toHaveTextContent(longContent);
    });

    it('handles special characters', () => {
      const content = 'Special chars: <>&"\'';
      render(<StreamingMessage content={content} />);

      const markdownContent = screen.getByTestId('markdown-content');
      expect(markdownContent).toHaveTextContent(content);
    });

    it('handles unicode characters', () => {
      const content = '你好 🌍 مرحبا';
      render(<StreamingMessage content={content} />);

      const markdownContent = screen.getByTestId('markdown-content');
      expect(markdownContent).toHaveTextContent(content);
    });
  });

  describe('Accessibility', () => {
    it('avatar is not interactive', () => {
      const { container } = render(<StreamingMessage content="Test" />);

      const avatar = screen.getByText('AI').closest('div');
      expect(avatar?.tagName).not.toBe('BUTTON');
    });

    it('message content is readable', () => {
      render(<StreamingMessage content="Important message" />);

      const content = screen.getByText('Important message');
      expect(content).toBeInTheDocument();
    });
  });

  describe('Dark Mode', () => {
    it('has dark mode classes for prose', () => {
      const { container } = render(<StreamingMessage content="Test" />);

      const prose = container.querySelector('.prose');
      expect(prose).toHaveClass('dark:prose-invert');
    });

    it('has dark mode classes for indicator text', () => {
      render(<StreamingMessage content="Test" />);

      const indicatorText = screen.getByText('Generating...');
      expect(indicatorText).toHaveClass('dark:text-gray-400');
    });
  });
});
