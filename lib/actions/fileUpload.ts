'use server';

import { Session } from 'next-auth';

import { createBlobStorageClient } from '@/lib/services/blobStorageFactory';

import Hasher from '@/lib/utils/app/hash';
import { getUserIdFromSession } from '@/lib/utils/app/user/session';
import { BlobStorage } from '@/lib/utils/server/blob/blob';
import {
  getContentType,
  validateBufferSignature,
  validateFileNotExecutable,
} from '@/lib/utils/server/mimeTypes';

import { auth } from '@/auth';
import { validateFileSizeRaw } from '@/lib/constants/fileLimits';

/**
 * Result of a file upload operation.
 */
export interface UploadResult {
  success: boolean;
  uri?: string;
  error?: string;
}

/**
 * Server Action to upload files to blob storage.
 *
 * This action supports up to 1.6GB body size limit configured in next.config.js,
 * unlike Route Handlers which have a lower default limit.
 * File size limits vary by file type (image: 5MB, audio: 1GB, video: 1.5GB, document: 50MB).
 *
 * @param formData - FormData containing:
 *   - file: The file to upload
 *   - filename: Original filename
 *   - filetype: 'image' | 'file' | 'audio' | 'video'
 *   - mime: MIME type (optional)
 * @returns Upload result with URI or error message
 */
export async function uploadFileAction(
  formData: FormData,
): Promise<UploadResult> {
  try {
    // Authenticate user
    const session: Session | null = await auth();
    if (!session) {
      return { success: false, error: 'Unauthorized' };
    }

    // Extract form data
    const file = formData.get('file') as File | null;
    const filename = formData.get('filename') as string | null;
    const filetype = (formData.get('filetype') as string) ?? 'file';
    const mimeType = formData.get('mime') as string | null;

    if (!file) {
      return { success: false, error: 'No file provided' };
    }

    if (!filename) {
      return { success: false, error: 'Filename is required' };
    }

    // Validate file is not executable
    const executableValidation = validateFileNotExecutable(filename, mimeType);
    if (!executableValidation.isValid) {
      return { success: false, error: executableValidation.error };
    }

    // Convert file to buffer
    const arrayBuffer = await file.arrayBuffer();
    const fileData = Buffer.from(arrayBuffer);

    // Check file size using category-based limits
    const sizeValidation = validateFileSizeRaw(
      filename,
      fileData.length,
      mimeType ?? undefined,
    );
    if (!sizeValidation.valid) {
      return {
        success: false,
        error: sizeValidation.error,
      };
    }

    // Upload to blob storage
    const fileURI = await uploadFileToBlobStorage(
      fileData,
      filename,
      filetype,
      mimeType,
      session,
    );

    return { success: true, uri: fileURI };
  } catch (error) {
    console.error('[uploadFileAction] Error:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to upload file',
    };
  }
}

/**
 * Upload file data to blob storage with content-based naming.
 */
async function uploadFileToBlobStorage(
  data: Buffer,
  filename: string,
  filetype: string,
  mimeType: string | null,
  session: Session,
): Promise<string> {
  const userId = getUserIdFromSession(session);
  const blobStorageClient: BlobStorage = createBlobStorageClient(session);

  // Hash file contents for deduplication-based naming
  const hashInput = data.toString('base64');
  const hashedFileContents = Hasher.sha256(hashInput).slice(0, 200);
  const extension: string | undefined = filename.split('.').pop();

  // Determine content type
  let contentType: string;
  if (mimeType) {
    contentType = mimeType;
  } else if (extension) {
    contentType = getContentType(extension);
  } else {
    contentType = 'application/octet-stream';
  }

  const uploadLocation = filetype === 'image' ? 'images' : 'files';

  // Validate magic bytes for audio/video files to prevent spoofing
  const isAudioVideo =
    (mimeType &&
      (mimeType.startsWith('audio/') || mimeType.startsWith('video/'))) ||
    filetype === 'audio' ||
    filetype === 'video';

  if (isAudioVideo) {
    const signatureValidation = validateBufferSignature(data, 'any', filename);
    if (!signatureValidation.isValid) {
      throw new Error(
        signatureValidation.error ||
          'File content does not match expected audio/video format',
      );
    }
  }

  return await blobStorageClient.upload(
    `${userId}/uploads/${uploadLocation}/${hashedFileContents}.${extension}`,
    data,
    {
      blobHTTPHeaders: {
        blobContentType: contentType,
      },
    },
  );
}
