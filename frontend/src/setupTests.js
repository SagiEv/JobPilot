import '@testing-library/jest-dom';
import { vi } from 'vitest';
import './tests/setup';

// Mock ResizeObserver for D3 / Charts if needed
global.ResizeObserver = class ResizeObserver {
  observe() {}
  unobserve() {}
  disconnect() {}
};

// Clean up mocks after each test
afterEach(() => {
  vi.clearAllMocks();
});
