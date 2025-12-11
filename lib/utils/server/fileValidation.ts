/**
 * File validation utilities using magic byte signatures.
 * Provides robust file type validation by checking actual file content,
 * not just extension or MIME type which can be spoofed.
 */

/**
 * Magic byte signatures for supported audio/video formats.
 * Each signature includes the byte pattern and optional offset.
 */
export interface MagicSignature {
  bytes: (number | null)[]; // null means any byte at that position
  offset?: number; // byte offset to start checking (default 0)
  mask?: number[]; // optional mask for partial byte matching
}

export interface FileTypeSignature {
  type: 'audio' | 'video';
  format: string;
  signatures: MagicSignature[];
  mimeTypes: string[];
  extensions: string[];
}

/**
 * Comprehensive magic byte signatures for audio/video formats.
 * Sources: https://en.wikipedia.org/wiki/List_of_file_signatures
 */
export const FILE_SIGNATURES: FileTypeSignature[] = [
  // === AUDIO FORMATS ===
  {
    type: 'audio',
    format: 'mp3',
    signatures: [
      // MP3 with ID3v2 tag
      { bytes: [0x49, 0x44, 0x33] }, // "ID3"
      // MP3 frame sync (MPEG Audio Layer 3)
      { bytes: [0xff, 0xfb] },
      { bytes: [0xff, 0xfa] },
      { bytes: [0xff, 0xf3] },
      { bytes: [0xff, 0xf2] },
    ],
    mimeTypes: ['audio/mpeg', 'audio/mp3'],
    extensions: ['.mp3'],
  },
  {
    type: 'audio',
    format: 'wav',
    signatures: [
      // RIFF....WAVE
      { bytes: [0x52, 0x49, 0x46, 0x46] }, // "RIFF" - also check for "WAVE" at offset 8
    ],
    mimeTypes: ['audio/wav', 'audio/wave', 'audio/x-wav'],
    extensions: ['.wav'],
  },
  {
    type: 'audio',
    format: 'm4a',
    signatures: [
      // ISO Base Media File Format (ftyp)
      { bytes: [0x66, 0x74, 0x79, 0x70], offset: 4 }, // "ftyp" at offset 4
    ],
    mimeTypes: ['audio/mp4', 'audio/m4a', 'audio/x-m4a'],
    extensions: ['.m4a'],
  },
  {
    type: 'audio',
    format: 'ogg',
    signatures: [
      // OggS
      { bytes: [0x4f, 0x67, 0x67, 0x53] }, // "OggS"
    ],
    mimeTypes: ['audio/ogg', 'application/ogg'],
    extensions: ['.ogg', '.oga'],
  },
  {
    type: 'audio',
    format: 'flac',
    signatures: [
      { bytes: [0x66, 0x4c, 0x61, 0x43] }, // "fLaC"
    ],
    mimeTypes: ['audio/flac', 'audio/x-flac'],
    extensions: ['.flac'],
  },
  {
    type: 'audio',
    format: 'webm-audio',
    signatures: [
      // WebM/Matroska EBML header
      { bytes: [0x1a, 0x45, 0xdf, 0xa3] },
    ],
    mimeTypes: ['audio/webm'],
    extensions: ['.webm'],
  },

  // === VIDEO FORMATS ===
  {
    type: 'video',
    format: 'mp4',
    signatures: [
      // ISO Base Media File Format (ftyp) - various brands
      { bytes: [0x66, 0x74, 0x79, 0x70], offset: 4 }, // "ftyp"
    ],
    mimeTypes: ['video/mp4', 'video/x-m4v'],
    extensions: ['.mp4', '.m4v'],
  },
  {
    type: 'video',
    format: 'webm',
    signatures: [
      // WebM/Matroska EBML header
      { bytes: [0x1a, 0x45, 0xdf, 0xa3] },
    ],
    mimeTypes: ['video/webm'],
    extensions: ['.webm'],
  },
  {
    type: 'video',
    format: 'mpeg',
    signatures: [
      // MPEG Program Stream
      { bytes: [0x00, 0x00, 0x01, 0xba] },
      // MPEG Video
      { bytes: [0x00, 0x00, 0x01, 0xb3] },
    ],
    mimeTypes: ['video/mpeg', 'video/mpg'],
    extensions: ['.mpeg', '.mpg', '.mpga'],
  },
  {
    type: 'video',
    format: 'avi',
    signatures: [
      // RIFF....AVI
      { bytes: [0x52, 0x49, 0x46, 0x46] }, // "RIFF"
    ],
    mimeTypes: ['video/avi', 'video/x-msvideo'],
    extensions: ['.avi'],
  },
  {
    type: 'video',
    format: 'mov',
    signatures: [
      // QuickTime ftyp
      { bytes: [0x66, 0x74, 0x79, 0x70], offset: 4 },
      // QuickTime moov atom
      { bytes: [0x6d, 0x6f, 0x6f, 0x76], offset: 4 },
      // QuickTime free atom (some MOV files)
      { bytes: [0x66, 0x72, 0x65, 0x65], offset: 4 },
    ],
    mimeTypes: ['video/quicktime'],
    extensions: ['.mov', '.qt'],
  },
];

