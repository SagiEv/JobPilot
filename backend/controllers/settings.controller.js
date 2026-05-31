const settingsService = require('../services/settings.service');
const { testImapConnection } = require('../services/mail-poller.service');
const { decrypt } = require('../utils/encryption');
const settingsRepository = require('../repositories/settings.repository');
const emailLogsRepo = require('../repositories/email-logs.repository');

exports.getSettings = async (req, res) => {
    try {
        const userId = req.user.id;
        const data = await settingsService.getSettings(userId, req.token);
        res.json(data);
    } catch (err) {
        res.status(400).json({ error: err.message });
    }
};

exports.putSettings = async (req, res) => {
    try {
        const userId = req.user.id;
        const data = await settingsService.saveSettings(userId, req.body, req.token);
        res.json(data);
    } catch (err) {
        res.status(400).json({ error: err.message });
    }
};

exports.testSmtpConnection = async (req, res) => {
    try {
        const userId = req.user.id;
        const { smtp_email, smtp_host, smtp_port, smtp_password } = req.body;

        let email = smtp_email;
        let host = smtp_host;
        let port = smtp_port || 993;
        let password = smtp_password;

        // If no password provided in payload, use saved credentials
        if (!password) {
            const { data: settings } = await settingsRepository.findSettings(userId, req.token);
            if (!settings?.smtp_password_encrypted) {
                return res.status(400).json({ success: false, error: 'No password provided and none saved.' });
            }
            email = email || settings.smtp_email;
            host = host || settings.smtp_host;
            port = port || settings.smtp_port || 993;
            password = decrypt(settings.smtp_password_encrypted);
        }

        if (!email || !host || !password) {
            return res.status(400).json({ success: false, error: 'Email, host, and password are required.' });
        }

        const result = await testImapConnection({ host, port, email, password });
        res.json(result);
    } catch (err) {
        res.status(500).json({ success: false, error: err.message });
    }
};

exports.getEmailLogs = async (req, res) => {
    try {
        const userId = req.user.id;
        const limit = parseInt(req.query.limit) || 50;
        const { data, error } = await emailLogsRepo.findByUser(userId, limit);
        if (error) throw new Error(error.message);
        res.json(data || []);
    } catch (err) {
        res.status(400).json({ error: err.message });
    }
};
