import {NextRequest, NextResponse} from 'next/server';
import {AzureBlobStorage, BlobProperty, BlobStorage} from '@/utils/server/blob';
import {getEnvVariable} from '@/utils/app/env';
import {getToken} from 'next-auth/jwt';
import {JWT, Session} from 'next-auth';
import {getServerSession} from 'next-auth/next';
import {authOptions} from '@/pages/api/auth/[...nextauth]';
import {tmpdir} from 'os';
import {join} from 'path';
import fs from "fs";
import TranscriptionService from "@/services/transcriptionService";
import {promisify} from "util";

const unlinkAsync = promisify(fs.unlink);

export async function GET(request: NextRequest, { params }: { params: { id: string } }) {

  const { id } = params;

  try {
    // Get the session and user ID
    // @ts-ignore
    const token: JWT | null = await getToken({ req: request as any });
    if (!token)
      throw new Error(`Token could not be pulled from request: ${request}`);

    const session: Session | null = await getServerSession(authOptions as any);
    if (!session) throw new Error("Failed to pull session!");

    // @ts-ignore
    const userId: string = (session.user as any)?.id ?? token.userId ?? 'anonymous';

    // Initialize blob storage client
    let blobStorageClient: BlobStorage = new AzureBlobStorage(
      getEnvVariable({ name: 'AZURE_BLOB_STORAGE_NAME', user: session.user }),
      getEnvVariable({ name: 'AZURE_BLOB_STORAGE_KEY', user: session.user }),
      getEnvVariable(
        {
          name: 'AZURE_BLOB_STORAGE_CONTAINER',
          throwErrorOnFail: false,
          defaultValue: process.env.AZURE_BLOB_STORAGE_IMAGE_CONTAINER ?? '',
          user: session.user
        }
      ),
      session.user
    );

    // Construct file path
    const filePath = `${userId}/uploads/files/${id}`;

    // Download the file to a temporary path
    const blockBlobClient = blobStorageClient.getBlockBlobClient(filePath);
    const tmpFilePath = join(tmpdir(), `${Date.now()}_${id}`);
    await blockBlobClient.downloadToFile(tmpFilePath);

    // Initialize the TranscriptionService
    const transcriptionService = new TranscriptionService();

    // Transcribe the file
    const transcript = await transcriptionService.transcribe(tmpFilePath);

    // Clean up temporary files
    await unlinkAsync(tmpFilePath);

    // Clean up temporary files
    await fs.unlink(tmpFilePath, ()=>null);

    return NextResponse.json({ transcript });
  } catch (error) {
    console.error('Error during transcription:', error);
    return NextResponse.json({ error: 'Failed to transcribe file' }, { status: 500 });
  }
  // return NextResponse.json({ error: 'Failed to transcribe file' }, { status: 500 });
}
