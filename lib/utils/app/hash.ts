import { createHash } from 'crypto';

/**
 * Computes SHA-256 hash of the input.
 *
 * @param input - String or Buffer to hash. Buffers are hashed directly
 *                without encoding, which is more efficient for large files
 *                and avoids V8's string length limit (~512MB).
 * @returns Hexadecimal hash string
 */
export default class Hasher {
  static sha256(input: string | Buffer): string {
    return createHash('sha256').update(input).digest('hex');
  }
}
