import { afterAll, afterEach, beforeAll, beforeEach } from 'vitest';

// Example setup code
beforeAll(() => {
  console.log('Setting up before NodeJS env tests');
});

afterAll(() => {
  console.log('Cleaning up after tests');
});

beforeEach(() => {});

afterEach(() => {});
