'use client';

import { useSession } from 'next-auth/react';
import { useEffect, useRef, useState } from 'react';

import { useTranslations } from 'next-intl';

import { useChat } from '@/client/hooks/chat/useChat';
import { useChatActions } from '@/client/hooks/chat/useChatActions';
import { useChatScrolling } from '@/client/hooks/chat/useChatScrolling';
import { useConversationInitialization } from '@/client/hooks/chat/useConversationInitialization';
import { usePromptSaving } from '@/client/hooks/chat/usePromptSaving';
import { useConversations } from '@/client/hooks/conversation/useConversations';
import { useSettings } from '@/client/hooks/settings/useSettings';
import { useAutoDismissError } from '@/client/hooks/ui/useAutoDismissError';
import { useModalState } from '@/client/hooks/ui/useModalSync';
import { useUI } from '@/client/hooks/ui/useUI';

import { OpenAIModelID, OpenAIModels } from '@/types/openai';

import { PromptModal } from '@/components/Prompts/PromptModal';

import { ChatError } from './ChatError';
import { ChatInput } from './ChatInput';
import { ChatMessages } from './ChatMessages';
import { ChatTopbar } from './ChatTopbar';
import { EmptyState } from './EmptyState/EmptyState';
import { SuggestedPrompts } from './EmptyState/SuggestedPrompts';
import { LoadingScreen } from './LoadingScreen';
import { ModelSelect } from './ModelSelect';

interface ChatProps {
  mobileModelSelectOpen?: boolean;
  onMobileModelSelectChange?: (open: boolean) => void;
}

/**
 * Main chat component
 */
