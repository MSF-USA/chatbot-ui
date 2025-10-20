import { Session } from 'next-auth';
import { NextRequest, NextResponse } from 'next/server';

import { createBlobStorageClient } from '@/lib/services/blobStorageFactory';

import Hasher from '@/lib/utils/app/hash';
import { getUserIdFromSession } from '@/lib/utils/app/session';
import { BlobStorage } from '@/lib/utils/server/blob';

import { auth } from '@/auth';

// Maximum file size: 50MB
const MAX_FILE_SIZE = 50 * 1024 * 1024;

export async function POST(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const filename: string = searchParams.get('filename') as string;
  const filetype: string = searchParams.get('filetype') ?? 'file';
  const mimeType: string | null = searchParams.get('mime');

  if (!filename) {
    return NextResponse.json(
      { error: 'Filename is required' },
      { status: 400 },
    );
  }

  if (filetype) {
    const extension = filename.split('.').pop()?.toLowerCase();
    const executableExtensions = [
      'exe',
      'bat',
      'cmd',
      'sh',
      'dll',
      'msi',
      'jar',
      'app',
    ];

    if (extension && executableExtensions.includes(extension)) {
      return NextResponse.json(
        { error: 'Executable files are not allowed' },
        { status: 400 },
      );
    }

    if (mimeType) {
      const executableMimeTypes = [
        'application/x-msdownload',
        'application/x-msdos-program',
        'application/x-executable',
        'application/x-sharedlib',
        'application/java-archive',
        'application/x-apple-diskimage',
      ];

      if (executableMimeTypes.includes(mimeType)) {
        return NextResponse.json(
          { error: 'Invalid file type submitted' },
          { status: 400 },
        );
      }
    }
  }

  const getContentType = (extension: string): string => {
    switch (extension.toLowerCase().trim()) {
      case 'jpg':
      case 'jpeg':
        return 'image/jpeg';
      case 'png':
        return 'image/png';
      case 'gif':
        return 'image/gif';
      default:
        return 'application/octet-stream';
    }
  };

  const uploadFileToBlobStorage = async (data: string) => {
    const session: Session | null = await auth();
    if (!session) throw new Error('Failed to pull session!');

    const userId = getUserIdFromSession(session);

    const blobStorageClient: BlobStorage = createBlobStorageClient(session);

    const hashedFileContents = Hasher.sha256(data).slice(0, 200);
    const extension: string | undefined = filename.split('.').pop();

    let contentType;
    if (mimeType) {
      contentType = mimeType;
    } else if (extension) {
      contentType = getContentType(extension);
    } else {
      contentType = 'application/octet-stream';
    }

    const uploadLocation = filetype === 'image' ? 'images' : 'files';

    const isImage =
      (mimeType && mimeType.startsWith('image/')) || filetype === 'image';
    const decodedData = isImage ? data : Buffer.from(data, 'base64');

    return await blobStorageClient.upload(
      `${userId}/uploads/${uploadLocation}/${hashedFileContents}.${extension}`,
      decodedData,
      {
        blobHTTPHeaders: {
          blobContentType: contentType,
        },
      },
    );
  };

  try {
    const fileData = await request.text();

    // Check file size
    const fileSize = Buffer.byteLength(fileData);
    if (fileSize > MAX_FILE_SIZE) {
      return NextResponse.json(
        {
          error: `File size exceeds maximum limit of ${MAX_FILE_SIZE / (1024 * 1024)}MB`,
        },
        { status: 413 },
      );
    }

    const fileURI: string = await uploadFileToBlobStorage(fileData);
    return NextResponse.json({ message: 'File uploaded', uri: fileURI });
  } catch (error) {
    console.error('Error uploading file:', error);
    return NextResponse.json(
      {
        error: 'Failed to upload file',
        details: error instanceof Error ? error.message : String(error),
      },
      { status: 500 },
    );
  }
}
