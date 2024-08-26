import { render, screen } from '@testing-library/react';
import React from 'react';

import { extractCitations } from '@/utils/app/citations';

import { Citation } from '@/types/citation';

import { CitationItem } from '@/components/Chat/Citations/CitationItem';
import { CitationList } from '@/components/Chat/Citations/CitationList';

import '@testing-library/jest-dom';
import { describe, expect, it, vi } from 'vitest';

describe('CitationList Component', () => {
  const mockCitations: Citation[] = [
    {
      number: '1',
      title: 'Test Citation 1',
      url: 'https://test1.com',
      date: '2023-01-01',
    },
    {
      number: '2',
      title: 'Test Citation 2',
      url: 'https://test2.com',
      date: '2023-01-02',
    },
  ];

  it('should render citations correctly', () => {
    render(<CitationList citations={mockCitations} />);
    expect(screen.getByText('Sources and Relevant Links')).toBeInTheDocument();
    expect(screen.getByText('Test Citation 1')).toBeInTheDocument();
    expect(screen.getByText('Test Citation 2')).toBeInTheDocument();
  });

  it('should not render when citations array is empty', () => {
    const { container } = render(<CitationList citations={[]} />);
    expect(container.firstChild).toBeNull();
  });
});

describe('CitationItem Component', () => {
  const mockCitation: Citation = {
    number: '1',
    title: 'Test Citation',
    url: 'https://test.com',
    date: '2023-01-01',
  };

  it('should render citation details correctly', () => {
    render(<CitationItem citation={mockCitation} />);
    expect(screen.getByText('Test Citation')).toBeInTheDocument();
    expect(screen.getByText('2023-01-01')).toBeInTheDocument();
    expect(screen.getByText('test')).toBeInTheDocument();
    expect(screen.getByText('1')).toBeInTheDocument();
  });
});

describe('extractCitations function', () => {
  it('should extract citations correctly', () => {
    const content = `Test content
[[CITATIONS_START]]
[{"number": "1", "title": "Test Citation 1", "url": "https://test1.com", "date": "2023-01-01"}]
[{"number": "2", "title": "Test Citation 2", "url": "https://test2.com", "date": "2023-01-02"}]
[[CITATIONS_END]]`;

    const result = extractCitations(content);
    expect(result.mainContent).toBe('Test content');
    expect(result.citations).toHaveLength(2);
    expect(result.citations[0].title).toBe('Test Citation 1');
    expect(result.citations[1].title).toBe('Test Citation 2');
  });

  it('should handle content without citations', () => {
    const content = 'Test content without citations';
    const result = extractCitations(content);
    expect(result.mainContent).toBe(content);
    expect(result.citations).toHaveLength(0);
  });

  it('should handle malformed citations', () => {
    const content = `Test content with malformed citations
[[CITATIONS_START]]
[{"number": "1", "title": "Test Citation 1", "url": "https://test1.com", "date": "2023-01-01"}]
[{"number": "2", "title": "Malformed Citation", "url": "https://test2.com", "date": "2023-01-02}]
[[CITATIONS_END]]`;

    const result = extractCitations(content);
    expect(result.mainContent).toBe('Test content with malformed citations');
    expect(result.citations).toHaveLength(1);
    expect(result.citations[0].title).toBe('Test Citation 1');
  });
});
