import { NextRequest } from 'next/server';

import { HealthCheckService } from '@/lib/services/health';

import { GET } from '@/app/api/health/route';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

/**
 * Creates a mock NextRequest with the given URL.
 *
 * @param url - The URL for the request
 * @returns A NextRequest object
 */
function createMockRequest(url: string): NextRequest {
  return new NextRequest(new URL(url, 'http://localhost:3000'));
}

describe('GET /api/health', () => {
  describe('Liveness Check (default)', () => {
    it('returns 200 OK status', async () => {
      const request = createMockRequest('/api/health');
      const response = await GET(request);
      expect(response.status).toBe(200);
    });

    it('returns OK text', async () => {
      const request = createMockRequest('/api/health');
      const response = await GET(request);
      const text = await response.text();
      expect(text).toBe('OK');
    });

    it('has correct content type', async () => {
      const request = createMockRequest('/api/health');
      const response = await GET(request);
      expect(response.headers.get('content-type')).toContain('text/plain');
    });

    it('returns OK for explicit live check', async () => {
      const request = createMockRequest('/api/health?check=live');
      const response = await GET(request);
      expect(response.status).toBe(200);
      const text = await response.text();
      expect(text).toBe('OK');
    });

    it('returns OK for invalid check parameter', async () => {
      const request = createMockRequest('/api/health?check=invalid');
      const response = await GET(request);
      expect(response.status).toBe(200);
      const text = await response.text();
      expect(text).toBe('OK');
    });
  });

  describe('Readiness Check', () => {
    beforeEach(() => {
      // Reset the health check service singleton before each test
      HealthCheckService.reset();
    });

    afterEach(() => {
      vi.restoreAllMocks();
    });

    it('returns JSON response for ready check', async () => {
      const request = createMockRequest('/api/health?check=ready');
      const response = await GET(request);

      // Should return JSON (either healthy, degraded, or unhealthy)
      expect(response.headers.get('content-type')).toContain(
        'application/json',
      );

      const json = await response.json();
      expect(json).toHaveProperty('status');
      expect(json).toHaveProperty('timestamp');
      expect(json).toHaveProperty('level', 'ready');
      expect(json).toHaveProperty('checks');

      // Status should be one of the valid health statuses
      expect(['healthy', 'degraded', 'unhealthy']).toContain(json.status);
    });

    it('includes azureOpenAI and azureSearch checks', async () => {
      const request = createMockRequest('/api/health?check=ready');
      const response = await GET(request);
      const json = await response.json();

      // Should have checks for critical services
      expect(json.checks).toHaveProperty('azureOpenAI');
      expect(json.checks).toHaveProperty('azureSearch');

      // Should NOT have non-critical services in ready check
      expect(json.checks).not.toHaveProperty('azureBlobStorage');
      expect(json.checks).not.toHaveProperty('azureSpeechWhisper');
    });
  });

  describe('Deep Check', () => {
    beforeEach(() => {
      // Reset the health check service singleton before each test
      HealthCheckService.reset();
    });

    afterEach(() => {
      vi.restoreAllMocks();
    });

    it('returns JSON response for deep check', async () => {
      const request = createMockRequest('/api/health?check=deep');
      const response = await GET(request);

      expect(response.headers.get('content-type')).toContain(
        'application/json',
      );

      const json = await response.json();
      expect(json).toHaveProperty('status');
      expect(json).toHaveProperty('timestamp');
      expect(json).toHaveProperty('level', 'deep');
      expect(json).toHaveProperty('checks');
    });

    it('includes all Azure service checks', async () => {
      const request = createMockRequest('/api/health?check=deep');
      const response = await GET(request);
      const json = await response.json();

      // Should have checks for all services
      expect(json.checks).toHaveProperty('azureOpenAI');
      expect(json.checks).toHaveProperty('azureSearch');
      expect(json.checks).toHaveProperty('azureBlobStorage');
      expect(json.checks).toHaveProperty('azureSpeechWhisper');
    });
  });

  describe('HTTP Status Codes', () => {
    beforeEach(() => {
      HealthCheckService.reset();
    });

    afterEach(() => {
      vi.restoreAllMocks();
    });

    it('returns 200 for healthy status', async () => {
      // Mock the HealthCheckService to return healthy
      vi.spyOn(HealthCheckService.prototype, 'check').mockResolvedValue({
        status: 'healthy',
        timestamp: new Date().toISOString(),
        level: 'ready',
        checks: {
          azureOpenAI: { status: 'pass', latencyMs: 100 },
          azureSearch: { status: 'pass', latencyMs: 50 },
        },
      });

      const request = createMockRequest('/api/health?check=ready');
      const response = await GET(request);
      expect(response.status).toBe(200);
    });

    it('returns 200 for degraded status', async () => {
      // Mock the HealthCheckService to return degraded
      vi.spyOn(HealthCheckService.prototype, 'check').mockResolvedValue({
        status: 'degraded',
        timestamp: new Date().toISOString(),
        level: 'deep',
        checks: {
          azureOpenAI: { status: 'pass', latencyMs: 100 },
          azureSearch: { status: 'pass', latencyMs: 50 },
          azureBlobStorage: { status: 'fail', message: 'timeout' },
          azureSpeechWhisper: { status: 'pass', latencyMs: 75 },
        },
      });

      const request = createMockRequest('/api/health?check=deep');
      const response = await GET(request);
      expect(response.status).toBe(200);

      const json = await response.json();
      expect(json.status).toBe('degraded');
    });

    it('returns 503 for unhealthy status', async () => {
      // Mock the HealthCheckService to return unhealthy
      vi.spyOn(HealthCheckService.prototype, 'check').mockResolvedValue({
        status: 'unhealthy',
        timestamp: new Date().toISOString(),
        level: 'ready',
        checks: {
          azureOpenAI: { status: 'fail', message: 'connection refused' },
          azureSearch: { status: 'pass', latencyMs: 50 },
        },
      });

      const request = createMockRequest('/api/health?check=ready');
      const response = await GET(request);
      expect(response.status).toBe(503);

      const json = await response.json();
      expect(json.status).toBe('unhealthy');
    });
  });
});
