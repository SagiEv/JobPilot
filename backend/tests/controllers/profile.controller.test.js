'use strict';

jest.mock('../../services/profile.service');
const profileService = require('../../services/profile.service');
const controller = require('../../controllers/profile.controller');
const { buildReqRes } = require('../helpers/factories');

describe('profile.controller', () => {
    beforeEach(() => jest.clearAllMocks());

    describe('getProfile', () => {
        it('should return profile', async () => {
            const { req, res } = buildReqRes();
            profileService.getProfile.mockResolvedValue({ name: 'John' });
            await controller.getProfile(req, res);
            expect(res.json).toHaveBeenCalledWith({ name: 'John' });
        });

        it('should return 400 on error', async () => {
            const { req, res } = buildReqRes();
            profileService.getProfile.mockRejectedValue(new Error('fail'));
            await controller.getProfile(req, res);
            expect(res.status).toHaveBeenCalledWith(400);
        });
    });

    describe('updateProfile', () => {
        it('should return updated profile', async () => {
            const { req, res } = buildReqRes({ body: { name: 'Jane' } });
            profileService.upsertProfile.mockResolvedValue({ name: 'Jane' });
            await controller.updateProfile(req, res);
            expect(res.json).toHaveBeenCalledWith({ name: 'Jane' });
        });
    });
});
