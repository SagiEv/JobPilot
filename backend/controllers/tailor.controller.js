const tailorService = require('../services/tailor.service');
const jobService = require('../services/job.service');

exports.tailorCv = async (req, res) => {
    try {
        const userId = req.user.id;
        const { job_description, mode, use_profile_cv, pipeline_mode } = req.body;
        const cv_file = req.file;

        if (!job_description) {
            return res.status(400).json({ error: 'job_description is required' });
        }

        const useProfile = use_profile_cv === 'true' || use_profile_cv === true;

        // 1. Create Job in DB
        const jobId = await jobService.createJob(userId, 'tailor_cv');

        // 2. Return Job ID immediately to frontend
        res.status(202).json({ jobId, status: 'pending' });

        // 3. Start async execution in background (do not await)
        tailorService.runTailoringAsync(userId, jobId, job_description, mode, useProfile, cv_file, req.token, pipeline_mode)
            .catch(err => console.error("Async tailoring background error:", err));

    } catch (err) {
        console.error('Tailor Controller Error:', err);
        res.status(500).json({ error: err.message });
    }
};

exports.getJobStatus = async (req, res) => {
    try {
        const jobId = req.params.id;
        const job = await jobService.getJob(jobId);
        
        // Ensure user owns job
        if (job.user_id !== req.user.id) {
            return res.status(403).json({ error: 'Unauthorized' });
        }
        
        res.json(job);
    } catch (err) {
        res.status(404).json({ error: 'Job not found' });
    }
};
