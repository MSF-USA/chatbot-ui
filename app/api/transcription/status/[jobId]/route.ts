/**
 * Transcription Status Polling Endpoint
 *
 * Polls the status of a batch transcription job and returns the transcript
 * when the job is complete.
 *
 * GET /api/transcription/status/[jobId]
 */
import { NextRequest, NextResponse } from 'next/server';

import { BatchTranscriptionService } from '@/lib/services/transcription/batchTranscriptionService';

import {
  errorResponse,
  successResponse,
  unauthorizedResponse,
} from '@/lib/utils/server/apiResponse';

import { auth } from '@/auth';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ jobId: string }> },
) {
  // Verify authentication
  const session = await auth();
  if (!session) {
    return unauthorizedResponse();
  }

  const { jobId } = await params;

  if (!jobId) {
    return NextResponse.json({ error: 'Job ID is required' }, { status: 400 });
  }

  const batchService = new BatchTranscriptionService();

  // Check if service is configured
  if (!batchService.isConfigured()) {
    return errorResponse(
      'Batch transcription service not configured',
      503,
      'AZURE_SPEECH_KEY not set',
    );
  }

  try {
    // Get the current status of the job
    const status = await batchService.getStatus(jobId);

    // If the job succeeded, also fetch the transcript
    if (status.status === 'Succeeded') {
      const transcript = await batchService.getTranscript(jobId);

      // Optionally clean up the job after retrieving results
      // await batchService.deleteTranscription(jobId);

      return successResponse({
        status: status.status,
        transcript,
        createdAt: status.createdDateTime,
        completedAt: status.lastUpdatedDateTime,
      });
    }

    // If the job failed, return error details
    if (status.status === 'Failed') {
      return successResponse({
        status: status.status,
        error: status.error || 'Transcription failed',
        createdAt: status.createdDateTime,
      });
    }

    // Job is still processing
    return successResponse({
      status: status.status,
      createdAt: status.createdDateTime,
      message:
        status.status === 'NotStarted'
          ? 'Transcription job is queued'
          : 'Transcription in progress',
    });
  } catch (error) {
    console.error('Error polling transcription status:', error);
    return errorResponse(
      'Failed to get transcription status',
      500,
      error instanceof Error ? error.message : 'Unknown error',
    );
  }
}
