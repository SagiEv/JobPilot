'use strict';

jest.mock('../../repositories/experience.repository');
const experienceRepository = require('../../repositories/experience.repository');
const experienceService = require('../../services/experience.service');
const { buildProject } = require('../helpers/factories');

describe('experience.service', () => {
    beforeEach(() => jest.clearAllMocks());

    describe('getAllProjects', () => {
        it('should return data', async () => {
            const projects = [buildProject()];
            experienceRepository.findAllProjects.mockResolvedValue({ data: projects, error: null });
            const result = await experienceService.getAllProjects('user-123');
            expect(result).toEqual(projects);
        });

        it('should throw on error', async () => {
            experienceRepository.findAllProjects.mockResolvedValue({ data: null, error: { message: 'fail' } });
            await expect(experienceService.getAllProjects('u')).rejects.toThrow('fail');
        });
    });

    describe('createProject', () => {
        it('should return new project', async () => {
            const project = buildProject({ id: 5 });
            experienceRepository.createProject.mockResolvedValue({ data: project, error: null });
            const result = await experienceService.createProject('user-123', { title: 'New' });
            expect(result).toEqual(project);
        });

        it('should throw raw error (not wrapped) for detail logging', async () => {
            const rawErr = { message: 'DB constraint', code: '23505', details: 'unique' };
            experienceRepository.createProject.mockResolvedValue({ data: null, error: rawErr });
            await expect(experienceService.createProject('u', {})).rejects.toEqual(rawErr);
        });
    });

    describe('updateProject', () => {
        it('should return updated project', async () => {
            const updated = buildProject({ title: 'Updated' });
            experienceRepository.updateProject.mockResolvedValue({ data: updated, error: null });
            const result = await experienceService.updateProject('user-123', 1, { title: 'Updated' });
            expect(result.title).toBe('Updated');
        });

        it('should throw on error', async () => {
            experienceRepository.updateProject.mockResolvedValue({ data: null, error: { message: 'fail' } });
            await expect(experienceService.updateProject('u', 1, {})).rejects.toThrow('fail');
        });
    });

    describe('deleteProject', () => {
        it('should return { success: true }', async () => {
            experienceRepository.removeProject.mockResolvedValue({ error: null });
            const result = await experienceService.deleteProject('user-123', 1);
            expect(result).toEqual({ success: true });
        });

        it('should throw on error', async () => {
            experienceRepository.removeProject.mockResolvedValue({ error: { message: 'fail' } });
            await expect(experienceService.deleteProject('u', 1)).rejects.toThrow('fail');
        });
    });

    describe('getExperienceText', () => {
        it('should return data on success', async () => {
            experienceRepository.findExperienceText.mockResolvedValue({
                data: { text: 'My experience' }, error: null,
            });
            const result = await experienceService.getExperienceText('user-123');
            expect(result.text).toBe('My experience');
        });

        it('should return { text: "" } fallback when PGRST116', async () => {
            experienceRepository.findExperienceText.mockResolvedValue({
                data: null, error: { code: 'PGRST116', message: 'Not found' },
            });
            const result = await experienceService.getExperienceText('user-123');
            expect(result).toEqual({ text: '' });
        });

        it('should throw on non-PGRST116 error', async () => {
            experienceRepository.findExperienceText.mockResolvedValue({
                data: null, error: { code: 'OTHER', message: 'real error' },
            });
            await expect(experienceService.getExperienceText('u')).rejects.toThrow('real error');
        });
    });

    describe('saveExperienceText', () => {
        it('should return saved data', async () => {
            experienceRepository.upsertExperienceText.mockResolvedValue({
                data: { text: 'saved' }, error: null,
            });
            const result = await experienceService.saveExperienceText('user-123', 1, 'saved');
            expect(result.text).toBe('saved');
        });

        it('should throw on error', async () => {
            experienceRepository.upsertExperienceText.mockResolvedValue({
                data: null, error: { message: 'upsert fail' },
            });
            await expect(experienceService.saveExperienceText('u', 1, '')).rejects.toThrow('upsert fail');
        });
    });
});
