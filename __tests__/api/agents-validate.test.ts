import { NextRequest } from 'next/server';

import { POST } from '@/app/api/agents/validate/route';
import { beforeEach, describe, expect, it, vi } from 'vitest';

// Mock auth
vi.mock('@/auth', () => ({
  auth: vi.fn(),
}));

// Mock Azure libraries
vi.mock('@azure/ai-agents', () => ({
  AgentsClient: vi.fn().mockImplementation(function () {
    return {
      getAgent: vi.fn(),
    };
  }),
}));

vi.mock('@azure/identity', () => ({
  DefaultAzureCredential: vi.fn().mockImplementation(function () {
    return {};
  }),
}));

describe('POST /api/agents/validate', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    process.env.AZURE_AI_FOUNDRY_ENDPOINT =
      'https://test.services.ai.azure.com';
  });

  const createMockRequest = (body: any) => {
    return new NextRequest('http://localhost:3000/api/agents/validate', {
      method: 'POST',
      body: JSON.stringify(body),
      headers: {
        'Content-Type': 'application/json',
      },
    });
  };

  describe('Authentication', () => {
    it('returns 401 when no session', async () => {
      const { auth } = await import('@/auth');
      vi.mocked(auth).mockResolvedValue(null);

      const request = createMockRequest({ agentId: 'asst_test123' });
      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(401);
      expect(data.error).toBe('Unauthorized');
    });

    it('returns 401 when no user in session', async () => {
      const { auth } = await import('@/auth');
      vi.mocked(auth).mockResolvedValue({ user: null } as any);

      const request = createMockRequest({ agentId: 'asst_test123' });
      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(401);
      expect(data.error).toBe('Unauthorized');
    });
  });

  describe('Request Validation', () => {
    it('returns 400 when agentId is missing', async () => {
      const { auth } = await import('@/auth');
      vi.mocked(auth).mockResolvedValue({ user: { id: 'test' } } as any);

      const request = createMockRequest({});
      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toBe('Agent ID is required');
    });

    it('returns 400 when agentId is not a string', async () => {
      const { auth } = await import('@/auth');
      vi.mocked(auth).mockResolvedValue({ user: { id: 'test' } } as any);

      const request = createMockRequest({ agentId: 123 });
      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toBe('Agent ID is required');
    });

    it('returns 400 when agentId has invalid format', async () => {
      const { auth } = await import('@/auth');
      vi.mocked(auth).mockResolvedValue({ user: { id: 'test' } } as any);

      const request = createMockRequest({ agentId: 'invalid-format' });
      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toBe('Invalid agent ID format');
      expect(data.details).toContain('asst_');
    });

    it('accepts valid agent ID formats', async () => {
      const { auth } = await import('@/auth');
      vi.mocked(auth).mockResolvedValue({ user: { id: 'test' } } as any);

      const { AgentsClient } = await import('@azure/ai-agents');
      const mockGetAgent = vi.fn().mockResolvedValue({
        name: 'Test Agent',
      });
      vi.mocked(AgentsClient).mockImplementation(
        () =>
          ({
            getAgent: mockGetAgent,
          }) as any,
      );

      const validIds = ['asst_abc123', 'asst_XYZ-789', 'asst_test_agent'];

      for (const agentId of validIds) {
        mockGetAgent.mockClear();
        const request = createMockRequest({ agentId });
        const response = await POST(request);
        expect(response.status).not.toBe(400);
      }
    });
  });

  describe('Configuration', () => {
    it('returns 500 when endpoint not configured', async () => {
      const { auth } = await import('@/auth');
      vi.mocked(auth).mockResolvedValue({ user: { id: 'test' } } as any);

      delete process.env.AZURE_AI_FOUNDRY_ENDPOINT;

      const request = createMockRequest({ agentId: 'asst_test123' });
      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(500);
      expect(data.error).toBe('Azure AI Foundry endpoint not configured');
      expect(data.details).toContain('Server configuration error');
    });
  });

  describe('Agent Validation', () => {
    it('returns success when agent is found', async () => {
      const { auth } = await import('@/auth');
      vi.mocked(auth).mockResolvedValue({ user: { id: 'test' } } as any);

      const { AgentsClient } = await import('@azure/ai-agents');
      const mockGetAgent = vi.fn().mockResolvedValue({
        name: 'Test Agent',
      });
      vi.mocked(AgentsClient).mockImplementation(function () {
        return {
          getAgent: mockGetAgent,
        };
      } as any);

      const request = createMockRequest({ agentId: 'asst_test123' });
      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.valid).toBe(true);
      expect(data.agentId).toBe('asst_test123');
      expect(data.agentName).toBe('Test Agent');
      expect(data.message).toBe('Agent validated successfully');
    });

    it('handles agent with no name', async () => {
      const { auth } = await import('@/auth');
      vi.mocked(auth).mockResolvedValue({ user: { id: 'test' } } as any);

      const { AgentsClient } = await import('@azure/ai-agents');
      const mockGetAgent = vi.fn().mockResolvedValue({});
      vi.mocked(AgentsClient).mockImplementation(function () {
        return {
          getAgent: mockGetAgent,
        };
      } as any);

      const request = createMockRequest({ agentId: 'asst_test123' });
      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.agentName).toBe('Unknown');
    });

    it('returns 404 when agent not found (null response)', async () => {
      const { auth } = await import('@/auth');
      vi.mocked(auth).mockResolvedValue({ user: { id: 'test' } } as any);

      const { AgentsClient } = await import('@azure/ai-agents');
      const mockGetAgent = vi.fn().mockResolvedValue(null);
      vi.mocked(AgentsClient).mockImplementation(function () {
        return {
          getAgent: mockGetAgent,
        };
      } as any);

      const request = createMockRequest({ agentId: 'asst_notfound' });
      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(404);
      expect(data.error).toBe('Agent not found');
      expect(data.details).toContain('asst_notfound');
    });

    it('returns 404 when agent not found (404 error)', async () => {
      const { auth } = await import('@/auth');
      vi.mocked(auth).mockResolvedValue({ user: { id: 'test' } } as any);

      const { AgentsClient } = await import('@azure/ai-agents');
      const mockGetAgent = vi.fn().mockRejectedValue({
        statusCode: 404,
        code: 'NotFound',
      });
      vi.mocked(AgentsClient).mockImplementation(function () {
        return {
          getAgent: mockGetAgent,
        };
      } as any);

      const request = createMockRequest({ agentId: 'asst_notfound' });
      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(404);
      expect(data.error).toBe('Agent not found');
      expect(data.details).toContain('asst_notfound');
    });

    it('returns 403 when access denied', async () => {
      const { auth } = await import('@/auth');
      vi.mocked(auth).mockResolvedValue({ user: { id: 'test' } } as any);

      const { AgentsClient } = await import('@azure/ai-agents');
      const mockGetAgent = vi.fn().mockRejectedValue({
        statusCode: 403,
        code: 'Forbidden',
      });
      vi.mocked(AgentsClient).mockImplementation(function () {
        return {
          getAgent: mockGetAgent,
        };
      } as any);

      const request = createMockRequest({ agentId: 'asst_forbidden' });
      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(403);
      expect(data.error).toBe('Access denied');
      expect(data.details).toContain('permission');
    });

    it('returns 500 for generic Azure errors', async () => {
      const { auth } = await import('@/auth');
      vi.mocked(auth).mockResolvedValue({ user: { id: 'test' } } as any);

      const { AgentsClient } = await import('@azure/ai-agents');
      const mockGetAgent = vi.fn().mockRejectedValue({
        message: 'Network timeout',
      });
      vi.mocked(AgentsClient).mockImplementation(function () {
        return {
          getAgent: mockGetAgent,
        };
      } as any);

      const request = createMockRequest({ agentId: 'asst_test123' });
      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(500);
      expect(data.error).toBe('Validation failed');
      expect(data.details).toContain('Network timeout');
    });
  });

  describe('Error Handling', () => {
    it('handles JSON parsing errors', async () => {
      const { auth } = await import('@/auth');
      vi.mocked(auth).mockResolvedValue({ user: { id: 'test' } } as any);

      const request = new NextRequest(
        'http://localhost:3000/api/agents/validate',
        {
          method: 'POST',
          body: 'invalid json',
          headers: {
            'Content-Type': 'application/json',
          },
        },
      );

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(500);
      expect(data.error).toBe('Server error');
    });

    it('handles unexpected errors', async () => {
      const { auth } = await import('@/auth');
      vi.mocked(auth).mockRejectedValue(new Error('Unexpected auth error'));

      const request = createMockRequest({ agentId: 'asst_test123' });
      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(500);
      expect(data.error).toBe('Server error');
    });
  });

  describe('Azure Client Initialization', () => {
    it('creates client with correct endpoint and credentials', async () => {
      const { auth } = await import('@/auth');
      vi.mocked(auth).mockResolvedValue({ user: { id: 'test' } } as any);

      const { AgentsClient } = await import('@azure/ai-agents');
      const { DefaultAzureCredential } = await import('@azure/identity');

      const mockGetAgent = vi.fn().mockResolvedValue({ name: 'Test' });
      vi.mocked(AgentsClient).mockImplementation(function () {
        return {
          getAgent: mockGetAgent,
        };
      } as any);

      const request = createMockRequest({ agentId: 'asst_test123' });
      await POST(request);

      expect(AgentsClient).toHaveBeenCalledWith(
        'https://test.services.ai.azure.com',
        expect.any(Object), // DefaultAzureCredential instance
      );
    });
  });
});
