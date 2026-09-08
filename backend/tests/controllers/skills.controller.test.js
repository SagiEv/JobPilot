'use strict';

jest.mock('../../services/skills.service');
const skillService = require('../../services/skills.service');
const controller = require('../../controllers/skills.controller');
const { buildReqRes } = require('../helpers/factories');

describe('skills.controller', () => {
    beforeEach(() => jest.clearAllMocks());

    describe('getAll', () => {
        it('should return data', async () => {
            const { req, res } = buildReqRes();
            skillService.getAllSkills.mockResolvedValue([{ id: 1 }]);
            await controller.getAll(req, res);
            expect(res.json).toHaveBeenCalledWith([{ id: 1 }]);
        });
    });

    describe('create', () => {
        it('should return data', async () => {
            const { req, res } = buildReqRes({ body: { name: 'React' } });
            skillService.createSkill.mockResolvedValue({ id: 1 });
            await controller.create(req, res);
            expect(res.json).toHaveBeenCalledWith({ id: 1 });
        });
    });

    describe('update', () => {
        it('should return updated data', async () => {
            const { req, res } = buildReqRes({ params: { id: 1 }, body: {} });
            skillService.updateSkill.mockResolvedValue({ id: 1 });
            await controller.update(req, res);
            expect(res.json).toHaveBeenCalledWith({ id: 1 });
        });
    });

    describe('remove', () => {
        it('should return result', async () => {
            const { req, res } = buildReqRes({ params: { id: 1 } });
            skillService.deleteSkill.mockResolvedValue({ success: true });
            await controller.remove(req, res);
            expect(res.json).toHaveBeenCalledWith({ success: true });
        });

        it('should return 400 on error', async () => {
            const { req, res } = buildReqRes({ params: { id: 1 } });
            skillService.deleteSkill.mockRejectedValue(new Error('fail'));
            await controller.remove(req, res);
            expect(res.status).toHaveBeenCalledWith(400);
        });
    });
});
