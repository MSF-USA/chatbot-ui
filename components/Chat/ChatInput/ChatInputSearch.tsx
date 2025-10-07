import {
  IconBrandBing,
  IconLink,
  IconSearch,
} from '@tabler/icons-react';
import React, {
  Dispatch,
  SetStateAction,
  useEffect,
  useRef,
  useState,
} from 'react';

import { useTranslations } from 'next-intl';


import { AgentType } from '@/types/agent';
import {
  ChatInputSubmitTypes,
  FileMessageContent,
  FilePreview,
  ImageMessageContent,
  Message,
  MessageType,
} from '@/types/chat';
import { Plugin, PluginID } from '@/types/plugin';

import BetaBadge from '@/components/Beta/Badge';
import Modal from '@/components/UI/Modal';

import crypto from 'crypto';

interface ChatInputSearchProps {
  isOpen: boolean; // Directly controls visibility
  onClose: () => void; // Callback to tell parent to close
  onFileUpload: (
    event: React.ChangeEvent<any> | File[] | FileList,
    setSubmitType: Dispatch<SetStateAction<ChatInputSubmitTypes>>,
    setFilePreviews: Dispatch<SetStateAction<FilePreview[]>>,
    setFileFieldValue: Dispatch<
      SetStateAction<
        | FileMessageContent
        | FileMessageContent[]
        | ImageMessageContent
        | ImageMessageContent[]
        | null
      >
    >,
    setImageFieldValue: Dispatch<
      SetStateAction<
        ImageMessageContent | ImageMessageContent[] | null | undefined
      >
    >,
    setUploadProgress: Dispatch<SetStateAction<{ [key: string]: number }>>,
  ) => Promise<void>;
  setSubmitType: Dispatch<SetStateAction<ChatInputSubmitTypes>>;
  setFilePreviews: Dispatch<SetStateAction<FilePreview[]>>;
  setFileFieldValue: Dispatch<
    SetStateAction<
      | FileMessageContent
      | FileMessageContent[]
      | ImageMessageContent
      | ImageMessageContent[]
      | null
    >
  >;
  setImageFieldValue: Dispatch<
    SetStateAction<
      ImageMessageContent | ImageMessageContent[] | null | undefined
    >
  >;
  setUploadProgress: Dispatch<SetStateAction<{ [key: string]: number }>>;
  setTextFieldValue: Dispatch<SetStateAction<string>>;
  initialMode?: 'search' | 'url';
  // New props for agent-based web search
  onSend?: (
    message: Message,
    plugin: Plugin | null,
    forceStandardChat?: boolean,
    forcedAgentType?: AgentType,
  ) => void;
  setRequestStatusMessage?: Dispatch<SetStateAction<string | null>>;
  setProgress?: Dispatch<SetStateAction<number | null>>;
  stopConversationRef?: { current: boolean };
  apiKey?: string;
  pluginKeys?: { pluginId: PluginID; requiredKeys: any[] }[];
  systemPrompt?: string;
  temperature?: number;
}

