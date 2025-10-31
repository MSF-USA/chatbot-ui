import { NextRequest } from 'next/server';

import { POST } from '@/app/api/tts/route';
import { beforeEach, describe, expect, it, vi } from 'vitest';

// Mock auth
vi.mock('@/auth', () => ({
  auth: vi.fn(),
}));

// Mock Azure Speech SDK
const mockSpeakTextAsync = vi.fn();
const mockClose = vi.fn();

vi.mock('microsoft-cognitiveservices-speech-sdk', () => ({
  SpeechConfig: {
    fromSubscription: vi.fn(function () {
      return {
        speechSynthesisOutputFormat: null,
      };
    }),
  },
  SpeechSynthesizer: vi.fn(function () {
    return {
      speakTextAsync: mockSpeakTextAsync,
      close: mockClose,
    };
  }),
  SpeechSynthesisOutputFormat: {
    Audio16Khz32KBitRateMonoMp3: 5,
  },
  ResultReason: {
    SynthesizingAudioCompleted: 3,
    Canceled: 2,
  },
  CancellationDetails: {
    fromResult: vi.fn(function () {
      return {
        reason: 'Error',
        ErrorCode: 'ServiceError',
        errorDetails: 'Service connection failed',
      };
    }),
  },
}));

describe('POST /api/tts', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    process.env.OPENAI_API_KEY = 'test-api-key';
    mockClose.mockClear();
    mockSpeakTextAsync.mockClear();
  });

  const createMockRequest = (body: any) => {
    return new NextRequest('http://localhost:3000/api/tts', {
      method: 'POST',
      body: JSON.stringify(body),
      headers: {
        'Content-Type': 'application/json',
      },
    });
  };

  describe('Authentication', () => {
    it('throws error when no session', async () => {
      const { auth } = await import('@/auth');
      vi.mocked(auth).mockResolvedValue(null);

      const request = createMockRequest({ text: 'Hello world' });

      await expect(POST(request)).rejects.toThrow('Failed to pull session!');
    });

    it('proceeds when session exists', async () => {
      const { auth } = await import('@/auth');
      vi.mocked(auth).mockResolvedValue({
        user: { id: 'test-user' },
      } as any);

      mockSpeakTextAsync.mockImplementation((text, successCallback) => {
        successCallback({
          reason: 3, // SynthesizingAudioCompleted
          audioData: new ArrayBuffer(100),
        });
      });

      const request = createMockRequest({ text: 'Hello world' });
      const response = await POST(request);

      expect(response.status).toBe(200);
    });
  });

  describe('Request Validation', () => {
    it('returns 500 when text is missing', async () => {
      const { auth } = await import('@/auth');
      vi.mocked(auth).mockResolvedValue({ user: { id: 'test' } } as any);

      const request = createMockRequest({});
      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(500);
      expect(data.error).toBe('Internal server error');
    });

    it('returns 400 when text is empty after cleaning', async () => {
      const { auth } = await import('@/auth');
      vi.mocked(auth).mockResolvedValue({ user: { id: 'test' } } as any);

      const request = createMockRequest({ text: '   ' });
      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toBe('No text provided');
    });

    it('cleans markdown from text before synthesis', async () => {
      const { auth } = await import('@/auth');
      vi.mocked(auth).mockResolvedValue({ user: { id: 'test' } } as any);

      mockSpeakTextAsync.mockImplementation((text, successCallback) => {
        // Verify markdown is cleaned
        expect(text).not.toContain('**');
        expect(text).not.toContain('#');

        successCallback({
          reason: 3,
          audioData: new ArrayBuffer(100),
        });
      });

      const request = createMockRequest({
        text: '# Hello **world** with `code`',
      });
      await POST(request);

      expect(mockSpeakTextAsync).toHaveBeenCalled();
    });
  });

  describe('Configuration', () => {
    it('returns 500 when API key not configured', async () => {
      const { auth } = await import('@/auth');
      vi.mocked(auth).mockResolvedValue({ user: { id: 'test' } } as any);

      delete process.env.OPENAI_API_KEY;

      const request = createMockRequest({ text: 'Hello world' });
      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(500);
      expect(data.error).toBe('Internal server error');
    });

    it('configures speech synthesizer with correct settings', async () => {
      const { auth } = await import('@/auth');
      vi.mocked(auth).mockResolvedValue({ user: { id: 'test' } } as any);

      const sdk = await import('microsoft-cognitiveservices-speech-sdk');

      mockSpeakTextAsync.mockImplementation((text, successCallback) => {
        successCallback({
          reason: 3,
          audioData: new ArrayBuffer(100),
        });
      });

      const request = createMockRequest({ text: 'Hello world' });
      await POST(request);

      expect(sdk.SpeechConfig.fromSubscription).toHaveBeenCalledWith(
        'test-api-key',
        'eastus2',
      );
    });
  });

  describe('Speech Synthesis', () => {
    it('returns audio stream on successful synthesis', async () => {
      const { auth } = await import('@/auth');
      vi.mocked(auth).mockResolvedValue({ user: { id: 'test' } } as any);

      const mockAudioData = new ArrayBuffer(100);
      mockSpeakTextAsync.mockImplementation((text, successCallback) => {
        successCallback({
          reason: 3, // SynthesizingAudioCompleted
          audioData: mockAudioData,
        });
      });

      const request = createMockRequest({ text: 'Hello world' });
      const response = await POST(request);

      expect(response.status).toBe(200);
      expect(response.headers.get('Content-Type')).toBe('audio/mpeg');
      expect(response.headers.get('Content-Disposition')).toContain(
        'speech.mp3',
      );
    });

    it('calls speakTextAsync with cleaned text', async () => {
      const { auth } = await import('@/auth');
      vi.mocked(auth).mockResolvedValue({ user: { id: 'test' } } as any);

      mockSpeakTextAsync.mockImplementation((text, successCallback) => {
        successCallback({
          reason: 3,
          audioData: new ArrayBuffer(100),
        });
      });

      const request = createMockRequest({ text: 'Hello world' });
      await POST(request);

      expect(mockSpeakTextAsync).toHaveBeenCalledWith(
        'Hello world',
        expect.any(Function),
        expect.any(Function),
      );
    });

    it('closes synthesizer after successful synthesis', async () => {
      const { auth } = await import('@/auth');
      vi.mocked(auth).mockResolvedValue({ user: { id: 'test' } } as any);

      mockSpeakTextAsync.mockImplementation((text, successCallback) => {
        successCallback({
          reason: 3,
          audioData: new ArrayBuffer(100),
        });
      });

      const request = createMockRequest({ text: 'Hello world' });
      await POST(request);

      expect(mockClose).toHaveBeenCalled();
    });

    it('handles synthesis cancellation', async () => {
      const { auth } = await import('@/auth');
      vi.mocked(auth).mockResolvedValue({ user: { id: 'test' } } as any);

      mockSpeakTextAsync.mockImplementation((text, successCallback) => {
        successCallback({
          reason: 2, // Canceled
          audioData: null,
        });
      });

      const request = createMockRequest({ text: 'Hello world' });

      await expect(POST(request)).rejects.toThrow();
      expect(mockClose).toHaveBeenCalled();
    });

    it('handles synthesis error callback', async () => {
      const { auth } = await import('@/auth');
      vi.mocked(auth).mockResolvedValue({ user: { id: 'test' } } as any);

      const testError = new Error('Synthesis failed');
      mockSpeakTextAsync.mockImplementation(
        (text, successCallback, errorCallback) => {
          errorCallback(testError);
        },
      );

      const request = createMockRequest({ text: 'Hello world' });

      await expect(POST(request)).rejects.toThrow('Synthesis failed');
      expect(mockClose).toHaveBeenCalled();
    });
  });

  describe('Error Handling', () => {
    it('returns 500 on JSON parsing error', async () => {
      const { auth } = await import('@/auth');
      vi.mocked(auth).mockResolvedValue({ user: { id: 'test' } } as any);

      const request = new NextRequest('http://localhost:3000/api/tts', {
        method: 'POST',
        body: 'invalid json',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(500);
      expect(data.error).toBe('Internal server error');
    });

    it('returns 500 on unexpected errors', async () => {
      const { auth } = await import('@/auth');
      vi.mocked(auth).mockRejectedValue(new Error('Unexpected error'));

      const request = createMockRequest({ text: 'Hello world' });

      await expect(POST(request)).rejects.toThrow();
    });
  });

  describe('Content Handling', () => {
    it('handles long text', async () => {
      const { auth } = await import('@/auth');
      vi.mocked(auth).mockResolvedValue({ user: { id: 'test' } } as any);

      mockSpeakTextAsync.mockImplementation((text, successCallback) => {
        expect(text.length).toBeGreaterThan(100);
        successCallback({
          reason: 3,
          audioData: new ArrayBuffer(1000),
        });
      });

      const longText = 'Hello world. '.repeat(100);
      const request = createMockRequest({ text: longText });
      const response = await POST(request);

      expect(response.status).toBe(200);
    });

    it('handles special characters', async () => {
      const { auth } = await import('@/auth');
      vi.mocked(auth).mockResolvedValue({ user: { id: 'test' } } as any);

      mockSpeakTextAsync.mockImplementation((text, successCallback) => {
        successCallback({
          reason: 3,
          audioData: new ArrayBuffer(100),
        });
      });

      const request = createMockRequest({
        text: "Hello! How are you? I'm fine, thanks.",
      });
      const response = await POST(request);

      expect(response.status).toBe(200);
    });

    it('handles unicode characters', async () => {
      const { auth } = await import('@/auth');
      vi.mocked(auth).mockResolvedValue({ user: { id: 'test' } } as any);

      mockSpeakTextAsync.mockImplementation((text, successCallback) => {
        successCallback({
          reason: 3,
          audioData: new ArrayBuffer(100),
        });
      });

      const request = createMockRequest({
        text: 'Hello 世界 🌍',
      });
      const response = await POST(request);

      expect(response.status).toBe(200);
    });
  });

  describe('Audio Response', () => {
    it('sets correct content type for MP3', async () => {
      const { auth } = await import('@/auth');
      vi.mocked(auth).mockResolvedValue({ user: { id: 'test' } } as any);

      mockSpeakTextAsync.mockImplementation((text, successCallback) => {
        successCallback({
          reason: 3,
          audioData: new ArrayBuffer(100),
        });
      });

      const request = createMockRequest({ text: 'Hello world' });
      const response = await POST(request);

      expect(response.headers.get('Content-Type')).toBe('audio/mpeg');
    });

    it('sets content disposition as attachment', async () => {
      const { auth } = await import('@/auth');
      vi.mocked(auth).mockResolvedValue({ user: { id: 'test' } } as any);

      mockSpeakTextAsync.mockImplementation((text, successCallback) => {
        successCallback({
          reason: 3,
          audioData: new ArrayBuffer(100),
        });
      });

      const request = createMockRequest({ text: 'Hello world' });
      const response = await POST(request);

      const disposition = response.headers.get('Content-Disposition');
      expect(disposition).toContain('attachment');
      expect(disposition).toContain('speech.mp3');
    });
  });
});
