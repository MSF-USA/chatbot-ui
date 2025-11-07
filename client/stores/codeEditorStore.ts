'use client';

import { create } from 'zustand';
import { persist } from 'zustand/middleware';

interface CodeEditorStore {
  // State
  originalCode: string;
  modifiedCode: string;
  language: string;
  fileName: string;
  isLoading: boolean;
  error: string | null;
  isEditorOpen: boolean; // Track if editor is visible
  isArtifactOpen: boolean; // Track if artifact overlay is visible

  // Actions
  setModifiedCode: (code: string) => void;
  setLanguage: (language: string) => void;
  setFileName: (fileName: string) => void;
  setIsLoading: (isLoading: boolean) => void;
  setError: (error: string | null) => void;
  clearError: () => void;
  resetEditor: () => void;
  downloadFile: () => void;
  setIsEditorOpen: (isOpen: boolean) => void;
  openArtifact: (code: string, language?: string, fileName?: string) => void;
  closeArtifact: () => void;
  getArtifactContext: () => {
    fileName: string;
    language: string;
    code: string;
  } | null; // Get artifact metadata for including in messages
}

export const useCodeEditorStore = create<CodeEditorStore>()(
  persist(
    (set, get) => ({
      // Initial state
      originalCode: '',
      modifiedCode: '',
      language: 'typescript',
      fileName: 'untitled.ts',
      isLoading: false,
      error: null,
      isEditorOpen: false,
      isArtifactOpen: false,

      // Actions
      setModifiedCode: (code) => {
        // User edits update immediately
        set({
          modifiedCode: code,
          originalCode: code, // Keep in sync
        });
      },

      setLanguage: (language) => {
        const { fileName } = get();

        // Auto-update fileName if it's still using default naming
        // Check if current fileName is "untitled.*"
        const isDefaultName = fileName.startsWith('untitled.');

        if (isDefaultName) {
          // Get appropriate extension for the language
          const extensionMap: Record<string, string> = {
            typescript: 'ts',
            javascript: 'js',
            python: 'py',
            java: 'java',
            csharp: 'cs',
            go: 'go',
            rust: 'rs',
            cpp: 'cpp',
            c: 'c',
            html: 'html',
            css: 'css',
            json: 'json',
            markdown: 'md',
            sql: 'sql',
            shell: 'sh',
            yaml: 'yaml',
            plaintext: 'txt',
          };

          const ext = extensionMap[language] || 'txt';
          set({ language, fileName: `untitled.${ext}` });
        } else {
          set({ language });
        }
      },

      setFileName: (fileName) => {
        // Auto-detect language from file extension
        const ext = fileName.split('.').pop()?.toLowerCase();
        const languageMap: Record<string, string> = {
          ts: 'typescript',
          tsx: 'typescript',
          js: 'javascript',
          jsx: 'javascript',
          py: 'python',
          java: 'java',
          cs: 'csharp',
          go: 'go',
          rs: 'rust',
          cpp: 'cpp',
          c: 'c',
          html: 'html',
          css: 'css',
          json: 'json',
          md: 'markdown',
          sql: 'sql',
          sh: 'shell',
          yml: 'yaml',
          yaml: 'yaml',
        };

        const detectedLanguage = ext
          ? languageMap[ext] || 'plaintext'
          : 'plaintext';

        set({
          fileName,
          language: detectedLanguage,
        });
      },

      setIsLoading: (isLoading) => set({ isLoading }),

      setError: (error) => set({ error }),

      clearError: () => set({ error: null }),

      resetEditor: () =>
        set({
          originalCode: '',
          modifiedCode: '',
          language: 'typescript',
          fileName: 'untitled.ts',
          isLoading: false,
          error: null,
        }),

      downloadFile: () => {
        const { modifiedCode, fileName } = get();

        // Create a blob from the code content
        const blob = new Blob([modifiedCode], {
          type: 'text/plain;charset=utf-8',
        });

        // Create a download link
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = fileName;

        // Trigger download
        document.body.appendChild(link);
        link.click();

        // Cleanup
        document.body.removeChild(link);
        URL.revokeObjectURL(url);
      },

      setIsEditorOpen: (isOpen) => set({ isEditorOpen: isOpen }),

      openArtifact: (code, language = 'typescript', fileName?) => {
        // Auto-generate fileName based on language if not provided
        const extensionMap: Record<string, string> = {
          typescript: 'ts',
          javascript: 'js',
          python: 'py',
          java: 'java',
          csharp: 'cs',
          go: 'go',
          rust: 'rs',
          cpp: 'cpp',
          c: 'c',
          html: 'html',
          css: 'css',
          json: 'json',
          markdown: 'md',
          sql: 'sql',
          shell: 'sh',
          bash: 'sh',
          powershell: 'ps1',
          yaml: 'yaml',
          tsx: 'tsx',
          jsx: 'jsx',
          plaintext: 'txt',
        };

        const ext = extensionMap[language] || 'txt';
        const defaultFileName = `untitled.${ext}`;

        console.log(
          `[CodeEditorStore] Opening artifact: ${defaultFileName} (${language})`,
        );

        // Opening a new artifact replaces the current one
        set({
          originalCode: code,
          modifiedCode: code,
          language,
          fileName: fileName || defaultFileName,
          isArtifactOpen: true,
          isEditorOpen: true,
        });
      },

      closeArtifact: () => {
        set({
          isArtifactOpen: false,
          isEditorOpen: false,
        });
      },

      getArtifactContext: () => {
        const state = get();
        if (!state.isArtifactOpen) return null;

        // Return artifact metadata for including in messages
        return {
          fileName: state.fileName,
          language: state.language,
          code: state.modifiedCode,
        };
      },
    }),
    {
      name: 'code-editor-storage',
      // Persist code, language, and file info
      partialize: (state) => ({
        originalCode: state.originalCode,
        modifiedCode: state.modifiedCode,
        language: state.language,
        fileName: state.fileName,
      }),
    },
  ),
);
