import { extractCitationsAndQuestions } from '@/utils/app/citations';

describe('extractCitations function', () => {
  it('should extract citations correctly', () => {
    const content = `Test content
  [[CITATIONS_START]]
  [{"number": "1", "title": "Test Citation 1", "url": "https://test1.com", "date": "2023-01-01"}]
  [{"number": "2", "title": "Test Citation 2", "url": "https://test2.com", "date": "2023-01-02"}]
  [[CITATIONS_END]]`;

    const result = extractCitationsAndQuestions(content);
    expect(result.mainContent).toBe('Test content');
    expect(result.citations).toHaveLength(2);
    expect(result.citations[0].title).toBe('Test Citation 1');
    expect(result.citations[1].title).toBe('Test Citation 2');
  });

  it('should handle content without citations', () => {
    const content = 'Test content without citations';
    const result = extractCitationsAndQuestions(content);
    expect(result.mainContent).toBe(content);
    expect(result.citations).toHaveLength(0);
  });

  it('should handle malformed citations', () => {
    const content = `Test content with malformed citations
  [[CITATIONS_START]]
  [{"number": "1", "title": "Test Citation 1", "url": "https://test1.com", "date": "2023-01-01"}]
  [{"number": "2", "title": "Malformed Citation", "url": "https://test2.com", "date": "2023-01-02}]
  [[CITATIONS_END]]`;

    const result = extractCitationsAndQuestions(content);
    expect(result.mainContent).toBe('Test content with malformed citations');
    expect(result.citations).toHaveLength(1);
    expect(result.citations[0].title).toBe('Test Citation 1');
  });

  it('should handle citations with missing fields', () => {
    const content = `Test content with incomplete citations
  [[CITATIONS_START]]
  [{"number": "1", "title": "Test Citation 1", "url": "https://test1.com"}]
  [{"number": "2", "title": "Incomplete Citation"}]
  [[CITATIONS_END]]`;

    const result = extractCitationsAndQuestions(content);
    expect(result.mainContent).toBe('Test content with incomplete citations');
    expect(result.citations).toHaveLength(2);
    expect(result.citations[0].title).toBe('Test Citation 1');
    expect(result.citations[0].date).toBeUndefined();
    expect(result.citations[1].title).toBe('Incomplete Citation');
    expect(result.citations[1].url).toBeUndefined();
    expect(result.citations[1].date).toBeUndefined();
  });
});
