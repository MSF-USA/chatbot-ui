/**
 * Hook for polling batch transcription job status.
 *
 * This hook automatically polls the transcription status endpoint for any
 * pending batch transcription jobs and updates the store when they complete.
 *
 * Handles two types of transcription jobs:
 * 1. Pre-submit jobs (from chatInputStore.pendingTranscriptions) - tracked before message is sent
 * 2. Post-submit jobs (from chatStore.pendingConversationTranscription) - for large files (>25MB)
 *    that are submitted and tracked after the message is already in the conversation
 *
 * Polling intervals increase over time:
 * - 0-10s: every 2 seconds
 * - 10-60s: every 5 seconds
 * - 1-5min: every 15 seconds
 * - 5min+: every 30 seconds
 */
import { useCallback, useEffect, useRef } from 'react';
import toast from 'react-hot-toast';

import { generateConversationTitle } from '@/client/services/titleService';

import { BatchTranscriptionStatusResponse } from '@/types/transcription';

import { useChatInputStore } from '@/client/stores/chatInputStore';
import { useChatStore } from '@/client/stores/chatStore';
import { useConversationStore } from '@/client/stores/conversationStore';

/** Polling intervals in milliseconds */
const POLL_INTERVALS = {
  INITIAL: 2000, // 2 seconds
  SHORT: 5000, // 5 seconds
  MEDIUM: 15000, // 15 seconds
  LONG: 30000, // 30 seconds
} as const;

/** Time thresholds for interval changes (in milliseconds) */
const INTERVAL_THRESHOLDS = {
  SHORT: 10000, // 10 seconds
  MEDIUM: 60000, // 1 minute
  LONG: 300000, // 5 minutes
} as const;

/**
 * Determines the appropriate polling interval based on elapsed time.
 *
 * @param elapsedMs - Time elapsed since the job started
 * @returns The polling interval in milliseconds
 */
function getPollingInterval(elapsedMs: number): number {
  if (elapsedMs < INTERVAL_THRESHOLDS.SHORT) {
    return POLL_INTERVALS.INITIAL;
  }
  if (elapsedMs < INTERVAL_THRESHOLDS.MEDIUM) {
    return POLL_INTERVALS.SHORT;
  }
  if (elapsedMs < INTERVAL_THRESHOLDS.LONG) {
    return POLL_INTERVALS.MEDIUM;
  }
  return POLL_INTERVALS.LONG;
}

/**
 * Hook that polls for batch transcription job status.
 *
 * Call this hook in a component that needs to track transcription progress.
 * It will automatically start polling when there are pending jobs and stop
 * when all jobs are complete or failed.
 */
/** Maximum time to wait for transcription (10 minutes) */
const MAX_TRANSCRIPTION_TIME_MS = 10 * 60 * 1000;

