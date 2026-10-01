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

module.exports = { getJobsByUser, updateJob, deleteJob };
