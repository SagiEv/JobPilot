'use strict';

jest.mock('../../services/experience.service');
const experienceService = require('../../services/experience.service');
const controller = require('../../controllers/experience.controller');
const { buildReqRes } = require('../helpers/factories');

describe('experience.controller', () => {
    beforeEach(() => jest.clearAllMocks());

    describe('getProjects', () => {
        it('should return data', async () => {
            const { req, res } = buildReqRes();
            experienceService.getAllProjects.mockResolvedValue([{ id: 1 }]);
            await controller.getProjects(req, res);
            expect(res.json).toHaveBeenCalledWith([{ id: 1 }]);
        });
    });

    describe('postProject', () => {
        it('should return data', async () => {
            const { req, res } = buildReqRes({ body: { title: 'Proj' } });
            experienceService.createProject.mockResolvedValue({ id: 1 });
            await controller.postProject(req, res);
            expect(res.json).toHaveBeenCalledWith({ id: 1 });
        });

        it('should return 400 on error', async () => {
            const { req, res } = buildReqRes();
            experienceService.createProject.mockRejectedValue(new Error('fail'));
            await controller.postProject(req, res);
            expect(res.status).toHaveBeenCalledWith(400);
        });
    });

    describe('putProject', () => {
        it('should return updated data', async () => {
            const { req, res } = buildReqRes({ params: { id: 1 }, body: {} });
            experienceService.updateProject.mockResolvedValue({ id: 1 });
            await controller.putProject(req, res);
            expect(res.json).toHaveBeenCalledWith({ id: 1 });
        });
    });

    describe('deleteProject', () => {
        it('should return result', async () => {
            const { req, res } = buildReqRes({ params: { id: 1 } });
            experienceService.deleteProject.mockResolvedValue({ success: true });
            await controller.deleteProject(req, res);
            expect(res.json).toHaveBeenCalledWith({ success: true });
        });
    });

    describe('getExpText', () => {
        it('should return data', async () => {
            const { req, res } = buildReqRes();
            experienceService.getExperienceText.mockResolvedValue({ text: 'exp' });
            await controller.getExpText(req, res);
            expect(res.json).toHaveBeenCalledWith({ text: 'exp' });
        });
    });

    describe('putExpText', () => {
        it('should return data', async () => {
            const { req, res } = buildReqRes({ body: { id: 1, text: 'updated' } });
            experienceService.saveExperienceText.mockResolvedValue({ text: 'updated' });
            await controller.putExpText(req, res);
            expect(res.json).toHaveBeenCalledWith({ text: 'updated' });
        });
    });
});
