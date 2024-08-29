import { IconCornerDownRightDouble } from '@tabler/icons-react';
import React from 'react';

interface Question {
  question: string;
}

interface QuestionItemProps {
  question: Question;
  onQuestionClick: (question: string) => void;
}

export const QuestionItem: React.FC<QuestionItemProps> = ({
  question,
  onQuestionClick,
}) => {
  return (
    <div
      className="flex items-center p-2 hover:bg-gray-300 dark:hover:bg-[#212121]/90 cursor-pointer rounded-md"
      onClick={() => onQuestionClick(question.question)}
    >
      <span className="text-sm text-gray-700 dark:text-gray-300">
        {question.question}
      </span>
    </div>
  );
};

interface QuestionListProps {
  questions: Question[];
  onQuestionClick: (question: string) => void;
}

export const QuestionList: React.FC<QuestionListProps> = ({
  questions,
  onQuestionClick,
}) => {
  if (questions.length === 0) {
    return null;
  }

  return (
    <div className="mt-4 border-t border-gray-200 dark:border-gray-700 pt-4">
      <div className="flex items-center mb-2">
        <IconCornerDownRightDouble size={20} className="inline-block" />
        <h3 className="text-lg font-semibold ml-2 mt-3">Follow-Up</h3>
      </div>
      <div className="space-y-2">
        {questions.map((question, index) => (
          <QuestionItem
            key={index}
            question={question}
            onQuestionClick={onQuestionClick}
          />
        ))}
      </div>
    </div>
  );
};
