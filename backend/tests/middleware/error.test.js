'use strict';

const { buildReqRes } = require('../helpers/factories');
const { errorHandler } = require('../../middleware/error');

describe('errorHandler middleware', () => {
    const originalEnv = process.env.NODE_ENV;

    beforeEach(() => {
        jest.clearAllMocks();
    });

    afterEach(() => {
        process.env.NODE_ENV = originalEnv;
    });

    it('should return the status from err.status', () => {
        // Arrange
        const err = new Error('Bad request');
        err.status = 400;
        const { req, res, next } = buildReqRes();

        // Act
        errorHandler(err, req, res, next);

        // Assert
        expect(res.status).toHaveBeenCalledWith(400);
        expect(res.json).toHaveBeenCalledWith(
            expect.objectContaining({ status: 'error', message: 'Bad request' })
        );
    });

    it('should default to 500 when err.status is not set', () => {
        // Arrange
        const err = new Error('Something broke');
        const { req, res, next } = buildReqRes();

        // Act
        errorHandler(err, req, res, next);

        // Assert
        expect(res.status).toHaveBeenCalledWith(500);
    });

    it('should return 409 for Supabase unique constraint error (code 23505)', () => {
        // Arrange
        const err = new Error('duplicate key');
        err.code = '23505';
        const { req, res, next } = buildReqRes();

        // Act
        errorHandler(err, req, res, next);

        // Assert
        expect(res.status).toHaveBeenCalledWith(409);
        expect(res.json).toHaveBeenCalledWith(
            expect.objectContaining({ message: 'Resource already exists.' })
        );
    });

    it('should include stack trace in development mode', () => {
        // Arrange
        process.env.NODE_ENV = 'development';
        const err = new Error('Dev error');
        err.status = 500;
        const { req, res, next } = buildReqRes();

        // Act
        errorHandler(err, req, res, next);

        // Assert
        const responseBody = res.json.mock.calls[0][0];
        expect(responseBody.stack).toBeDefined();
    });

    it('should exclude stack trace in production mode', () => {
        // Arrange
        process.env.NODE_ENV = 'production';
        const err = new Error('Prod error');
        err.status = 500;
        const { req, res, next } = buildReqRes();

        // Act
        errorHandler(err, req, res, next);

        // Assert
        const responseBody = res.json.mock.calls[0][0];
        expect(responseBody.stack).toBeUndefined();
    });
});
