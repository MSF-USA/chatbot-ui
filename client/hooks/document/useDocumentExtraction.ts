'use client';

import { JSONContent } from '@tiptap/react';
import { useEffect, useRef } from 'react';

import { useChatStore } from '@/client/stores/chatStore';
import { useConversationStore } from '@/client/stores/conversationStore';
import { useDocumentEditorStore } from '@/client/stores/documentEditorStore';

/**
 * Hook to extract Tiptap JSON from chat messages and apply to document editor
 * Supports both structured JSON output and markdown conversion
 */
export function useDocumentExtraction() {
  const { streamingContent, isStreaming } = useChatStore();
  const { selectedConversation } = useConversationStore();
  const { applyAIContent, setDocumentTitle } = useDocumentEditorStore();

  const lastProcessedContent = useRef<string>('');
  const isProcessing = useRef(false);

  useEffect(() => {
    if (isProcessing.current) return;

    const contentToProcess = isStreaming
      ? streamingContent
      : selectedConversation?.messages[selectedConversation.messages.length - 1]
          ?.content;

    if (!contentToProcess || typeof contentToProcess !== 'string') return;
    if (contentToProcess === lastProcessedContent.current) return;

    // Try to extract JSON from code blocks or structured output
    const jsonBlockRegex = /```json\s*\n([\s\S]*?)```/g;
    const matches = [...contentToProcess.matchAll(jsonBlockRegex)];

    if (matches.length > 0) {
      isProcessing.current = true;

      try {
        // Get the last JSON block (most recent)
        const lastMatch = matches[matches.length - 1];
        const jsonString = lastMatch[1].trim();
        const parsedJSON = JSON.parse(jsonString);

        // Validate it's Tiptap-compatible JSON
        if (isTiptapJSON(parsedJSON)) {
          applyAIContent(parsedJSON as JSONContent);

          // Try to extract document title from context
          const titleMatch = contentToProcess.match(
            /(?:title|document|file)[:\s]+[`"]?([^`"\n]+)[`"]?/i,
          );
          if (titleMatch) {
            setDocumentTitle(titleMatch[1].trim());
          }
        }
      } catch (error) {
        console.error('Failed to parse AI document JSON:', error);
      }

      lastProcessedContent.current = contentToProcess;
      isProcessing.current = false;
    } else {
      // Fallback: Try to find inline JSON (structured output without code blocks)
      try {
        // Look for JSON-like structures in the content
        const jsonMatch = contentToProcess.match(
          /\{[^{}]*"type"[^{}]*"doc"[\s\S]*?\}/,
        );
        if (jsonMatch) {
          const parsedJSON = JSON.parse(jsonMatch[0]);
          if (isTiptapJSON(parsedJSON)) {
            isProcessing.current = true;
            applyAIContent(parsedJSON as JSONContent);
            lastProcessedContent.current = contentToProcess;
            isProcessing.current = false;
          }
        }
      } catch (error) {
        // Not valid JSON, ignore
      }
    }
  }, [
    streamingContent,
    isStreaming,
    selectedConversation,
    applyAIContent,
    setDocumentTitle,
  ]);

  return {
    isMonitoring: true,
  };
}

/**
 * Validates if JSON matches Tiptap/ProseMirror schema
 */
function isTiptapJSON(json: any): boolean {
  if (!json || typeof json !== 'object') return false;

  // Must have type 'doc' for root node
  if (json.type !== 'doc') return false;

  // Must have content array
  if (!Array.isArray(json.content)) return false;

  // Basic validation of content nodes
  const hasValidContent = json.content.every((node: any) => {
    return node && typeof node === 'object' && typeof node.type === 'string';
  });

  return hasValidContent;
}
