const rolesController = require('../../controllers/roles.controller');

describe('Roles Controller', () => {
    let mockReq;
    let mockRes;

    beforeEach(() => {
        mockRes = {
            json: jest.fn(),
            status: jest.fn().mockReturnThis()
        };
    });

    it('should return roles bank successfully (Sunny Day)', async () => {
        mockReq = {
            supabase: {
                from: jest.fn().mockReturnValue({
                    select: jest.fn().mockReturnValue({
                        order: jest.fn().mockResolvedValue({
                            data: [{ id: 1, name: 'Software Engineer' }],
                            error: null
                        })
                    })
                })
            }
        };

        await rolesController.getRolesBank(mockReq, mockRes);
        expect(mockRes.json).toHaveBeenCalledWith([{ id: 1, name: 'Software Engineer' }]);
    });

    it('should handle db error gracefully (Rainy Day)', async () => {
        mockReq = {
            supabase: {
                from: jest.fn().mockReturnValue({
                    select: jest.fn().mockReturnValue({
                        order: jest.fn().mockResolvedValue({
                            data: null,
                            error: { message: 'Database error' }
                        })
                    })
                })
            }
        };

        await rolesController.getRolesBank(mockReq, mockRes);
        expect(mockRes.status).toHaveBeenCalledWith(400);
        expect(mockRes.json).toHaveBeenCalledWith({ error: 'Database error' });
    });
});
