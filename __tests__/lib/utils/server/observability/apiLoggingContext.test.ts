import { createApiLoggingContext } from '@/lib/utils/server/observability/apiLoggingContext';

import { beforeEach, describe, expect, it, vi } from 'vitest';

// Mock the Azure Monitor Logger
vi.mock('@/lib/services/observability/AzureMonitorLoggingService', () => ({
  getAzureMonitorLogger: vi.fn(() => ({
    logError: vi.fn(),
    logChatCompletion: vi.fn(),
    isConnected: vi.fn(() => false),
  })),
}));

describe('apiLoggingContext', () => {
  describe('createApiLoggingContext', () => {
    beforeEach(() => {
      vi.useFakeTimers();
    });

    it('creates a context with null session', () => {
      const ctx = createApiLoggingContext();
      expect(ctx.session).toBeNull();
    });

    it('returns undefined for user when session is null', () => {
      const ctx = createApiLoggingContext();
      expect(ctx.user).toBeUndefined();
    });

    it('provides access to the logger', () => {
      const ctx = createApiLoggingContext();
      expect(ctx.logger).toBeDefined();
      expect(typeof ctx.logger.logError).toBe('function');
    });

    it('provides a timer that starts on creation', () => {
      const ctx = createApiLoggingContext();
      expect(ctx.timer).toBeDefined();
      expect(ctx.timer.elapsed()).toBe(0);

      vi.advanceTimersByTime(100);
      expect(ctx.timer.elapsed()).toBe(100);

      vi.useRealTimers();
    });

    it('provides getErrorMessage function', () => {
      const ctx = createApiLoggingContext();
      expect(typeof ctx.getErrorMessage).toBe('function');
      expect(ctx.getErrorMessage(new Error('test'))).toBe('test');
    });

    it('provides getErrorDetails function', () => {
      const ctx = createApiLoggingContext();
      expect(typeof ctx.getErrorDetails).toBe('function');
      const details = ctx.getErrorDetails(new Error('test'));
      expect(details.message).toBe('test');
    });

    it('allows session to be set after creation', () => {
      const ctx = createApiLoggingContext();
      expect(ctx.session).toBeNull();

      const mockSession = {
        user: {
          id: 'user-123',
          mail: 'test@example.com',
          givenName: 'Test',
          surname: 'User',
        },
        expires: '2024-01-01',
      };

      ctx.session = mockSession;
      expect(ctx.session).toBe(mockSession);
    });

    it('returns user from session after session is set', () => {
      const ctx = createApiLoggingContext();
      const mockUser = {
        id: 'user-123',
        mail: 'test@example.com',
        givenName: 'Test',
        surname: 'User',
      };

      ctx.session = {
        user: mockUser,
        expires: '2024-01-01',
      };

      expect(ctx.user).toBe(mockUser);
    });

    it('returns undefined for user when session has no user', () => {
      const ctx = createApiLoggingContext();
      // @ts-expect-error Testing edge case with session without user
      ctx.session = { expires: '2024-01-01' };

      expect(ctx.user).toBeUndefined();
    });

    it('creates independent contexts', () => {
      const ctx1 = createApiLoggingContext();
      const ctx2 = createApiLoggingContext();

      ctx1.session = {
        user: { id: 'user-1', mail: 'user1@example.com' },
        expires: '2024-01-01',
      };

      expect(ctx1.user?.id).toBe('user-1');
      expect(ctx2.session).toBeNull();
      expect(ctx2.user).toBeUndefined();

      vi.useRealTimers();
    });

    it('each context has its own timer', () => {
      const ctx1 = createApiLoggingContext();
      vi.advanceTimersByTime(50);
      const ctx2 = createApiLoggingContext();
      vi.advanceTimersByTime(50);

      expect(ctx1.timer.elapsed()).toBe(100);
      expect(ctx2.timer.elapsed()).toBe(50);

      vi.useRealTimers();
    });
  });
});
