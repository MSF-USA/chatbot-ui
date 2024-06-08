import {NextApiRequest, NextApiResponse} from "next";

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

    res.status(200).json({ message: 'File retrieved successfully', id });
}

export default handler;
