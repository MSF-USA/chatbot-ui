import { NextRequest, NextResponse } from 'next/server';
import { AzureBlobStorage, BlobStorage } from '@/lib/utils/server/blob';
import { getEnvVariable } from '@/lib/utils/app/env';
import Hasher from '@/lib/utils/app/hash';
import { getToken } from 'next-auth/jwt';
import {JWT, Session} from 'next-auth';
import { auth } from '@/auth';

export async function POST(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const filename: string = searchParams.get('filename') as string;
  const filetype: string = searchParams.get('filetype') ?? 'file';
  const mimeType: string | null = searchParams.get('mime');

  if (filetype) {
    const extension = filename.split('.').pop()?.toLowerCase();
    const executableExtensions = ['exe', 'bat', 'cmd', 'sh', 'dll', 'msi', 'jar', 'app'];

    if (extension && executableExtensions.includes(extension)) {
      return NextResponse.json({error: 'Executable files are not allowed'}, {status: 400});
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
        return NextResponse.json({error: 'Invalid file type submitted'}, {status: 400});
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
    // @ts-ignore
    const token: JWT | null = await getToken({ req: request });
    if (!token)
      throw new Error(`Token could not be pulled from request: ${request}`);

    const session: Session | null = await auth();
    if (!session) throw new Error("Failed to pull session!");

    // @ts-ignore
    const userId: string = session?.user?.id ?? token.userId ?? 'anonymous';

    let blobStorageClient: BlobStorage = new AzureBlobStorage(
      getEnvVariable({name: 'AZURE_BLOB_STORAGE_NAME', user: session.user}),
      getEnvVariable({name: 'AZURE_BLOB_STORAGE_KEY', user: session.user}),
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

    const hashedFileContents = Hasher.sha256(data).slice(0, 200);
    const extension: string | undefined = filename.split('.').pop();

    let contentType;
    if(mimeType) {
      contentType = mimeType
    } else if (extension) {
      contentType = getContentType(extension);
    } else {
      contentType = 'application/octet-stream';
    }

    const uploadLocation = filetype === 'image' ? 'images' : 'files';

    let decodedData;
    if (mimeType && mimeType.indexOf('image') > -1 || filetype === 'image')
      decodedData = data
    else
      decodedData = Buffer.from(data, 'base64')

    return await blobStorageClient.upload(
      `${userId}/uploads/${uploadLocation}/${hashedFileContents}.${extension}`,
      decodedData,
      {
        blobHTTPHeaders: {
          blobContentType: contentType,
        },
      }
    );
  };

  const fileData = await request.text();
  const fileURI: string = await uploadFileToBlobStorage(fileData);
  const fileHash: string = fileURI.split('/').pop() ?? fileURI.split('/')[fileURI.split('/').length-1];
  return NextResponse.json({ message: 'File uploaded', uri: fileURI });
}
