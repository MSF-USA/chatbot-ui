import React from 'react';

import '@testing-library/jest-dom/vitest';
import { afterAll, afterEach, beforeAll, beforeEach, vi } from 'vitest';

// Mock next-auth to prevent module resolution errors in test environment
vi.mock('next-auth', () => ({
  default: () => ({
    handlers: { GET: vi.fn(), POST: vi.fn() },
    signIn: vi.fn(),
    signOut: vi.fn(),
    auth: vi.fn(),
  }),
  getServerSession: vi.fn(),
}));

vi.mock('next-auth/react', () => ({
  useSession: () => ({
    data: null,
    status: 'unauthenticated',
  }),
  signIn: vi.fn(),
  signOut: vi.fn(),
  SessionProvider: ({ children }: { children: React.ReactNode }) => children,
}));

// Mock CSS imports
vi.mock('katex/dist/katex.min.css', () => ({}));

// Mock localStorage for Zustand persist middleware in jsdom environment
// jsdom has localStorage but it may not be fully compatible with Zustand's persist middleware
const localStorageMock = {
  store: {} as Record<string, string>,
  getItem(key: string) {
    return this.store[key] ?? null;
  },
  setItem(key: string, value: string) {
    this.store[key] = value;
  },
  removeItem(key: string) {
    delete this.store[key];
  },
  clear() {
    this.store = {};
  },
  get length() {
    return Object.keys(this.store).length;
  },
  key(index: number) {
    return Object.keys(this.store)[index] ?? null;
  },
};

Object.defineProperty(global, 'localStorage', {
  value: localStorageMock,
  writable: true,
});

Object.defineProperty(window, 'localStorage', {
  value: localStorageMock,
  writable: true,
});

// Example setup code
beforeAll(() => {
  console.log('Setting up before JSDom env tests');
});

afterAll(() => {
  console.log('Cleaning up after tests');
});

beforeEach(() => {
  // Clear localStorage before each test
  localStorageMock.clear();
});

afterEach(() => {});