const ChatInputSearch = ({
  isOpen,
  onClose,
  onFileUpload,
  setSubmitType,
  setFilePreviews,
  setFileFieldValue,
  setImageFieldValue,
  setUploadProgress,
  setTextFieldValue,
  initialMode = 'search',
  onSend,
  setRequestStatusMessage,
  setProgress,
  stopConversationRef,
  apiKey,
  pluginKeys,
  systemPrompt,
  temperature,
}: ChatInputSearchProps) => {
  const t = useTranslations();

  const [mode, setMode] = useState<'search' | 'url'>(initialMode);

  // URL Mode States
  const [urlInput, setUrlInput] = useState('');
  const [urlQuestionInput, setUrlQuestionInput] = useState('');
  const [urlError, setUrlError] = useState<string | null>(null);
  const [urlStatusMessage, setUrlStatusMessage] = useState<string | null>(null);
  const [isUrlSubmitting, setIsUrlSubmitting] = useState<boolean>(false);

  // Search Mode States
  const [searchInput, setSearchInput] = useState('');
  const [searchError, setSearchError] = useState<string | null>(null);
  const [searchStatusMessage, setSearchStatusMessage] = useState<string | null>(
    null,
  );
  const [isSearchSubmitting, setIsSearchSubmitting] = useState<boolean>(false);


  const urlInputRef = useRef<HTMLInputElement>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    // Reset mode if initialMode changes (e.g., modal re-opened with different mode by parent)
    setMode(initialMode);
  }, [initialMode]);

  useEffect(() => {
    // Auto-populate question input when mode/primary input changes
    if (isOpen) {
      // Only if modal is intended to be open
      if (mode === 'url' && !urlQuestionInput && urlInput) {
        setUrlQuestionInput(t('defaultWebPullerQuestion'));
      }
    }
  }, [
    urlInput,
    mode,
    t,
    urlQuestionInput,
    isOpen,
  ]);

  // Focus input when modal opens or mode changes
  useEffect(() => {
    if (isOpen) {
      if (mode === 'url' && urlInputRef.current) {
        urlInputRef.current.focus();
      } else if (mode === 'search' && searchInputRef.current) {
        searchInputRef.current.focus();
      }
    }
  }, [isOpen, mode]);




  const handleUrlSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setUrlError(null);
    setUrlStatusMessage(t('webPullerPullingStatusMessage'));
    setIsUrlSubmitting(true);

    try {
      const response = await fetch('/api/v2/web/pull', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url: urlInput }),
      });
      if (!response.ok)
        throw new Error(
          t('errorFailedToFetchUrl') || 'Failed to fetch the URL content',
        );
      const data = await response.json();
      if (data.error) throw new Error(data.error);

      const content = data.content;
      const hash = crypto.createHash('sha256').update(content).digest('hex');
      const blob = new Blob([content], { type: 'text/plain' });
      const urlHostname = new URL(urlInput).hostname;
      const fileName = `web-pull-${urlHostname}_${hash}.txt`;
      const file = new File([blob], fileName, { type: 'text/plain' });

      setUrlStatusMessage(t('webPullerHandlingContentStatusMessage'));
      await onFileUpload(
        [file],
        setSubmitType,
        setFilePreviews,
        setFileFieldValue,
        setImageFieldValue,
        setUploadProgress,
      );
      setTextFieldValue(
        `${urlQuestionInput || t('defaultWebPullerQuestion')}\n\n${t(
          'webPullerCitationPrompt',
        )}: ${urlInput}\n\n${t('webPullerReferencePrompt')}`,
      );
      onClose();

      setUrlInput('');
      setUrlQuestionInput('');
    } catch (error: any) {
      console.error(error);
      setUrlError(
        error.message ||
          t('errorOccurredFetchingUrl') ||
          'An error occurred while fetching the URL content',
      );
    } finally {
      setUrlStatusMessage(null);
      setIsUrlSubmitting(false);
    }
  };

  const handleSearchSubmit = async (
    event: React.FormEvent<HTMLFormElement>,
  ) => {
    event.preventDefault();
    setSearchError(null);
    setIsSearchSubmitting(true);

    try {
      const originalQuery = searchInput;

      // Simply send the search query with forced web search agent
      // The parent component's agentic service will handle:
      // 1. Query optimization
      // 2. Agent execution
      // 3. Response generation with citations
      if (onSend) {
        const userMessage: Message = {
          role: 'user',
          content: originalQuery,
          messageType: MessageType.TEXT,
        };
        // Pass AgentType.WEB_SEARCH as forced agent to ensure web search is used
        onSend(userMessage, null, undefined, AgentType.WEB_SEARCH);
      }

      // Close modal and reset state
      onClose();
      setSearchInput('');
    } catch (error: any) {
      console.error(error);
      setSearchError(
        error.message ||
          t('errorOccurredFetchingSearchResults') ||
          'An error occurred while initiating web search',
      );
    } finally {
      setSearchStatusMessage(null);
      setIsSearchSubmitting(false);
    }
  };

  const isSubmitting = isUrlSubmitting || isSearchSubmitting;

  const renderTabs = () => {
    return (
      <div className="mb-4 flex justify-center border-b border-gray-300 dark:border-gray-600">
        <button
          onClick={() => setMode('search')}
          disabled={isSubmitting}
          className={`px-4 py-2 font-medium ${
            mode === 'search'
              ? 'border-b-2 border-blue-500 text-blue-600 dark:text-blue-400'
              : 'text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200'
          }`}
          aria-pressed={mode === 'search'}
        >
          {t('webSearchModalTitle')}
        </button>
        <button
          onClick={() => setMode('url')}
          disabled={isSubmitting}
          className={`px-4 py-2 font-medium ${
            mode === 'url'
              ? 'border-b-2 border-blue-500 text-blue-600 dark:text-blue-400'
              : 'text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200'
          }`}
          aria-pressed={mode === 'url'}
        >
          {t('chatUrlInputTitle')}
        </button>
      </div>
    );
  };

  const renderUrlForm = () => (
    <form onSubmit={handleUrlSubmit} className={'mt-1'}>
      <div className="space-y-4 py-4">
        <div className="flex flex-col">
          <em className="text-sm text-gray-500 dark:text-gray-400 mb-2 ml-1">
            {t('webUrlInputDescription')}
          </em>
          <div className="flex items-center gap-4">
            <input
              ref={urlInputRef}
              id="url-input"
              type="url"
              value={urlInput}
              onChange={(e) => setUrlInput(e.target.value)}
              placeholder="https://example.com"
              required
              disabled={isSubmitting}
              className="col-span-3 mt-1 w-full p-2 border border-gray-300 dark:border-gray-600 rounded-md text-gray-900 dark:text-white bg-white dark:bg-gray-700"
            />
          </div>
        </div>
        <div className="flex flex-col">
          <em className="text-sm text-gray-500 dark:text-gray-400 mb-1 ml-1">
            {t('webUrlQuestionDescription')}
          </em>
          <div className="flex items-center gap-4">
            <input
              id="url-question-input"
              type="text"
              value={urlQuestionInput}
              onChange={(e) => setUrlQuestionInput(e.target.value)}
              placeholder={t('defaultWebPullerQuestion')}
              disabled={isSubmitting}
              className="col-span-3 mt-1 w-full p-2 border border-gray-300 dark:border-gray-600 rounded-md text-gray-900 dark:text-white bg-white dark:bg-gray-700"
            />
          </div>
        </div>
        {urlError && (
          <p className="text-red-500 text-sm mt-2 col-span-4 text-center">
            {urlError}
          </p>
        )}
        {urlStatusMessage && !isUrlSubmitting && (
          <p className="text-gray-500 text-sm mt-2 col-span-4 text-center animate-pulse">
            {urlStatusMessage}
          </p>
        )}
      </div>
      <button
        type="submit"
        disabled={isSubmitting}
        className="w-full px-4 py-2 mt-4 text-black text-base font-medium border rounded-md shadow border-neutral-500 text-neutral-900 hover:bg-neutral-100 focus:outline-none dark:border-neutral-800 dark:border-opacity-50 dark:bg-white dark:hover:bg-neutral-300 flex items-center justify-center"
      >
        <IconLink className="mr-2 h-4 w-4" />
        {t('submitButton')}
      </button>
    </form>
  );

  const renderSearchForm = () => (
    <form onSubmit={handleSearchSubmit} className={'mt-1'}>
      <div className="space-y-4 py-4">
        <div className="flex flex-col">
          <em className="text-sm text-gray-500 dark:text-gray-400 mb-2 ml-1">
            {t('webSearchInputDescription')}
          </em>
          <div className="relative w-full">
            <IconBrandBing className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
            <input
              id="search-term"
              type="text"
              value={searchInput}
              onChange={(e) => setSearchInput(e.target.value)}
              placeholder={t('searchQueryPlaceholder')}
              required
              disabled={isSubmitting}
              title={t('searchQueryPlaceholder')}
              ref={searchInputRef}
              className="w-full pl-10 pr-2 py-2 border border-gray-300 dark:border-gray-600 rounded-md text-gray-900 dark:text-white bg-white dark:bg-gray-700"
            />
          </div>
        </div>
        {searchError && (
          <p className="text-red-500 text-sm mt-2 text-center" role="alert">
            {searchError}
          </p>
        )}
        {searchStatusMessage && !isSearchSubmitting && (
          <p
            className="text-gray-500 text-sm mt-2 animate-pulse text-center"
            aria-live="polite"
          >
            {searchStatusMessage}
          </p>
        )}
      </div>
      <button
        type="submit"
        disabled={isSubmitting}
        className="w-full px-4 py-2 mt-4 text-black text-base font-medium border rounded-md shadow border-neutral-500 text-neutral-900 hover:bg-neutral-100 focus:outline-none dark:border-neutral-800 dark:border-opacity-50 dark:bg-white dark:hover:bg-neutral-300 flex items-center justify-center"
      >
        <IconSearch className="mr-2 h-4 w-4" />
        {t('submitButton')}
      </button>
    </form>
  );

  const modalContent = (
    <div className="relative">
      {renderTabs()}
      {mode === 'search' && renderSearchForm()}
      {mode === 'url' && renderUrlForm()}

      {isSubmitting && (
        <div
          className="absolute inset-0 flex flex-col items-center justify-center bg-white bg-opacity-75 dark:bg-gray-800 dark:bg-opacity-75"
          aria-live="assertive"
        >
          <svg
            className="animate-spin h-8 w-8 text-blue-600 dark:text-blue-400"
            xmlns="http://www.w3.org/2000/svg"
            fill="none"
            viewBox="0 0 24 24"
            role="img"
            aria-label={t('loadingAriaLabel') || 'Loading'}
          >
            <circle
              className="opacity-25"
              cx="12"
              cy="12"
              r="10"
              stroke="currentColor"
              strokeWidth="4"
            />
            <path
              className="opacity-75"
              fill="currentColor"
              d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"
            />
          </svg>
          {(mode === 'url' ? urlStatusMessage : searchStatusMessage) && (
            <p className="mt-2 text-gray-700 dark:text-gray-200">
              {mode === 'url' ? urlStatusMessage : searchStatusMessage}
            </p>
          )}
        </div>
      )}
    </div>
  );

  if (!isOpen) {
    return null; // Don't render anything if not open
  }

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      size="md"
      className="mx-2"
      betaBadge={<BetaBadge />}
      closeWithButton={true}
      initialFocusRef={mode === 'url' ? urlInputRef : searchInputRef}
    >
      {modalContent}
    </Modal>
  );
};

export default ChatInputSearch;
