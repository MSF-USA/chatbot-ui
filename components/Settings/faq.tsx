// components/FAQ.tsx
import { useState, FC } from 'react';
import { FAQData } from '@/types/faq';
import { IconArrowRight } from '@tabler/icons-react';

type FAQProps = {
  faq: FAQData['faq'];
};

export const FAQ: FC<FAQProps> = ({ faq }) => {
  const [expanded, setExpanded] = useState<number | null>(null);

  const handleExpand = (index: number) => {
    setExpanded(expanded === index ? null : index);
  };

  return (
    <div>
      {faq.map((item, index) => (
        <div key={index} className="mb-4">
          <button
            className="w-full rounded-lg border border-neutral-200 bg-transparent px-4 py-3 text-neutral-900 dark:border-neutral-600 dark:text-neutral-100 text-left"
            onClick={() => handleExpand(index)}
          >
            {item.question}
          </button>
          {expanded === index && (
            <div className="mt-2 px-4 py-2 bg-transparent text-black dark:text-white whitespace-pre-line leading-relaxed">
              {item.answer}
            </div>
          )}
        </div>
      ))}
    </div>
  );
};