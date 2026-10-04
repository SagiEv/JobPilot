const tailorService = require('../services/tailor.service');
const jobService = require('../services/job.service');
const AppError = require('../utils/AppError');

exports.tailorCv = async (req, res) => {
    const userId = req.user.id;
    const { job_description, mode, use_profile_cv, pipeline_mode } = req.body;
    const cv_file = req.file;

    if (!job_description) {
        throw new AppError('job_description is required', 400);
    }

    const useProfile = use_profile_cv === 'true' || use_profile_cv === true;

    // 1. Create Job in DB
    const jobId = await jobService.createJob(userId, 'tailor_cv', req.supabase);

    // 2. Return Job ID immediately to frontend
    res.status(202).json({ jobId, status: 'pending' });

    // 3. Start async execution in background (do not await)
    tailorService.runTailoringAsync(userId, jobId, job_description, mode, useProfile, cv_file, req.supabase, pipeline_mode)
        .catch(err => console.error("Async tailoring background error:", err));
};

exports.getJobStatus = async (req, res) => {
    const jobId = req.params.id;
    const job = await jobService.getJob(jobId, req.supabase);
    
    // Ensure user owns job
    if (job.user_id !== req.user.id) {
        throw new AppError('Unauthorized', 403);
    }
    
    res.json(job);
};
