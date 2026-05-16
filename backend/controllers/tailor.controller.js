const tailorService = require('../services/tailor.service');

exports.tailorCv = async (req, res) => {
    try {
        const userId = req.user.id;
        const { job_description, mode, use_profile_cv } = req.body;
        const cv_file = req.file;

        if (!job_description) {
            return res.status(400).json({ error: 'job_description is required' });
        }

        const useProfile = use_profile_cv === 'true' || use_profile_cv === true;

        const result = await tailorService.runTailoring(userId, job_description, mode, useProfile, cv_file, req.token);
        res.json(result);
    } catch (err) {
        console.error('Tailor Controller Error:', err);
        res.status(500).json({ error: err.message });
    }
};
