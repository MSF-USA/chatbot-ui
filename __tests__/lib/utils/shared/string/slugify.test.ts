import {
  generateAudioFilename,
  slugify,
} from '@/lib/utils/shared/string/slugify';

import { describe, expect, it } from 'vitest';

describe('slugify', () => {
  describe('Basic Transformations', () => {
    it('converts text to lowercase', () => {
      expect(slugify('HELLO WORLD')).toBe('hello-world');
    });

    it('replaces spaces with hyphens', () => {
      expect(slugify('hello world')).toBe('hello-world');
    });

    it('removes special characters', () => {
      expect(slugify('Hello, World!')).toBe('hello-world');
    });

    it('replaces underscores with hyphens', () => {
      expect(slugify('hello_world')).toBe('hello-world');
    });

    it('handles mixed case and special characters', () => {
      expect(slugify('How to Bake Cookies!')).toBe('how-to-bake-cookies');
    });

    it('handles numbers', () => {
      expect(slugify('Chapter 1: Introduction')).toBe('chapter-1-introduction');
    });
  });

  describe('Whitespace Handling', () => {
    it('trims leading and trailing whitespace', () => {
      expect(slugify('  hello world  ')).toBe('hello-world');
    });

    it('collapses multiple spaces into single hyphen', () => {
      expect(slugify('hello    world')).toBe('hello-world');
    });

    it('handles tabs and multiple whitespace types', () => {
      expect(slugify('hello\t\tworld')).toBe('hello-world');
    });
  });

  describe('Hyphen Handling', () => {
    it('preserves single hyphens', () => {
      expect(slugify('hello-world')).toBe('hello-world');
    });

    it('collapses multiple hyphens', () => {
      expect(slugify('hello---world')).toBe('hello-world');
    });

    it('removes leading hyphens', () => {
      expect(slugify('---hello')).toBe('hello');
    });

    it('removes trailing hyphens', () => {
      expect(slugify('hello---')).toBe('hello');
    });
  });

  describe('Edge Cases', () => {
    it('returns empty string for empty input', () => {
      expect(slugify('')).toBe('');
    });

    it('returns empty string for only special characters', () => {
      expect(slugify('@#$%^&*()')).toBe('');
    });

    it('returns empty string for only whitespace', () => {
      expect(slugify('   ')).toBe('');
    });

    it('handles single character', () => {
      expect(slugify('a')).toBe('a');
    });

    it('handles single word', () => {
      expect(slugify('hello')).toBe('hello');
    });
  });

  describe('Max Length', () => {
    it('truncates to default max length of 50', () => {
      const longText =
        'This is a very long title that exceeds the default maximum length limit';
      const result = slugify(longText);
      expect(result.length).toBeLessThanOrEqual(50);
    });

    it('respects custom max length', () => {
      const text = 'hello world test';
      expect(slugify(text, 10)).toBe('hello-worl');
    });

    it('does not truncate short text', () => {
      expect(slugify('hello', 100)).toBe('hello');
    });
  });

  describe('Unicode and International Characters', () => {
    it('removes accented characters', () => {
      expect(slugify('Caf\u00e9')).toBe('caf');
    });

    it('removes non-latin characters', () => {
      expect(slugify('\u4f60\u597d world')).toBe('world');
    });

    it('handles emoji', () => {
      expect(slugify('Hello \ud83d\udc4b World')).toBe('hello-world');
    });
  });
});

