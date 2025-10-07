import { NextRequest, NextResponse } from 'next/server';
import { AzureBlobStorage, BlobProperty, getBlobBase64String } from '@/lib/utils/server/blob';
import { getToken } from 'next-auth/jwt';
import {Session} from "next-auth";
import {auth} from "@/auth";
import {getEnvVariable} from "@/lib/utils/app/env";

const isValidSha256Hash = (id: string | string[] | undefined): boolean => {
  if (typeof id !== 'string' || id.length < 1) {
    console.error(`Invalid id type '${typeof id}' for object: ${JSON.stringify(id)}`);
    return false;
  }
  const idParts: string[] = id.split('.');
  if (idParts.length > 2) return false;

  const [idHash, idExtension] = idParts;
  if (idExtension.length > 4) return false;

  const SHA256_HASH_LENGTH: number = 64;
  const VALID_HASH_REGEX: RegExp = /^[0-9a-f]{64}$/;

  return idHash.length === SHA256_HASH_LENGTH && VALID_HASH_REGEX.test(idHash);
};

export async function GET(
    request: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const { searchParams } = new URL(request.url);
  const requestedFileType = searchParams.get('filetype');


  if (!isValidSha256Hash(id)) {
    return NextResponse.json({ error: 'Invalid file identifier' }, { status: 400 });
  }

  let fileType: 'image' | 'file' = 'file';
  if (requestedFileType === 'image' || requestedFileType === 'file') {
    fileType = requestedFileType;
  }

  // @ts-ignore
  const token: JWT = await getToken({ req: request });
  const session: Session | null = await auth();
  if (!session) throw new Error("Failed to pull session!");

  // @ts-ignore
  const userId: string = session?.user?.id ?? token.userId ?? 'anonymous';
  const remoteFilepath = `${userId}/uploads/${fileType}s`;

  try {
    if (fileType === 'image') {
      const base64String: string = await getBlobBase64String(
        userId, id as string,
        undefined,
        session.user
      );
      return NextResponse.json({ base64Url: base64String });
    } else if (fileType === 'file') {
      const blobStorage = new AzureBlobStorage(
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
      const blob: Buffer = await (blobStorage.get(`${remoteFilepath}/${id}`, BlobProperty.BLOB) as Promise<Buffer>);
      return new NextResponse(blob);
    } else {
      throw new Error(`Invalid fileType requested: ${fileType}`);
    }
  } catch (error) {
    console.error('Error retrieving blob:', error);
    return NextResponse.json({ error: 'Failed to retrieve file' }, { status: 500, headers: { 'Cache-Control': 's-maxage=43200, stale-while-revalidate' } });
  }
}
