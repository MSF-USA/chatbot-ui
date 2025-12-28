'use client';

import { useCallback, useEffect, useRef, useState } from 'react';

import { useTranslations } from 'next-intl';

import { TRANSCRIPT_EXPIRY_DAYS } from '@/types/transcription';

/**
 * Regex to match blob transcript references.
 * Format: [Transcript: filename | blob:jobId | expires:ISO_TIMESTAMP]
 * Note: Uses case-insensitive hex characters to handle UUID variations.
 */
const BLOB_REFERENCE_REGEX =
  /^\[Transcript:\s*(.+?)\s*\|\s*blob:([a-fA-F0-9-]+)\s*\|\s*expires:(\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d{3})?Z)\]$/;

/** Polling interval in milliseconds */
const POLL_INTERVAL_MS = 3000;

/** Maximum polling attempts (20 minutes at 3s intervals = 400 attempts) */
const MAX_POLL_ATTEMPTS = 400;

interface TranscriptContentProps {
  /** The message content which may be inline text or a blob reference */
  content: string;
  /** Optional className for styling */
  className?: string;
}

interface BlobReference {
  filename: string;
  jobId: string;
  expiresAt: Date;
}

/**
 * Parses a blob reference string.
 * Returns null if the content is not a blob reference.
 */
function parseBlobReference(content: string): BlobReference | null {
  // Trim content before matching to handle whitespace
  const match = content.trim().match(BLOB_REFERENCE_REGEX);
  if (!match) {
    return null;
  }

  return {
    filename: match[1],
    jobId: match[2],
    expiresAt: new Date(match[3]),
  };
}

/**
 * Calculates days until expiration.
 */
function getDaysUntilExpiry(expiresAt: Date): number {
  const now = new Date();
  const diffMs = expiresAt.getTime() - now.getTime();
  return Math.ceil(diffMs / (1000 * 60 * 60 * 24));
}

/**
 * Component that renders transcript content.
 *
 * Handles two types of content:
 * 1. Inline transcripts: Renders the text directly
 * 2. Blob references: Polls API until content loads, with expiration warning
 */
export function TranscriptContent({
  content,
  className = '',
}: TranscriptContentProps) {
  const t = useTranslations('transcription');
  const [loadedContent, setLoadedContent] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [pollCount, setPollCount] = useState(0);

  // Use ref to track if component is mounted (for cleanup)
  const isMountedRef = useRef(true);
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);

  const blobRef = parseBlobReference(content);
  const isExpired = blobRef
    ? getDaysUntilExpiry(blobRef.expiresAt) <= 0
    : false;

  /**
   * Fetches transcript content from blob storage.
   * Returns true if successful, false if should retry.
   */
  const fetchTranscript = useCallback(async (): Promise<boolean> => {
    if (!blobRef) return true; // No blob ref - nothing to fetch

    try {
      const response = await fetch(
        `/api/transcription/content/${blobRef.jobId}`,
      );

      if (response.ok) {
        const responseBody = await response.json();
        const data = responseBody.data || responseBody;
        if (isMountedRef.current) {
          setLoadedContent(data.transcript);
          setIsLoading(false);
          setError(null);
        }
        return true; // Success - stop polling
      }

      if (response.status === 404) {
        // Not found - could be still uploading or expired
        console.log(
          `[TranscriptContent] Blob not found for job ${blobRef.jobId}, will retry`,
        );
        return false; // Retry
      }

      // Other error
      if (isMountedRef.current) {
        setError(t('fetchError'));
        setIsLoading(false);
      }
      return true; // Stop polling on error
    } catch (err) {
      console.error('[TranscriptContent] Fetch error:', err);
      // Network error - retry
      return false;
    }
  }, [blobRef, t]);

  /**
   * Polling effect that fetches transcript and retries if not found.
   */
  useEffect(() => {
    isMountedRef.current = true;

    // Early returns
    if (!blobRef) {
      setIsLoading(false);
      return;
    }

    if (isExpired) {
      setError(t('expiredOrDeleted'));
      setIsLoading(false);
      return;
    }

    if (loadedContent) {
      setIsLoading(false);
      return;
    }

    // Check poll limit
    if (pollCount >= MAX_POLL_ATTEMPTS) {
      setError(t('fetchError'));
      setIsLoading(false);
      return;
    }

    const poll = async () => {
      const success = await fetchTranscript();

      if (!success && isMountedRef.current && pollCount < MAX_POLL_ATTEMPTS) {
        // Schedule next poll
        timeoutRef.current = setTimeout(() => {
          if (isMountedRef.current) {
            setPollCount((c) => c + 1);
          }
        }, POLL_INTERVAL_MS);
      }
    };

    poll();

    return () => {
      isMountedRef.current = false;
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
        timeoutRef.current = null;
      }
    };
  }, [blobRef, fetchTranscript, isExpired, loadedContent, pollCount, t]);

  // Inline content - render directly
  if (!blobRef) {
    return <div className={className}>{content}</div>;
  }

  // Calculate expiration warning
  const daysUntilExpiry = getDaysUntilExpiry(blobRef.expiresAt);
  const showWarning = daysUntilExpiry > 0 && daysUntilExpiry <= 2;

  // Loading state (with poll count indicator for long waits)
  if (isLoading && !loadedContent) {
    return (
      <div className={`${className} text-gray-500 dark:text-gray-400`}>
        <div className="flex items-center gap-2">
          <span className="animate-pulse">
            {t('loadingTranscript', { filename: blobRef.filename })}
            {pollCount > 0 && ` (attempt ${pollCount + 1})`}
          </span>
        </div>
      </div>
    );
  }

  // Error state (expired or fetch failed)
  if (error || isExpired) {
    return (
      <div className={`${className} text-gray-500 dark:text-gray-400`}>
        <div className="rounded-md border border-yellow-200 bg-yellow-50 p-3 dark:border-yellow-800 dark:bg-yellow-900/20">
          <p className="text-sm text-yellow-800 dark:text-yellow-200">
            {isExpired
              ? t('transcriptExpired', {
                  filename: blobRef.filename,
                  days: TRANSCRIPT_EXPIRY_DAYS,
                })
              : error}
          </p>
        </div>
      </div>
    );
  }

  // Loaded content with optional expiration warning
  return (
    <div className={className}>
      {showWarning && (
        <div className="mb-2 rounded-md border border-yellow-200 bg-yellow-50 p-2 dark:border-yellow-800 dark:bg-yellow-900/20">
          <p className="text-xs text-yellow-800 dark:text-yellow-200">
            {t('expirationWarning', {
              filename: blobRef.filename,
              days: daysUntilExpiry,
            })}
          </p>
        </div>
      )}
      <div className="whitespace-pre-wrap">
        [Transcript: {blobRef.filename}]{'\n'}
        {loadedContent}
      </div>
    </div>
  );
}

export default TranscriptContent;
