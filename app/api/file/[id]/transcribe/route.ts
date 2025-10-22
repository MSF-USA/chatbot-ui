import { Session } from 'next-auth';
import { NextRequest, NextResponse } from 'next/server';

import { createBlobStorageClient } from '@/lib/services/blobStorageFactory';
import { TranscriptionServiceFactory } from '@/lib/services/transcriptionService';

import { getUserIdFromSession } from '@/lib/utils/app/session';

import { auth } from '@/auth';
import fs from 'fs';
import { tmpdir } from 'os';
import { join } from 'path';
import { promisify } from 'util';

const unlinkAsync = promisify(fs.unlink);

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const session: Session | null = await auth();
  if (!session) throw new Error('Failed to pull session!');

  const { id } = await params;

  const { searchParams } = new URL(request.url);
  let transcriptionServiceName: 'whisper' | 'azureCognitiveSpeechService' =
    'whisper';
  const serviceParam = searchParams.get('service');
  // Default to Whisper (Azure OpenAI) for audio transcription
  if (
    serviceParam &&
    ['whisper', 'azureCognitiveSpeechService'].includes(serviceParam)
  ) {
    transcriptionServiceName = serviceParam as
      | 'whisper'
      | 'azureCognitiveSpeechService';
  }

  let transcript: string | undefined;

  try {
    const userId = getUserIdFromSession(session);
    const blobStorageClient = createBlobStorageClient(session);

    const filePath = `${userId}/uploads/files/${id}`;

    // Download the file to a temporary path
    const blockBlobClient = blobStorageClient.getBlockBlobClient(filePath);
    const tmpFilePath = join(tmpdir(), `${Date.now()}_${id}`);
    await blockBlobClient.downloadToFile(tmpFilePath);

    const transcriptionService =
      TranscriptionServiceFactory.getTranscriptionService(
        transcriptionServiceName,
      );

    transcript = await transcriptionService.transcribe(tmpFilePath);

    await unlinkAsync(tmpFilePath);
    // **Delete the blob from Azure Blob Storage**
    await blockBlobClient.delete();

    return NextResponse.json({ transcript });
  } catch (error) {
    console.error('Error during transcription:', error);
    if (transcript) return NextResponse.json({ transcript });
    return NextResponse.json(
      { message: 'Failed to transcribe audio' },
      { status: 500 },
    );
  }
}
