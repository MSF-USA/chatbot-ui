import toast from 'react-hot-toast';

import { cacheImageBase64 } from '@/lib/services/imageService';

import { FILE_SIZE_LIMITS, FILE_SIZE_LIMITS_MB } from '@/lib/utils/app/const';

export interface UploadProgress {
  [fileName: string]: number;
}

export interface UploadResult {
  url: string;
  originalFilename: string;
  type: 'image' | 'file' | 'audio' | 'video';
}

const DISALLOWED_EXTENSIONS = [
  '.exe',
  '.dll',
  '.cmd',
  '.msi',
  '.zip',
  '.rar',
  '.7z',
  '.tar',
  '.gz',
  '.iso',
];

const DISALLOWED_MIME_TYPES = [
  'application/x-msdownload',
  'application/x-executable',
  'application/x-dosexec',
  'application/x-msdos-program',
  'application/x-msi',
  'application/zip',
  'application/x-rar-compressed',
  'application/x-7z-compressed',
  'application/x-tar',
  'application/gzip',
  'application/x-iso9660-image',
  'application/octet-stream',
];

export class FileUploadService {
  /**
   * Check if file type is allowed
   */
  static isFileAllowed(file: File): boolean {
    const extension =
      '.' + file.name.split('.')[file.name.split('.').length - 1].toLowerCase();
    return (
      !DISALLOWED_EXTENSIONS.includes(extension) &&
      !DISALLOWED_MIME_TYPES.includes(file.type)
    );
  }

  /**
   * Check if file is audio or video
   */
  static isAudioOrVideo(file: File): boolean {
    return file.type.startsWith('audio/') || file.type.startsWith('video/');
  }

  /**
   * Check if file is an image
   */
  static isImage(file: File): boolean {
    return file.type.startsWith('image/');
  }

  /**
   * Get file type category
   */
  static getFileType(file: File): 'image' | 'audio' | 'video' | 'file' {
    if (file.type.startsWith('image/')) return 'image';
    if (file.type.startsWith('audio/')) return 'audio';
    if (file.type.startsWith('video/')) return 'video';
    return 'file';
  }

  /**
   * Check if file is a video (not just audio)
   */
  static isVideo(file: File): boolean {
    return file.type.startsWith('video/');
  }

  /**
   * Get max file size for given file type
   */
  static getMaxSize(file: File): { bytes: number; mb: number } {
    const isImage = this.isImage(file);
    const isVideo = this.isVideo(file);
    const isAudio = file.type.startsWith('audio/');

    if (isImage) {
      return {
        bytes: FILE_SIZE_LIMITS.IMAGE_MAX_BYTES,
        mb: FILE_SIZE_LIMITS_MB.IMAGE,
      };
    }
    // Video files can be larger since audio is extracted client-side
    if (isVideo) {
      return {
        bytes: FILE_SIZE_LIMITS.VIDEO_MAX_BYTES,
        mb: FILE_SIZE_LIMITS_MB.VIDEO,
      };
    }
    // Audio files have the standard audio limit
    if (isAudio) {
      return {
        bytes: FILE_SIZE_LIMITS.AUDIO_VIDEO_MAX_BYTES,
        mb: FILE_SIZE_LIMITS_MB.AUDIO_VIDEO,
      };
    }
    return {
      bytes: FILE_SIZE_LIMITS.FILE_MAX_BYTES,
      mb: FILE_SIZE_LIMITS_MB.FILE,
    };
  }

  /**
   * Validate file before upload
   */
  static validateFile(file: File): { valid: boolean; error?: string } {
    if (!this.isFileAllowed(file)) {
      return {
        valid: false,
        error: `Invalid file type: ${file.name}`,
      };
    }

    const { bytes, mb } = this.getMaxSize(file);
    if (file.size > bytes) {
      return {
        valid: false,
        error: `${file.name} must be less than ${mb}MB`,
      };
    }

    return { valid: true };
  }

