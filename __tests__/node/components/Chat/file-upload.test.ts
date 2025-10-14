import { describe, expect, it, vi, beforeEach, afterEach } from 'vitest';
import toast from 'react-hot-toast';
import { onFileUpload } from '@/components/Chat/ChatInputEventHandlers/file-upload';
import { onImageUpload } from '@/components/Chat/ChatInputEventHandlers/image-upload';
import { ChatInputSubmitTypes, FilePreview } from '@/types/chat';

// Mock dependencies
vi.mock('react-hot-toast', () => ({
  default: {
    error: vi.fn(),
    success: vi.fn(),
  },
}));

vi.mock('@/components/Chat/ChatInputEventHandlers/image-upload', () => ({
  onImageUpload: vi.fn(),
}));

describe('file-upload', () => {
  let setSubmitType: ReturnType<typeof vi.fn>;
  let setFilePreviews: ReturnType<typeof vi.fn>;
  let setFileFieldValue: ReturnType<typeof vi.fn>;
  let setImageFieldValue: ReturnType<typeof vi.fn>;
  let setUploadProgress: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    setSubmitType = vi.fn();
    setFilePreviews = vi.fn((fn) => {
      if (typeof fn === 'function') {
        return fn([]);
      }
    });
    setFileFieldValue = vi.fn((fn) => {
      if (typeof fn === 'function') {
        return fn(undefined);
      }
    });
    setImageFieldValue = vi.fn();
    setUploadProgress = vi.fn();

    vi.clearAllMocks();

    // Mock URL.createObjectURL
    global.URL.createObjectURL = vi.fn(() => 'blob:mock-url');
    global.URL.revokeObjectURL = vi.fn();

    // Mock FileList for Node environment
    if (typeof FileList === 'undefined') {
      (global as any).FileList = class FileList {
        length: number;
        [index: number]: File;

        constructor(files: File[]) {
          this.length = files.length;
          files.forEach((file, i) => {
            this[i] = file;
          });
        }

        item(index: number): File | null {
          return this[index] || null;
        }

        [Symbol.iterator]() {
          let index = 0;
          const length = this.length;
          const self = this;

          return {
            next() {
              if (index < length) {
                return { value: self[index++], done: false };
              } else {
                return { value: undefined, done: true };
              }
            }
          };
        }
      };
    }

    // Mock FileReader
    global.FileReader = class MockFileReader {
      readAsBinaryString = vi.fn();
      onloadend: (() => void) | null = null;
      result: string | ArrayBuffer | null = null;
    } as any;

    // Mock fetch
    global.fetch = vi.fn();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('File Validation', () => {
    it('rejects disallowed extensions', async () => {
      const disallowedFiles = [
        new File(['content'], 'test.exe', { type: 'application/x-msdownload' }),
        new File(['content'], 'test.dll', { type: 'application/octet-stream' }),
        new File(['content'], 'archive.zip', { type: 'application/zip' }),
        new File(['content'], 'archive.rar', { type: 'application/x-rar-compressed' }),
      ];

      for (const file of disallowedFiles) {
        await onFileUpload(
          [file],
          setSubmitType,
          setFilePreviews,
          setFileFieldValue,
          setImageFieldValue,
          setUploadProgress,
        );

        expect(toast.error).toHaveBeenCalledWith(
          expect.stringContaining(`Invalid file type provided: ${file.name}`)
        );
      }
    });

    it('rejects unsupported media files', async () => {
      const unsupportedFiles = [
        new File(['content'], 'audio.mp3', { type: 'audio/mpeg' }),
        new File(['content'], 'audio.wav', { type: 'audio/wav' }),
        new File(['content'], 'video.mp4', { type: 'video/mp4' }),
        new File(['content'], 'video.avi', { type: 'video/x-msvideo' }),
      ];

      for (const file of unsupportedFiles) {
        vi.clearAllMocks();

        await onFileUpload(
          [file],
          setSubmitType,
          setFilePreviews,
          setFileFieldValue,
          setImageFieldValue,
          setUploadProgress,
        );

        expect(toast.error).toHaveBeenCalledWith(
          expect.stringContaining(`This file type is currently unsupported: ${file.name}`)
        );
      }
    });

    it('rejects files larger than 10MB', async () => {
      // Create a file larger than 10MB (10485760 bytes)
      const largeContent = 'x'.repeat(10485761);
      const largeFile = new File([largeContent], 'large.txt', { type: 'text/plain' });

      await onFileUpload(
        [largeFile],
        setSubmitType,
        setFilePreviews,
        setFileFieldValue,
        setImageFieldValue,
        setUploadProgress,
      );

      expect(toast.error).toHaveBeenCalledWith(
        expect.stringContaining('File large.txt must be less than 10MB.')
      );
    });

    it('accepts valid files', async () => {
      const validFile = new File(['content'], 'document.pdf', { type: 'application/pdf' });

      vi.mocked(fetch).mockResolvedValue({
        ok: true,
        json: async () => ({ uri: 'uploaded-file-url', filename: 'document.pdf' }),
      } as Response);

      await onFileUpload(
        [validFile],
        setSubmitType,
        setFilePreviews,
        setFileFieldValue,
        setImageFieldValue,
        setUploadProgress,
      );

      expect(setFilePreviews).toHaveBeenCalled();
      expect(toast.error).not.toHaveBeenCalledWith(
        expect.stringContaining('Invalid file type')
      );
    });
  });

  describe('File Count Limits', () => {
    it('rejects when no files selected', async () => {
      await onFileUpload(
        [],
        setSubmitType,
        setFilePreviews,
        setFileFieldValue,
        setImageFieldValue,
        setUploadProgress,
      );

      expect(toast.error).toHaveBeenCalledWith('No files selected.');
    });

    it('rejects more than 5 files', async () => {
      const files = Array.from({ length: 6 }, (_, i) =>
        new File(['content'], `file${i}.txt`, { type: 'text/plain' })
      );

      await onFileUpload(
        files,
        setSubmitType,
        setFilePreviews,
        setFileFieldValue,
        setImageFieldValue,
        setUploadProgress,
      );

      expect(toast.error).toHaveBeenCalledWith(
        'You can upload a maximum of 5 files at a time.'
      );
    });

    it('accepts up to 5 files', async () => {
      const files = Array.from({ length: 5 }, (_, i) =>
        new File(['content'], `file${i}.txt`, { type: 'text/plain' })
      );

      vi.mocked(fetch).mockResolvedValue({
        ok: true,
        json: async () => ({ uri: 'uploaded-file-url' }),
      } as Response);

      await onFileUpload(
        files,
        setSubmitType,
        setFilePreviews,
        setFileFieldValue,
        setImageFieldValue,
        setUploadProgress,
      );

      expect(toast.error).not.toHaveBeenCalledWith(
        expect.stringContaining('maximum of 5 files')
      );
    });
  });

  describe('File Previews', () => {
    it('creates preview for image files', async () => {
      const imageFile = new File(['content'], 'image.png', { type: 'image/png' });

      vi.mocked(onImageUpload).mockImplementation(() => {});

      await onFileUpload(
        [imageFile],
        setSubmitType,
        setFilePreviews,
        setFileFieldValue,
        setImageFieldValue,
        setUploadProgress,
      );

      expect(setFilePreviews).toHaveBeenCalledWith(expect.any(Function));
      const callArg = setFilePreviews.mock.calls[0][0];
      const previews = callArg([]);

      expect(previews).toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            name: 'image.png',
            type: 'image/png',
            status: 'pending',
            previewUrl: 'blob:mock-url',
          }),
        ])
      );
    });

    it('creates preview for non-image files without URL', async () => {
      const textFile = new File(['content'], 'document.txt', { type: 'text/plain' });

      vi.mocked(fetch).mockResolvedValue({
        ok: true,
        json: async () => ({ uri: 'uploaded-file-url' }),
      } as Response);

      await onFileUpload(
        [textFile],
        setSubmitType,
        setFilePreviews,
        setFileFieldValue,
        setImageFieldValue,
        setUploadProgress,
      );

      const callArg = setFilePreviews.mock.calls[0][0];
      const previews = callArg([]);

      expect(previews).toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            name: 'document.txt',
            type: 'text/plain',
            status: 'pending',
            previewUrl: '',
          }),
        ])
      );
    });

    it('creates multiple previews at once', async () => {
      const files = [
        new File(['content'], 'file1.txt', { type: 'text/plain' }),
        new File(['content'], 'file2.txt', { type: 'text/plain' }),
      ];

      vi.mocked(fetch).mockResolvedValue({
        ok: true,
        json: async () => ({ uri: 'uploaded-file-url' }),
      } as Response);

      await onFileUpload(
        files,
        setSubmitType,
        setFilePreviews,
        setFileFieldValue,
        setImageFieldValue,
        setUploadProgress,
      );

      const callArg = setFilePreviews.mock.calls[0][0];
      const previews = callArg([]);

      expect(previews).toHaveLength(2);
      expect(previews[0].name).toBe('file1.txt');
      expect(previews[1].name).toBe('file2.txt');
    });
  });

  describe('Image Upload Handling', () => {
    it('delegates image files to onImageUpload', async () => {
      const imageFile = new File(['content'], 'photo.jpg', { type: 'image/jpeg' });

      await onFileUpload(
        [imageFile],
        setSubmitType,
        setFilePreviews,
        setFileFieldValue,
        setImageFieldValue,
        setUploadProgress,
      );

      expect(onImageUpload).toHaveBeenCalledWith(
        imageFile,
        '',
        setFilePreviews,
        setSubmitType,
        setFileFieldValue,
      );
    });

    it('handles multiple image files', async () => {
      const images = [
        new File(['content'], 'photo1.jpg', { type: 'image/jpeg' }),
        new File(['content'], 'photo2.png', { type: 'image/png' }),
      ];

      await onFileUpload(
        images,
        setSubmitType,
        setFilePreviews,
        setFileFieldValue,
        setImageFieldValue,
        setUploadProgress,
      );

      expect(onImageUpload).toHaveBeenCalledTimes(2);
    });
  });

  describe('File Upload Process', () => {
    it('updates preview status to uploading', async () => {
      const file = new File(['content'], 'test.txt', { type: 'text/plain' });

      let uploadingCalled = false;
      setFilePreviews = vi.fn((fn) => {
        if (typeof fn === 'function') {
          const result = fn([
            { name: 'test.txt', type: 'text/plain', status: 'pending', previewUrl: '' },
          ]);
          if (result[0]?.status === 'uploading') {
            uploadingCalled = true;
          }
          return result;
        }
      });

      vi.mocked(fetch).mockResolvedValue({
        ok: true,
        json: async () => ({ uri: 'uploaded-file-url' }),
      } as Response);

      await onFileUpload(
        [file],
        setSubmitType,
        setFilePreviews,
        setFileFieldValue,
        setImageFieldValue,
        setUploadProgress,
      );

      expect(uploadingCalled).toBe(true);
    });

    it('updates preview status to completed on success', async () => {
      const file = new File(['content'], 'test.txt', { type: 'text/plain' });

      let completedCalled = false;
      setFilePreviews = vi.fn((fn) => {
        if (typeof fn === 'function') {
          const result = fn([
            { name: 'test.txt', type: 'text/plain', status: 'uploading', previewUrl: '' },
          ]);
          if (result[0]?.status === 'completed') {
            completedCalled = true;
          }
          return result;
        }
      });

      vi.mocked(fetch).mockResolvedValue({
        ok: true,
        json: async () => ({ uri: 'uploaded-file-url' }),
      } as Response);

      await onFileUpload(
        [file],
        setSubmitType,
        setFilePreviews,
        setFileFieldValue,
        setImageFieldValue,
        setUploadProgress,
        );

      expect(completedCalled).toBe(true);
    });

    it('updates preview status to failed on error', async () => {
      const file = new File(['content'], 'test.txt', { type: 'text/plain' });

      let failedCalled = false;
      setFilePreviews = vi.fn((fn) => {
        if (typeof fn === 'function') {
          const result = fn([
            { name: 'test.txt', type: 'text/plain', status: 'uploading', previewUrl: '' },
          ]);
          if (result[0]?.status === 'failed') {
            failedCalled = true;
          }
          return result;
        }
      });

      vi.mocked(fetch).mockResolvedValue({
        ok: false,
      } as Response);

      await onFileUpload(
        [file],
        setSubmitType,
        setFilePreviews,
        setFileFieldValue,
        setImageFieldValue,
        setUploadProgress,
      );

      expect(failedCalled).toBe(true);
      expect(toast.error).toHaveBeenCalledWith(
        expect.stringContaining('File upload failed: test.txt')
      );
    });

    it('handles network errors', async () => {
      const file = new File(['content'], 'test.txt', { type: 'text/plain' });

      vi.mocked(fetch).mockRejectedValue(new Error('Network error'));

      await onFileUpload(
        [file],
        setSubmitType,
        setFilePreviews,
        setFileFieldValue,
        setImageFieldValue,
        setUploadProgress,
      );

      expect(toast.error).toHaveBeenCalledWith(
        expect.stringContaining('File upload failed: test.txt')
      );
    });
  });

  describe('Submit Type Updates', () => {
    it('sets submit type to "file" for single file', async () => {
      const file = new File(['content'], 'single.txt', { type: 'text/plain' });

      setFileFieldValue = vi.fn((fn) => {
        if (typeof fn === 'function') {
          fn(undefined);
        }
      });

      vi.mocked(fetch).mockResolvedValue({
        ok: true,
        json: async () => ({ uri: 'uploaded-file-url' }),
      } as Response);

      await onFileUpload(
        [file],
        setSubmitType,
        setFilePreviews,
        setFileFieldValue,
        setImageFieldValue,
        setUploadProgress,
      );

      expect(setSubmitType).toHaveBeenCalledWith('file');
    });

    it('sets submit type to "multi-file" for multiple files', async () => {
      const files = [
        new File(['content'], 'file1.txt', { type: 'text/plain' }),
        new File(['content'], 'file2.txt', { type: 'text/plain' }),
      ];

      let fileCount = 0;
      setFileFieldValue = vi.fn((fn) => {
        if (typeof fn === 'function') {
          fileCount++;
          // Simulate having multiple files
          if (fileCount > 1) {
            fn([{ type: 'file_url', url: 'url1', originalFilename: 'file1.txt' }]);
          } else {
            fn(undefined);
          }
        }
      });

      vi.mocked(fetch).mockResolvedValue({
        ok: true,
        json: async () => ({ uri: 'uploaded-file-url' }),
      } as Response);

      await onFileUpload(
        files,
        setSubmitType,
        setFilePreviews,
        setFileFieldValue,
        setImageFieldValue,
        setUploadProgress,
      );

      expect(setSubmitType).toHaveBeenCalledWith('multi-file');
    });
  });

  describe('Success Notification', () => {
    it('shows success toast after all uploads complete', async () => {
      const files = [
        new File(['content'], 'file1.txt', { type: 'text/plain' }),
        new File(['content'], 'file2.txt', { type: 'text/plain' }),
      ];

      vi.mocked(fetch).mockResolvedValue({
        ok: true,
        json: async () => ({ uri: 'uploaded-file-url' }),
      } as Response);

      await onFileUpload(
        files,
        setSubmitType,
        setFilePreviews,
        setFileFieldValue,
        setImageFieldValue,
        setUploadProgress,
      );

      expect(toast.success).toHaveBeenCalledWith('Files uploaded successfully');
    });
  });

  describe('ChangeEvent Handling', () => {
    it('handles React.ChangeEvent input', async () => {
      const file = new File(['content'], 'test.txt', { type: 'text/plain' });
      const event = {
        preventDefault: vi.fn(),
        target: {
          files: [file],
          value: 'test.txt',
        },
      } as any;

      vi.mocked(fetch).mockResolvedValue({
        ok: true,
        json: async () => ({ uri: 'uploaded-file-url' }),
      } as Response);

      await onFileUpload(
        event,
        setSubmitType,
        setFilePreviews,
        setFileFieldValue,
        setImageFieldValue,
        setUploadProgress,
      );

      expect(event.preventDefault).toHaveBeenCalled();
      expect(event.target.value).toBe(''); // Should be reset
    });

    it('resets input value after upload', async () => {
      const file = new File(['content'], 'test.txt', { type: 'text/plain' });
      const event = {
        preventDefault: vi.fn(),
        target: {
          files: [file],
          value: 'original-value',
        },
      } as any;

      vi.mocked(fetch).mockResolvedValue({
        ok: true,
        json: async () => ({ uri: 'uploaded-file-url' }),
      } as Response);

      await onFileUpload(
        event,
        setSubmitType,
        setFilePreviews,
        setFileFieldValue,
        setImageFieldValue,
        setUploadProgress,
      );

      expect(event.target.value).toBe('');
    });
  });

  describe('Edge Cases', () => {
    it('handles file with no extension', async () => {
      const file = new File(['content'], 'noextension', { type: 'text/plain' });

      vi.mocked(fetch).mockResolvedValue({
        ok: true,
        json: async () => ({ uri: 'uploaded-file-url' }),
      } as Response);

      await onFileUpload(
        [file],
        setSubmitType,
        setFilePreviews,
        setFileFieldValue,
        setImageFieldValue,
        setUploadProgress,
      );

      expect(setFilePreviews).toHaveBeenCalled();
    });

    it('handles file with multiple dots in name', async () => {
      const file = new File(['content'], 'file.name.with.dots.txt', { type: 'text/plain' });

      vi.mocked(fetch).mockResolvedValue({
        ok: true,
        json: async () => ({ uri: 'uploaded-file-url' }),
      } as Response);

      await onFileUpload(
        [file],
        setSubmitType,
        setFilePreviews,
        setFileFieldValue,
        setImageFieldValue,
        setUploadProgress,
      );

      expect(setFilePreviews).toHaveBeenCalled();
    });

    it('handles mixed valid and invalid files', async () => {
      const files = [
        new File(['content'], 'valid.txt', { type: 'text/plain' }),
        new File(['content'], 'invalid.exe', { type: 'application/x-msdownload' }),
      ];

      vi.mocked(fetch).mockResolvedValue({
        ok: true,
        json: async () => ({ uri: 'uploaded-file-url' }),
      } as Response);

      await onFileUpload(
        files,
        setSubmitType,
        setFilePreviews,
        setFileFieldValue,
        setImageFieldValue,
        setUploadProgress,
      );

      expect(toast.error).toHaveBeenCalledWith(
        expect.stringContaining('Invalid file type provided: invalid.exe')
      );
    });
  });
});
