// Shared project-level options (safe to spread into individual projects)
const projectBase = {
    collectCoverageFrom: [
        'controllers/**/*.js',
        'services/**/*.js',
        'middleware/**/*.js',
        'utils/**/*.js',
        'schemas/**/*.js',
        '!**/node_modules/**',
    ],
    modulePathIgnorePatterns: ['<rootDir>/node_modules/', '<rootDir>/ai_service/'],
};

module.exports = {
    // Root-level options (not valid inside project configs)
    forceExit: true,
    projects: [
        // ── Unit tests (existing) ──────────────────────────────────────
        {
            ...projectBase,
            displayName: 'unit',
            testMatch: ['<rootDir>/tests/**/*.test.js'],
            testPathIgnorePatterns: ['<rootDir>/tests/integration/'],
            setupFiles: ['<rootDir>/tests/setup.js'],
            testTimeout: 10000,
        },
        // ── Integration tests ──────────────────────────────────────────
        {
            ...projectBase,
            displayName: 'integration',
            testMatch: ['<rootDir>/tests/integration/**/*.integration.test.js'],
            setupFiles: ['<rootDir>/tests/integration/setup.integration.js'],
            testTimeout: 30000,
        },
    ],
};