/**
 * Result of file signature validation
 */
export interface SignatureValidationResult {
  isValid: boolean;
  detectedFormat: string | null;
  detectedType: 'audio' | 'video' | null;
  expectedType: 'audio' | 'video' | 'any' | null;
  error?: string;
  confidence: 'high' | 'medium' | 'low';
}

/**
 * Checks if a byte array matches a signature pattern
 */
function matchesSignature(
  bytes: Uint8Array,
  signature: MagicSignature,
): boolean {
  const offset = signature.offset ?? 0;

  if (bytes.length < offset + signature.bytes.length) {
    return false;
  }

  for (let i = 0; i < signature.bytes.length; i++) {
    const expected = signature.bytes[i];
    if (expected === null) continue; // null means any byte is acceptable

    const actual = bytes[offset + i];
    if (signature.mask && signature.mask[i] !== undefined) {
      // Apply mask if provided
      if ((actual & signature.mask[i]) !== (expected & signature.mask[i])) {
        return false;
      }
    } else {
      if (actual !== expected) {
        return false;
      }
    }
  }

  return true;
}

/**
 * Additional validation for RIFF-based formats (WAV, AVI)
 * Checks the format identifier at offset 8
 */
function validateRiffFormat(
  bytes: Uint8Array,
  expectedFormat: 'WAVE' | 'AVI ',
): boolean {
  if (bytes.length < 12) return false;

  const formatBytes =
    expectedFormat === 'WAVE'
      ? [0x57, 0x41, 0x56, 0x45]
      : [0x41, 0x56, 0x49, 0x20];

  for (let i = 0; i < 4; i++) {
    if (bytes[8 + i] !== formatBytes[i]) return false;
  }

  return true;
}

/**
 * Validates a file's magic bytes against known signatures.
 *
 * @param buffer - The file content as ArrayBuffer (first 12+ bytes recommended)
 * @param expectedType - Expected file type ('audio', 'video', or 'any')
 * @param claimedExtension - Optional file extension for additional validation
 * @returns Validation result with detected format and confidence
 */
