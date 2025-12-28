'use client';

import { useEffect, useState } from 'react';

import { useTranslations } from 'next-intl';

import { TRANSCRIPT_EXPIRY_DAYS } from '@/types/transcription';

/**
 * Regex to match blob transcript references.
 * Format: [Transcript: filename | blob:jobId | expires:ISO_TIMESTAMP]
 */
const BLOB_REFERENCE_REGEX =
  /^\[Transcript:\s*(.+?)\s*\|\s*blob:([a-f0-9-]+)\s*\|\s*expires:(\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d{3})?Z)\]$/;

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
  const match = content.match(BLOB_REFERENCE_REGEX);
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
 * 2. Blob references: Fetches content from API and displays with expiration warning
 */
export function TranscriptContent({
  content,
  className = '',
}: TranscriptContentProps) {
  const t = useTranslations('transcription');
  const [loadedContent, setLoadedContent] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const blobRef = parseBlobReference(content);

  useEffect(() => {
    if (!blobRef) {
      return;
    }

    const fetchTranscript = async () => {
      setIsLoading(true);
      setError(null);

      try {
        const response = await fetch(
          `/api/transcription/content/${blobRef.jobId}`,
        );

        if (!response.ok) {
          if (response.status === 404) {
            setError(t('expiredOrDeleted'));
          } else {
            setError(t('fetchError'));
          }
          return;
        }

        const responseBody = await response.json();
        const data = responseBody.data || responseBody;
        setLoadedContent(data.transcript);
      } catch (err) {
        console.error('[TranscriptContent] Failed to fetch transcript:', err);
        setError(t('fetchError'));
      } finally {
        setIsLoading(false);
      }
    };

    fetchTranscript();
  }, [blobRef?.jobId, t]);

  // Inline content - render directly
  if (!blobRef) {
    return <div className={className}>{content}</div>;
  }

  // Calculate expiration warning
  const daysUntilExpiry = getDaysUntilExpiry(blobRef.expiresAt);
  const isExpired = daysUntilExpiry <= 0;
  const showWarning = daysUntilExpiry > 0 && daysUntilExpiry <= 2;

  // Loading state
  if (isLoading) {
    return (
      <div className={`${className} text-gray-500 dark:text-gray-400`}>
        <div className="flex items-center gap-2">
          <span className="animate-pulse">
            {t('loadingTranscript', { filename: blobRef.filename })}
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
