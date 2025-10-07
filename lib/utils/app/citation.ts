import { Citation } from '@/types/rag';

/**
 * Extracts citations from content using both marker and legacy formats
 * @param content The text content to parse
 * @returns Object containing the cleaned text and extracted citations
 */
export const extractCitationsFromContent = (
  content: string,
): {
  text: string;
  citations: Citation[];
  extractionMethod: string;
} => {
  let mainContent = content;
  let citationsData: Citation[] = [];
  let extractionMethod = 'none';

  // First check for the newer citation marker format
  const citationMarker = content.indexOf('\n\n---CITATIONS_DATA---\n');
  if (citationMarker !== -1) {
    extractionMethod = 'marker';
    mainContent = content.slice(0, citationMarker);
    const jsonStr = content.slice(citationMarker + 22); // Length of marker

    try {
      const parsedData = JSON.parse(jsonStr);
      if (parsedData.citations) {
        citationsData = parsedData.citations;
      }
    } catch (error) {
      console.error('Error parsing citations JSON with marker:', error);
    }
  }
  // Next try the legacy JSON detection at the end
  else {
    const jsonMatch = content.match(/(\{[\s\S]*\})$/);
    if (jsonMatch) {
      extractionMethod = 'regex';
      const jsonStr = jsonMatch[1];
      mainContent = content.slice(0, -jsonStr.length).trim();
      try {
        const parsedData = JSON.parse(jsonStr);
        if (parsedData.citations) {
          citationsData = parsedData.citations;
        }
      } catch (error) {
        console.error('Error parsing citations JSON:', error);
      }
    }
  }

  return {
    text: mainContent,
    citations: citationsData,
    extractionMethod,
  };
};