export function validateFileSignature(
  buffer: ArrayBuffer,
  expectedType: 'audio' | 'video' | 'any' = 'any',
  claimedExtension?: string,
): SignatureValidationResult {
  const bytes = new Uint8Array(buffer);

  if (bytes.length < 4) {
    return {
      isValid: false,
      detectedFormat: null,
      detectedType: null,
      expectedType,
      error: 'File too small to validate (minimum 4 bytes required)',
      confidence: 'low',
    };
  }

  // Try to match against all known signatures
  for (const fileType of FILE_SIGNATURES) {
    for (const signature of fileType.signatures) {
      if (matchesSignature(bytes, signature)) {
        // Additional validation for RIFF formats
        if (fileType.format === 'wav') {
          if (!validateRiffFormat(bytes, 'WAVE')) continue;
        } else if (fileType.format === 'avi') {
          if (!validateRiffFormat(bytes, 'AVI ')) continue;
        }

        // Check if type matches expected
        const typeMatches =
          expectedType === 'any' || fileType.type === expectedType;

        // Check if extension matches (if provided)
        let extensionMatches = true;
        if (claimedExtension) {
          const normalizedExt = claimedExtension.toLowerCase();
          extensionMatches = fileType.extensions.some(
            (ext) => ext.toLowerCase() === normalizedExt,
          );
        }

        // Determine confidence level
        let confidence: 'high' | 'medium' | 'low' = 'high';
        if (!extensionMatches) {
          confidence = 'medium'; // Signature matches but extension doesn't
        }

        if (!typeMatches) {
          return {
            isValid: false,
            detectedFormat: fileType.format,
            detectedType: fileType.type,
            expectedType,
            error: `File appears to be ${fileType.type} (${fileType.format}), but ${expectedType} was expected`,
            confidence,
          };
        }

        return {
          isValid: true,
          detectedFormat: fileType.format,
          detectedType: fileType.type,
          expectedType,
          confidence,
        };
      }
    }
  }

  // No matching signature found
  return {
    isValid: false,
    detectedFormat: null,
    detectedType: null,
    expectedType,
    error: 'File signature does not match any known audio/video format',
    confidence: 'low',
  };
}

/**
 * Client-side helper to read the first N bytes of a file for validation.
 *
 * @param file - File object to read
 * @param numBytes - Number of bytes to read (default 16)
 * @returns Promise resolving to ArrayBuffer of first N bytes
 */
export async function readFileHeader(
  file: File | Blob,
  numBytes: number = 16,
): Promise<ArrayBuffer> {
  const slice = file.slice(0, numBytes);
  return await slice.arrayBuffer();
}

/**
 * Validates a file using magic bytes and returns a user-friendly result.
 *
 * @param file - File to validate
 * @param expectedType - Expected type ('audio', 'video', or 'any')
 * @returns Promise resolving to validation result
 */
export async function validateFile(
  file: File,
  expectedType: 'audio' | 'video' | 'any' = 'any',
): Promise<SignatureValidationResult> {
  const header = await readFileHeader(file, 16);
  const extension = file.name.includes('.')
    ? '.' + file.name.split('.').pop()?.toLowerCase()
    : undefined;

  return validateFileSignature(header, expectedType, extension);
}

/**
 * Checks if a file is a valid audio file using magic bytes.
 */
export async function isValidAudioFile(file: File): Promise<boolean> {
  const result = await validateFile(file, 'audio');
  return result.isValid;
}

/**
 * Checks if a file is a valid video file using magic bytes.
 */
export async function isValidVideoFile(file: File): Promise<boolean> {
  const result = await validateFile(file, 'video');
  return result.isValid;
}

/**
 * Checks if a file is a valid audio or video file using magic bytes.
 */
export async function isValidAudioVideoFile(file: File): Promise<boolean> {
  const result = await validateFile(file, 'any');
  return result.isValid;
}

/**
 * Server-side validation from a Buffer.
 *
 * @param buffer - Node.js Buffer containing file data
 * @param expectedType - Expected file type
 * @param filename - Optional filename for extension validation
 * @returns Validation result
 */
export function validateBufferSignature(
  buffer: Buffer,
  expectedType: 'audio' | 'video' | 'any' = 'any',
  filename?: string,
): SignatureValidationResult {
  // Create a proper ArrayBuffer from the Node.js Buffer
  const headerBytes = Math.min(buffer.byteLength, 16);
  const arrayBuffer = new ArrayBuffer(headerBytes);
  const view = new Uint8Array(arrayBuffer);
  for (let i = 0; i < headerBytes; i++) {
    view[i] = buffer[i];
  }

  const extension =
    filename && filename.includes('.')
      ? '.' + filename.split('.').pop()?.toLowerCase()
      : undefined;

  return validateFileSignature(arrayBuffer, expectedType, extension);
}
