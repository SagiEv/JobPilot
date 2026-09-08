'use strict';

// ─────────────────────────────────────────────────────────────────────────────
// Supabase Sandbox — per-test mock with call tracking & configurable responses
//
// Usage:
//   const { createSandbox } = require('./supabaseSandbox');
//   let sb;
//   beforeEach(() => { sb = createSandbox(); });
//   afterEach(() => sb.reset());
//
//   // Queue a response for a specific table+operation
//   sb.onTable('applications').forSelect({ data: [...], error: null });
//   sb.onTable('applications').forInsert({ data: {...}, error: null });
//
//   // After the code runs, inspect what was called
//   sb.getCallsTo('applications', 'select');  // => [{ args: [...] }]
// ─────────────────────────────────────────────────────────────────────────────

function createSandbox() {
    // Per-table, per-operation response queues
    // Structure: { 'tableName': { select: [...], insert: [...], ... } }
    const _responses = {};

    // Call history
    // Structure: { 'tableName': { select: [{ args, filters }], ... } }
    const _calls = {};

    // Auth mock state
    let _authGetUserResult = {
        data: {
            user: {
                id: 'user-uuid-123',
                email: 'test@example.com',
                user_metadata: { role: 'user' },
                app_metadata: {},
            },
        },
        error: null,
    };

    // RPC mock responses: { 'function_name': { data, error } }
    const _rpcResponses = {};

    function _getResponse(table, operation) {
        if (!_responses[table]?.[operation]?.length) {
            return { data: null, error: null };
        }
        // Shift the first queued response (FIFO)
        return _responses[table][operation].shift();
    }

    function _recordCall(table, operation, args = {}) {
        if (!_calls[table]) _calls[table] = {};
        if (!_calls[table][operation]) _calls[table][operation] = [];
        _calls[table][operation].push(args);
    }

    function _queueResponse(table, operation, result) {
        if (!_responses[table]) _responses[table] = {};
        if (!_responses[table][operation]) _responses[table][operation] = [];
        _responses[table][operation].push(result);
    }

    /**
     * Create a chainable query builder that mimics Supabase's PostgREST client.
     */
    function _createChain(table) {
        let _operation = null;
        let _operationArgs = null;
        const _filters = {};

        const chain = {
            select: jest.fn(function (...args) {
                if (!_operation) _operation = 'select';
                _operationArgs = args;
                return chain;
            }),
            insert: jest.fn(function (data) {
                _operation = 'insert';
                _operationArgs = data;
                return chain;
            }),
            update: jest.fn(function (data) {
                _operation = 'update';
                _operationArgs = data;
                return chain;
            }),
            upsert: jest.fn(function (data) {
                _operation = 'upsert';
                _operationArgs = data;
                return chain;
            }),
            delete: jest.fn(function () {
                _operation = 'delete';
                return chain;
            }),
            eq: jest.fn(function (col, val) {
                _filters[col] = val;
                return chain;
            }),
            neq: jest.fn(function (col, val) {
                _filters[`neq_${col}`] = val;
                return chain;
            }),
            in: jest.fn(function (col, vals) {
                _filters[`in_${col}`] = vals;
                return chain;
            }),
            not: jest.fn(function (col, op, val) {
                _filters[`not_${col}`] = { op, val };
                return chain;
            }),
            or: jest.fn(function (expr) {
                _filters['_or'] = expr;
                return chain;
            }),
            gte: jest.fn(function (col, val) {
                _filters[`gte_${col}`] = val;
                return chain;
            }),
            lte: jest.fn(function (col, val) {
                _filters[`lte_${col}`] = val;
                return chain;
            }),
            order: jest.fn(function () { return chain; }),
            limit: jest.fn(function () { return chain; }),
            maybeSingle: jest.fn(function () {
                const op = _operation || 'select';
                _recordCall(table, op, { args: _operationArgs, filters: { ..._filters } });
                return Promise.resolve(_getResponse(table, op));
            }),
            single: jest.fn(function () {
                const op = _operation || 'select';
                _recordCall(table, op, { args: _operationArgs, filters: { ..._filters } });
                return Promise.resolve(_getResponse(table, op));
            }),
            then: jest.fn(function (resolve, reject) {
                const op = _operation || 'select';
                _recordCall(table, op, { args: _operationArgs, filters: { ..._filters } });
                const result = _getResponse(table, op);
                if (reject && result.error) return reject(result);
                return resolve(result);
            }),
        };

        return chain;
    }

    // ── Public API ────────────────────────────────────────────────────────────

    const mock = {
        from: jest.fn((table) => _createChain(table)),

        rpc: jest.fn((fnName, params) => {
            _recordCall('_rpc', fnName, params);
            const result = _rpcResponses[fnName] || { data: null, error: null };
            return Promise.resolve(result);
        }),

        auth: {
            getUser: jest.fn((token) => Promise.resolve(_authGetUserResult)),
            signUp: jest.fn(() => Promise.resolve({ data: null, error: null })),
            signInWithPassword: jest.fn(() => Promise.resolve({ data: null, error: null })),
        },

        // ── Sandbox configuration methods ──

        /**
         * Queue responses for a table. Returns a fluent builder.
         * @param {string} tableName
         */
        onTable(tableName) {
            return {
                forSelect: (result) => { _queueResponse(tableName, 'select', result); return mock.onTable(tableName); },
                forInsert: (result) => { _queueResponse(tableName, 'insert', result); return mock.onTable(tableName); },
                forUpdate: (result) => { _queueResponse(tableName, 'update', result); return mock.onTable(tableName); },
                forDelete: (result) => { _queueResponse(tableName, 'delete', result); return mock.onTable(tableName); },
                forUpsert: (result) => { _queueResponse(tableName, 'upsert', result); return mock.onTable(tableName); },
            };
        },

        /**
         * Set the auth.getUser return value.
         */
        setAuthUser(user) {
            _authGetUserResult = {
                data: { user },
                error: null,
            };
        },

        /**
         * Set auth.getUser to return an error (simulate expired token).
         */
        setAuthError(error = { message: 'Invalid token' }) {
            _authGetUserResult = { data: { user: null }, error };
        },

        /**
         * Set RPC function return value.
         */
        onRpc(fnName, result) {
            _rpcResponses[fnName] = result;
        },

        /**
         * Get recorded calls for a table+operation.
         */
        getCallsTo(tableName, operation) {
            return _calls[tableName]?.[operation] || [];
        },

        /**
         * Get all recorded calls for a table.
         */
        getAllCallsTo(tableName) {
            return _calls[tableName] || {};
        },

        /**
         * Reset all state.
         */
        reset() {
            Object.keys(_responses).forEach((k) => delete _responses[k]);
            Object.keys(_calls).forEach((k) => delete _calls[k]);
            Object.keys(_rpcResponses).forEach((k) => delete _rpcResponses[k]);
            _authGetUserResult = {
                data: {
                    user: {
                        id: 'user-uuid-123',
                        email: 'test@example.com',
                        user_metadata: { role: 'user' },
                        app_metadata: {},
                    },
                },
                error: null,
            };
            mock.from.mockClear();
            mock.rpc.mockClear();
            mock.auth.getUser.mockClear();
        },
    };

    // Expose adminSupabase as alias (used by job.service.js, rssPoller, etc.)
    mock.adminSupabase = mock;
    mock.createAuthClient = jest.fn(() => mock);

    return mock;
}

module.exports = { createSandbox };
