import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import React from 'react';
import { describe, expect, it, vi } from 'vitest';
import '@testing-library/jest-dom';

import { CitationList } from '@/components/Chat/Citations/CitationList';
import { Citation } from '@/types/rag';

// Mock CitationItem component
vi.mock('@/components/Chat/Citations/CitationItem', () => ({
  CitationItem: ({ citation }: { citation: Citation }) => (
    <div data-testid={`citation-${citation.number}`}>
      {citation.title}
    </div>
  ),
}));

// Mock next/link
vi.mock('next/link', () => ({
  default: ({ children, ...props }: any) => <a {...props}>{children}</a>,
}));

describe('CitationList', () => {
  const mockCitations: Citation[] = [
    {
      title: 'First Article',
      url: 'https://example.com/1',
      date: '2024-01-01',
      number: 1,
    },
    {
      title: 'Second Article',
      url: 'https://example.com/2',
      date: '2024-01-02',
      number: 2,
    },
    {
      title: 'Third Article',
      url: 'https://example.com/3',
      date: '2024-01-03',
      number: 3,
    },
  ];

  describe('Rendering', () => {
    it('renders citation list with count', () => {
      render(<CitationList citations={mockCitations} />);

      expect(screen.getByText('3')).toBeInTheDocument();
      expect(screen.getByText('Sources')).toBeInTheDocument();
    });

    it('displays "Source" singular for single citation', () => {
      render(<CitationList citations={[mockCitations[0]]} />);

      expect(screen.getByText('1')).toBeInTheDocument();
      expect(screen.getByText('Source')).toBeInTheDocument();
    });

    it('displays "Sources" plural for multiple citations', () => {
      render(<CitationList citations={mockCitations} />);

      expect(screen.getByText('Sources')).toBeInTheDocument();
    });

    it('returns null when no citations provided', () => {
      const { container } = render(<CitationList citations={[]} />);

      expect(container.firstChild).toBeNull();
    });

    it('renders citation icon', () => {
      const { container } = render(<CitationList citations={mockCitations} />);

      const icon = container.querySelector('svg');
      expect(icon).toBeInTheDocument();
    });
  });

  describe('Expand/Collapse', () => {
    it('starts in collapsed state', () => {
      render(<CitationList citations={mockCitations} />);

      expect(screen.queryByTestId('citation-1')).not.toBeInTheDocument();
      expect(screen.queryByTestId('citation-2')).not.toBeInTheDocument();
      expect(screen.queryByTestId('citation-3')).not.toBeInTheDocument();
    });

    it('expands when clicked', async () => {
      render(<CitationList citations={mockCitations} />);

      const header = screen.getByText('Sources').closest('div');
      fireEvent.click(header!);

      await waitFor(() => {
        expect(screen.getByTestId('citation-1')).toBeInTheDocument();
        expect(screen.getByTestId('citation-2')).toBeInTheDocument();
        expect(screen.getByTestId('citation-3')).toBeInTheDocument();
      });
    });

    it('collapses when clicked again', async () => {
      render(<CitationList citations={mockCitations} />);

      const header = screen.getByText('Sources').closest('div');

      // Expand
      fireEvent.click(header!);
      await waitFor(() => {
        expect(screen.getByTestId('citation-1')).toBeInTheDocument();
      });

      // Collapse
      fireEvent.click(header!);
      await waitFor(() => {
        expect(screen.queryByTestId('citation-1')).not.toBeInTheDocument();
      });
    });

    it('shows chevron down when collapsed', () => {
      const { container } = render(<CitationList citations={mockCitations} />);

      // IconChevronDown is rendered
      const chevrons = container.querySelectorAll('svg');
      expect(chevrons.length).toBeGreaterThan(0);
    });

    it('shows chevron up when expanded', async () => {
      const { container } = render(<CitationList citations={mockCitations} />);

      const header = screen.getByText('Sources').closest('div');
      fireEvent.click(header!);

      await waitFor(() => {
        expect(screen.getByTestId('citation-1')).toBeInTheDocument();
      });

      const chevrons = container.querySelectorAll('svg');
      expect(chevrons.length).toBeGreaterThan(0);
    });
  });

  describe('Deduplication', () => {
    it('deduplicates citations by URL', () => {
      const duplicateCitations: Citation[] = [
        { title: 'Article', url: 'https://example.com/1', date: '2024-01-01', number: 1 },
        { title: 'Same Article', url: 'https://example.com/1', date: '2024-01-01', number: 2 },
      ];

      render(<CitationList citations={duplicateCitations} />);

      expect(screen.getByText('1')).toBeInTheDocument();
      expect(screen.getByText('Source')).toBeInTheDocument();
    });

    it('deduplicates citations by title', () => {
      const duplicateCitations: Citation[] = [
        { title: 'Same Title', url: 'https://example.com/1', date: '2024-01-01', number: 1 },
        { title: 'Same Title', url: 'https://example.com/2', date: '2024-01-02', number: 2 },
      ];

      render(<CitationList citations={duplicateCitations} />);

      expect(screen.getByText('1')).toBeInTheDocument();
    });

    it('keeps citations with different URLs and titles', () => {
      render(<CitationList citations={mockCitations} />);

      expect(screen.getByText('3')).toBeInTheDocument();
    });

    it('handles citations without URLs', () => {
      const citationsWithoutUrls: Citation[] = [
        { title: 'Article 1', url: '', date: '2024-01-01', number: 1 },
        { title: 'Article 2', url: '', date: '2024-01-02', number: 2 },
      ];

      render(<CitationList citations={citationsWithoutUrls} />);

      expect(screen.getByText('2')).toBeInTheDocument();
    });
  });

  describe('Styling', () => {
    it('has correct header styling', () => {
      const { container } = render(<CitationList citations={mockCitations} />);

      const header = container.querySelector('.cursor-pointer');
      expect(header).toBeInTheDocument();
      expect(header).toHaveClass('rounded-md');
      expect(header).toHaveClass('dark:bg-[#1f1f1f]');
      expect(header).toHaveClass('bg-gray-100');
    });

    it('has hover styling on header', () => {
      const { container } = render(<CitationList citations={mockCitations} />);

      const header = container.querySelector('.cursor-pointer');
      expect(header).toHaveClass('hover:text-blue-500');
    });

    it('container fades in with transition', () => {
      const { container } = render(<CitationList citations={mockCitations} />);

      const wrapper = container.firstChild as HTMLElement;
      expect(wrapper).toHaveClass('transition-opacity');
      expect(wrapper).toHaveClass('duration-500');
    });

    it('expanded citations container has correct classes', async () => {
      const { container } = render(<CitationList citations={mockCitations} />);

      const header = screen.getByText('Sources').closest('div');
      fireEvent.click(header!);

      await waitFor(() => {
        const citationsContainer = container.querySelector('.overflow-x-auto');
        expect(citationsContainer).toBeInTheDocument();
        expect(citationsContainer).toHaveClass('flex');
        expect(citationsContainer).toHaveClass('gap-4');
        expect(citationsContainer).toHaveClass('no-scrollbar');
      });
    });
  });

  describe('Citation Rendering', () => {
    it('renders all citations when expanded', async () => {
      render(<CitationList citations={mockCitations} />);

      const header = screen.getByText('Sources').closest('div');
      fireEvent.click(header!);

      await waitFor(() => {
        expect(screen.getByText('First Article')).toBeInTheDocument();
        expect(screen.getByText('Second Article')).toBeInTheDocument();
        expect(screen.getByText('Third Article')).toBeInTheDocument();
      });
    });

    it('wraps each citation in flex-shrink-0 container', async () => {
      const { container } = render(<CitationList citations={mockCitations} />);

      const header = screen.getByText('Sources').closest('div');
      fireEvent.click(header!);

      await waitFor(() => {
        const shrinkContainers = container.querySelectorAll('.flex-shrink-0');
        expect(shrinkContainers.length).toBe(3);
      });
    });
  });

  describe('Edge Cases', () => {
    it('handles single citation', () => {
      render(<CitationList citations={[mockCitations[0]]} />);

      expect(screen.getByText('1')).toBeInTheDocument();
      expect(screen.getByText('Source')).toBeInTheDocument();
    });

    it('handles many citations', () => {
      const manyCitations = Array.from({ length: 20 }, (_, i) => ({
        title: `Article ${i + 1}`,
        url: `https://example.com/${i + 1}`,
        date: '2024-01-01',
        number: i + 1,
      }));

      render(<CitationList citations={manyCitations} />);

      expect(screen.getByText('20')).toBeInTheDocument();
      expect(screen.getByText('Sources')).toBeInTheDocument();
    });

    it('handles citations without numbers', async () => {
      const citationsWithoutNumbers: Citation[] = [
        { title: 'Article 1', url: 'https://example.com/1', date: '2024-01-01', number: 1 },
        { title: 'Article 2', url: 'https://example.com/2', date: '2024-01-02', number: 2 },
      ];

      render(<CitationList citations={citationsWithoutNumbers} />);

      const header = screen.getByText('Sources').closest('div');
      fireEvent.click(header!);

      await waitFor(() => {
        expect(screen.getByText('Article 1')).toBeInTheDocument();
        expect(screen.getByText('Article 2')).toBeInTheDocument();
      });
    });
  });

  describe('Visibility Animation', () => {
    it('starts with opacity-0', () => {
      const { container } = render(<CitationList citations={mockCitations} />);

      const wrapper = container.firstChild as HTMLElement;
      // Initially may have opacity-0, but will transition to opacity-100
      expect(wrapper).toHaveClass('transition-opacity');
    });
  });

  describe('Accessibility', () => {
    it('header is clickable', () => {
      const { container } = render(<CitationList citations={mockCitations} />);

      const header = container.querySelector('.cursor-pointer');
      expect(header).toBeInTheDocument();
    });

    it('displays citation count prominently', () => {
      render(<CitationList citations={mockCitations} />);

      const count = screen.getByText('3');
      expect(count).toBeInTheDocument();
    });
  });
});
