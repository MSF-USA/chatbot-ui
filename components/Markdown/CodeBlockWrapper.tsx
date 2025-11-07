'use client';

import { IconCode } from '@tabler/icons-react';
import React, { useEffect, useRef } from 'react';

import { useCodeEditorStore } from '@/client/stores/codeEditorStore';

interface CodeBlockWrapperProps {
  children: React.ReactNode;
}

/**
 * Wrapper component that adds "Open in editor" buttons to code blocks
 * Works by finding pre elements after render and adding buttons to them
 */
export const CodeBlockWrapper: React.FC<CodeBlockWrapperProps> = ({
  children,
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const { openArtifact } = useCodeEditorStore();

  useEffect(() => {
    if (!containerRef.current) return;

    const addButtons = () => {
      if (!containerRef.current) return;

      // Find all pre elements (code blocks)
      const preElements = containerRef.current.querySelectorAll('pre');

      console.log('[CodeBlockWrapper] Found pre elements:', preElements.length);

      preElements.forEach((pre, index) => {
        // Skip if we've already added a button
        if (pre.parentElement?.classList.contains('code-block-with-button')) {
          console.log('[CodeBlockWrapper] Already has button, skipping', index);
          return;
        }

        // Extract code content
        const codeElement = pre.querySelector('code');
        if (!codeElement) {
          console.log('[CodeBlockWrapper] No code element found', index);
          return;
        }

        const codeText = codeElement.textContent || '';

        // Extract language from multiple possible sources
        // 1. Check code element class
        let language = 'plaintext';
        const codeClassName = codeElement.className || '';

        // 2. Check pre element class (Shiki might use this)
        const preClassName = pre.className || '';

        // 3. Check data attributes
        const dataLanguage =
          pre.getAttribute('data-language') ||
          codeElement.getAttribute('data-language');

        console.log(
          '[CodeBlockWrapper] Debug - code class:',
          codeClassName,
          'pre class:',
          preClassName,
          'data-language:',
          dataLanguage,
        );

        // Try different patterns
        const languageMatch =
          codeClassName.match(/language-(\w+)/) ||
          preClassName.match(/language-(\w+)/) ||
          codeClassName.match(/lang-(\w+)/) ||
          preClassName.match(/lang-(\w+)/);

        if (languageMatch) {
          language = languageMatch[1];
        } else if (dataLanguage) {
          language = dataLanguage;
        }

        console.log('[CodeBlockWrapper] Adding button for', language, 'code');

        // Create wrapper div
        const wrapper = document.createElement('div');
        wrapper.className = 'code-block-with-button my-4';

        // Create button container
        const buttonContainer = document.createElement('div');
        buttonContainer.className = 'flex justify-end mb-1';

        // Create button
        const button = document.createElement('button');
        button.className =
          'flex items-center gap-1.5 px-2.5 py-1 text-xs font-medium text-neutral-600 dark:text-neutral-400 hover:text-blue-600 dark:hover:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-950/30 rounded transition-colors';
        button.title = 'Open in editor';
        button.innerHTML = `
          <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <polyline points="16 18 22 12 16 6"></polyline>
            <polyline points="8 6 2 12 8 18"></polyline>
          </svg>
          <span>Open in editor</span>
        `;
        button.onclick = (e) => {
          e.preventDefault();
          openArtifact(codeText, language);
        };

        buttonContainer.appendChild(button);

        // Replace pre with wrapped version
        pre.parentNode?.insertBefore(wrapper, pre);
        wrapper.appendChild(buttonContainer);
        wrapper.appendChild(pre);
      });
    };

    // Try immediately
    addButtons();

    // Also try after a short delay to catch async-rendered code blocks
    const timer1 = setTimeout(addButtons, 100);
    const timer2 = setTimeout(addButtons, 500);

    return () => {
      clearTimeout(timer1);
      clearTimeout(timer2);
    };
  }, [children, openArtifact]);

  return <div ref={containerRef}>{children}</div>;
};
