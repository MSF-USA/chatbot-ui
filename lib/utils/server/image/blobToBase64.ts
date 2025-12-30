/**
 * Blob to Base64 Conversion Utilities
 *
 * @deprecated This module is deprecated. Use getBlobBase64String from
 * '@/lib/utils/server/blob/blob' instead. That function:
 * - Uses the same working path as the /api/file/[id] route
 * - Handles both data URL strings and binary content
 * - Works with the new /api/file/{id} URL format
 *
 * The functions in this module relied on parsing full blob storage URLs,
 * which is no longer needed since the frontend now stores file references
 * instead of blob URLs for security reasons.
 */
import { Session } from 'next-auth';

import { getEnvVariable } from '@/lib/utils/app/env';
import { AzureBlobStorage, BlobProperty } from '@/lib/utils/server/blob/blob';

import { env } from '@/config/environment';
import { lookup } from 'mime-types';

/**
 * Checks if a URL is an Azure Blob Storage URL that needs conversion.
 *
 * @param url - The URL to check
 * @returns True if this is an Azure Blob Storage URL
 */
export function isBlobStorageUrl(url: string): boolean {
  return url.includes('.blob.core.windows.net');
}

/**
 * Checks if a URL is already a base64 data URL.
 *
 * @param url - The URL to check
 * @returns True if this is a base64 data URL
 */
export function isBase64DataUrl(url: string): boolean {
  return url.startsWith('data:');
}

/**
 * Extracts the blob path from an Azure Blob Storage URL.
 *
 * @param blobUrl - The full Azure blob URL
 * @param containerName - The container name to strip from the path
 * @returns The blob path within the container
 *
 * @example
 * // URL: https://account.blob.core.windows.net/container/user123/uploads/images/abc.jpg
 * // Returns: user123/uploads/images/abc.jpg
 */
export function extractBlobPath(
  blobUrl: string,
  containerName: string,
): string {
  try {
    const url = new URL(blobUrl);
    // Path starts with /container/path, we need to remove the container prefix
    const fullPath = url.pathname;
    const containerPrefix = `/${containerName}/`;

    if (fullPath.startsWith(containerPrefix)) {
      return fullPath.slice(containerPrefix.length);
    }

    // If container prefix not found, try to extract path after first segment
    const pathParts = fullPath.split('/').filter(Boolean);
    if (pathParts.length > 1) {
      return pathParts.slice(1).join('/');
    }

    throw new Error(`Could not extract blob path from URL: ${blobUrl}`);
  } catch (error) {
    throw new Error(
      `Invalid blob URL format: ${error instanceof Error ? error.message : 'Unknown error'}`,
    );
  }
}

/**
 * Gets the MIME type for an image based on its file extension.
 *
 * @param filename - The filename or path to check
 * @returns The MIME type or 'image/jpeg' as default
 */
export function getImageMimeType(filename: string): string {
  const ext = filename.split('.').pop()?.toLowerCase();
  if (!ext) return 'image/jpeg';

  const mimeType = lookup(ext);
  if (mimeType && mimeType.startsWith('image/')) {
    return mimeType;
  }

  // Default mappings for common image types
  const imageExtensions: Record<string, string> = {
    jpg: 'image/jpeg',
    jpeg: 'image/jpeg',
    png: 'image/png',
    gif: 'image/gif',
    webp: 'image/webp',
    svg: 'image/svg+xml',
    bmp: 'image/bmp',
    ico: 'image/x-icon',
  };

  return imageExtensions[ext] || 'image/jpeg';
}

/**
 * Fetches an image from Azure Blob Storage and converts it to a base64 data URL.
 *
 * @deprecated Use getBlobBase64String from '@/lib/utils/server/blob/blob' instead.
 * Extract the filename from the URL with `url.split('/').pop()` and pass it
 * to getBlobBase64String for conversion.
 *
 * @param blobUrl - The Azure Blob Storage URL
 * @param user - The user session (needed for blob storage access)
 * @returns Promise resolving to base64 data URL (e.g., "data:image/jpeg;base64,...")
 * @throws Error if the blob cannot be fetched or converted
 */
export async function convertBlobUrlToBase64(
  blobUrl: string,
  user: Session['user'],
): Promise<string> {
  // Skip if already a base64 data URL
  if (isBase64DataUrl(blobUrl)) {
    return blobUrl;
  }

  // Validate it's a blob storage URL
  if (!isBlobStorageUrl(blobUrl)) {
    throw new Error(`URL is not an Azure Blob Storage URL: ${blobUrl}`);
  }

  // Get container name from environment
  const containerName = getEnvVariable({
    name: 'AZURE_BLOB_STORAGE_CONTAINER',
    throwErrorOnFail: false,
    defaultValue: env.AZURE_BLOB_STORAGE_IMAGE_CONTAINER ?? '',
    user,
  });

  // Extract blob path from URL
  const blobPath = extractBlobPath(blobUrl, containerName);

  // Create blob storage client
  const blobStorageClient = new AzureBlobStorage(
    getEnvVariable({ name: 'AZURE_BLOB_STORAGE_NAME', user }),
    containerName,
    user,
  );

  // Fetch the blob as a buffer
  const blobBuffer = (await blobStorageClient.get(
    blobPath,
    BlobProperty.BLOB,
  )) as Buffer;

  // Check if the blob content is already a data URL string (legacy format)
  const contentString = blobBuffer.toString('utf8');
  if (contentString.startsWith('data:')) {
    return contentString;
  }

  // Convert binary to base64
  const base64Data = blobBuffer.toString('base64');
  const mimeType = getImageMimeType(blobPath);

  return `data:${mimeType};base64,${base64Data}`;
}

/**
 * Converts multiple blob URLs to base64 in parallel.
 *
 * @param images - Array of image objects with URL and detail
 * @param user - The user session
 * @returns Promise resolving to array of images with base64 URLs
 */
export async function convertImagesToBase64(
  images: Array<{ url: string; detail: 'auto' | 'low' | 'high' }>,
  user: Session['user'],
): Promise<Array<{ url: string; detail: 'auto' | 'low' | 'high' }>> {
  const convertedImages = await Promise.all(
    images.map(async (image) => {
      try {
        const base64Url = await convertBlobUrlToBase64(image.url, user);
        return {
          url: base64Url,
          detail: image.detail,
        };
      } catch (error) {
        console.error(
          `[blobToBase64] Failed to convert image: ${error instanceof Error ? error.message : 'Unknown error'}`,
        );
        // Return original URL if conversion fails - let the LLM API handle the error
        return image;
      }
    }),
  );

  return convertedImages;
}
