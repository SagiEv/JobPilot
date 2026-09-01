module.exports = {
    testMatch: ['<rootDir>/tests/**/*.test.js'],
    setupFiles: ['<rootDir>/tests/setup.js'],
    collectCoverageFrom: [
        'controllers/**/*.js',
        'services/**/*.js',
        'middleware/**/*.js',
        'utils/**/*.js',
        'schemas/**/*.js',
        '!**/node_modules/**',
    ],
    modulePathIgnorePatterns: ['<rootDir>/node_modules/', '<rootDir>/ai_service/'],
    testTimeout: 10000,
    forceExit: true,
};
