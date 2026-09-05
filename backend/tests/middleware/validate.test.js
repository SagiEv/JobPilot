'use strict';

const { buildReqRes } = require('../helpers/factories');
const { validate } = require('../../middleware/validate');
const z = require('zod');

describe('validate middleware', () => {
    beforeEach(() => {
        jest.clearAllMocks();
    });

    it('should call next() when body passes schema validation', () => {
        // Arrange
        const schema = z.object({ name: z.string() });
        const middleware = validate(schema);
        const { req, res, next } = buildReqRes({ body: { name: 'John' } });

        // Act
        middleware(req, res, next);

        // Assert
        expect(next).toHaveBeenCalledTimes(1);
        expect(res.status).not.toHaveBeenCalled();
    });

    it('should return 400 with formatted issues on invalid body', () => {
        // Arrange
        const schema = z.object({
            email: z.string().email(),
            age: z.number().min(18),
        });
        const middleware = validate(schema);
        const { req, res, next } = buildReqRes({
            body: { email: 'not-an-email', age: 10 },
        });

        // Act
        middleware(req, res, next);

        // Assert
        expect(next).not.toHaveBeenCalled();
        expect(res.status).toHaveBeenCalledWith(400);
        expect(res.json).toHaveBeenCalledWith(
            expect.objectContaining({
                status: 'error',
                message: 'Invalid request data',
                details: expect.arrayContaining([
                    expect.objectContaining({ field: expect.any(String) }),
                ]),
            })
        );
    });

    it('should return "unknown" field when error has no path', () => {
        // Arrange — use a refinement that produces an error without a field path
        const schema = z.object({}).refine(() => false, { message: 'Global error' });
        const middleware = validate(schema);
        const { req, res, next } = buildReqRes({ body: {} });

        // Act
        middleware(req, res, next);

        // Assert
        expect(res.status).toHaveBeenCalledWith(400);
        const call = res.json.mock.calls[0][0];
        expect(call.details).toEqual(
            expect.arrayContaining([
                expect.objectContaining({ field: expect.any(String) }),
            ])
        );
    });
});
