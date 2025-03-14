import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import React from 'react';

import { Conversation } from '@/types/chat';
import { Citation } from '@/types/rag';

import { CitationItem } from '@/components/Chat/Citations/CitationItem';
import { CitationList } from '@/components/Chat/Citations/CitationList';
import { CitationMarkdown } from '@/components/Markdown/CitationMarkdown';

import '@testing-library/jest-dom';
import { describe, expect, it } from 'vitest';

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

    const citationCount = screen.getByText('2');
    expect(citationCount).toBeInTheDocument();

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

    const initialCitations = screen.queryByText('Test Citation 1');
    expect(initialCitations).not.toBeInTheDocument();

    const toggleButton = screen.getByText('Sources');
    fireEvent.click(toggleButton);

    const citation1 = screen.getByText('Test Citation 1');
    const citation2 = screen.getByText('Test Citation 2');
    expect(citation1).toBeInTheDocument();
    expect(citation2).toBeInTheDocument();

    fireEvent.click(toggleButton);

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

    const titleElement = screen.getByText('Test Citation');
    expect(titleElement).toBeInTheDocument();

    const dateElement = screen.getByText('2023-01-01');
    expect(dateElement).toBeInTheDocument();

    const domainElement = screen.getByText('example');
    expect(domainElement).toBeInTheDocument();

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
      title: 'Test Citation 1',
      url: 'https://www.example1.com',
      date: '2023-01-01',
    },
    {
      number: 2,
      title: 'Test Citation 2',
      url: 'https://www.example2.com',
      date: '2023-01-02',
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
    const supElement = citation.closest('sup') as HTMLElement;
    expect(supElement).toHaveClass('citation-number');
    expect(supElement).toHaveClass('cursor-help');
    expect(supElement).toHaveClass('text-blue-600');
  });

  it('renders multiple adjacent citations with correct styling', () => {
    render(
      <CitationMarkdown
        citations={mockCitations}
        conversation={createMockConversation()}
      >
        Here are multiple citations [1][2] in a row.
      </CitationMarkdown>,
    );

    // Verify base styling for all citations
    ['[1]', '[2]'].forEach((text) => {
      const citation = screen.getByText(text);
      const supElement = citation.closest('sup') as HTMLElement;
      expect(supElement).toHaveClass('citation-number');
      expect(supElement).toHaveClass('cursor-help');
      expect(supElement).toHaveClass('text-blue-600');
    });
  });

  it('shows correct tooltip for first citation', async () => {
    render(
      <CitationMarkdown
        citations={mockCitations}
        conversation={createMockConversation()}
      >
        Here are multiple citations [1][2] in a row.
      </CitationMarkdown>,
    );

    const citation = screen.getByText('[1]');
    const supElement = citation.closest('sup') as HTMLElement;

    fireEvent.mouseEnter(supElement);

    await waitFor(() => {
      expect(screen.getByText('Test Citation 1')).toBeInTheDocument();
    });

    const link = screen.getByRole('link');
    expect(link).toHaveAttribute('href', 'https://www.example1.com');
    expect(link).toHaveAttribute('title', 'Test Citation 1');
    expect(screen.getByText('2023-01-01')).toBeInTheDocument();
    expect(screen.getByText('example1')).toBeInTheDocument();
  });

  it('shows correct tooltip for second citation', async () => {
    render(
      <CitationMarkdown
        citations={mockCitations}
        conversation={createMockConversation()}
      >
        Here are multiple citations [1][2] in a row.
      </CitationMarkdown>,
    );

    const citation = screen.getByText('[2]');
    const supElement = citation.closest('sup') as HTMLElement;

    fireEvent.mouseEnter(supElement);

    await waitFor(() => {
      expect(screen.getByText('Test Citation 2')).toBeInTheDocument();
    });

    const link = screen.getByRole('link');
    expect(link).toHaveAttribute('href', 'https://www.example2.com');
    expect(link).toHaveAttribute('title', 'Test Citation 2');
    expect(screen.getByText('2023-01-02')).toBeInTheDocument();
    expect(screen.getByText('example2')).toBeInTheDocument();
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
    const supElement = citation.closest('sup') as HTMLElement;

    fireEvent.mouseEnter(supElement);

    await waitFor(() => {
      const tooltipContent = screen.getByText('Test Citation 1');
      expect(tooltipContent).toBeInTheDocument();
    });

    const tooltipContent = screen.getByText('Test Citation 1');
    const tooltipContainer = tooltipContent.closest(
      '.citation-tooltip',
    ) as HTMLElement;
    expect(tooltipContainer).toBeInTheDocument();

    const linkElement = screen.getByRole('link');
    expect(linkElement).toHaveAttribute('href', 'https://www.example1.com');
    expect(linkElement).toHaveAttribute('title', 'Test Citation 1');

    expect(screen.getByText('2023-01-01')).toBeInTheDocument();
    expect(screen.getByText('example1')).toBeInTheDocument();
  });

  it('ignores citations when conversation.bot is undefined', () => {
    // Render with conversation.bot undefined
    const { container } = render(
      <CitationMarkdown
        citations={mockCitations}
        conversation={createMockConversation(false)}
      >
        Here is a citation [1] that should not be interactive.
      </CitationMarkdown>,
    );

    // 1. Directly check if the rendered output has the correct text content
    const paragraph = container.querySelector('p');
    expect(paragraph).not.toBeNull();
    expect(paragraph?.textContent).toBe(
      'Here is a citation [1] that should not be interactive.',
    );

    // 2. Check that no citation-specific elements exist
    const citationWrappers = container.querySelectorAll('.citation-wrapper');
    expect(citationWrappers.length).toBe(0);

    const supElements = container.querySelectorAll('sup.citation-number');
    expect(supElements.length).toBe(0);

    // 3. Ensure no links were rendered (which would be in tooltips)
    expect(screen.queryByRole('link')).not.toBeInTheDocument();
  });
});
