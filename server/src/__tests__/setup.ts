// Global test setup for Vitest
// This file is loaded before each test file via vitest.config.ts setupFiles

import { vi } from 'vitest';

// Set environment variables needed by various modules
process.env.OPENROUTER_API_KEY = 'sk_test_mock_openrouter_key';

// Reset all mocks between tests
afterEach(() => {
    vi.clearAllMocks();
});
