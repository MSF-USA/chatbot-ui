import { render, screen } from '@testing-library/react';
import React from 'react';

import { Citation } from '@/types/citation';

import { CitationItem } from '@/components/Chat/Citations/CitationItem';
import { CitationList } from '@/components/Chat/Citations/CitationList';

import '@testing-library/jest-dom';
import { describe, expect, it, vi } from 'vitest';

type MockCitation = {
  number: string | null;
  title: string | null;
  url: string | null;
  date: string | null;
};

describe('CitationList Component', () => {
  const mockCitations: MockCitation[] = [
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
    render(<CitationList citations={mockCitations as Citation[]} />);
    expect(screen.getByText('Sources and Relevant Links')).toBeInTheDocument();
    expect(screen.getByText('Test Citation 1')).toBeInTheDocument();
    expect(screen.getByText('Test Citation 2')).toBeInTheDocument();
  });

  it('should not render when citations array is empty', () => {
    const { container } = render(<CitationList citations={[]} />);
    expect(container.firstChild).toBeNull();
  });

  it('should handle citations with null titles by not rendering them', () => {
    const mockCitationsWithNullTitle: MockCitation[] = [
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
      {
        number: '3',
        title: null,
        url: 'https://test3.com',
        date: '2023-01-03',
      },
    ];

    render(
      <CitationList citations={mockCitationsWithNullTitle as Citation[]} />,
    );

    expect(screen.getByText('Sources and Relevant Links')).toBeInTheDocument();
    expect(screen.getByText('Test Citation 1')).toBeInTheDocument();
    expect(screen.getByText('Test Citation 2')).toBeInTheDocument();
    expect(screen.queryByText('null')).not.toBeInTheDocument();

    const citationItems = screen.getAllByRole('link');
    expect(citationItems).toHaveLength(2);
  });
});

describe('CitationItem', () => {
  const renderCitationItem = (citation: MockCitation) => {
    return render(<CitationItem citation={citation as Citation} />);
  };

  it('renders correctly with all valid data', () => {
    const citation: MockCitation = {
      number: '1',
      title: 'Test Citation',
      url: 'https://www.example.com',
      date: '2023-01-01',
    };
    renderCitationItem(citation);

    expect(screen.getByText('Test Citation')).toBeInTheDocument();
    expect(screen.getByText('2023-01-01')).toBeInTheDocument();
    expect(screen.getByText('example')).toBeInTheDocument();
    expect(screen.getByText('1')).toBeInTheDocument();

    const link = screen.getByRole('link');
    expect(link).toHaveAttribute('href', 'https://www.example.com');
    expect(link).toHaveAttribute('title', 'Test Citation');

    const favicon = screen.getByAltText('www.example.com favicon');
    expect(favicon).toBeInTheDocument();
  });

  it('does not render when URL is null', () => {
    const citation: MockCitation = {
      number: '2',
      title: 'Null URL Citation',
      url: null,
      date: '2023-01-02',
    };
    const { container } = renderCitationItem(citation);
    expect(container.firstChild).toBeNull();
  });

  it('does not render when title is null', () => {
    const citation: MockCitation = {
      number: '3',
      title: null,
      url: 'https://example.com',
      date: '2023-01-03',
    };
    const { container } = renderCitationItem(citation);
    expect(container.firstChild).toBeNull();
  });

  it('handles invalid URL gracefully', () => {
    const citation: MockCitation = {
      number: '4',
      title: 'Invalid URL Citation',
      url: 'not-a-valid-url',
      date: '2023-01-04',
    };
    renderCitationItem(citation);

    expect(screen.getByText('Invalid URL Citation')).toBeInTheDocument();
    expect(screen.getByText('2023-01-04')).toBeInTheDocument();
    expect(screen.getByText('Invalid URL')).toBeInTheDocument();
    expect(screen.getByText('4')).toBeInTheDocument();
  });

  it('handles null date gracefully', () => {
    const citation: MockCitation = {
      number: '5',
      title: 'No Date Citation',
      url: 'https://example.com',
      date: null,
    };
    renderCitationItem(citation);

    expect(screen.getByText('No Date Citation')).toBeInTheDocument();
    expect(screen.getByText('example')).toBeInTheDocument();
    expect(screen.getByText('5')).toBeInTheDocument();
    expect(screen.queryByText('null')).not.toBeInTheDocument();
  });

  it('processes complex domain correctly', () => {
    const citation: MockCitation = {
      number: '6',
      title: 'Complex Domain Citation',
      url: 'https://www.test-domain.co.uk',
      date: '2023-01-06',
    };
    renderCitationItem(citation);

    expect(screen.getByText('Complex Domain Citation')).toBeInTheDocument();
    expect(screen.getByText('2023-01-06')).toBeInTheDocument();
    expect(screen.getByText('test-domain')).toBeInTheDocument();
    expect(screen.getByText('6')).toBeInTheDocument();
  });

  it('handles subdomain correctly', () => {
    const citation: MockCitation = {
      number: '7',
      title: 'Subdomain Citation',
      url: 'https://blog.example.com',
      date: '2023-01-07',
    };
    renderCitationItem(citation);

    expect(screen.getByText('Subdomain Citation')).toBeInTheDocument();
    expect(screen.getByText('2023-01-07')).toBeInTheDocument();
    expect(screen.getByText('blog')).toBeInTheDocument();
    expect(screen.getByText('7')).toBeInTheDocument();
  });

  it('handles IP address correctly', () => {
    const citation: MockCitation = {
      number: '8',
      title: 'IP Address Citation',
      url: 'http://192.168.1.1',
      date: '2023-01-08',
    };
    renderCitationItem(citation);

    expect(screen.getByText('IP Address Citation')).toBeInTheDocument();
    expect(screen.getByText('2023-01-08')).toBeInTheDocument();
    expect(screen.getByText('192')).toBeInTheDocument();
    expect(screen.getByText('8')).toBeInTheDocument();
  });
});
