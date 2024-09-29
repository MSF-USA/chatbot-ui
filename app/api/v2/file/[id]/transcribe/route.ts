import {NextRequest, NextResponse} from 'next/server';
import {AzureBlobStorage, BlobProperty, BlobStorage} from "@/utils/server/blob";
import {getEnvVariable} from "@/utils/app/env";
import {getToken} from "next-auth/jwt";
import {JWT, Session} from "next-auth";
import {getServerSession} from "next-auth/next";
import {authOptions} from "@/pages/api/auth/[...nextauth]";
import {tmpdir} from 'os';
import {join} from 'path';
import ffmpegPath from 'ffmpeg-static';
import ffmpeg from 'fluent-ffmpeg';
import {promises as fs} from 'fs';


if (!ffmpegPath) {
  // pass throw new Error('ffmpeg could not be found');
} else {
  ffmpeg.setFfmpegPath(ffmpegPath);
}

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

    // Get a reference to the blob client
    const blobClient = blobStorageClient.get(filePath, BlobProperty.BLOB);

    // Download the file to a temporary path
    const tmpFilePath = join(tmpdir(), id);
    // await blobClient.downloadToFile(tmpFilePath);

    // Determine if the file is audio or video
    const extension = id.split('.').pop()?.toLowerCase();
    const audioExtensions = ['mp3', 'wav', 'm4a', 'ogg', 'aac', 'flac', 'webm'];
    const videoExtensions = ['mp4', 'mov', 'avi', 'mkv', 'webm'];

    let audioFilePath = tmpFilePath;

    if (extension && videoExtensions.includes(extension)) {
      // Convert video to audio using ffmpeg
      const outputAudioPath = tmpFilePath + '.wav'; // Convert to WAV format
      await new Promise((resolve, reject) => {
        ffmpeg(tmpFilePath)
          .output(outputAudioPath)
          .on('end', () => {
            resolve(true);
          })
          .on('error', (err: any) => {
            reject(err);
          })
          .run();
      });
      audioFilePath = outputAudioPath;
    }

    // Pass the audio file to the transcription service (dummy code)
    // For example, read the file and pretend to transcribe
    const transcript = "Transcribed text goes here.";

    // Clean up temporary files
    await fs.unlink(tmpFilePath);
    if (audioFilePath !== tmpFilePath) {
      await fs.unlink(audioFilePath);
    }

    return NextResponse.json({ transcript });
  } catch (error) {
    console.error('Error during transcription:', error);
    return NextResponse.json({ error: 'Failed to transcribe file' }, { status: 500 });
  }
}