export function useTranscriptionPolling(): void {
  // Pre-submit transcription tracking (chatInputStore)
  const pendingTranscriptions = useChatInputStore(
    (state) => state.pendingTranscriptions,
  );
  const updateTranscriptionStatus = useChatInputStore(
    (state) => state.updateTranscriptionStatus,
  );
  const removePendingTranscription = useChatInputStore(
    (state) => state.removePendingTranscription,
  );
  const setTextFieldValue = useChatInputStore(
    (state) => state.setTextFieldValue,
  );
  const setFilePreviews = useChatInputStore((state) => state.setFilePreviews);

  // Post-submit transcription tracking (chatStore - for large files >25MB)
  const pendingConversationTranscription = useChatStore(
    (state) => state.pendingConversationTranscription,
  );
  const setConversationTranscriptionPending = useChatStore(
    (state) => state.setConversationTranscriptionPending,
  );

  // Conversation store for updating messages
  const updateMessageWithTranscript = useConversationStore(
    (state) => state.updateMessageWithTranscript,
  );
  const conversations = useConversationStore((state) => state.conversations);
  const updateConversation = useConversationStore(
    (state) => state.updateConversation,
  );

  const timeoutRef = useRef<NodeJS.Timeout | null>(null);
  const isPollingRef = useRef(false);

  /**
   * Polls the status of all active transcription jobs.
   */
  const pollJobs = useCallback(async () => {
    if (isPollingRef.current) return;
    isPollingRef.current = true;

    try {
      const activeJobs = Array.from(pendingTranscriptions.entries()).filter(
        ([, job]) => job.status === 'pending' || job.status === 'processing',
      );

      if (activeJobs.length === 0) {
        isPollingRef.current = false;
        return;
      }

      for (const [fileId, job] of activeJobs) {
        try {
          const response = await fetch(
            `/api/transcription/status/${job.jobId}`,
          );

          if (!response.ok) {
            console.error(
              `Failed to poll job ${job.jobId}: ${response.status}`,
            );
            continue;
          }

          const data: BatchTranscriptionStatusResponse = await response.json();

          // Handle success case
          if (data.status === 'Succeeded' && data.transcript) {
            updateTranscriptionStatus(fileId, 'completed');

            // Update file preview status
            setFilePreviews((prev) =>
              prev.map((p) =>
                p.transcriptionJobId === job.jobId
                  ? { ...p, transcriptionStatus: 'completed' }
                  : p,
              ),
            );

            // Append transcript to text field
            setTextFieldValue((prev) =>
              prev
                ? `${prev}\n\n[Transcript: ${job.filename}]\n${data.transcript}`
                : data.transcript || '',
            );

            toast.success(`Transcription complete: ${job.filename}`, {
              duration: 4000,
            });

            // Remove from pending after a short delay
            setTimeout(() => {
              removePendingTranscription(fileId);
            }, 1000);
          }
          // Handle failure case
          else if (data.status === 'Failed') {
            updateTranscriptionStatus(fileId, 'failed');

            // Update file preview status
            setFilePreviews((prev) =>
              prev.map((p) =>
                p.transcriptionJobId === job.jobId
                  ? { ...p, transcriptionStatus: 'failed' }
                  : p,
              ),
            );

            toast.error(
              `Transcription failed: ${job.filename}${data.error ? ` - ${data.error}` : ''}`,
              { duration: 5000 },
            );
          }
          // Handle running case - update to processing if not already
          else if (data.status === 'Running' && job.status === 'pending') {
            updateTranscriptionStatus(fileId, 'processing');

            // Update file preview status
            setFilePreviews((prev) =>
              prev.map((p) =>
                p.transcriptionJobId === job.jobId
                  ? { ...p, transcriptionStatus: 'processing' }
                  : p,
              ),
            );
          }
        } catch (error) {
          console.error(`Error polling job ${job.jobId}:`, error);
        }
      }
    } finally {
      isPollingRef.current = false;
    }

    // Schedule next poll if there are still active jobs
    const stillActiveJobs = Array.from(pendingTranscriptions.entries()).filter(
      ([, job]) => job.status === 'pending' || job.status === 'processing',
    );

    if (stillActiveJobs.length > 0) {
      // Find the oldest job to determine polling interval
      const oldestStartTime = Math.min(
        ...stillActiveJobs.map(([, job]) => job.startedAt),
      );
      const elapsedMs = Date.now() - oldestStartTime;
      const interval = getPollingInterval(elapsedMs);

      timeoutRef.current = setTimeout(pollJobs, interval);
    }
  }, [
    pendingTranscriptions,
    updateTranscriptionStatus,
    removePendingTranscription,
    setTextFieldValue,
    setFilePreviews,
  ]);

  // Start/stop polling based on pending transcriptions
  useEffect(() => {
    const hasActiveJobs = Array.from(pendingTranscriptions.values()).some(
      (job) => job.status === 'pending' || job.status === 'processing',
    );

    if (hasActiveJobs && !timeoutRef.current) {
      // Start polling
      pollJobs();
    }

    // Cleanup on unmount
    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
        timeoutRef.current = null;
      }
    };
  }, [pendingTranscriptions, pollJobs]);
}

export default useTranscriptionPolling;