export function Chat({
  mobileModelSelectOpen,
  onMobileModelSelectChange,
}: ChatProps = {}) {
  const t = useTranslations();
  const { data: session, status } = useSession();
  const {
    selectedConversation,
    updateConversation,
    conversations,
    addConversation,
    selectConversation,
    isLoaded,
  } = useConversations();
  const {
    isStreaming,
    streamingContent,
    streamingConversationId,
    error,
    sendMessage,
    citations,
    clearError,
    loadingMessage,
  } = useChat();
  const { isSettingsOpen, setIsSettingsOpen, showChatbar } = useUI();
  const { models, defaultModelId, systemPrompt, temperature, addPrompt } =
    useSettings();

  // Transcription state (local to Chat component)
  const [transcriptionStatus, setTranscriptionStatus] = useState<string | null>(
    null,
  );
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const stopConversationRef = useRef<boolean>(false);

  // Modal state
  const [isModelSelectOpen, setIsModelSelectOpen] = useModalState(
    mobileModelSelectOpen,
    false,
    onMobileModelSelectChange,
  );

  // Custom hooks for state management
  const {
    messagesEndRef,
    chatContainerRef,
    lastMessageRef,
    showScrollDownButton,
    handleScrollDown,
  } = useChatScrolling({
    selectedConversationId: selectedConversation?.id,
    messageCount: selectedConversation?.messages?.length || 0,
    isStreaming,
    streamingContent,
  });

  const {
    handleClearAll,
    handleEditMessage,
    handleSend,
    handleSelectPrompt,
    handleRegenerate,
  } = useChatActions({
    updateConversation,
    sendMessage,
  });

  const {
    isSavePromptModalOpen,
    savePromptContent,
    savePromptName,
    savePromptDescription,
    handleOpenSavePromptModal,
    handleSavePrompt,
    handleCloseSavePromptModal,
  } = usePromptSaving({
    models,
    defaultModelId,
    addPrompt,
  });

  useConversationInitialization({
    isLoaded,
    models,
    conversations,
    selectedConversation,
    defaultModelId,
    systemPrompt: systemPrompt || '',
    temperature: temperature || 0.5,
    addConversation,
    selectConversation,
  });

  // Close modal on ESC key
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isModelSelectOpen) {
        setIsModelSelectOpen(false);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
    // setIsModelSelectOpen is a stable setState function and doesn't need to be a dependency
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isModelSelectOpen]);

  useAutoDismissError(error, clearError, 10000);

  const messages = selectedConversation?.messages || [];
  const hasMessages =
    messages.length > 0 ||
    (isStreaming && streamingConversationId === selectedConversation?.id);

  // Show loading screen until session and data are fully loaded
  // This prevents UI flickering during initialization
  if (status === 'loading' || !isLoaded || models.length === 0) {
    return <LoadingScreen />;
  }

  return (
    <div className="relative flex h-full w-full flex-col overflow-x-hidden bg-white dark:bg-[#212121] transition-all">
      {/* Header - Hidden on mobile, shown on desktop */}
      <div className="hidden md:block">
        <ChatTopbar
          botInfo={null}
          selectedModelName={
            selectedConversation?.model?.name ||
            models.find((m) => m.id === defaultModelId)?.name ||
            'GPT-4o'
          }
          selectedModelProvider={
            OpenAIModels[selectedConversation?.model?.id as OpenAIModelID]
              ?.provider ||
            models.find((m) => m.id === defaultModelId)?.provider
          }
          selectedModelId={selectedConversation?.model?.id}
          isCustomAgent={selectedConversation?.model?.isCustomAgent}
          showSettings={isSettingsOpen}
          onSettingsClick={() => setIsSettingsOpen(!isSettingsOpen)}
          onModelClick={() => setIsModelSelectOpen(true)}
          onClearAll={handleClearAll}
          hasMessages={hasMessages}
          searchMode={selectedConversation?.defaultSearchMode}
          showChatbar={showChatbar}
        />
      </div>

      {/* Empty state with centered input */}
      {!hasMessages ? (
        <div className="flex-1 flex flex-col items-center justify-center px-4 py-8">
          <div className="w-full flex flex-col items-center justify-center gap-6 -translate-y-12">
            {/* Logo and Heading */}
            <EmptyState
              userName={
                session?.user?.givenName ||
                session?.user?.displayName?.split(' ')[0]
              }
            />

            {/* Centered Chat Input */}
            <div className="w-full max-w-3xl relative z-50">
              <ChatInput
                onSend={handleSend}
                onRegenerate={handleRegenerate}
                onScrollDownClick={handleScrollDown}
                stopConversationRef={stopConversationRef}
                textareaRef={textareaRef}
                showScrollDownButton={false}
                showDisclaimer={false}
                onTranscriptionStatusChange={setTranscriptionStatus}
              />
            </div>

            {/* Suggested Prompts below input */}
            <div className="relative z-10">
              <SuggestedPrompts onSelectPrompt={handleSelectPrompt} />
            </div>
          </div>
        </div>
      ) : (
        <>
          {/* Messages */}
          <div ref={chatContainerRef} className="flex-1 overflow-y-auto">
            <div className="mx-auto max-w-3xl pb-4">
              <ChatMessages
                messages={messages}
                isStreaming={isStreaming}
                streamingConversationId={streamingConversationId}
                selectedConversationId={selectedConversation?.id}
                streamingContent={streamingContent}
                citations={citations}
                loadingMessage={loadingMessage}
                transcriptionStatus={transcriptionStatus}
                lastMessageRef={lastMessageRef}
                messagesEndRef={messagesEndRef}
                onEditMessage={handleEditMessage}
                onSelectPrompt={handleSelectPrompt}
                onRegenerate={handleRegenerate}
                onSaveAsPrompt={handleOpenSavePromptModal}
              />
            </div>
          </div>

          {/* Error Display */}
          <ChatError error={error} onClearError={clearError} />

          {/* Chat Input - Bottom position */}
          <ChatInput
            onSend={handleSend}
            onRegenerate={handleRegenerate}
            onScrollDownClick={handleScrollDown}
            stopConversationRef={stopConversationRef}
            textareaRef={textareaRef}
            showScrollDownButton={showScrollDownButton}
            onTranscriptionStatusChange={setTranscriptionStatus}
          />
        </>
      )}

      {/* Model Selection Modal */}
      {isModelSelectOpen && (
        <div
          className="fixed inset-0 flex items-center justify-center bg-black/50 backdrop-blur-sm z-[150] animate-fade-in-fast"
          onClick={() => setIsModelSelectOpen(false)}
        >
          <div
            className="max-w-4xl w-full max-h-[90vh] overflow-y-auto mx-4 rounded-lg bg-white dark:bg-[#212121] p-6 shadow-xl animate-modal-in"
            onClick={(e) => e.stopPropagation()}
          >
            <ModelSelect onClose={() => setIsModelSelectOpen(false)} />
          </div>
        </div>
      )}

      {/* Save Prompt Modal */}
      <PromptModal
        isOpen={isSavePromptModalOpen}
        onClose={handleCloseSavePromptModal}
        onSave={handleSavePrompt}
        initialName={savePromptName}
        initialDescription={savePromptDescription}
        initialContent={savePromptContent}
        title={t('Save as prompt')}
      />
    </div>
  );
}
