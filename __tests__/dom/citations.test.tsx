import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import React from 'react';

import { Conversation } from '@/types/chat';
import { Citation } from '@/types/rag';

import { CitationItem } from '@/components/Chat/Citations/CitationItem';
import { CitationList } from '@/components/Chat/Citations/CitationList';
import { CitationMarkdown } from '@/components/Markdown/CitationMarkdown';

import '@testing-library/jest-dom';
import { describe, expect, it } from 'vitest';

// Create a complete mock conversation that matches the Conversation type
const createMockConversation = (bot: boolean = true): Conversation => ({
  id: 'test-conversation',
  name: 'Test Conversation',
  messages: [],
  model: { id: 'gpt-4o', name: 'GPT-4o', maxLength: 12000, tokenLimit: 4000 },
  prompt: 'test prompt',
  temperature: 0.7,
  bot: bot ? 'test' : undefined,
  folderId: null,
});

describe('CitationList', () => {
  const mockCitations: Citation[] = [
    {
      number: 1,
      title: 'Test Citation 1',
      url: 'https://test1.com',
      date: '2023-01-01',
    },
    {
      number: 2,
      title: 'Test Citation 2',
      url: 'https://test2.com',
      date: '2023-01-02',
    },
  ];

  it('renders citation count and toggle button', () => {
    render(<CitationList citations={mockCitations} />);

    // Check citation count
    const citationCount = screen.getByText('2');
    expect(citationCount).toBeInTheDocument();

    // Check "Sources" text
    const sourcesText = screen.getByText('Sources');
    expect(sourcesText).toBeInTheDocument();
  });

  it('shows "Source" for single citation', () => {
    const singleCitation: Citation[] = [mockCitations[0]];
    render(<CitationList citations={singleCitation} />);

    const sourceText = screen.getByText('Source');
    expect(sourceText).toBeInTheDocument();
  });

  it('expands and collapses citations', () => {
    render(<CitationList citations={mockCitations} />);

    // Initial state should not show citations
    const initialCitations = screen.queryByText('Test Citation 1');
    expect(initialCitations).not.toBeInTheDocument();

    // Click to expand
    const toggleButton = screen.getByText('Sources');
    fireEvent.click(toggleButton);

    // Now citations should be visible
    const citation1 = screen.getByText('Test Citation 1');
    const citation2 = screen.getByText('Test Citation 2');
    expect(citation1).toBeInTheDocument();
    expect(citation2).toBeInTheDocument();

    // Click to collapse
    fireEvent.click(toggleButton);

    // Citations should be hidden again
    expect(screen.queryByText('Test Citation 1')).toBeNull();
  });

  it('returns null when no citations', () => {
    const { container } = render(<CitationList citations={[]} />);
    expect(container.firstChild).toBeNull();
  });
});

describe('CitationItem', () => {
  const mockCitation: Citation = {
    number: 1,
    title: 'Test Citation',
    url: 'https://www.example.com',
    date: '2023-01-01',
  };

  it('renders citation details correctly', () => {
    render(<CitationItem citation={mockCitation} />);

    // Check title
    const titleElement = screen.getByText('Test Citation');
    expect(titleElement).toBeInTheDocument();

    // Check date
    const dateElement = screen.getByText('2023-01-01');
    expect(dateElement).toBeInTheDocument();

    // Check domain
    const domainElement = screen.getByText('example');
    expect(domainElement).toBeInTheDocument();

    // Check link
    const linkElement = screen.getByRole('link');
    expect(linkElement).toHaveAttribute('href', 'https://www.example.com');
    expect(linkElement).toHaveAttribute('title', 'Test Citation');
  });

  it('returns null for citation without title or url', () => {
    const incompleteCitation: Citation = {
      number: 1,
      title: '',
      url: '',
      date: '2023-01-01',
    };

    const { container } = render(
      <CitationItem citation={incompleteCitation} />,
    );
    expect(container.firstChild).toBeNull();
  });
});

describe('CitationMarkdown', () => {
  const mockCitations: Citation[] = [
    {
      number: 1,
      title: 'Test Citation',
      url: 'https://www.example.com',
      date: '2023-01-01',
    },
  ];

  it('renders citation numbers with correct styling', () => {
    render(
      <CitationMarkdown
        citations={mockCitations}
        conversation={createMockConversation()}
      >
        Here is a citation [1].
      </CitationMarkdown>,
    );

    const citation = screen.getByText('[1]');
    const supElement = citation.closest('sup');
    expect(supElement).toHaveClass('citation-number');
    expect(supElement).toHaveClass('cursor-help');
    expect(supElement).toHaveClass('text-blue-600');
  });

  it('displays tooltip with correct content on hover', async () => {
    render(
      <CitationMarkdown
        citations={mockCitations}
        conversation={createMockConversation()}
      >
        Here is a citation [1].
      </CitationMarkdown>,
    );

    const citation = screen.getByText('[1]');
    const supElement = citation.closest('sup');

    // Simulate mouse enter
    fireEvent.mouseEnter(supElement!);

    // Wait for tooltip to appear
    await waitFor(() => {
      const tooltipElement = screen.getByText('Test Citation');
      expect(tooltipElement).toBeInTheDocument();
    });

    const linkElement = screen.getByRole('link');
    expect(linkElement).toHaveAttribute('href', 'https://www.example.com');
    expect(linkElement).toHaveAttribute('title', 'Test Citation');

    expect(screen.getByText('2023-01-01')).toBeInTheDocument();
    expect(screen.getByText('example')).toBeInTheDocument();
  });

  it('ignores citations when conversation.bot is false', () => {
    render(
      <CitationMarkdown
        citations={mockCitations}
        conversation={createMockConversation(false)}
      >
        Here is a citation [1] that should not be interactive.
      </CitationMarkdown>,
    );

    const text = screen.getByText(
      'Here is a citation [1] that should not be interactive.',
    );
    expect(text.tagName).toBe('P');
    expect(screen.queryByRole('link')).not.toBeInTheDocument();
  });
});
