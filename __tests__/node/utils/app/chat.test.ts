import { describe, it, expect } from 'vitest';
import {
  isImageConversation,
  isFileConversation,
  checkIsModelValid,
} from '@/lib/utils/app/chat';
import { OpenAIModelID, OpenAIVisionModelID } from '@/types/openai';
import { Message } from '@/types/chat';

describe('Chat Utilities', () => {
  describe('isImageConversation', () => {
    it('should return true when last message contains image_url', () => {
      const messages: Message[] = [
        {
          role: 'user',
          content: [
            { type: 'text', text: 'What is in this image?' },
            { type: 'image_url', image_url: { url: 'https://example.com/image.jpg' } },
          ],
        },
      ];

      expect(isImageConversation(messages)).toBe(true);
    });

    it('should return true when last message has multiple images', () => {
      const messages: Message[] = [
        {
          role: 'user',
          content: [
            { type: 'text', text: 'Compare these images' },
            { type: 'image_url', image_url: { url: 'https://example.com/image1.jpg' } },
            { type: 'image_url', image_url: { url: 'https://example.com/image2.jpg' } },
          ],
        },
      ];

      expect(isImageConversation(messages)).toBe(true);
    });

    it('should return false when message content is string', () => {
      const messages: Message[] = [
        {
          role: 'user',
          content: 'Just a text message',
        },
      ];

      expect(isImageConversation(messages)).toBe(false);
    });

    it('should return false when message content is array without image_url', () => {
      const messages: Message[] = [
        {
          role: 'user',
          content: [
            { type: 'text', text: 'Just text content' },
          ],
        },
      ];

      expect(isImageConversation(messages)).toBe(false);
    });

    it('should check only the last message in conversation', () => {
      const messages: Message[] = [
        {
          role: 'user',
          content: [
            { type: 'text', text: 'First message' },
            { type: 'image_url', image_url: { url: 'https://example.com/old.jpg' } },
          ],
        },
        {
          role: 'assistant',
          content: 'I see an image',
        },
        {
          role: 'user',
          content: 'Now just text',
        },
      ];

      expect(isImageConversation(messages)).toBe(false);
    });

    it('should handle single message conversation with image', () => {
      const messages: Message[] = [
        {
          role: 'user',
          content: [
            { type: 'image_url', image_url: { url: 'https://example.com/image.jpg' } },
          ],
        },
      ];

      expect(isImageConversation(messages)).toBe(true);
    });

    it('should return false for empty messages array', () => {
      const messages: Message[] = [];

      // The function should handle empty arrays gracefully
      expect(isImageConversation(messages)).toBe(false);
    });
  });

  describe('isFileConversation', () => {
    it('should return true when last message contains file_url', () => {
      const messages: Message[] = [
        {
          role: 'user',
          content: [
            { type: 'text', text: 'Analyze this file' },
            { type: 'file_url', url: 'https://example.com/document.pdf' },
          ],
        },
      ];

      expect(isFileConversation(messages)).toBe(true);
    });

    it('should return false when message content is string', () => {
      const messages: Message[] = [
        {
          role: 'user',
          content: 'Just text',
        },
      ];

      expect(isFileConversation(messages)).toBe(false);
    });

    it('should return false when message content is array without file_url', () => {
      const messages: Message[] = [
        {
          role: 'user',
          content: [
            { type: 'text', text: 'Just text content' },
          ],
        },
      ];

      expect(isFileConversation(messages)).toBe(false);
    });

    it('should check only the last message in conversation', () => {
      const messages: Message[] = [
        {
          role: 'user',
          content: [
            { type: 'text', text: 'First message' },
            { type: 'file_url', url: 'https://example.com/old.pdf' },
          ],
        },
        {
          role: 'assistant',
          content: 'I analyzed the file',
        },
        {
          role: 'user',
          content: 'Now just text',
        },
      ];

      expect(isFileConversation(messages)).toBe(false);
    });

    it('should handle file and text together', () => {
      const messages: Message[] = [
        {
          role: 'user',
          content: [
            { type: 'text', text: 'Please summarize this document' },
            { type: 'file_url', url: 'https://example.com/report.docx' },
          ],
        },
      ];

      expect(isFileConversation(messages)).toBe(true);
    });

    it('should return false when message has image_url instead of file_url', () => {
      const messages: Message[] = [
        {
          role: 'user',
          content: [
            { type: 'text', text: 'Look at this' },
            { type: 'image_url', image_url: { url: 'https://example.com/image.jpg' } },
          ],
        },
      ];

      expect(isFileConversation(messages)).toBe(false);
    });
  });

  describe('checkIsModelValid', () => {
    describe('OpenAI Models', () => {
      it('should return true for valid GPT-4o model', () => {
        expect(checkIsModelValid('gpt-4o', OpenAIModelID)).toBe(true);
      });

      it('should return true for valid GPT-4 model', () => {
        expect(checkIsModelValid('gpt-4', OpenAIModelID)).toBe(true);
      });

      it('should return true for valid GPT-3.5 model', () => {
        expect(checkIsModelValid('gpt-35-turbo', OpenAIModelID)).toBe(true);
      });

      it('should return true for valid o1 model', () => {
        expect(checkIsModelValid('gpt-o1', OpenAIModelID)).toBe(true);
      });

      it('should return true for valid o1-mini model', () => {
        expect(checkIsModelValid('gpt-o1-mini', OpenAIModelID)).toBe(true);
      });

      it('should return true for valid o3-mini model', () => {
        expect(checkIsModelValid('o3-mini', OpenAIModelID)).toBe(true);
      });

      it('should return false for invalid model', () => {
        expect(checkIsModelValid('invalid-model', OpenAIModelID)).toBe(false);
      });

      it('should return false for empty string', () => {
        expect(checkIsModelValid('', OpenAIModelID)).toBe(false);
      });

      it('should return false for vision model when checking against OpenAIModelID', () => {
        expect(checkIsModelValid('gpt-4-vision-preview', OpenAIModelID)).toBe(false);
      });
    });

    describe('Vision Models', () => {
      it('should return true for valid vision model', () => {
        expect(checkIsModelValid('gpt-4-vision-preview', OpenAIVisionModelID)).toBe(true);
      });

      it('should return true for gpt-4o with vision capabilities', () => {
        expect(checkIsModelValid('gpt-4o', OpenAIVisionModelID)).toBe(true);
      });

      it('should return false for non-vision model', () => {
        expect(checkIsModelValid('gpt-35-turbo', OpenAIVisionModelID)).toBe(false);
      });

      it('should return false for invalid vision model', () => {
        expect(checkIsModelValid('invalid-vision', OpenAIVisionModelID)).toBe(false);
      });
    });

    describe('Error handling', () => {
      it('should throw error for invalid enum type', () => {
        const invalidEnum = { INVALID: 'invalid' };

        expect(() => checkIsModelValid('gpt-4', invalidEnum)).toThrow(
          'Invalid enum provided for validModelIDs'
        );
      });

      it('should handle special characters in model ID', () => {
        expect(checkIsModelValid('gpt-4-@#$%', OpenAIModelID)).toBe(false);
      });

      it('should be case-sensitive', () => {
        expect(checkIsModelValid('GPT-4O', OpenAIModelID)).toBe(false);
        expect(checkIsModelValid('gpt-4o', OpenAIModelID)).toBe(true);
      });
    });

    describe('Edge cases', () => {
      it('should handle model IDs with similar prefixes', () => {
        // gpt-4 vs gpt-4o vs gpt-4.1
        expect(checkIsModelValid('gpt-4', OpenAIModelID)).toBe(true);
        expect(checkIsModelValid('gpt-4o', OpenAIModelID)).toBe(true);
        expect(checkIsModelValid('gpt-4.1', OpenAIModelID)).toBe(true);
      });

      it('should not match partial model IDs', () => {
        expect(checkIsModelValid('gpt-4-fake', OpenAIModelID)).toBe(false);
        expect(checkIsModelValid('gpt', OpenAIModelID)).toBe(false);
      });
    });
  });

  describe('Integration scenarios', () => {
    it('should correctly identify image conversation workflow', () => {
      const messages: Message[] = [
        {
          role: 'user',
          content: [
            { type: 'text', text: 'Analyze this chart' },
            { type: 'image_url', image_url: { url: 'https://example.com/chart.png' } },
          ],
        },
      ];

      const isImage = isImageConversation(messages);
      const isFile = isFileConversation(messages);

      expect(isImage).toBe(true);
      expect(isFile).toBe(false);
    });

    it('should correctly identify file conversation workflow', () => {
      const messages: Message[] = [
        {
          role: 'user',
          content: [
            { type: 'text', text: 'Summarize this PDF' },
            { type: 'file_url', url: 'https://example.com/document.pdf' },
          ],
        },
      ];

      const isImage = isImageConversation(messages);
      const isFile = isFileConversation(messages);

      expect(isImage).toBe(false);
      expect(isFile).toBe(true);
    });

    it('should correctly identify text-only conversation', () => {
      const messages: Message[] = [
        {
          role: 'user',
          content: 'Just a regular text question',
        },
      ];

      const isImage = isImageConversation(messages);
      const isFile = isFileConversation(messages);

      expect(isImage).toBe(false);
      expect(isFile).toBe(false);
    });

    it('should validate model for image conversation', () => {
      const messages: Message[] = [
        {
          role: 'user',
          content: [
            { type: 'text', text: 'What is in this image?' },
            { type: 'image_url', image_url: { url: 'https://example.com/image.jpg' } },
          ],
        },
      ];

      const isImage = isImageConversation(messages);
      const modelId = 'gpt-4o';
      const isValidStandard = checkIsModelValid(modelId, OpenAIModelID);
      const isValidVision = checkIsModelValid(modelId, OpenAIVisionModelID);

      expect(isImage).toBe(true);
      expect(isValidStandard).toBe(true);
      expect(isValidVision).toBe(true); // gpt-4o supports vision
    });
  });
});
