import { NextRequest, NextResponse } from 'next/server';

import { getAzureMonitorLogger } from '@/lib/services/observability';

import { auth } from '@/auth';
import HTMLtoDOCX from 'html-to-docx';

/**
 * POST /api/export/docx
 * Converts HTML to DOCX on the server-side
 */
export async function POST(request: NextRequest) {
  const logger = getAzureMonitorLogger();
  const startTime = Date.now();

  // Check authentication
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const { html } = await request.json();

    if (!html || typeof html !== 'string') {
      return NextResponse.json(
        { error: 'Invalid HTML content' },
        { status: 400 },
      );
    }

    // Convert HTML to DOCX
    const docxBlob = await HTMLtoDOCX(html, null, {
      table: { row: { cantSplit: true } },
      footer: true,
      pageNumber: true,
    });

    // Log success
    const duration = Date.now() - startTime;
    void logger.logDocumentExportSuccess({
      user: session.user,
      format: 'docx',
      contentLength: html.length,
      duration,
    });

    // Return DOCX file as response
    return new NextResponse(docxBlob, {
      status: 200,
      headers: {
        'Content-Type':
          'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
        'Content-Disposition': 'attachment; filename="document.docx"',
      },
    });
  } catch (error) {
    console.error('Error converting HTML to DOCX:', error);

    // Log error
    void logger.logDocumentExportError({
      user: session.user,
      format: 'docx',
      errorCode: 'DOCX_CONVERSION_ERROR',
      errorMessage: error instanceof Error ? error.message : 'Unknown error',
    });

    return NextResponse.json(
      { error: 'Failed to convert to DOCX' },
      { status: 500 },
    );
  }
}
