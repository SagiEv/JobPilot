'use strict';

// ─────────────────────────────────────────────────────────────────────────────
// Chainable Supabase Mock
//
// Usage in tests:
//   jest.mock('../../supabaseClient', () => require('../helpers/mockSupabase').createMockSupabase());
//
// Then in each test:
//   const supabase = require('../../supabaseClient');
//   supabase.__setResult({ data: [...], error: null });
// ─────────────────────────────────────────────────────────────────────────────

function createMockSupabase() {
    let _result = { data: null, error: null };

    const chainable = () => {
        const chain = {
            select: jest.fn().mockReturnThis(),
            insert: jest.fn().mockReturnThis(),
            update: jest.fn().mockReturnThis(),
            delete: jest.fn().mockReturnThis(),
            upsert: jest.fn().mockReturnThis(),
            eq: jest.fn().mockReturnThis(),
            in: jest.fn().mockReturnThis(),
            single: jest.fn(() => Promise.resolve(_result)),
            order: jest.fn().mockReturnThis(),
            limit: jest.fn().mockReturnThis(),
            rpc: jest.fn(() => Promise.resolve(_result)),
            then: jest.fn((resolve) => resolve(_result)),
        };
        // Make the chain itself thenable (for `await supabase.from(...).select(...)`)
        chain[Symbol.for('jest.asymmetricMatch')] = undefined;
        return chain;
    };

    const mock = {
        from: jest.fn(() => chainable()),
        rpc: jest.fn(() => Promise.resolve(_result)),
        auth: {
            getUser: jest.fn(() => Promise.resolve({ data: { user: null }, error: null })),
            signUp: jest.fn(() => Promise.resolve({ data: null, error: null })),
            signInWithPassword: jest.fn(() => Promise.resolve({ data: null, error: null })),
            refreshSession: jest.fn(() => Promise.resolve({ data: null, error: null })),
        },
        __setResult: (result) => { _result = result; },
        __reset: () => { _result = { data: null, error: null }; },
    };

    // Also expose adminSupabase and createAuthClient
    mock.adminSupabase = mock;
    mock.createAuthClient = jest.fn(() => mock);

    return mock;
}

module.exports = { createMockSupabase };
