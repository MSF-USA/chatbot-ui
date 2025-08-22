import {
  AZURE_DEPLOYMENT_ID,
  DEFAULT_SYSTEM_PROMPT,
  DEFAULT_TEMPERATURE,
  OPENAI_API_HOST,
  OPENAI_API_TYPE,
  OPENAI_API_VERSION,
  OPENAI_ORGANIZATION,
  findWorkingConfiguration,
  parseApiVersionDate,
  determineApiVersion,
} from '@/utils/app/const';

import { beforeEach, describe, expect, it, vi, afterEach } from 'vitest';

describe('Test Environment Variables', () => {
  let prompt =
    process.env.NEXT_PUBLIC_DEFAULT_SYSTEM_PROMPT ||
    "You are ChatGPT, a large language model trained by OpenAI. Follow the user's instructions carefully. Respond using markdown.";
  let apiVersion = process.env.OPENAI_API_VERSION || '2025-03-01-preview';
  let org = process.env.OPENAI_ORGANIZATION || '';
  let deploymentId = process.env.AZURE_DEPLOYMENT_ID || 'gpt-35-turbo';
  beforeEach(() => {
    // @ts-ignore
    global.process.env = {
      ...global.process.env,
      NEXT_PUBLIC_DEFAULT_SYSTEM_PROMPT: 'Prompt',
      OPENAI_API_HOST: 'https://api.openai.com',
      NEXT_PUBLIC_DEFAULT_TEMPERATURE: '1',
      OPENAI_API_TYPE: 'openai',
      OPENAI_API_VERSION: '2023',
      OPENAI_ORGANIZATION: 'MyOrg',
      AZURE_DEPLOYMENT_ID: 'Azure1',
    };
  });

  it('DEFAULT_SYSTEM_PROMPT is set correctly', async () => {
    expect(DEFAULT_SYSTEM_PROMPT).toBe(prompt);
  });

  it('OPENAI_API_HOST is set correctly', async () => {
    expect(OPENAI_API_HOST).toBe('https://api.openai.com');
  });

  it('DEFAULT_TEMPERATURE is set correctly', async () => {
    expect(DEFAULT_TEMPERATURE).toBe(0.5);
  });

  it('OPENAI_API_TYPE is set correctly', async () => {
    expect(OPENAI_API_TYPE).toBe('azure');
  });

  it('OPENAI_API_VERSION is set correctly', async () => {
    expect(OPENAI_API_VERSION).toBe(apiVersion);
  });

  it('OPENAI_ORGANIZATION is set correctly', async () => {
    expect(OPENAI_ORGANIZATION).toBe(org);
  });

  it('AZURE_DEPLOYMENT_ID is set correctly', async () => {
    expect(AZURE_DEPLOYMENT_ID).toBe(deploymentId);
  });
});

describe('findWorkingConfiguration Function', () => {
  const mockResponse = (status: number, statusText: string, response: any) => {
    return new Response(JSON.stringify(response), {
      status,
      statusText,
      headers: {
        'Content-Type': 'application/json',
      },
    });
  };

  beforeEach(() => {
    // Clear OPENAI_API_KEY to force the function to test configurations
    delete process.env.OPENAI_API_KEY;

    // Mock fetch function
    global.fetch = vi
      .fn()
      .mockImplementation(() =>
        Promise.resolve(mockResponse(200, 'OK', { data: 'valid response' })),
      );
  });

  it('Throws error when no valid configuration found', async () => {
    global.fetch = vi
      .fn()
      .mockImplementation(() =>
        Promise.resolve(
          mockResponse(400, 'Bad Request', { error: 'invalid token' }),
        ),
      );

    const key = 'invalid token';
    await expect(findWorkingConfiguration(key)).rejects.toThrow(
      'No valid configuration found for this key',
    );
  });

  it('Returns a valid configuration', async () => {
    const key = 'valid token';
    const config = await findWorkingConfiguration(key);
    expect(config).toBeDefined();
    expect(config.OPENAI_API_TYPE).toBe('azure');
  });
});

