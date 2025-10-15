import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { fetchImageBase64FromMessageContent } from '@/lib/services/imageService';
import { ImageMessageContent } from '@/types/chat';

describe('Image Service', () => {
  beforeEach(() => {
    // Reset mocks before each test
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('fetchImageBase64FromMessageContent', () => {
    it('should fetch and return base64 URL for valid image', async () => {
      const mockImageContent: ImageMessageContent = {
        type: 'image_url',
        image_url: {
          url: 'https://example.com/images/test-image.jpg',
          detail: 'auto',
        },
      };

      const mockResponse = {
        base64Url: 'data:image/jpeg;base64,/9j/4AAQSkZJRg...',
      };

      global.fetch = vi.fn().mockResolvedValue({
        json: async () => mockResponse,
      } as Response);

      const result = await fetchImageBase64FromMessageContent(mockImageContent);

      expect(result).toBe('data:image/jpeg;base64,/9j/4AAQSkZJRg...');
      expect(global.fetch).toHaveBeenCalledWith('/api/file/test-image.jpg?filetype=image');
    });

    it('should extract filename correctly from URL with multiple slashes', async () => {
      const mockImageContent: ImageMessageContent = {
        type: 'image_url',
        image_url: {
          url: 'https://storage.azure.com/container/folder/subfolder/image.png',
          detail: 'auto',
        },
      };

      const mockResponse = {
        base64Url: 'data:image/png;base64,iVBORw0KGgo...',
      };

      global.fetch = vi.fn().mockResolvedValue({
        json: async () => mockResponse,
      } as Response);

      const result = await fetchImageBase64FromMessageContent(mockImageContent);

      expect(result).toBe('data:image/png;base64,iVBORw0KGgo...');
      expect(global.fetch).toHaveBeenCalledWith('/api/file/image.png?filetype=image');
    });

    it('should return empty string when image_url is missing', async () => {
      const mockImageContent: ImageMessageContent = {
        type: 'image_url',
      } as ImageMessageContent;

      const consoleWarnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});

      const result = await fetchImageBase64FromMessageContent(mockImageContent);

      expect(result).toBe('');
      expect(consoleWarnSpy).toHaveBeenCalledWith(
        expect.stringContaining("Couldn't find url in message content")
      );

      consoleWarnSpy.mockRestore();
    });

    it('should return empty string when url is missing in image_url', async () => {
      const mockImageContent: ImageMessageContent = {
        type: 'image_url',
        image_url: {} as any,
      };

      const consoleWarnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});

      const result = await fetchImageBase64FromMessageContent(mockImageContent);

      expect(result).toBe('');
      expect(consoleWarnSpy).toHaveBeenCalled();

      consoleWarnSpy.mockRestore();
    });

    it('should return empty string and log error when fetch fails', async () => {
      const mockImageContent: ImageMessageContent = {
        type: 'image_url',
        image_url: {
          url: 'https://example.com/images/test.jpg',
          detail: 'auto',
        },
      };

      global.fetch = vi.fn().mockRejectedValue(new Error('Network error'));

      const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

      const result = await fetchImageBase64FromMessageContent(mockImageContent);

      expect(result).toBe('');
      expect(consoleErrorSpy).toHaveBeenCalledWith(
        'Error fetching the image:',
        expect.any(Error)
      );

      consoleErrorSpy.mockRestore();
    });

    it('should return empty string when JSON parsing fails', async () => {
      const mockImageContent: ImageMessageContent = {
        type: 'image_url',
        image_url: {
          url: 'https://example.com/images/test.jpg',
          detail: 'auto',
        },
      };

      global.fetch = vi.fn().mockResolvedValue({
        json: async () => {
          throw new Error('Invalid JSON');
        },
      } as unknown as Response);

      const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

      const result = await fetchImageBase64FromMessageContent(mockImageContent);

      expect(result).toBe('');
      expect(consoleErrorSpy).toHaveBeenCalled();

      consoleErrorSpy.mockRestore();
    });

    it('should handle URLs with query parameters', async () => {
      const mockImageContent: ImageMessageContent = {
        type: 'image_url',
        image_url: {
          url: 'https://example.com/images/test.jpg?size=large&quality=high',
          detail: 'auto',
        },
      };

      const mockResponse = {
        base64Url: 'data:image/jpeg;base64,ABC123...',
      };

      global.fetch = vi.fn().mockResolvedValue({
        json: async () => mockResponse,
      } as Response);

      const result = await fetchImageBase64FromMessageContent(mockImageContent);

      expect(result).toBe('data:image/jpeg;base64,ABC123...');
      // The filename extraction will include query params
      expect(global.fetch).toHaveBeenCalledWith('/api/file/test.jpg?size=large&quality=high?filetype=image');
    });

    it('should handle different image formats', async () => {
      const formats = ['jpg', 'png', 'gif', 'webp', 'svg'];

      for (const format of formats) {
        const mockImageContent: ImageMessageContent = {
          type: 'image_url',
          image_url: {
            url: `https://example.com/image.${format}`,
            detail: 'auto',
          },
        };

        const mockResponse = {
          base64Url: `data:image/${format};base64,testdata`,
        };

        global.fetch = vi.fn().mockResolvedValue({
          json: async () => mockResponse,
        } as Response);

        const result = await fetchImageBase64FromMessageContent(mockImageContent);

        expect(result).toBe(`data:image/${format};base64,testdata`);
        expect(global.fetch).toHaveBeenCalledWith(`/api/file/image.${format}?filetype=image`);
      }
    });

    it('should handle URLs without protocol', async () => {
      const mockImageContent: ImageMessageContent = {
        type: 'image_url',
        image_url: {
          url: '/local/path/to/image.jpg',
          detail: 'auto',
        },
      };

      const mockResponse = {
        base64Url: 'data:image/jpeg;base64,local...',
      };

      global.fetch = vi.fn().mockResolvedValue({
        json: async () => mockResponse,
      } as Response);

      const result = await fetchImageBase64FromMessageContent(mockImageContent);

      expect(result).toBe('data:image/jpeg;base64,local...');
      expect(global.fetch).toHaveBeenCalledWith('/api/file/image.jpg?filetype=image');
    });

    it('should handle single segment URLs', async () => {
      const mockImageContent: ImageMessageContent = {
        type: 'image_url',
        image_url: {
          url: 'image.jpg',
          detail: 'auto',
        },
      };

      const mockResponse = {
        base64Url: 'data:image/jpeg;base64,simple...',
      };

      global.fetch = vi.fn().mockResolvedValue({
        json: async () => mockResponse,
      } as Response);

      const result = await fetchImageBase64FromMessageContent(mockImageContent);

      expect(result).toBe('data:image/jpeg;base64,simple...');
      expect(global.fetch).toHaveBeenCalledWith('/api/file/image.jpg?filetype=image');
    });
  });
});
