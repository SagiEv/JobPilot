'use strict';

const { buildReqRes } = require('../helpers/factories');

// Mock the supabaseClient module BEFORE requiring the auth middleware
jest.mock('../../supabaseClient', () => ({
    auth: {
        getUser: jest.fn(),
    },
}));

const supabase = require('../../supabaseClient');
const { authenticate } = require('../../middleware/auth');

describe('authenticate middleware', () => {
    beforeEach(() => {
        jest.clearAllMocks();
    });

    it('should return 401 when no Authorization header is present', async () => {
        // Arrange
        const { req, res, next } = buildReqRes({ headers: {} });

        // Act
        await authenticate(req, res, next);

        // Assert
        expect(res.status).toHaveBeenCalledWith(401);
        expect(res.json).toHaveBeenCalledWith({ error: 'No token provided' });
        expect(next).not.toHaveBeenCalled();
    });

    it('should return 401 when Authorization header does not start with "Bearer "', async () => {
        // Arrange
        const { req, res, next } = buildReqRes({
            headers: { authorization: 'Basic abc123' },
        });

        // Act
        await authenticate(req, res, next);

        // Assert
        expect(res.status).toHaveBeenCalledWith(401);
        expect(res.json).toHaveBeenCalledWith({ error: 'No token provided' });
        expect(next).not.toHaveBeenCalled();
    });

    it('should return 401 when supabase returns an error', async () => {
        // Arrange
        const { req, res, next } = buildReqRes({
            headers: { authorization: 'Bearer valid-token' },
        });
        supabase.auth.getUser.mockResolvedValue({
            data: { user: null },
            error: { message: 'Token expired' },
        });

        // Act
        await authenticate(req, res, next);

        // Assert
        expect(res.status).toHaveBeenCalledWith(401);
        expect(res.json).toHaveBeenCalledWith({ error: 'Invalid or expired token' });
        expect(next).not.toHaveBeenCalled();
    });

    it('should return 401 when user data is null', async () => {
        // Arrange
        const { req, res, next } = buildReqRes({
            headers: { authorization: 'Bearer valid-token' },
        });
        supabase.auth.getUser.mockResolvedValue({
            data: { user: null },
            error: null,
        });

        // Act
        await authenticate(req, res, next);

        // Assert
        expect(res.status).toHaveBeenCalledWith(401);
        expect(res.json).toHaveBeenCalledWith({ error: 'Invalid or expired token' });
    });

    it('should return 500 on unexpected exception', async () => {
        // Arrange
        const { req, res, next } = buildReqRes({
            headers: { authorization: 'Bearer valid-token' },
        });
        supabase.auth.getUser.mockRejectedValue(new Error('Network failure'));

        // Act
        await authenticate(req, res, next);

        // Assert
        expect(res.status).toHaveBeenCalledWith(500);
        expect(res.json).toHaveBeenCalledWith({ error: 'Authentication failed' });
    });

    it('should set req.user and req.token and call next() on valid token', async () => {
        // Arrange
        const mockUser = { id: 'user-123', email: 'test@example.com' };
        const { req, res, next } = buildReqRes({
            headers: { authorization: 'Bearer valid-token-123' },
        });
        supabase.auth.getUser.mockResolvedValue({
            data: { user: mockUser },
            error: null,
        });

        // Act
        await authenticate(req, res, next);

        // Assert
        expect(req.user).toEqual(mockUser);
        expect(req.token).toBe('valid-token-123');
        expect(next).toHaveBeenCalledTimes(1);
        expect(res.status).not.toHaveBeenCalled();
    });
});
