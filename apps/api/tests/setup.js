/**
 * Jest Test Setup
 *
 * Global setup and mocks for all tests
 */

// Set test environment variables
process.env.NODE_ENV = 'test';
process.env.SESSION_SECRET = 'test-session-secret';
process.env.REDIRECT_URI = 'http://localhost:3000/callback';

// Increase timeout for integration tests
jest.setTimeout(10000);

// Mock logger to avoid console noise during tests
jest.mock('../src/logger', () => ({
  info: jest.fn(),
  warn: jest.fn(),
  error: jest.fn(),
  debug: jest.fn()
}));

// Clean up after all tests
afterAll(async () => {
  // Allow async operations to complete
  await new Promise(resolve => setTimeout(resolve, 100));
});
