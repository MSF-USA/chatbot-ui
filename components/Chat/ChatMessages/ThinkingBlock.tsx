import { IconBrain, IconChevronDown, IconChevronRight } from '@tabler/icons-react';
import { FC, useState } from 'react';
import { MemoizedReactMarkdown } from '@/components/Markdown/MemoizedReactMarkdown';
import { CodeBlock } from '@/components/Markdown/CodeBlock';
import remarkGfm from 'remark-gfm';
import remarkMath from 'remark-math';
import rehypeMathjax from 'rehype-mathjax/svg';

interface ThinkingBlockProps {
  thinking: string;
  isStreaming?: boolean;
}

export const ThinkingBlock: FC<ThinkingBlockProps> = ({ thinking, isStreaming }) => {
  const [isExpanded, setIsExpanded] = useState(false);

  if (!thinking || thinking.trim() === '') {
    return null;
  }

  const customMarkdownComponents = {
    code({ inline, className, children, ...props }: any) {
      const match = /language-(\w+)/.exec(className || '');

      return !inline ? (
        <CodeBlock
          language={(match && match[1]) || ''}
          value={String(children).replace(/\n$/, '')}
          {...props}
        />
      ) : (
        <code className={className} {...props}>
          {children}
        </code>
      );
    },
    table({ children }: any) {
      return (
        <div className="overflow-auto">
          <table className="border-collapse border border-gray-400 dark:border-gray-600 px-3 py-1">
            {children}
          </table>
        </div>
      );
    },
    th({ children }: any) {
      return (
        <th className="break-words border border-gray-400 dark:border-gray-600 bg-gray-300 dark:bg-gray-700 px-3 py-1">
          {children}
        </th>
      );
    },
    td({ children }: any) {
      return (
        <td className="break-words border border-gray-400 dark:border-gray-600 px-3 py-1">
          {children}
        </td>
      );
    },
    p({ children }: any) {
      return <p>{children}</p>;
    },
  };

  return (
    <div className="mb-3 border border-blue-200 dark:border-blue-900/50 rounded-lg overflow-hidden bg-blue-50/50 dark:bg-blue-950/20 transition-all">
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        className="w-full flex items-center justify-between px-4 py-2.5 text-sm font-medium text-blue-700 dark:text-blue-300 hover:bg-blue-100/50 dark:hover:bg-blue-900/30 transition-colors"
        aria-expanded={isExpanded}
        aria-label={isExpanded ? 'Collapse thinking' : 'Expand thinking'}
      >
        <div className="flex items-center gap-2">
          <IconBrain size={18} className="flex-shrink-0" />
          <span>
            {isStreaming ? 'Thinking...' : 'View reasoning process'}
          </span>
        </div>
        {isExpanded ? (
          <IconChevronDown size={18} className="flex-shrink-0" />
        ) : (
          <IconChevronRight size={18} className="flex-shrink-0" />
        )}
      </button>

      {isExpanded && (
        <div className="px-4 py-3 border-t border-blue-200 dark:border-blue-900/50 animate-in fade-in slide-in-from-top-1 duration-200">
          <div className="prose dark:prose-invert prose-sm max-w-none text-gray-700 dark:text-gray-300">
            <MemoizedReactMarkdown
              remarkPlugins={[remarkGfm, [remarkMath, { singleDollar: false }]]}
              rehypePlugins={[rehypeMathjax]}
              components={customMarkdownComponents}
            >
              {thinking}
            </MemoizedReactMarkdown>
          </div>
        </div>
      )}
    </div>
  );
};

export default ThinkingBlock;
