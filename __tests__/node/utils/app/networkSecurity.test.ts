import { beforeEach, describe, expect, it, vi } from 'vitest';

// Mock fetch globally
global.fetch = vi.fn();

// Mock DNS lookup to control network security tests
const { mockLookup } = vi.hoisted(() => ({
  mockLookup: vi.fn(),
}));

vi.mock('dns', () => ({
  lookup: mockLookup,
}));

// Import after mocks are set up
const { executeSecureRequest, validateResponseContentType } = await import(
  '@/utils/app/networkSecurity'
);
const { HttpError } = await import('@/utils/app/security');

describe('Network Security Utils', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // Default DNS lookup to return public IP
    mockLookup.mockImplementation((hostname, callback) => {
      if (callback) {
        callback(null, { address: '8.8.8.8', family: 4 });
      }
    });
  });

  describe('executeSecureRequest', () => {
    const validUrl = 'https://example.com/test';

    it('should reject localhost URLs', async () => {
      await expect(
        executeSecureRequest('http://localhost:8080/admin'),
      ).rejects.toThrow(HttpError);
      await expect(
        executeSecureRequest('http://127.0.0.1/config'),
      ).rejects.toThrow(HttpError);
    });

    it('should reject private network URLs', async () => {
      // Mock DNS to return private IP
      mockLookup.mockImplementation((hostname, callback) => {
        if (callback) {
          callback(null, { address: '192.168.1.1', family: 4 });
        }
      });

      await expect(executeSecureRequest(validUrl)).rejects.toThrow(HttpError);
      expect(mockLookup).toHaveBeenCalledWith(
        'example.com',
        expect.any(Function),
      );
    });

    it('should reject invalid URLs', async () => {
      await expect(executeSecureRequest('')).rejects.toThrow(HttpError);
      await expect(
        executeSecureRequest('ftp://example.com/file'),
      ).rejects.toThrow(HttpError);
      await expect(executeSecureRequest('invalid-url')).rejects.toThrow(
        HttpError,
      );
    });

    it('should make successful request to valid public URLs', async () => {
      const mockResponse = {
        ok: true,
        status: 200,
        headers: new Map([['content-type', 'text/html']]),
        body: {
          getReader: () => ({
            read: () => Promise.resolve({ done: true, value: undefined }),
            releaseLock: () => {},
          }),
        },
      };

      (global.fetch as any).mockResolvedValue(mockResponse);

      const result = await executeSecureRequest(validUrl);

      expect(result.response).toBe(mockResponse);
      expect(result.finalUrl).toBe(validUrl);
      expect(result.redirectCount).toBe(0);
      expect(global.fetch).toHaveBeenCalledWith(
        validUrl,
        expect.objectContaining({
          method: 'GET',
          redirect: 'manual',
        }),
      );
    });

    it('should handle redirects with security validation', async () => {
      const redirectUrl = 'https://redirect.example.com/page';

      // First response - redirect
      const redirectResponse = {
        ok: false,
        status: 301,
        headers: new Map([['location', redirectUrl]]),
      };

      // Second response - final content
      const finalResponse = {
        ok: true,
        status: 200,
        headers: new Map([['content-type', 'text/html']]),
      };

      (global.fetch as any)
        .mockResolvedValueOnce(redirectResponse)
        .mockResolvedValueOnce(finalResponse);

      const result = await executeSecureRequest(validUrl);

      expect(result.response).toBe(finalResponse);
      expect(result.finalUrl).toBe(redirectUrl);
      expect(result.redirectCount).toBe(1);
      expect(global.fetch).toHaveBeenCalledTimes(2);
    });

    it('should reject redirects to private networks', async () => {
      const redirectResponse = {
        ok: false,
        status: 301,
        headers: new Map([['location', 'http://192.168.1.100/internal']]),
      };

      (global.fetch as any).mockResolvedValueOnce(redirectResponse);

      // Mock DNS to return private IP for redirect URL
      mockLookup.mockImplementation((hostname, callback) => {
        if (hostname === 'example.com') {
          callback(null, { address: '8.8.8.8', family: 4 });
        } else {
          callback(null, { address: '192.168.1.100', family: 4 });
        }
      });

      await expect(executeSecureRequest(validUrl)).rejects.toThrow(HttpError);
    });

    it('should reject redirects to localhost', async () => {
      const redirectResponse = {
        ok: false,
        status: 301,
        headers: new Map([['location', 'http://localhost:3000/admin']]),
      };

      // Mock only the redirect response - the function should throw before making second request
      (global.fetch as any).mockResolvedValue(redirectResponse);

      await expect(executeSecureRequest(validUrl)).rejects.toThrow(HttpError);
    });

    it('should handle too many redirects', async () => {
      const redirectResponse = {
        ok: false,
        status: 301,
        headers: new Map([['location', 'https://redirect.example.com']]),
      };

      // Always return redirect response
      (global.fetch as any).mockResolvedValue(redirectResponse);

      await expect(
        executeSecureRequest(validUrl, { maxRedirects: 3 }),
      ).rejects.toThrow(HttpError);
      expect(global.fetch).toHaveBeenCalledTimes(3);
    });

    it('should reject server errors', async () => {
      const errorResponse = {
        ok: false,
        status: 500,
        headers: new Map(),
      };

      (global.fetch as any).mockResolvedValue(errorResponse);

      await expect(executeSecureRequest(validUrl)).rejects.toThrow(HttpError);
    });

    it('should handle network errors', async () => {
      (global.fetch as any).mockRejectedValue(new Error('Network error'));

      await expect(executeSecureRequest(validUrl)).rejects.toThrow(HttpError);
    });

    it('should handle custom headers and options', async () => {
      const mockResponse = {
        ok: true,
        status: 200,
        headers: new Map(),
      };

      (global.fetch as any).mockResolvedValue(mockResponse);

      await executeSecureRequest(validUrl, {
        method: 'POST',
        headers: { 'Custom-Header': 'test' },
        userAgent: 'Custom-Agent',
        additionalHeaders: { Additional: 'header' },
      });

      expect(global.fetch).toHaveBeenCalledWith(
        validUrl,
        expect.objectContaining({
          method: 'POST',
          headers: expect.objectContaining({
            'Custom-Header': 'test',
            Additional: 'header',
            'User-Agent': 'Custom-Agent',
          }),
        }),
      );
    });

    it('should handle timeout with AbortController', async () => {
      // Mock a response that respects the AbortSignal
      (global.fetch as any).mockImplementation((_url: string, options: any) => {
        return new Promise((resolve, reject) => {
          const signal = options?.signal;
          if (signal) {
            signal.addEventListener('abort', () => {
              reject(new Error('The operation was aborted'));
            });
          }
          // Never resolve to simulate a long request
        });
      });

      await expect(
        executeSecureRequest(validUrl, { timeout: 100 }),
      ).rejects.toThrow(HttpError);
    }, 10000); // Increase test timeout to 10 seconds
  });

  describe('validateResponseContentType', () => {
    const mockResponse = (contentType: string) =>
      ({
        headers: new Map([['content-type', contentType]]),
      } as Response);

    it('should validate allowed content types', () => {
      const allowedTypes = new Set(['text/html', 'text/plain']);
      const response = mockResponse('text/html');

      expect(() =>
        validateResponseContentType(response, { allowedTypes }),
      ).not.toThrow();

      const result = validateResponseContentType(response, { allowedTypes });
      expect(result).toBe('text/html');
    });

    it('should reject disallowed content types', () => {
      const allowedTypes = new Set(['text/html']);
      const response = mockResponse('application/json');

      expect(() =>
        validateResponseContentType(response, { allowedTypes }),
      ).toThrow(HttpError);
    });

    it('should block dangerous content types', () => {
      const blockedTypes = new Set(['application/x-executable']);
      const response = mockResponse('application/x-executable');

      expect(() =>
        validateResponseContentType(response, { blockedTypes }),
      ).toThrow(HttpError);
    });

    it('should handle wildcard content types', () => {
      const allowedTypes = new Set(['image/*']);
      const response = mockResponse('image/jpeg');

      expect(() =>
        validateResponseContentType(response, { allowedTypes }),
      ).not.toThrow();
    });

    it('should return content type when valid', () => {
      const response = mockResponse('text/html; charset=utf-8');
      const result = validateResponseContentType(response);
      expect(result).toBe('text/html; charset=utf-8');
    });
  });
});
