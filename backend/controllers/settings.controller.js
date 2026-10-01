const settingsService = require('../services/settings.service');
const { testImapConnection } = require('../services/mailPoller.service');
const { decrypt } = require('../utils/encryption');
const { validateAiToken } = require('../utils/ai_validator');
const settingsRepository = require('../repositories/settings.repository');
const emailLogsRepo = require('../repositories/emailLogs.repository');
const AppError = require('../utils/AppError');

exports.getSettings = async (req, res) => {
    const data = await settingsService.getSettings(req.user.id, req.supabase);
    res.json(data);
};

exports.putSettings = async (req, res) => {
    const data = await settingsService.saveSettings(req.user.id, req.body, req.supabase);
    res.json(data);
};

exports.testSmtpConnection = async (req, res) => {
    const userId = req.user.id;
    const { smtp_email, smtp_host, smtp_port, smtp_password } = req.body;

    let email = smtp_email;
    let host = smtp_host;
    let port = smtp_port || 993;
    let password = smtp_password;

    // If no password provided in payload, use saved credentials
    if (!password) {
        const { data: settings } = await settingsRepository.findSettings(userId, req.supabase);
        if (!settings?.smtp_password_encrypted) {
            throw new AppError('No password provided and none saved.', 400);
        }
        email = email || settings.smtp_email;
        host = host || settings.smtp_host;
        port = port || settings.smtp_port || 993;
        password = decrypt(settings.smtp_password_encrypted);
    }

    if (!email || !host || !password) {
        throw new AppError('Email, host, and password are required.', 400);
    }

    const result = await testImapConnection({ host, port, email, password });
    res.json(result);
};

exports.getEmailLogs = async (req, res) => {
    const limit = parseInt(req.query.limit) || 50;
    const { data, error } = await emailLogsRepo.findByUser(req.user.id, limit);
    if (error) throw new AppError(error.message, 400);
    res.json(data || []);
};

exports.testAiToken = async (req, res) => {
    const userId = req.user.id;
    const { provider } = req.body;
    if (!provider) {
        throw new AppError('Provider is required.', 400);
    }
    
    const { data: settings } = await settingsRepository.findSettings(userId, req.supabase);
    const encryptedKey = settings?.[`${provider}_token_encrypted`];
    const unencryptedKey = settings?.[`${provider}_token`];
    
    const rawToken = encryptedKey ? decrypt(encryptedKey) : unencryptedKey;
    if (!rawToken) {
        throw new AppError('No token configured for this provider.', 400);
    }
    
    const result = await validateAiToken(provider, rawToken);
    if (result.valid) {
        res.json({ success: true });
    } else {
        res.json({ success: false, error: result.error });
    }
};
