'use strict';


const supabase = require('../../supabaseClient');
const jobService = require('../../services/job.service');

describe('job.service', () => {
    beforeEach(() => {
        jest.clearAllMocks();
    });

    describe('createJob', () => {
        it('should return job ID', async () => {
            // Arrange
            supabase.__chain.single.mockResolvedValue({ data: { id: 'job-uuid' }, error: null });

            // Act
            const result = await jobService.createJob('user-123', 'tailor_cv');

            // Assert
            expect(result).toBe('job-uuid');
            expect(supabase.from).toHaveBeenCalledWith('ai_jobs');
        });

        it('should throw on error', async () => {
            // Arrange
            supabase.__chain.single.mockResolvedValue({ data: null, error: { message: 'DB fail' } });

            // Act & Assert
            await expect(jobService.createJob('user-123', 'tailor_cv'))
                .rejects.toThrow('Failed to create background job');
        });
    });

    describe('completeJob', () => {
        it('should update status to completed with result_data', async () => {
            // Arrange
            // mock the awaitable chain directly
            supabase.__chain.then.mockImplementationOnce((resolve) => resolve({ error: null }));

            // Act
            await jobService.completeJob('job-123', { tailored_cv: 'data' });

            // Assert
            expect(supabase.__chain.update).toHaveBeenCalledWith(
                expect.objectContaining({ status: 'completed', result_data: { tailored_cv: 'data' } })
            );
        });
    });

    describe('failJob', () => {
        it('should handle string error', async () => {
            // Arrange
            supabase.__chain.then.mockImplementationOnce((resolve) => resolve({ error: null }));

            // Act
            await jobService.failJob('job-123', 'Something broke');

            // Assert
            expect(supabase.__chain.update).toHaveBeenCalledWith(
                expect.objectContaining({ status: 'failed', error_message: 'Something broke' })
            );
        });

        it('should handle object error with suggested_model', async () => {
            // Arrange
            supabase.__chain.then.mockImplementationOnce((resolve) => resolve({ error: null }));

            // Act
            await jobService.failJob('job-123', { error: 'Model too large', suggested_model: 'llama-3' });

            // Assert
            expect(supabase.__chain.update).toHaveBeenCalledWith(
                expect.objectContaining({
                    error_message: 'Model too large',
                    result_data: { suggested_model: 'llama-3' },
                })
            );
        });

        it('should handle object error with only message', async () => {
            // Arrange
            supabase.__chain.then.mockImplementationOnce((resolve) => resolve({ error: null }));

            // Act
            await jobService.failJob('job-123', { message: 'Timeout' });

            // Assert
            expect(supabase.__chain.update).toHaveBeenCalledWith(
                expect.objectContaining({ error_message: 'Timeout' })
            );
        });
    });

    describe('getJob', () => {
        it('should return job data', async () => {
            // Arrange
            supabase.__chain.single.mockResolvedValue({
                data: { id: 'job-123', status: 'completed' }, error: null,
            });

            // Act
            const result = await jobService.getJob('job-123');

            // Assert
            expect(result).toEqual(expect.objectContaining({ id: 'job-123' }));
        });

        it('should throw on not found', async () => {
            // Arrange
            supabase.__chain.single.mockResolvedValue({ data: null, error: { message: 'Not found' } });

            // Act & Assert
            await expect(jobService.getJob('bad-id')).rejects.toThrow('Job not found');
        });
    });
});
