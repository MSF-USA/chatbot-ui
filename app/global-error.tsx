'use client';

import { useEffect } from 'react';

import { ErrorDisplay } from '@/components/ErrorBoundary/ErrorDisplay';

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error('Global error:', error);
  }, [error]);

  return (
    <html lang="en">
      <body>
        <ErrorDisplay
          error={error}
          title="Application Error"
          description="A critical error occurred. Please reload the page."
          onRetry={() => window.location.reload()}
          retryLabel="Reload page"
          showSupportInfo={true}
        />
      </body>
    </html>
  );
}
