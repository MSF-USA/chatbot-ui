import { Citation } from '@/types/citation';

interface Question {
  question: string;
}

export const extractCitationsAndQuestions = (
  content: string,
): { mainContent: string; citations: Citation[]; questions: Question[] } => {
  const citationRegex =
    /\[\[CITATIONS_START\]\]([\s\S]*?)\[\[CITATIONS_END\]\]/;
  const questionRegex =
    /\[\[FOLLOW_UP_QUESTIONS_START\]\]([\s\S]*?)\[\[FOLLOW_UP_QUESTIONS_END\]\]/;

  const citationMatch = content.match(citationRegex);
  const questionMatch = content.match(questionRegex);

  let mainContent = content;
  let citations: Citation[] = [];
  let questions: Question[] = [];

  if (citationMatch) {
    mainContent = mainContent.replace(citationRegex, '').trim();
    const citationsString = citationMatch[1].trim();
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

  if (questionMatch) {
    mainContent = mainContent.replace(questionRegex, '').trim();
    const questionsString = questionMatch[1].trim();
    const questionLines = questionsString.split('\n');
    questions = questionLines
      .map((line) => {
        try {
          return JSON.parse(line);
        } catch (error) {
          console.error('Failed to parse question:', error);
          return null;
        }
      })
      .filter((question) => question !== null);
  }

  return { mainContent, citations, questions };
};
