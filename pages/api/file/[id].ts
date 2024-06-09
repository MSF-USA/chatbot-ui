import {NextApiRequest, NextApiResponse} from "next";
import {AzureBlobStorage, BlobProperty, BlobStorage} from "@/utils/server/blob";
import {getEnvVariable} from "@/utils/app/env";
import {getToken} from "next-auth/jwt";
import {
  BlobSASPermissions,
  generateBlobSASQueryParameters,
  SASProtocol, SASQueryParameters,
  StorageSharedKeyCredential
} from "@azure/storage-blob";

/**
 * Checks if the given identifier is a valid SHA-256 hash.
 *
 * @param {string} id - The identifier to validate.
 * @returns {boolean} True if the identifier is a valid SHA-256 hash, false otherwise.
 */
const isValidSha256Hash = (id: string): boolean => {
  if (typeof id !== 'string' || id.length < 1) {
    return false;
  }
  const idParts: string[] = id.split('.');
  if (idParts.length > 2)
    return false;

  const [idHash, idExtension] = idParts
  if (idExtension.length > 4)
    return false;

  const SHA256_HASH_LENGTH: number = 64;
  const VALID_HASH_REGEX: RegExp = /^[0-9a-f]{64}$/;

  return idHash.length === SHA256_HASH_LENGTH && VALID_HASH_REGEX.test(idHash);
};


const handler = async (req: NextApiRequest, res: NextApiResponse) => {
  const { id } = req.query;

  if (!isValidSha256Hash(id as string)) {
    res.status(400).json({ error: 'Invalid file identifier' });
    return;
  }

  // @ts-ignore
  const token: JWT = await getToken({req});
  const userId: string = token.userId ?? 'anonymous';

  let blobStorageClient: BlobStorage = new AzureBlobStorage(
    getEnvVariable('AZURE_BLOB_STORAGE_NAME'),
    getEnvVariable('AZURE_BLOB_STORAGE_KEY'),
    getEnvVariable('AZURE_BLOB_STORAGE_IMAGE_CONTAINER') ?? 'files'
  );
  const sharedKeyCredential = new StorageSharedKeyCredential(
    getEnvVariable('AZURE_BLOB_STORAGE_NAME'),
    getEnvVariable('AZURE_BLOB_STORAGE_KEY'),
  );

  try {
    const blobLocation: string = `${userId}/uploads/images/${id}`
    const blob: Buffer = await (blobStorageClient.get(blobLocation, BlobProperty.BLOB) as Promise<Buffer>);

    const base64String: string = blob.toString();

    res.status(200).json({ base64Url: base64String });
  } catch (error) {
    console.error('Error retrieving blob:', error);
    res.status(500).json({ error: 'Failed to retrieve file' });
  }
};

export default handler;
