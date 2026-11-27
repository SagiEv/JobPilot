const scrapedJobsRepo = require('../repositories/scrapedJobs.repository');
const AppError = require('../utils/AppError');

const getJobsByUser = async (userId, supabaseClient) => {
    const { data, error } = await scrapedJobsRepo.findByUser(userId, supabaseClient);
    if (error) throw new AppError(error.message, error.status || 400, error.code);
    return data;
};

const updateJob = async (userId, jobId, updateData) => {
    const { data, error } = await scrapedJobsRepo.updateJob(userId, jobId, updateData);
    if (error) throw new AppError(error.message, error.status || 400, error.code);
    return data;
};

const deleteJob = async (userId, jobId) => {
    const { error } = await scrapedJobsRepo.deleteJob(userId, jobId);
    if (error) throw new AppError(error.message, error.status || 400, error.code);
    return { message: 'Job deleted successfully' };
};

const deleteJobsBatch = async (userId, ids) => {
    if (!Array.isArray(ids) || ids.length === 0) {
        throw new AppError('ids must be a non-empty array', 400);
    }
    const cleanIds = ids.map(Number).filter(n => Number.isInteger(n) && n > 0);
    if (cleanIds.length === 0) {
        throw new AppError('No valid job IDs provided', 400);
    }
    const { error } = await scrapedJobsRepo.deleteJobsBatch(userId, cleanIds);
    if (error) throw new AppError(error.message, error.status || 400, error.code);
    return { message: 'Jobs deleted successfully', deletedCount: cleanIds.length };
};

module.exports = { getJobsByUser, updateJob, deleteJob, deleteJobsBatch };
