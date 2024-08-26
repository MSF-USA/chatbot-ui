import { Citation } from '@/types/citation';

export const extractCitations = (
  content: string,
): { mainContent: string; citations: Citation[] } => {
  const citationRegex =
    /\[\[CITATIONS_START\]\]([\s\S]*?)\[\[CITATIONS_END\]\]/;
  const match = content.match(citationRegex);
  let mainContent = content;
  let citations: Citation[] = [];

  if (match) {
    mainContent = content.replace(citationRegex, '').trim();
    const citationsString = match[1].trim();
    const citationLines = citationsString.split('\n');
    citations = citationLines
      .map((line) => {
        try {
          return JSON.parse(line)[0];
        } catch (error) {
          console.error('Failed to parse citation:', error);
          return null;
        }
      })
      .filter((citation) => citation !== null);
  }

  return { mainContent, citations };
};
