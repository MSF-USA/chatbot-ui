'use client';

import { DiffEditor, Editor, loader } from '@monaco-editor/react';
import { useEffect, useRef, useState } from 'react';

import { useCodeEditorStore } from '@/client/stores/codeEditorStore';

// Configure Monaco to load from local node_modules instead of CDN
if (typeof window !== 'undefined') {
  loader.config({
    paths: {
      vs: 'https://cdn.jsdelivr.net/npm/monaco-editor@0.54.0/min/vs',
    },
  });
}

interface CodeEditorProps {
  theme?: 'light' | 'dark';
  showDiff?: boolean;
}

export default function CodeEditor({
  theme = 'light',
  showDiff = false,
}: CodeEditorProps) {
  const { originalCode, modifiedCode, language, setModifiedCode, isDirty } =
    useCodeEditorStore();

  const [isLoading, setIsLoading] = useState(true);
  const editorRef = useRef<any>(null);
  const diffEditorRef = useRef<any>(null);

  const handleEditorDidMount = (editor: any) => {
    console.log('Editor mounted', editor);
    editorRef.current = editor;
    setIsLoading(false);

    // Listen to changes
    editor.onDidChangeModelContent(() => {
      const newValue = editor.getValue();
      setModifiedCode(newValue);
    });
  };

  const handleDiffEditorDidMount = (editor: any) => {
    console.log('Diff editor mounted', editor);
    diffEditorRef.current = editor;
    setIsLoading(false);

    // Listen to changes on the modified editor
    const modifiedEditor = editor.getModifiedEditor();
    modifiedEditor.onDidChangeModelContent(() => {
      const newValue = modifiedEditor.getValue();
      setModifiedCode(newValue);
    });
  };

  // Use vs-dark for dark theme, vs for light theme
  const monacoTheme = theme === 'dark' ? 'vs-dark' : 'vs';

  // Use DiffEditor only when showing diff AND there are actual changes
  const useDiffView = showDiff && isDirty && originalCode !== '';

  // Show placeholder when editor is empty
  const showPlaceholder = !modifiedCode && !useDiffView;

  return (
    <div className="h-full w-full flex flex-col relative">
      {showPlaceholder && (
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none z-10">
          <div className="text-center text-neutral-400 dark:text-neutral-500">
            <p className="text-lg mb-2">
              Start typing or ask AI to generate code
            </p>
            <p className="text-sm">
              Code will automatically sync from chat messages
            </p>
          </div>
        </div>
      )}

      {useDiffView ? (
        <DiffEditor
          height="100%"
          width="100%"
          language={language}
          original={originalCode}
          modified={modifiedCode}
          theme={monacoTheme}
          onMount={handleDiffEditorDidMount}
          loading={
            <div className="flex items-center justify-center h-full w-full bg-white dark:bg-neutral-900">
              <div className="text-neutral-900 dark:text-neutral-100">
                Loading editor...
              </div>
            </div>
          }
          options={{
            renderSideBySide: false,
            readOnly: false,
            minimap: { enabled: false },
            fontSize: 14,
            lineNumbers: 'on',
            scrollBeyondLastLine: false,
            wordWrap: 'on',
            automaticLayout: true,
            renderIndicators: true,
            renderMarginRevertIcon: true,
            enableSplitViewResizing: false,
            diffWordWrap: 'on',
            ignoreTrimWhitespace: false,
            renderOverviewRuler: true,
          }}
        />
      ) : (
        <Editor
          height="100%"
          width="100%"
          defaultLanguage={language}
          defaultValue={modifiedCode || '// Start coding...'}
          theme={monacoTheme}
          onMount={handleEditorDidMount}
          onChange={(value) => {
            if (value !== undefined) {
              setModifiedCode(value);
            }
          }}
          loading={
            <div className="flex items-center justify-center h-full w-full bg-white dark:bg-neutral-900">
              <div className="text-neutral-900 dark:text-neutral-100">
                Loading editor...
              </div>
            </div>
          }
          options={{
            minimap: { enabled: false },
            fontSize: 14,
            lineNumbers: 'on',
            scrollBeyondLastLine: false,
            wordWrap: 'on',
            automaticLayout: true,
            tabSize: 2,
            insertSpaces: true,
            formatOnPaste: true,
            formatOnType: true,
            suggestOnTriggerCharacters: true,
            quickSuggestions: true,
            folding: true,
            foldingStrategy: 'indentation',
            showFoldingControls: 'always',
          }}
        />
      )}

      {isDirty && (
        <div className="absolute bottom-4 right-4 bg-blue-500 text-white px-3 py-1 rounded-md text-sm shadow-lg">
          Unsaved changes
        </div>
      )}
    </div>
  );
}
