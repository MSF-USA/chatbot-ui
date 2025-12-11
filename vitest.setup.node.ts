import { afterAll, afterEach, beforeAll, beforeEach } from 'vitest';

// Mock localStorage for Zustand persist middleware
// Node.js environment doesn't have localStorage, but Zustand's persist middleware requires it
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
  console.log('Setting up before NodeJS env tests');
});

afterAll(() => {
  console.log('Cleaning up after tests');
});

beforeEach(() => {});

afterEach(() => {});
