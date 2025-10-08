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
  // Use a more specific regex that looks for citations JSON structure
  else {
    // Look specifically for JSON with a "citations" key
    const jsonMatch = content.match(/(\{"citations":\s*\[[\s\S]*?\]\s*\})$/);
    if (jsonMatch) {
      const jsonStr = jsonMatch[1];
      
      // Additional validation to ensure this is likely citation JSON and not code
      const looksLikeCitationJson = 
        jsonStr.includes('"citations"') && 
        jsonStr.length > 20 && // Citations JSON is typically longer
        jsonStr.includes('":') && // JSON key-value separator
        !jsonStr.includes('function') && // Not JavaScript code
        !jsonStr.includes('class') && // Not class definition
        !jsonStr.includes('=>') && // Not arrow function
        !jsonStr.includes('console.'); // Not console statements
      
      if (looksLikeCitationJson) {
        extractionMethod = 'regex';
        const tempContent = content.slice(0, -jsonStr.length).trim();
        
        try {
          const parsedData = JSON.parse(jsonStr);
          if (parsedData.citations && Array.isArray(parsedData.citations)) {
            citationsData = parsedData.citations;
            mainContent = tempContent; // Only update if parsing succeeds
          }
        } catch (error) {
          // Don't modify content if parsing fails - likely not citation JSON
          console.warn('Content ended with braces but was not valid citation JSON, keeping original content');
        }
      }
    }
  }

  return {
    text: mainContent,
    citations: citationsData,
    extractionMethod,
  };
};
