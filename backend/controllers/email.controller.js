const emailService = require('../services/emailIntegration.service');
const AppError = require('../utils/AppError');

exports.getStatus = async (req, res) => {
    const result = await emailService.getStatus(req.user.id, req.supabase);
    res.json(result);
};

exports.googleAuth = (req, res) => {
    const userId = req.query.userId;
    if (!userId) {
        throw new AppError('User ID is required', 400);
    }

    const url = emailService.getGoogleAuthUrl(userId);
    res.redirect(url);
};

exports.googleCallback = async (req, res) => {
    const code = req.query.code;
    const userId = req.query.state;

    if (!code || !userId) {
        throw new AppError('Missing code or state', 400);
    }

    await emailService.handleGoogleCallback(code, userId);

    // Redirect back to settings page
    const frontendUrl = process.env.VITE_FRONTEND_URL || 'http://localhost:3000';
    res.redirect(`${frontendUrl}/?tab=settings&emailConnected=true`);
};

exports.syncEmail = async (req, res) => {
    await emailService.startSync(req.user.id, req.supabase);
    res.json({ message: 'Sync started' });
};

exports.disconnectEmail = async (req, res) => {
    await emailService.disconnect(req.user.id, req.supabase);
    res.json({ message: 'Disconnected successfully' });
};