describe('generateAudioFilename', () => {
  describe('Basic Usage', () => {
    it('generates filename from conversation title and index', () => {
      expect(generateAudioFilename('How to bake cookies', 5)).toBe(
        'how-to-bake-cookies-5.mp3',
      );
    });

    it('generates filename with string suffix', () => {
      expect(generateAudioFilename('Meeting notes', 'audio')).toBe(
        'meeting-notes-audio.mp3',
      );
    });

    it('generates filename without suffix', () => {
      expect(generateAudioFilename('My conversation')).toBe(
        'my-conversation.mp3',
      );
    });

    it('uses custom extension', () => {
      expect(generateAudioFilename('Audio file', 1, 'wav')).toBe(
        'audio-file-1.wav',
      );
    });
  });

  describe('Fallback Behavior', () => {
    it('uses fallback for empty title', () => {
      expect(generateAudioFilename('', 1, 'mp3', 'assistant-audio')).toBe(
        'assistant-audio-1.mp3',
      );
    });

    it('uses fallback for title that slugifies to empty', () => {
      expect(generateAudioFilename('@#$%', 1, 'mp3', 'assistant-audio')).toBe(
        'assistant-audio-1.mp3',
      );
    });

    it('uses default fallback when not specified', () => {
      expect(generateAudioFilename('', 1)).toBe('audio-1.mp3');
    });
  });

  describe('File Extension Stripping', () => {
    it('strips .mp3 extension from base text', () => {
      expect(generateAudioFilename('meeting.mp3', 'audio')).toBe(
        'meeting-audio.mp3',
      );
    });

    it('strips .wav extension from base text', () => {
      expect(generateAudioFilename('recording.wav', 'audio')).toBe(
        'recording-audio.mp3',
      );
    });

    it('strips .mp4 extension from base text', () => {
      expect(generateAudioFilename('video.mp4', 'audio')).toBe(
        'video-audio.mp3',
      );
    });

    it('strips .m4a extension from base text', () => {
      expect(generateAudioFilename('podcast.m4a', 'audio')).toBe(
        'podcast-audio.mp3',
      );
    });

    it('strips .webm extension from base text', () => {
      expect(generateAudioFilename('stream.webm', 'audio')).toBe(
        'stream-audio.mp3',
      );
    });

    it('is case insensitive when stripping extensions', () => {
      expect(generateAudioFilename('RECORDING.MP3', 'audio')).toBe(
        'recording-audio.mp3',
      );
    });
  });

  describe('Suffix Handling', () => {
    it('handles numeric suffix 0', () => {
      expect(generateAudioFilename('test', 0)).toBe('test-0.mp3');
    });

    it('handles numeric suffix 1', () => {
      expect(generateAudioFilename('test', 1)).toBe('test-1.mp3');
    });

    it('skips empty string suffix', () => {
      expect(generateAudioFilename('test', '')).toBe('test.mp3');
    });

    it('skips null suffix', () => {
      expect(generateAudioFilename('test', null as unknown as string)).toBe(
        'test.mp3',
      );
    });

    it('skips undefined suffix', () => {
      expect(generateAudioFilename('test', undefined)).toBe('test.mp3');
    });
  });

  describe('Real-World Examples', () => {
    it('handles typical chat conversation title', () => {
      expect(
        generateAudioFilename(
          'Help me write a Python script',
          3,
          'mp3',
          'assistant-audio',
        ),
      ).toBe('help-me-write-a-python-script-3.mp3');
    });

    it('handles untitled conversation (empty string)', () => {
      expect(generateAudioFilename('', 1, 'mp3', 'assistant-audio')).toBe(
        'assistant-audio-1.mp3',
      );
    });

    it('handles transcript viewer with filename', () => {
      expect(generateAudioFilename('interview-recording.wav', 'audio')).toBe(
        'interview-recording-audio.mp3',
      );
    });

    it('handles conversation with special characters', () => {
      expect(generateAudioFilename("What's the weather like?", 2)).toBe(
        'whats-the-weather-like-2.mp3',
      );
    });

    it('handles very long conversation title', () => {
      const longTitle =
        'This is a very long conversation title that goes on and on and might exceed reasonable filename lengths';
      const result = generateAudioFilename(longTitle, 1);
      expect(result.length).toBeLessThanOrEqual(60); // 50 chars + "-1.mp3"
      expect(result).toMatch(/^this-is-a-very-long.*-1\.mp3$/);
    });
  });
});
