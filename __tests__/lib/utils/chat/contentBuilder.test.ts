import { buildMessageContent } from '@/lib/utils/chat/contentBuilder';

import {
  ChatInputSubmitTypes,
  FileMessageContent,
  ImageMessageContent,
  TextMessageContent,
} from '@/types/chat';

import { describe, expect, it } from 'vitest';

describe('contentBuilder', () => {
  describe('buildMessageContent', () => {
    describe('text submit type', () => {
      it('should return plain text for text-only message', () => {
        const result = buildMessageContent(
          'text',
          'Hello world',
          null as any,
          null,
        );

        expect(result).toBe('Hello world');
        expect(typeof result).toBe('string');
      });

      it('should handle empty text', () => {
        const result = buildMessageContent('text', '', null as any, null);

        expect(result).toBe('');
      });

      it('should handle text with whitespace', () => {
        const result = buildMessageContent(
          'text',
          '  Hello  \n  World  ',
          null,
          null,
        );

        expect(result).toBe('  Hello  \n  World  ');
      });

      it('should ignore image and file fields for text type', () => {
        const imageField: ImageMessageContent = {
          type: 'image_url',
          image_url: { url: 'data:image/png;base64,...', detail: 'auto' },
        };
        const fileField: FileMessageContent = {
          type: 'file_url',
          url: 'https://example.com/file.pdf',
        };

        const result = buildMessageContent(
          'text',
          'Just text',
          imageField,
          fileField,
        );

        expect(result).toBe('Just text');
      });
    });

    describe('image submit type', () => {
      const imageContent: ImageMessageContent = {
        type: 'image_url',
        image_url: { url: 'data:image/png;base64,abc123', detail: 'auto' },
      };

      it('should build content array with single image', () => {
        const result = buildMessageContent(
          'image',
          'Describe this',
          imageContent,
          null,
        );

        expect(Array.isArray(result)).toBe(true);
        const arr = result as (TextMessageContent | ImageMessageContent)[];
        expect(arr).toHaveLength(2);
        expect(arr[0]).toEqual(imageContent);
        expect(arr[1]).toEqual({ type: 'text', text: 'Describe this' });
      });

      it('should handle multiple images as array', () => {
        const image2: ImageMessageContent = {
          type: 'image_url',
          image_url: { url: 'data:image/jpeg;base64,xyz789', detail: 'auto' },
        };

        const result = buildMessageContent(
          'image',
          'Compare these',
          [imageContent, image2],
          null,
        );

        const arr = result as (TextMessageContent | ImageMessageContent)[];
        expect(arr).toHaveLength(3);
        expect(arr[0]).toEqual(imageContent);
        expect(arr[1]).toEqual(image2);
        expect(arr[2]).toEqual({ type: 'text', text: 'Compare these' });
      });

      it('should include file along with image', () => {
        const fileContent: FileMessageContent = {
          type: 'file_url',
          url: 'https://example.com/doc.pdf',
        };

        const result = buildMessageContent(
          'image',
          'Analyze these',
          imageContent,
          fileContent,
        );

        const arr = result as (
          | TextMessageContent
          | ImageMessageContent
          | FileMessageContent
        )[];
        expect(arr).toHaveLength(3);
        expect(arr[0]).toEqual(imageContent);
        expect(arr[1]).toEqual(fileContent);
        expect(arr[2]).toEqual({ type: 'text', text: 'Analyze these' });
      });

      it('should filter out null images', () => {
        const result = buildMessageContent(
          'image',
          'Test',
          [imageContent, null as any],
          null,
        );

        const arr = result as (TextMessageContent | ImageMessageContent)[];
        expect(arr).toHaveLength(2);
        expect(arr[0]).toEqual(imageContent);
        expect(arr[1]).toEqual({ type: 'text', text: 'Test' });
      });

      it('should handle only file without image', () => {
        const fileContent: FileMessageContent = {
          type: 'file_url',
          url: 'https://example.com/doc.pdf',
        };

        const result = buildMessageContent(
          'image',
          'Check this',
          null,
          fileContent,
        );

        const arr = result as (TextMessageContent | FileMessageContent)[];
        expect(arr).toHaveLength(2);
        expect(arr[0]).toEqual(fileContent);
        expect(arr[1]).toEqual({ type: 'text', text: 'Check this' });
      });

      it('should handle empty text with image', () => {
        const result = buildMessageContent('image', '', imageContent, null);

        const arr = result as (TextMessageContent | ImageMessageContent)[];
        expect(arr).toHaveLength(2);
        expect(arr[1]).toEqual({ type: 'text', text: '' });
      });
    });

    describe('file submit type', () => {
      const fileContent: FileMessageContent = {
        type: 'file_url',
        url: 'https://example.com/document.pdf',
      };

      it('should build content array with single file', () => {
        const result = buildMessageContent(
          'file',
          'Summarize this',
          null,
          fileContent,
        );

        expect(Array.isArray(result)).toBe(true);
        const arr = result as (TextMessageContent | FileMessageContent)[];
        expect(arr).toHaveLength(2);
        expect(arr[0]).toEqual(fileContent);
        expect(arr[1]).toEqual({ type: 'text', text: 'Summarize this' });
      });

      it('should handle multiple files as array', () => {
        const file2: FileMessageContent = {
          type: 'file_url',
          url: 'https://example.com/report.docx',
        };

        const result = buildMessageContent(
          'file',
          'Compare these documents',
          null,
          [fileContent, file2],
        );

        const arr = result as (TextMessageContent | FileMessageContent)[];
        expect(arr).toHaveLength(3);
        expect(arr[0]).toEqual(fileContent);
        expect(arr[1]).toEqual(file2);
        expect(arr[2]).toEqual({
          type: 'text',
          text: 'Compare these documents',
        });
      });

      it('should omit text content if text is empty', () => {
        const result = buildMessageContent(
          'file',
          '',
          null as any,
          fileContent,
        );

        const arr = result as (TextMessageContent | FileMessageContent)[];
        expect(arr).toHaveLength(1);
        expect(arr[0]).toEqual(fileContent);
      });

      it('should omit text content if text is only whitespace', () => {
        const result = buildMessageContent(
          'file',
          '   \n\t  ',
          null,
          fileContent,
        );

        const arr = result as (TextMessageContent | FileMessageContent)[];
        expect(arr).toHaveLength(1);
        expect(arr[0]).toEqual(fileContent);
      });

      it('should include text if not empty', () => {
        const result = buildMessageContent(
          'file',
          'Process this',
          null,
          fileContent,
        );

        const arr = result as (TextMessageContent | FileMessageContent)[];
        expect(arr).toHaveLength(2);
        expect(arr[1]).toEqual({ type: 'text', text: 'Process this' });
      });

      it('should filter out null files', () => {
        const file2: FileMessageContent = {
          type: 'file_url',
          url: 'https://example.com/file2.pdf',
        };

        const result = buildMessageContent('file', 'Check these', null as any, [
          fileContent,
          null as any,
          file2,
        ]);

        const arr = result as (TextMessageContent | FileMessageContent)[];
        expect(arr).toHaveLength(3);
        expect(arr[0]).toEqual(fileContent);
        expect(arr[1]).toEqual(file2);
        expect(arr[2]).toEqual({ type: 'text', text: 'Check these' });
      });
    });

    describe('multi-file submit type', () => {
      const imageContent: ImageMessageContent = {
        type: 'image_url',
        image_url: { url: 'data:image/png;base64,abc', detail: 'auto' },
      };

      const fileContent: FileMessageContent = {
        type: 'file_url',
        url: 'https://example.com/doc.pdf',
      };

      it('should combine images and files', () => {
        const result = buildMessageContent(
          'multi-file',
          'Analyze both',
          imageContent,
          fileContent,
        );

        const arr = result as (
          | TextMessageContent
          | ImageMessageContent
          | FileMessageContent
        )[];
        expect(arr).toHaveLength(3);
        expect(arr[0]).toEqual(imageContent);
        expect(arr[1]).toEqual(fileContent);
        expect(arr[2]).toEqual({ type: 'text', text: 'Analyze both' });
      });

      it('should handle multiple images and multiple files', () => {
        const image2: ImageMessageContent = {
          type: 'image_url',
          image_url: { url: 'data:image/jpeg;base64,xyz', detail: 'auto' },
        };
        const file2: FileMessageContent = {
          type: 'file_url',
          url: 'https://example.com/report.docx',
        };

        const result = buildMessageContent(
          'multi-file',
          'Process all',
          [imageContent, image2],
          [fileContent, file2],
        );

        const arr = result as (
          | TextMessageContent
          | ImageMessageContent
          | FileMessageContent
        )[];
        expect(arr).toHaveLength(5);
        expect(arr[0]).toEqual(imageContent);
        expect(arr[1]).toEqual(image2);
        expect(arr[2]).toEqual(fileContent);
        expect(arr[3]).toEqual(file2);
        expect(arr[4]).toEqual({ type: 'text', text: 'Process all' });
      });

      it('should omit text if empty', () => {
        const result = buildMessageContent(
          'multi-file',
          '',
          imageContent,
          fileContent,
        );

        const arr = result as (
          | TextMessageContent
          | ImageMessageContent
          | FileMessageContent
        )[];
        expect(arr).toHaveLength(2);
        expect(arr[0]).toEqual(imageContent);
        expect(arr[1]).toEqual(fileContent);
      });

      it('should handle only images without files', () => {
        const result = buildMessageContent(
          'multi-file',
          'Describe',
          imageContent,
          null,
        );

        const arr = result as (TextMessageContent | ImageMessageContent)[];
        expect(arr).toHaveLength(2);
        expect(arr[0]).toEqual(imageContent);
        expect(arr[1]).toEqual({ type: 'text', text: 'Describe' });
      });

      it('should handle only files without images', () => {
        const result = buildMessageContent(
          'multi-file',
          'Summarize',
          null,
          fileContent,
        );

        const arr = result as (TextMessageContent | FileMessageContent)[];
        expect(arr).toHaveLength(2);
        expect(arr[0]).toEqual(fileContent);
        expect(arr[1]).toEqual({ type: 'text', text: 'Summarize' });
      });

      it('should filter out null images and files', () => {
        const image2: ImageMessageContent = {
          type: 'image_url',
          image_url: { url: 'data:image/jpeg;base64,xyz', detail: 'auto' },
        };

        const result = buildMessageContent(
          'multi-file',
          'Check',
          [imageContent, null as any, image2],
          [fileContent, null as any],
        );

        const arr = result as (
          | TextMessageContent
          | ImageMessageContent
          | FileMessageContent
        )[];
        expect(arr).toHaveLength(4);
        expect(arr[0]).toEqual(imageContent);
        expect(arr[1]).toEqual(image2);
        expect(arr[2]).toEqual(fileContent);
        expect(arr[3]).toEqual({ type: 'text', text: 'Check' });
      });
    });

    describe('error handling', () => {
      it('should throw error for invalid submit type', () => {
        expect(() => {
          buildMessageContent(
            'invalid-type' as ChatInputSubmitTypes,
            'test',
            null,
            null,
          );
        }).toThrow('Invalid submit type for message: invalid-type');
      });

      it('should throw error for unknown submit type', () => {
        expect(() => {
          buildMessageContent(
            'audio' as ChatInputSubmitTypes,
            'test',
            null,
            null,
          );
        }).toThrow('Invalid submit type for message: audio');
      });
    });

    describe('edge cases', () => {
      it('should handle very long text', () => {
        const longText = 'a'.repeat(10000);
        const result = buildMessageContent('text', longText, null as any, null);

        expect(result).toBe(longText);
        expect((result as string).length).toBe(10000);
      });

      it('should handle special characters in text', () => {
        const specialText = 'Hello\n\tWorld\r\n"Test" <>&';
        const result = buildMessageContent(
          'text',
          specialText,
          null as any,
          null,
        );

        expect(result).toBe(specialText);
      });

      it('should handle unicode characters', () => {
        const unicodeText = 'Hello 世界 🌍 Ñoño';
        const result = buildMessageContent(
          'text',
          unicodeText,
          null as any,
          null,
        );

        expect(result).toBe(unicodeText);
      });

      it('should handle empty arrays', () => {
        const result = buildMessageContent('multi-file', 'Test', [], []);

        const arr = result as TextMessageContent[];
        expect(arr).toHaveLength(1);
        expect(arr[0]).toEqual({ type: 'text', text: 'Test' });
      });

      it('should handle mixed null and valid values in arrays', () => {
        const imageContent: ImageMessageContent = {
          type: 'image_url',
          image_url: { url: 'data:image/png;base64,abc', detail: 'auto' },
        };

        const result = buildMessageContent(
          'multi-file',
          'Test',
          [null as any, imageContent, null as any],
          [null as any, null as any],
        );

        const arr = result as (TextMessageContent | ImageMessageContent)[];
        expect(arr).toHaveLength(2);
        expect(arr[0]).toEqual(imageContent);
        expect(arr[1]).toEqual({ type: 'text', text: 'Test' });
      });
    });
  });
});
