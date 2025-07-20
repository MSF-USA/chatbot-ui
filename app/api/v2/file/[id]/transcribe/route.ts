import { JWT, Session } from 'next-auth';
import { getToken } from 'next-auth/jwt';
import { getServerSession } from 'next-auth/next';
import { NextRequest, NextResponse } from 'next/server';

import { TranscriptionServiceFactory } from '@/services/transcriptionService';

import { getEnvVariable } from '@/utils/app/env';
import {
  AzureBlobStorage,
  BlobProperty,
  BlobStorage,
} from '@/utils/server/blob';

import { authOptions } from '@/pages/api/auth/[...nextauth]';

import fs from 'fs';
import { tmpdir } from 'os';
import { join } from 'path';
import { promisify } from 'util';

const unlinkAsync = promisify(fs.unlink);

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  // @ts-ignore
  const token: JWT | null = await getToken({ req: request });
  if (!token)
    throw new Error(`Token could not be pulled from request: ${request}`);

  const session: Session | null = await getServerSession(authOptions as any);
  if (!session) throw new Error('Failed to pull session!');

  const { id } = await params;

  const { searchParams } = new URL(request.url);
  let transcriptionServiceName: 'whisper' | 'azureCognitiveSpeechService' = 'azureCognitiveSpeechService';
  const serviceParam = searchParams.get('service');
  if (
    serviceParam &&
    ['whisper', 'azureCognitiveSpeechService'].includes(serviceParam)
  ) {
    transcriptionServiceName = serviceParam as 'whisper' | 'azureCognitiveSpeechService';
  }

  let transcript: string | undefined;

  try {
    const userId: string =
      (session.user as any)?.id ?? (token as any)?.userId ?? 'anonymous';

    let blobStorageClient: BlobStorage = new AzureBlobStorage(
      getEnvVariable({ name: 'AZURE_BLOB_STORAGE_NAME', user: session.user }),
      getEnvVariable({ name: 'AZURE_BLOB_STORAGE_KEY', user: session.user }),
      getEnvVariable({
        name: 'AZURE_BLOB_STORAGE_CONTAINER',
        throwErrorOnFail: false,
        defaultValue: process.env.AZURE_BLOB_STORAGE_IMAGE_CONTAINER ?? '',
        user: session.user,
      }),
      session.user,
    );

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

    unlinkAsync(tmpFilePath);
    // **Delete the blob from Azure Blob Storage**
    blockBlobClient.delete();

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
