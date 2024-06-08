import {NextApiRequest, NextApiResponse} from "next";
import {AzureBlobStorage, BlobProperty, BlobStorage} from "@/utils/server/blob";
import {getEnvVariable} from "@/utils/app/env";

/**
 * Checks if the given identifier is a valid SHA-256 hash.
 *
 * @param {string} id - The identifier to validate.
 * @returns {boolean} True if the identifier is a valid SHA-256 hash, false otherwise.
 */
const isValidSha256Hash = (id: string): boolean => {
  if (typeof id !== 'string') {
    return false;
  }

  const SHA256_HASH_LENGTH: number = 64;
  const VALID_HASH_REGEX: RegExp = /^[0-9a-f]{64}$/;

  return id.length === SHA256_HASH_LENGTH && VALID_HASH_REGEX.test(id);
};


const handler = async (req: NextApiRequest, res: NextApiResponse<any>) => {
    const {id} = req.body;

    if (!isValidSha256Hash(id)) {
      res.status(400).json({ error: 'Invalid file identifier' });
    }

    let blobStorageClient: BlobStorage = new AzureBlobStorage(
      getEnvVariable('AZURE_BLOB_STORAGE_NAME'),
      getEnvVariable('AZURE_BLOB_STORAGE_KEY'),
      getEnvVariable('AZURE_BLOB_STORAGE_FILE_CONTAINER') ?? 'files'
    );

  try {
    const blob: Blob = await (blobStorageClient.get(id, BlobProperty.BLOB) as Promise<Blob>);

    res.setHeader('Content-Type', 'application/octet-stream');
    res.setHeader('Content-Disposition', `attachment; filename=${id}`);
    res.send(blob);
  } catch (error) {
    console.error('Error retrieving blob:', error);
    res.status(500).json({ error: 'Failed to retrieve file' });
  }
}

export default handler;
