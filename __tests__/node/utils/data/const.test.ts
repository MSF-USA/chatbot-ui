import {
  AZURE_DEPLOYMENT_ID,
  DEFAULT_SYSTEM_PROMPT,
  DEFAULT_TEMPERATURE,
  OPENAI_API_HOST,
  OPENAI_API_TYPE,
  OPENAI_API_VERSION,
  OPENAI_ORGANIZATION,
  findWorkingConfiguration,
} from '@/utils/app/const';

import { beforeEach, describe, expect, it, vi } from 'vitest';

describe('Test Environment Variables', () => {
  let prompt =
    process.env.NEXT_PUBLIC_DEFAULT_SYSTEM_PROMPT ||
    "You are ChatGPT, a large language model trained by OpenAI. Follow the user's instructions carefully. Respond using markdown.";
  let apiVersion = process.env.OPENAI_API_VERSION || '2024-03-01-preview';
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
