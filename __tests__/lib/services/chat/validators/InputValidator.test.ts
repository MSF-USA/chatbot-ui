import { InputValidator } from '@/lib/services/chat/validators/InputValidator';

import { ErrorCode, PipelineError } from '@/lib/types/errors';
import { SearchMode } from '@/types/searchMode';

import { beforeEach, describe, expect, it } from 'vitest';

describe('InputValidator', () => {
  let validator: InputValidator;

  beforeEach(() => {
    validator = new InputValidator();
  });

  describe('validateChatRequest', () => {
    const validRequest = {
      model: {
        id: 'gpt-4',
        name: 'GPT-4',
        tokenLimit: 8000,
        maxLength: 4000,
      },
      messages: [
        {
          role: 'user',
          content: 'Hello, how are you?',
          messageType: 'TEXT',
        },
      ],
      prompt: 'You are a helpful assistant.',
      temperature: 0.7,
      stream: true,
    };

    it('should validate a correct chat request', () => {
      const result = validator.validateChatRequest(validRequest);

      expect(result).toBeDefined();
      expect(result.model.id).toBe('gpt-4');
      expect(result.messages).toHaveLength(1);
      expect(result.temperature).toBe(0.7);
      expect(result.stream).toBe(true);
    });

    it('should apply default values for optional fields', () => {
      const minimalRequest = {
        model: validRequest.model,
        messages: validRequest.messages,
      };

      const result = validator.validateChatRequest(minimalRequest);

      expect(result.stream).toBe(true); // Default value
    });

    it('should accept optional searchMode parameter', () => {
      const requestWithSearch = {
        ...validRequest,
        searchMode: SearchMode.INTELLIGENT,
      };

      const result = validator.validateChatRequest(requestWithSearch);

      expect(result.searchMode).toBe(SearchMode.INTELLIGENT);
    });

    it('should accept optional botId parameter', () => {
      const requestWithBot = {
        ...validRequest,
        botId: 'bot-123',
      };

      const result = validator.validateChatRequest(requestWithBot);

      expect(result.botId).toBe('bot-123');
    });

    describe('Model Validation', () => {
      it('should reject request without model', () => {
        const invalidRequest = {
          messages: validRequest.messages,
        };

        expect(() => validator.validateChatRequest(invalidRequest)).toThrow(
          PipelineError,
        );
      });

      it('should reject request with invalid model structure', () => {
        const invalidRequest = {
          model: { id: '' }, // Missing required fields
          messages: validRequest.messages,
        };

        expect(() => validator.validateChatRequest(invalidRequest)).toThrow(
          PipelineError,
        );
      });
    });

    describe('Messages Validation', () => {
      it('should reject request without messages', () => {
        const invalidRequest = {
          model: validRequest.model,
        };

        expect(() => validator.validateChatRequest(invalidRequest)).toThrow(
          PipelineError,
        );
      });

      it('should reject request with empty messages array', () => {
        const invalidRequest = {
          model: validRequest.model,
          messages: [],
        };

        expect(() => validator.validateChatRequest(invalidRequest)).toThrow(
          PipelineError,
        );

        try {
          validator.validateChatRequest(invalidRequest);
        } catch (error) {
          expect(error).toBeInstanceOf(PipelineError);
          expect((error as PipelineError).code).toBe(
            ErrorCode.VALIDATION_FAILED,
          );
          expect((error as PipelineError).message).toContain(
            'At least one message',
          );
        }
      });

      it('should reject request with too many messages', () => {
        const tooManyMessages = Array(101).fill({
          role: 'user',
          content: 'test',
          messageType: 'TEXT',
        });

        const invalidRequest = {
          model: validRequest.model,
          messages: tooManyMessages,
        };

        expect(() => validator.validateChatRequest(invalidRequest)).toThrow(
          PipelineError,
        );
      });

      it('should reject messages with invalid roles', () => {
        const invalidRequest = {
          model: validRequest.model,
          messages: [
            {
              role: 'invalid_role',
              content: 'Hello',
              messageType: 'TEXT',
            },
          ],
        };

        expect(() => validator.validateChatRequest(invalidRequest)).toThrow(
          PipelineError,
        );
      });

      it('should accept valid message roles', () => {
        const validRoles = ['user', 'assistant', 'system'];

        validRoles.forEach((role) => {
          const request = {
            model: validRequest.model,
            messages: [
              {
                role,
                content: 'Test message',
                messageType: 'TEXT',
              },
            ],
          };

          expect(() => validator.validateChatRequest(request)).not.toThrow();
        });
      });

      it('should validate text content', () => {
        const request = {
          model: validRequest.model,
          messages: [
            {
              role: 'user',
              content: 'This is a text message',
              messageType: 'TEXT',
            },
          ],
        };

        const result = validator.validateChatRequest(request);
        expect(result.messages[0].content).toBe('This is a text message');
      });

      it('should validate array content with text', () => {
        const request = {
          model: validRequest.model,
          messages: [
            {
              role: 'user',
              content: [
                {
                  type: 'text',
                  text: 'Hello',
                },
              ],
              messageType: 'TEXT',
            },
          ],
        };

        const result = validator.validateChatRequest(request);
        expect(Array.isArray(result.messages[0].content)).toBe(true);
      });

      it('should validate array content with image_url', () => {
        const request = {
          model: validRequest.model,
          messages: [
            {
              role: 'user',
              content: [
                {
                  type: 'text',
                  text: 'What is this?',
                },
                {
                  type: 'image_url',
                  image_url: {
                    url: 'https://example.com/image.jpg',
                    detail: 'high',
                  },
                },
              ],
              messageType: 'IMAGE',
            },
          ],
        };

        const result = validator.validateChatRequest(request);
        expect(Array.isArray(result.messages[0].content)).toBe(true);
      });

      it('should reject excessively long text content', () => {
        const tooLongText = 'a'.repeat(101000); // Over 100k chars

        const request = {
          model: validRequest.model,
          messages: [
            {
              role: 'user',
              content: tooLongText,
              messageType: 'TEXT',
            },
          ],
        };

        expect(() => validator.validateChatRequest(request)).toThrow(
          PipelineError,
        );
      });
    });

    describe('Temperature Validation', () => {
      it('should accept valid temperature values', () => {
        const validTemps = [0, 0.5, 1.0, 1.5, 2.0];

        validTemps.forEach((temp) => {
          const request = {
            ...validRequest,
            temperature: temp,
          };

          expect(() => validator.validateChatRequest(request)).not.toThrow();
        });
      });

      it('should reject temperature below 0', () => {
        const request = {
          ...validRequest,
          temperature: -0.1,
        };

        expect(() => validator.validateChatRequest(request)).toThrow(
          PipelineError,
        );
      });

      it('should reject temperature above 2', () => {
        const request = {
          ...validRequest,
          temperature: 2.1,
        };

        expect(() => validator.validateChatRequest(request)).toThrow(
          PipelineError,
        );
      });
    });

    describe('Prompt Validation', () => {
      it('should accept valid system prompts', () => {
        const request = {
          ...validRequest,
          prompt: 'You are a helpful assistant that provides concise answers.',
        };

        const result = validator.validateChatRequest(request);
        expect(result.prompt).toBe(
          'You are a helpful assistant that provides concise answers.',
        );
      });

      it('should reject excessively long prompts', () => {
        const tooLongPrompt = 'a'.repeat(10001); // Over 10k chars

        const request = {
          ...validRequest,
          prompt: tooLongPrompt,
        };

        expect(() => validator.validateChatRequest(request)).toThrow(
          PipelineError,
        );
      });
    });

    describe('Stream Validation', () => {
      it('should accept stream as boolean', () => {
        const request1 = { ...validRequest, stream: true };
        const request2 = { ...validRequest, stream: false };

        expect(() => validator.validateChatRequest(request1)).not.toThrow();
        expect(() => validator.validateChatRequest(request2)).not.toThrow();
      });
    });

    describe('Optional Parameters', () => {
      it('should validate reasoningEffort', () => {
        const validEfforts = ['minimal', 'low', 'medium', 'high'];

        validEfforts.forEach((effort) => {
          const request = {
            ...validRequest,
            reasoningEffort: effort,
          };

          expect(() => validator.validateChatRequest(request)).not.toThrow();
        });
      });

      it('should validate verbosity', () => {
        const validVerbosity = ['low', 'medium', 'high'];

        validVerbosity.forEach((verbosity) => {
          const request = {
            ...validRequest,
            verbosity,
          };

          expect(() => validator.validateChatRequest(request)).not.toThrow();
        });
      });

      it('should reject invalid reasoningEffort', () => {
        const request = {
          ...validRequest,
          reasoningEffort: 'invalid',
        };

        expect(() => validator.validateChatRequest(request)).toThrow(
          PipelineError,
        );
      });
    });

    describe('Error Handling', () => {
      it('should throw PipelineError with correct error code', () => {
        const invalidRequest = {
          model: validRequest.model,
          messages: [],
        };

        try {
          validator.validateChatRequest(invalidRequest);
          expect.fail('Should have thrown error');
        } catch (error) {
          expect(error).toBeInstanceOf(PipelineError);
          expect((error as PipelineError).code).toBe(
            ErrorCode.VALIDATION_FAILED,
          );
          expect((error as PipelineError).severity).toBe('CRITICAL');
        }
      });

      it('should include validation errors in metadata', () => {
        const invalidRequest = {
          model: validRequest.model,
          messages: [],
        };

        try {
          validator.validateChatRequest(invalidRequest);
        } catch (error) {
          expect(error).toBeInstanceOf(PipelineError);
          const pipelineError = error as PipelineError;
          expect(pipelineError.metadata).toBeDefined();
          expect(pipelineError.metadata?.validationErrors).toBeDefined();
        }
      });
    });
  });

  describe('isValidFileUrl', () => {
    it('should accept Azure Blob Storage URLs', () => {
      const validUrls = [
        'https://storage.blob.core.windows.net/files/test.pdf',
        'https://myaccount.blob.core.windows.net/container/file.txt',
      ];

      validUrls.forEach((url) => {
        expect(validator.isValidFileUrl(url)).toBe(true);
      });
    });

    it('should accept localhost URLs for development', () => {
      const localhostUrls = [
        'http://localhost:3000/file.pdf',
        'http://localhost:8080/uploads/doc.txt',
      ];

      localhostUrls.forEach((url) => {
        expect(validator.isValidFileUrl(url)).toBe(true);
      });
    });

    it('should reject unauthorized domains (SSRF protection)', () => {
      const unauthorizedUrls = [
        'https://evil.com/malicious.pdf',
        'http://192.168.1.1/internal-file',
        'https://attacker.com/steal-data',
      ];

      unauthorizedUrls.forEach((url) => {
        expect(validator.isValidFileUrl(url)).toBe(false);
      });
    });

    it('should reject invalid URLs', () => {
      const invalidUrls = [
        'not-a-url',
        'ftp://file.txt',
        '',
        'javascript:alert(1)',
      ];

      invalidUrls.forEach((url) => {
        expect(validator.isValidFileUrl(url)).toBe(false);
      });
    });
  });

  describe('sanitizeString', () => {
    it('should trim whitespace', () => {
      const input = '  Hello World  ';
      const result = validator.sanitizeString(input);

      expect(result).toBe('Hello World');
    });

    it('should remove null bytes', () => {
      const input = 'Hello\x00World';
      const result = validator.sanitizeString(input);

      expect(result).toBe('HelloWorld');
    });

    it('should enforce maximum length', () => {
      const longString = 'a'.repeat(20000);
      const result = validator.sanitizeString(longString, 100);

      expect(result.length).toBe(100);
    });

    it('should handle empty strings', () => {
      const result = validator.sanitizeString('');

      expect(result).toBe('');
    });

    it('should preserve normal text', () => {
      const input = 'This is a normal string with punctuation!';
      const result = validator.sanitizeString(input);

      expect(result).toBe('This is a normal string with punctuation!');
    });
  });

  describe('validateRequestSize', () => {
    it('should accept requests within size limit', () => {
      const smallRequest = {
        model: { id: 'gpt-4', name: 'GPT-4' },
        messages: [{ role: 'user', content: 'Hello' }],
      };

      expect(validator.validateRequestSize(smallRequest)).toBe(true);
    });

    it('should reject oversized requests', () => {
      // Create a request larger than 10MB
      const largeContent = 'x'.repeat(11 * 1024 * 1024);
      const largeRequest = {
        model: { id: 'gpt-4' },
        messages: [{ role: 'user', content: largeContent }],
      };

      expect(validator.validateRequestSize(largeRequest)).toBe(false);
    });

    it('should accept custom size limits', () => {
      const request = {
        content: 'a'.repeat(1000),
      };

      // Should pass with 1KB limit
      expect(validator.validateRequestSize(request, 2000)).toBe(true);

      // Should fail with 500 byte limit
      expect(validator.validateRequestSize(request, 500)).toBe(false);
    });

    it('should handle non-serializable objects gracefully', () => {
      const circularRef: any = { a: 1 };
      circularRef.self = circularRef; // Create circular reference

      expect(validator.validateRequestSize(circularRef)).toBe(false);
    });
  });
});
