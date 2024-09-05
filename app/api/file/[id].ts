import { NextApiRequest, NextApiResponse } from 'next';
import { Session } from 'next-auth';
import { getToken } from 'next-auth/jwt';
import { getServerSession } from 'next-auth/next';

import {
  AzureBlobStorage,
  BlobProperty,
  getBlobBase64String,
} from '@/utils/server/blob';

import { authOptions } from '@/app/api/auth/[...nextauth]';

/**
 * Checks if the given identifier is a valid SHA-256 hash.
 *
 * @param {string} id - The identifier to validate.
 * @returns {boolean} True if the identifier is a valid SHA-256 hash, false otherwise.
 */
const isValidSha256Hash = (id: string | string[] | undefined): boolean => {
  if (typeof id !== 'string' || id.length < 1) {
    console.error(
      `Invalid id type '${typeof id}' for object: ${JSON.stringify(id)}`,
    );
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

const handler = async (req: NextApiRequest, res: NextApiResponse) => {
  const { id, filetype: requestedFileType } = req.query;

  if (!isValidSha256Hash(id)) {
    res.status(400).json({ error: 'Invalid file identifier' });
    return;
  }

  let fileType: 'image' | 'file' = 'file';
  if (requestedFileType === 'image' || requestedFileType === 'file') {
    fileType = requestedFileType;
  }

  // @ts-ignore
  const token: JWT = await getToken({ req });
  const session: Session | null = await getServerSession(authOptions as any);
  if (!session) throw new Error('Failed to pull session!');

  // @ts-ignore
  const userId: string = token.userId ?? session?.user?.id ?? 'anonymous';
  const remoteFilepath = `${userId}/uploads/${fileType}s`;

  try {
    if (fileType === 'image') {
      const base64String: string = await getBlobBase64String(
        userId,
        id as string,
      );

      res.status(200).json({ base64Url: base64String });
    } else if (fileType === 'file') {
      const blobStorage = new AzureBlobStorage();
      const blob: Buffer = await (blobStorage.get(
        `${remoteFilepath}/${id}`,
        BlobProperty.BLOB,
      ) as Promise<Buffer>);
      res.status(200).send(blob.toString());
    } else {
      throw new Error(`Invalid fileType requested: ${fileType}`);
    }
  } catch (error) {
    console.error('Error retrieving blob:', error);
    res.setHeader('Cache-Control', 's-maxage=43200, stale-while-revalidate');
    res.status(500).json({ error: 'Failed to retrieve file' });
  }
};

export default handler;
