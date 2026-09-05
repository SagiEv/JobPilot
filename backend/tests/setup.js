'use strict';

// ── Stub environment variables so modules that read process.env on load don't crash ──
process.env.SUPABASE_URL = process.env.SUPABASE_URL || 'http://localhost:54321';
process.env.SUPABASE_ANON_KEY = process.env.SUPABASE_ANON_KEY || 'dummy_anon_key';
process.env.GROQ_API_KEY = process.env.GROQ_API_KEY || 'dummy_groq_key';
process.env.JWT_SECRET = process.env.JWT_SECRET || 'dummy_jwt_secret';
process.env.ENCRYPTION_KEY = process.env.ENCRYPTION_KEY || '0123456789abcdef0123456789abcdef';
process.env.NODE_ENV = 'test';

// ── Mock Supabase Client globally ──
// This ensures that any module requiring supabaseClient gets the mock instead of the real one,
jest.mock('../supabaseClient', () => {
    const chain = {
        single: jest.fn(),
    };
    chain.select = jest.fn(() => chain);
    chain.insert = jest.fn(() => chain);
    chain.update = jest.fn(() => chain);
    chain.delete = jest.fn(() => chain);
    chain.eq = jest.fn(() => chain);
    chain.in = jest.fn(() => chain);
    chain.order = jest.fn(() => chain);
    
    // Make the chain awaitable
    chain.then = jest.fn((resolve) => resolve({ data: [], error: null }));
    
    const mockClient = {
        from: jest.fn(() => chain),
        auth: {
            getUser: jest.fn(),
        },
        __chain: chain,
    };
    mockClient.adminSupabase = mockClient;
    return mockClient;
}, { virtual: true });

// ── Silence console logs during tests unless explicitly requested ──
if (process.env.DEBUG_TESTS !== 'true') {
    jest.spyOn(console, 'log').mockImplementation(() => {});
    jest.spyOn(console, 'info').mockImplementation(() => {});
    // We intentionally keep console.warn and console.error active to spot issues
}
