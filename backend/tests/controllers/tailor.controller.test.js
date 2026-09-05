'use strict';

jest.mock('../../services/tailor.service');
jest.mock('../../services/job.service');

const tailorService = require('../../services/tailor.service');
const jobService = require('../../services/job.service');
const controller = require('../../controllers/tailor.controller');
const { buildReqRes } = require('../helpers/factories');

describe('tailor.controller', () => {
    beforeEach(() => jest.clearAllMocks());

    describe('tailorCv', () => {
        it('should return 400 when job_description is missing', async () => {
            const { req, res } = buildReqRes({ body: {} });
            await controller.tailorCv(req, res);
            expect(res.status).toHaveBeenCalledWith(400);
            expect(res.json).toHaveBeenCalledWith({ error: 'job_description is required' });
        });

        it('should return 202 with jobId on success', async () => {
            const { req, res } = buildReqRes({
                body: { job_description: 'SWE role', mode: 'full', use_profile_cv: 'true' },
            });
            jobService.createJob.mockResolvedValue('job-uuid');
            tailorService.runTailoringAsync.mockResolvedValue(undefined);

            await controller.tailorCv(req, res);

            expect(jobService.createJob).toHaveBeenCalledWith('user-uuid-123', 'tailor_cv');
            expect(res.status).toHaveBeenCalledWith(202);
            expect(res.json).toHaveBeenCalledWith({ jobId: 'job-uuid', status: 'pending' });
        });

        it('should return 500 on unexpected error', async () => {
            const { req, res } = buildReqRes({
                body: { job_description: 'test' },
            });
            jobService.createJob.mockRejectedValue(new Error('DB fail'));

            await controller.tailorCv(req, res);

            expect(res.status).toHaveBeenCalledWith(500);
        });
    });

    describe('getJobStatus', () => {
        it('should return job data when user owns it', async () => {
            const { req, res } = buildReqRes({ params: { id: 'job-123' } });
            jobService.getJob.mockResolvedValue({ id: 'job-123', user_id: 'user-uuid-123', status: 'completed' });

            await controller.getJobStatus(req, res);

            expect(res.json).toHaveBeenCalledWith(
                expect.objectContaining({ id: 'job-123', status: 'completed' })
            );
        });

        it('should return 403 when user does not own job', async () => {
            const { req, res } = buildReqRes({ params: { id: 'job-123' } });
            jobService.getJob.mockResolvedValue({ id: 'job-123', user_id: 'other-user' });

            await controller.getJobStatus(req, res);

            expect(res.status).toHaveBeenCalledWith(403);
        });

        it('should return 404 when job not found', async () => {
            const { req, res } = buildReqRes({ params: { id: 'bad' } });
            jobService.getJob.mockRejectedValue(new Error('Not found'));

            await controller.getJobStatus(req, res);

            expect(res.status).toHaveBeenCalledWith(404);
        });
    });
});
