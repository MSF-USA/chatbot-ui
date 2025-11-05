/**
 * Message Validation Service
 *
 * Centralized service for validating message submissions
 */
import { FilePreview } from '@/types/chat';

export type UploadProgress = { [key: string]: number };

export interface ValidationResult {
  valid: boolean;
  error?: string;
}

export interface MessageValidationOptions {
  maxLength?: number;
  requireContent?: boolean;
  allowEmptyWithFiles?: boolean;
}

/**
 * Message Validation Service
 * Provides validation for message submissions
 */
export class MessageValidationService {
  /**
   * Validate a message submission
   */
  static validateMessageSubmission(
    text: string,
    filePreviews: FilePreview[],
    uploadProgress: UploadProgress,
    options: MessageValidationOptions = {},
  ): ValidationResult {
    const {
      maxLength,
      requireContent = true,
      allowEmptyWithFiles = true,
    } = options;

    // Check if content is being uploaded (any file with progress < 100)
    const hasActiveUploads = Object.values(uploadProgress).some(
      (progress) => progress < 100,
    );
    if (hasActiveUploads) {
      return {
        valid: false,
        error: 'Please wait for file upload to complete',
      };
    }

    // Check if there's any content (text or files)
    const hasText = text.trim().length > 0;
    const hasFiles = filePreviews.length > 0;

    if (requireContent && !hasText && !hasFiles) {
      return {
        valid: false,
        error: 'Please enter a message or upload a file',
      };
    }

    if (!allowEmptyWithFiles && !hasText && hasFiles) {
      return {
        valid: false,
        error: 'Please enter a message to send with your files',
      };
    }

    // Check message length
    if (maxLength && text.length > maxLength) {
      return {
        valid: false,
        error: `Message exceeds maximum length of ${maxLength} characters`,
      };
    }

    // Check if there are any failed uploads
    const hasFailedUploads = filePreviews.some(
      (preview) => preview.status === 'failed',
    );

    if (hasFailedUploads) {
      return {
        valid: false,
        error: 'Some files failed to upload. Please remove them or try again',
      };
    }

    return { valid: true };
  }

  /**
   * Validate text length
   */
  static validateTextLength(text: string, maxLength: number): ValidationResult {
    if (text.length > maxLength) {
      return {
        valid: false,
        error: `Text exceeds maximum length of ${maxLength} characters`,
      };
    }

    return { valid: true };
  }

  /**
   * Validate file uploads
   */
  static validateFileUploads(
    filePreviews: FilePreview[],
    uploadProgress: UploadProgress,
  ): ValidationResult {
    const hasActiveUploads = Object.values(uploadProgress).some(
      (progress) => progress < 100,
    );
    if (hasActiveUploads) {
      return {
        valid: false,
        error: 'File upload in progress',
      };
    }

    const hasFailedUploads = filePreviews.some(
      (preview) => preview.status === 'failed',
    );

    if (hasFailedUploads) {
      return {
        valid: false,
        error: 'Some files failed to upload',
      };
    }

    const hasPendingUploads = filePreviews.some(
      (preview) => preview.status === 'uploading',
    );

    if (hasPendingUploads) {
      return {
        valid: false,
        error: 'Please wait for all files to finish uploading',
      };
    }

    return { valid: true };
  }

  /**
   * Validate file size
   */
  static validateFileSize(file: File, maxSizeBytes: number): ValidationResult {
    if (file.size > maxSizeBytes) {
      const maxSizeMB = Math.round(maxSizeBytes / (1024 * 1024));
      const fileSizeMB = Math.round(file.size / (1024 * 1024));

      return {
        valid: false,
        error: `File "${file.name}" is too large (${fileSizeMB}MB). Maximum size is ${maxSizeMB}MB`,
      };
    }

    return { valid: true };
  }

  /**
   * Validate file type
   */
  static validateFileType(
    file: File,
    allowedTypes: string[],
  ): ValidationResult {
    const fileExtension = file.name.split('.').pop()?.toLowerCase();

    if (!fileExtension || !allowedTypes.includes(fileExtension)) {
      return {
        valid: false,
        error: `File type "${fileExtension}" is not allowed. Allowed types: ${allowedTypes.join(', ')}`,
      };
    }

    return { valid: true };
  }

  /**
   * Validate number of files
   */
  static validateFileCount(
    fileCount: number,
    maxFiles: number,
  ): ValidationResult {
    if (fileCount > maxFiles) {
      return {
        valid: false,
        error: `Too many files. Maximum is ${maxFiles} files`,
      };
    }

    return { valid: true };
  }

  /**
   * Sanitize message text (remove potentially dangerous content)
   */
  static sanitizeMessageText(text: string): string {
    // Remove null bytes
    let sanitized = text.replace(/\0/g, '');

    // Trim excessive whitespace
    sanitized = sanitized.trim();

    // Remove zero-width characters
    sanitized = sanitized.replace(/[\u200B-\u200D\uFEFF]/g, '');

    return sanitized;
  }

  /**
   * Check if message contains only whitespace
   */
  static isEmptyMessage(text: string): boolean {
    return text.trim().length === 0;
  }

  /**
   * Get character count (excluding whitespace)
   */
  static getCharacterCount(text: string): number {
    return text.replace(/\s/g, '').length;
  }

  /**
   * Get word count
   */
  static getWordCount(text: string): number {
    return text.trim().split(/\s+/).filter(Boolean).length;
  }
}