describe('OPENAI_API_VERSION determination logic', () => {
  const originalEnv = process.env;
  let consoleWarnSpy: any;

  // Helper function to test determineApiVersion with mocked env variables
  function testDetermineApiVersion(envVersion: string | undefined, forceEnvVersion: string | undefined): string {
    const originalApiVersion = process.env.OPENAI_API_VERSION;
    const originalForceFlag = process.env.FORCE_OPENAI_API_VERSION;
    
    // Set test environment variables
    if (envVersion !== undefined) {
      process.env.OPENAI_API_VERSION = envVersion;
    } else {
      delete process.env.OPENAI_API_VERSION;
    }
    
    if (forceEnvVersion !== undefined) {
      process.env.FORCE_OPENAI_API_VERSION = forceEnvVersion;
    } else {
      delete process.env.FORCE_OPENAI_API_VERSION;
    }
    
    // Call the actual production function
    const result = determineApiVersion();
    
    // Restore original environment
    if (originalApiVersion !== undefined) {
      process.env.OPENAI_API_VERSION = originalApiVersion;
    } else {
      delete process.env.OPENAI_API_VERSION;
    }
    
    if (originalForceFlag !== undefined) {
      process.env.FORCE_OPENAI_API_VERSION = originalForceFlag;
    } else {
      delete process.env.FORCE_OPENAI_API_VERSION;
    }
    
    return result;
  }

  beforeEach(() => {
    consoleWarnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
  });

  afterEach(() => {
    consoleWarnSpy.mockRestore();
  });

  describe('Date parsing function', () => {
    it('parses valid date with -preview suffix', () => {
      const result = parseApiVersionDate('2025-04-01-preview');
      expect(result).toBeInstanceOf(Date);
      expect(result).not.toBeNull();
    });

    it('parses valid date without -preview suffix', () => {
      const result = parseApiVersionDate('2025-04-01');
      expect(result).toBeInstanceOf(Date);
      expect(result).not.toBeNull();
    });

    it('handles invalid date format', () => {
      const result = parseApiVersionDate('invalid-date-format');
      expect(result).toBeNull();
    });

    it('handles undefined environment variable', () => {
      const result = parseApiVersionDate(undefined);
      expect(result).toBeNull();
    });

    it('handles malformed date (invalid month)', () => {
      const result = parseApiVersionDate('2025-13-01-preview');
      // JavaScript Date constructor creates an invalid date for invalid months
      const date = new Date('2025-13-01');
      if (isNaN(date.getTime())) {
        expect(result).toBeNull();
      } else {
        expect(result).not.toBeNull();
      }
    });

    it('handles malformed date (invalid day)', () => {
      const result = parseApiVersionDate('2025-02-30-preview');
      // JavaScript Date constructor adjusts invalid days
      expect(result).not.toBeNull();
    });
  });

  describe('Version comparison logic', () => {
    it('selects environment version when newer than fallback', () => {
      const result = testDetermineApiVersion('2025-04-01-preview', undefined);
      expect(result).toBe('2025-04-01-preview');
    });

    it('selects fallback when newer than environment version', () => {
      const result = testDetermineApiVersion('2025-02-01-preview', undefined);
      expect(result).toBe('2025-03-01-preview');
    });

    it('handles equal dates (returns environment version)', () => {
      const result = testDetermineApiVersion('2025-03-01-preview', undefined);
      expect(result).toBe('2025-03-01-preview');
    });

    it('handles previous year in environment version', () => {
      const result = testDetermineApiVersion('2024-12-31-preview', undefined);
      expect(result).toBe('2025-03-01-preview');
    });

    it('handles future year in environment version', () => {
      const result = testDetermineApiVersion('2026-01-01-preview', undefined);
      expect(result).toBe('2026-01-01-preview');
    });

    it('handles dates at month boundaries', () => {
      const result = testDetermineApiVersion('2025-01-31-preview', undefined);
      expect(result).toBe('2025-03-01-preview');
    });

    it('handles dates at year boundaries', () => {
      const result = testDetermineApiVersion('2024-12-31', undefined);
      expect(result).toBe('2025-03-01-preview');
    });
  });

  describe('FORCE_OPENAI_API_VERSION flag', () => {
    it('uses environment version when force flag is true and env is older', () => {
      const result = testDetermineApiVersion('2025-02-01-preview', 'true');
      expect(result).toBe('2025-02-01-preview');
    });

    it('uses environment version when force flag is true and env is newer', () => {
      const result = testDetermineApiVersion('2025-04-01-preview', 'true');
      expect(result).toBe('2025-04-01-preview');
    });

    it('uses fallback when force flag is true but no env variable', () => {
      const result = testDetermineApiVersion(undefined, 'true');
      expect(result).toBe('2025-03-01-preview');
    });

    it('ignores force flag when not set to "true"', () => {
      const result = testDetermineApiVersion('2025-02-01-preview', 'false');
      expect(result).toBe('2025-03-01-preview');
    });

    it('ignores force flag when undefined', () => {
      const result = testDetermineApiVersion('2025-02-01-preview', undefined);
      expect(result).toBe('2025-03-01-preview');
    });
  });

  describe('Edge cases and error handling', () => {
    it('handles empty string environment variable', () => {
      const result = testDetermineApiVersion('', undefined);
      expect(result).toBe('2025-03-01-preview');
    });

    it('handles whitespace-only environment variable', () => {
      const result = testDetermineApiVersion('   ', undefined);
      expect(result).toBe('2025-03-01-preview');
    });

    it('handles partial date format', () => {
      const result = testDetermineApiVersion('2025-04', undefined);
      expect(result).toBe('2025-03-01-preview');
    });

    it('handles date with extra text after preview', () => {
      const result = testDetermineApiVersion('2025-04-01-preview-extra', undefined);
      expect(result).toBe('2025-04-01-preview-extra');
    });

    it('handles date with different separator', () => {
      const result = testDetermineApiVersion('2025/04/01', undefined);
      expect(result).toBe('2025-03-01-preview');
    });

    it('handles leap year date (Feb 29)', () => {
      const result = testDetermineApiVersion('2024-02-29-preview', undefined);
      expect(result).toBe('2025-03-01-preview');
    });

    it('handles invalid leap year date (Feb 29 in non-leap year)', () => {
      // JavaScript Date constructor adjusts Feb 29 in non-leap year to March 1
      // The date will be valid but different, so it won't be newer than fallback
      const result = testDetermineApiVersion('2025-02-29-preview', undefined);
      // The date parser will create a valid date (March 1, 2025)
      // which equals the fallback date, so environment version is returned
      expect(result).toBe('2025-02-29-preview');
    });

    it('handles date at start of year', () => {
      const result = testDetermineApiVersion('2025-01-01-preview', undefined);
      expect(result).toBe('2025-03-01-preview');
    });

    it('handles date at end of year', () => {
      const result = testDetermineApiVersion('2025-12-31-preview', undefined);
      expect(result).toBe('2025-12-31-preview');
    });

    it('handles numeric-only version', () => {
      const result = testDetermineApiVersion('20250401', undefined);
      expect(result).toBe('2025-03-01-preview');
    });

    it('handles version with letters', () => {
      const result = testDetermineApiVersion('v2025-04-01', undefined);
      expect(result).toBe('2025-03-01-preview');
    });

    it('handles zero-padded dates correctly', () => {
      const result = testDetermineApiVersion('2025-04-01-preview', undefined);
      expect(result).toBe('2025-04-01-preview');
    });

    it('handles dates without zero-padding', () => {
      const result = testDetermineApiVersion('2025-4-1-preview', undefined);
      expect(result).toBe('2025-03-01-preview');
    });
  });

  describe('Multiple scenario combinations', () => {
    it('handles force flag with invalid date', () => {
      const result = testDetermineApiVersion('invalid-date', 'true');
      expect(result).toBe('invalid-date');
    });

    it('handles force flag with empty env variable', () => {
      const result = testDetermineApiVersion('', 'true');
      expect(result).toBe('2025-03-01-preview');
    });

    it('compares dates correctly when both are valid but different formats', () => {
      const result = testDetermineApiVersion('2025-04-01', undefined);
      expect(result).toBe('2025-04-01');
    });

    it('handles same date different format suffix', () => {
      const result = testDetermineApiVersion('2025-03-01', undefined);
      expect(result).toBe('2025-03-01');
    });

    it('verifies console warning on error', () => {
      // Mock a scenario that would cause an error in try-catch
      const originalDate = global.Date;
      (global as any).Date = vi.fn().mockImplementation(() => {
        throw new Error('Date constructor error');
      });
      
      const result = testDetermineApiVersion('2025-04-01', undefined);
      expect(result).toBe('2025-04-01');
      expect(consoleWarnSpy).toHaveBeenCalledWith(
        'Error parsing API version dates, using fallback logic:',
        expect.any(Error)
      );
      
      global.Date = originalDate;
    });
  });
});
