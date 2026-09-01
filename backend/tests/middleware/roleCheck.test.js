'use strict';

const { buildReqRes, buildUser } = require('../helpers/factories');
const { authorize } = require('../../middleware/roleCheck');

describe('authorize middleware', () => {
    beforeEach(() => {
        jest.clearAllMocks();
    });

    it('should return 401 when req.user is missing', () => {
        // Arrange
        const middleware = authorize(['admin']);
        const { req, res, next } = buildReqRes();
        req.user = undefined;

        // Act
        middleware(req, res, next);

        // Assert
        expect(res.status).toHaveBeenCalledWith(401);
        expect(res.json).toHaveBeenCalledWith({ error: 'Authentication required' });
        expect(next).not.toHaveBeenCalled();
    });

    it('should return 403 when user role is not in allowed list', () => {
        // Arrange
        const middleware = authorize(['admin']);
        const { req, res, next } = buildReqRes();
        req.user = buildUser({ user_metadata: { role: 'user' } });

        // Act
        middleware(req, res, next);

        // Assert
        expect(res.status).toHaveBeenCalledWith(403);
        expect(res.json).toHaveBeenCalledWith(
            expect.objectContaining({ error: expect.stringContaining('user') })
        );
        expect(next).not.toHaveBeenCalled();
    });

    it('should read role from user_metadata.role', () => {
        // Arrange
        const middleware = authorize(['admin']);
        const { req, res, next } = buildReqRes();
        req.user = buildUser({ user_metadata: { role: 'admin' } });

        // Act
        middleware(req, res, next);

        // Assert
        expect(next).toHaveBeenCalledTimes(1);
        expect(res.status).not.toHaveBeenCalled();
    });

    it('should fall back to app_metadata.role when user_metadata has no role', () => {
        // Arrange
        const middleware = authorize(['admin']);
        const { req, res, next } = buildReqRes();
        req.user = buildUser({
            user_metadata: {},
            app_metadata: { role: 'admin' },
        });

        // Act
        middleware(req, res, next);

        // Assert
        expect(next).toHaveBeenCalledTimes(1);
    });

    it('should default to "user" when no role metadata exists', () => {
        // Arrange
        const middleware = authorize(['user']);
        const { req, res, next } = buildReqRes();
        req.user = buildUser({ user_metadata: {}, app_metadata: {} });

        // Act
        middleware(req, res, next);

        // Assert
        expect(next).toHaveBeenCalledTimes(1);
    });

    it('should return 403 when default "user" role is not in allowed list', () => {
        // Arrange
        const middleware = authorize(['admin', 'moderator']);
        const { req, res, next } = buildReqRes();
        req.user = buildUser({ user_metadata: {}, app_metadata: {} });

        // Act
        middleware(req, res, next);

        // Assert
        expect(res.status).toHaveBeenCalledWith(403);
        expect(next).not.toHaveBeenCalled();
    });
});
