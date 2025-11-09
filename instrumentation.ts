/**
 * Next.js 16 Instrumentation with OpenTelemetry
 *
 * This file is automatically loaded by Next.js to set up observability.
 * Exports telemetry data to Azure Monitor Application Insights.
 *
 * @see https://nextjs.org/docs/app/guides/open-telemetry
 */

export async function register() {
  // Only run on Node.js runtime (not Edge)
  // Edge Runtime doesn't support OpenTelemetry NodeSDK
  if (process.env.NEXT_RUNTIME === 'nodejs') {
    const { registerOTel } = await import('@vercel/otel');
    const { AzureMonitorTraceExporter } = await import(
      '@azure/monitor-opentelemetry-exporter'
    );

    const connectionString = process.env.APPLICATIONINSIGHTS_CONNECTION_STRING;

    if (!connectionString) {
      console.warn(
        '[OpenTelemetry] APPLICATIONINSIGHTS_CONNECTION_STRING not set - telemetry disabled',
      );
      return;
    }

    console.log('[OpenTelemetry] Initializing with Azure Monitor...');

    try {
      registerOTel({
        serviceName: process.env.NEXT_PUBLIC_ENV
          ? `msf-ai-assistant-${process.env.NEXT_PUBLIC_ENV}`
          : 'msf-ai-assistant',
        traceExporter: new AzureMonitorTraceExporter({
          connectionString,
        }),
      });

      console.log('[OpenTelemetry] Successfully initialized');
    } catch (error) {
      console.error('[OpenTelemetry] Failed to initialize:', error);
    }
  }
}
