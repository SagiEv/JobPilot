'use strict';

jest.mock('../../repositories/skills.repository');
const skillRepository = require('../../repositories/skills.repository');
const skillService = require('../../services/skills.service');

describe('skills.service', () => {
    beforeEach(() => jest.clearAllMocks());

    describe('getAllSkills', () => {
        it('should return data', async () => {
            skillRepository.findAll.mockResolvedValue({ data: [{ id: 1 }], error: null });
            const result = await skillService.getAllSkills('user-123');
            expect(result).toEqual([{ id: 1 }]);
        });

        it('should throw on error', async () => {
            skillRepository.findAll.mockResolvedValue({ data: null, error: { message: 'fail' } });
            await expect(skillService.getAllSkills('u')).rejects.toThrow('fail');
        });
    });

    describe('createSkill', () => {
        it('should return new skill', async () => {
            skillRepository.create.mockResolvedValue({ data: { id: 5, name: 'React' }, error: null });
            const result = await skillService.createSkill('user-123', { name: 'React' });
            expect(result.name).toBe('React');
        });

        it('should throw on error', async () => {
            skillRepository.create.mockResolvedValue({ data: null, error: { message: 'fail' } });
            await expect(skillService.createSkill('u', {})).rejects.toThrow('fail');
        });
    });

    describe('updateSkill', () => {
        it('should return updated skill', async () => {
            skillRepository.update.mockResolvedValue({ data: { id: 1, name: 'Vue' }, error: null });
            const result = await skillService.updateSkill('user-123', 1, { name: 'Vue' });
            expect(result.name).toBe('Vue');
        });

        it('should throw on error', async () => {
            skillRepository.update.mockResolvedValue({ data: null, error: { message: 'fail' } });
            await expect(skillService.updateSkill('u', 1, {})).rejects.toThrow('fail');
        });
    });

    describe('deleteSkill', () => {
        it('should return { success: true }', async () => {
            skillRepository.remove.mockResolvedValue({ error: null });
            const result = await skillService.deleteSkill('user-123', 1);
            expect(result).toEqual({ success: true });
        });

        it('should throw on error', async () => {
            skillRepository.remove.mockResolvedValue({ error: { message: 'fail' } });
            await expect(skillService.deleteSkill('u', 1)).rejects.toThrow('fail');
        });
    });
});