  /**
   * Read file as base64 data URL
   */
  static readFileAsDataURL(file: File): Promise<string> {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onloadend = () => resolve(reader.result as string);
      reader.onerror = reject;
      reader.readAsDataURL(file);
    });
  }

  /**
   * Upload image file
   */
  static async uploadImage(
    file: File,
    onProgress?: (progress: number) => void,
  ): Promise<UploadResult> {
    const base64String = await this.readFileAsDataURL(file);

    // Simulated progress for base64 encoding
    if (onProgress) onProgress(50);

    const data = await uploadImageToAPI(file.name, base64String, onProgress);

    return {
      url: data.uri ?? data.filename ?? '',
      originalFilename: file.name,
      type: 'image',
    };
  }

  /**
   * Converts an ArrayBuffer to a base64 string.
   * This method properly handles binary data without charset corruption issues
   * that occur with readAsBinaryString() + btoa().
   *
   * @param buffer - The ArrayBuffer to convert
   * @returns Base64 encoded string
   */
  private static arrayBufferToBase64(buffer: ArrayBuffer): string {
    const bytes = new Uint8Array(buffer);
    let binary = '';
    const chunkSize = 8192; // Process in chunks to avoid stack overflow for large files

    for (let i = 0; i < bytes.length; i += chunkSize) {
      const chunk = bytes.subarray(i, Math.min(i + chunkSize, bytes.length));
      binary += String.fromCharCode.apply(null, Array.from(chunk));
    }

    return btoa(binary);
  }

  /**
   * Upload file with chunked upload support.
   * Uses ArrayBuffer for proper binary handling to prevent file corruption
   * that can occur with deprecated readAsBinaryString().
   *
   * @param file - The file to upload
   * @param onProgress - Optional progress callback (0-100)
   * @returns Upload result with URL and metadata
   */
  static async uploadFile(
    file: File,
    onProgress?: (progress: number) => void,
  ): Promise<UploadResult> {
    const chunkSize = FILE_SIZE_LIMITS.UPLOAD_CHUNK_BYTES;
    let uploadedBytes = 0;

    return new Promise((resolve, reject) => {
      const uploadChunk = () => {
        const chunk = file.slice(uploadedBytes, uploadedBytes + chunkSize);

        const reader = new FileReader();
        reader.onloadend = async () => {
          try {
            // Convert ArrayBuffer to base64 properly to avoid binary corruption
            const arrayBuffer = reader.result as ArrayBuffer;
            const base64Chunk = this.arrayBufferToBase64(arrayBuffer);
            const encodedFileName = encodeURIComponent(file.name);
            const encodedMimeType = encodeURIComponent(file.type);

            const response = await fetch(
              `/api/file/upload?filename=${encodedFileName}&filetype=file&mime=${encodedMimeType}`,
              {
                method: 'POST',
                body: base64Chunk,
                headers: {
                  'x-file-name': encodedFileName,
                },
              },
            );

            if (response.ok) {
              uploadedBytes += chunk.size;
              const progress = Math.min((uploadedBytes / file.size) * 100, 100);

              if (onProgress) onProgress(progress);

              if (uploadedBytes < file.size) {
                // More chunks to upload - don't read response body yet
                uploadChunk();
              } else {
                // Last chunk - now read the response
                const response_data = await response.json();
                const resp = response_data.data || response_data;
                resolve({
                  url: resp.uri ?? resp.filename ?? '',
                  originalFilename: file.name,
                  type: this.getFileType(file),
                });
              }
            } else {
              // Read error response
              const errorText = await response.text();
              reject(
                new Error(`File upload failed: ${file.name} - ${errorText}`),
              );
            }
          } catch (error) {
            reject(error);
          }
        };
        reader.onerror = () => reject(reader.error);
        reader.readAsArrayBuffer(chunk);
      };

      uploadChunk();
    });
  }

  /**
   * Upload single file with automatic type detection
   */
  static async uploadSingleFile(
    file: File,
    onProgress?: (progress: number) => void,
  ): Promise<UploadResult> {
    const validation = this.validateFile(file);
    if (!validation.valid) {
      throw new Error(validation.error);
    }

    if (this.isImage(file)) {
      return this.uploadImage(file, onProgress);
    } else {
      return this.uploadFile(file, onProgress);
    }
  }

  /**
   * Upload multiple files
   */
  static async uploadMultipleFiles(
    files: File[],
    onProgressUpdate?: (progress: UploadProgress) => void,
  ): Promise<UploadResult[]> {
    const results: UploadResult[] = [];
    const progressMap: UploadProgress = {};

    // Initialize progress for all files
    files.forEach((file) => {
      progressMap[file.name] = 0;
    });

    for (const file of files) {
      try {
        const result = await this.uploadSingleFile(file, (progress) => {
          progressMap[file.name] = progress;
          if (onProgressUpdate) {
            onProgressUpdate({ ...progressMap });
          }
        });
        results.push(result);
      } catch (error) {
        console.error(`Failed to upload ${file.name}:`, error);
        toast.error(
          error instanceof Error
            ? error.message
            : `Failed to upload ${file.name}`,
        );
      }
    }

    return results;
  }
}

/**
 * Helper function to upload image to API (extracted from original code)
 */
async function uploadImageToAPI(
  filename: string,
  base64String: string,
  onProgress?: (progress: number) => void,
): Promise<{ uri?: string; filename?: string }> {
  const encodedFileName = encodeURIComponent(filename);
  const response = await fetch(
    `/api/file/upload?filename=${encodedFileName}&filetype=image`,
    {
      method: 'POST',
      body: base64String.split(',')[1],
      headers: {
        'x-file-name': encodedFileName,
      },
    },
  );

  if (!response.ok) {
    throw new Error('Image upload failed');
  }

  if (onProgress) onProgress(100);

  const response_data = await response.json();
  const data = response_data.data || response_data;

  // Cache the image for offline use
  try {
    await cacheImageBase64(data.uri ?? data.filename, base64String);
  } catch (cacheError) {
    console.warn('Failed to cache image:', cacheError);
  }

  return data;
}
