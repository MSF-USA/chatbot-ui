'use client';

import { useEffect } from 'react';

import { ErrorDisplay } from '@/components/ErrorBoundary/ErrorDisplay';

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error('Page error:', error);
  }, [error]);

  return (
    <ErrorDisplay
      error={error}
      title="Something went wrong"
      description="An unexpected error occurred"
      onRetry={reset}
      retryLabel="Try again"
      showSupportInfo={true}
    />
  );
}
