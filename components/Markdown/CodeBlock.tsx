import { IconCheck, IconClipboard, IconDownload } from '@tabler/icons-react';
import { FC, memo, useState } from 'react';
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter';
import { oneDark } from 'react-syntax-highlighter/dist/cjs/styles/prism';

import { useTranslations } from 'next-intl';

import {
  generateRandomString,
  programmingLanguages,
} from '@/lib/utils/app/codeblock';

interface Props {
  language: string;
  value: string;
  showLineNumbers?: boolean;
}

export const CodeBlock: FC<Props> = memo(
  ({ language, value, showLineNumbers }) => {
    const t = useTranslations();
    const [isCopied, setIsCopied] = useState<boolean>(false);

    // Auto-enable line numbers for code blocks with more than 5 lines
    const lineCount = value.split('\n').length;
    const shouldShowLineNumbers = showLineNumbers ?? lineCount > 5;

    const copyToClipboard = () => {
      if (!navigator.clipboard || !navigator.clipboard.writeText) {
        return;
      }

      navigator.clipboard.writeText(value).then(() => {
        setIsCopied(true);

        setTimeout(() => {
          setIsCopied(false);
        }, 2000);
      });
    };
    const downloadAsFile = () => {
      const fileExtension = programmingLanguages[language] || '.file';
      const suggestedFileName = `file-${generateRandomString(
        3,
        true,
      )}${fileExtension}`;
      const fileName = window.prompt(
        t('Enter file name') || '',
        suggestedFileName,
      );

      if (!fileName) {
        // user pressed cancel on prompt
        return;
      }

      const blob = new Blob([value], { type: 'text/plain' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.download = fileName;
      link.href = url;
      link.style.display = 'none';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
    };
    return (
      <div className="codeblock relative font-sans text-[16px]">
        <div className="flex items-center justify-between py-1.5 px-4 bg-[#282c34] dark:bg-[#1e1e1e]">
          <span className="text-xs font-semibold uppercase text-gray-300 dark:text-gray-400 tracking-wide">
            {language || 'text'}
          </span>

          <div className="flex items-center gap-1">
            <button
              className="flex gap-1.5 items-center rounded bg-transparent hover:bg-gray-700/50 p-1.5 text-xs text-gray-300 hover:text-white transition-colors"
              onClick={copyToClipboard}
              title={isCopied ? 'Copied!' : 'Copy code'}
            >
              {isCopied ? <IconCheck size={18} /> : <IconClipboard size={18} />}
              <span className="hidden sm:inline">
                {isCopied ? t('Copied!') : t('Copy code')}
              </span>
            </button>
            <button
              className="flex items-center rounded bg-transparent hover:bg-gray-700/50 p-1.5 text-xs text-gray-300 hover:text-white transition-colors"
              onClick={downloadAsFile}
              title="Download"
            >
              <IconDownload size={18} />
            </button>
          </div>
        </div>

        <SyntaxHighlighter
          language={language}
          style={oneDark}
          customStyle={{ margin: 0 }}
          showLineNumbers={shouldShowLineNumbers}
          wrapLines={true}
          lineNumberStyle={{
            minWidth: '3em',
            paddingRight: '1em',
            color: '#6c6c6c',
            userSelect: 'none',
          }}
        >
          {value}
        </SyntaxHighlighter>
      </div>
    );
  },
);
CodeBlock.displayName = 'CodeBlock';
