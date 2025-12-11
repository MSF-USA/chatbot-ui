import '@testing-library/jest-dom/vitest';
import { afterAll, afterEach, beforeAll, beforeEach, vi } from 'vitest';

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

// Example setup code
beforeAll(() => {
  console.log('Setting up before JSDom env tests');
});

afterAll(() => {
  console.log('Cleaning up after tests');
});

beforeEach(() => {});

afterEach(() => {});
