'use strict';

jest.mock('../../repositories/profile.repository');
const profileRepository = require('../../repositories/profile.repository');
const profileService = require('../../services/profile.service');

describe('profile.service', () => {
    beforeEach(() => jest.clearAllMocks());

    describe('getProfile', () => {
        it('should transform cv_data → cvData', async () => {
            // Arrange
            profileRepository.findFirstProfile.mockResolvedValue({
                data: { id: 1, cv_data: { summary: 'My CV' }, website: null },
                error: null,
            });

            // Act
            const result = await profileService.getProfile('user-123');

            // Assert
            expect(result.cvData).toEqual({ summary: 'My CV' });
            expect(result.cv_data).toBeUndefined();
        });

        it('should map website → github', async () => {
            // Arrange
            profileRepository.findFirstProfile.mockResolvedValue({
                data: { id: 1, website: 'github.com/user' },
                error: null,
            });

            // Act
            const result = await profileService.getProfile('user-123');

            // Assert
            expect(result.github).toBe('github.com/user');
        });

        it('should return {} when no profile found (PGRST116)', async () => {
            // Arrange
            profileRepository.findFirstProfile.mockResolvedValue({
                data: null,
                error: { code: 'PGRST116', message: 'Not found' },
            });

            // Act
            const result = await profileService.getProfile('user-123');

            // Assert
            expect(result).toEqual({});
        });

        it('should throw on non-PGRST116 error', async () => {
            // Arrange
            profileRepository.findFirstProfile.mockResolvedValue({
                data: null,
                error: { code: 'OTHER', message: 'real error' },
            });

            // Act & Assert
            await expect(profileService.getProfile('user-123')).rejects.toThrow('real error');
        });
    });

    describe('upsertProfile', () => {
        it('should map cvData → cv_data and github → website for update', async () => {
            // Arrange
            profileRepository.updateProfile.mockResolvedValue({
                data: { id: 1 }, error: null,
            });

            // Act
            await profileService.upsertProfile('user-123', {
                id: 1, cvData: { summary: 'test' }, github: 'gh.com/me',
            });

            // Assert
            expect(profileRepository.updateProfile).toHaveBeenCalledWith(
                'user-123',
                expect.objectContaining({ cv_data: { summary: 'test' }, website: 'gh.com/me' })
            );
        });

        it('should call createProfile when no id', async () => {
            // Arrange
            profileRepository.createProfile.mockResolvedValue({
                data: { id: 2 }, error: null,
            });

            // Act
            await profileService.upsertProfile('user-123', { name: 'John' });

            // Assert
            expect(profileRepository.createProfile).toHaveBeenCalled();
            expect(profileRepository.updateProfile).not.toHaveBeenCalled();
        });

        it('should call updateProfile when id is present', async () => {
            // Arrange
            profileRepository.updateProfile.mockResolvedValue({
                data: { id: 1 }, error: null,
            });

            // Act
            await profileService.upsertProfile('user-123', { id: 1, name: 'Jane' });

            // Assert
            expect(profileRepository.updateProfile).toHaveBeenCalled();
            expect(profileRepository.createProfile).not.toHaveBeenCalled();
        });

        it('should throw on error', async () => {
            // Arrange
            profileRepository.createProfile.mockResolvedValue({
                data: null, error: { message: 'upsert fail' },
            });

            // Act & Assert
            await expect(profileService.upsertProfile('u', {})).rejects.toThrow('upsert fail');
        });
    });
});
