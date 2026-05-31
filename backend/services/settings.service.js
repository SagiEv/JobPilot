const settingsRepository = require('../repositories/settings.repository');
const { encrypt } = require('../utils/encryption');

const MASKED = '••••••••••••••••••••••••••••••••••••••••';

const getSettings = async (userId, token) => {
    const { data, error } = await settingsRepository.findSettings(userId, token);
    if (error && error.code !== 'PGRST116') throw new Error(error.message);

    const settings = data || {};

    // Mask the token — never send the raw key to the frontend
    return {
        groq_token_set: !!(settings.groq_token && settings.groq_token.length > 0),
        groq_token_preview: settings.groq_token
            ? `${settings.groq_token.slice(0, 6)}${MASKED.slice(6)}`
            : null,
        timezone: settings.timezone || 'Asia/Jerusalem',
        // SMTP / IMAP fields (password never sent)
        smtp_email: settings.smtp_email || null,
        smtp_host: settings.smtp_host || null,
        smtp_port: settings.smtp_port || 993,
        smtp_enabled: settings.smtp_enabled || false,
        smtp_poll_interval_min: settings.smtp_poll_interval_min || 15,
        smtp_password_set: !!settings.smtp_password_encrypted,
        smtp_last_polled_at: settings.smtp_last_polled_at || null,
    };
};

const saveSettings = async (userId, payload, token) => {
    const updateData = {};

    if ('groq_token' in payload) {
        // Allow clearing (empty string) or setting a new token
        updateData.groq_token = payload.groq_token || null;
    }
    
    if ('timezone' in payload) {
        updateData.timezone = payload.timezone;
    }

    // SMTP / IMAP fields
    if ('smtp_email' in payload) updateData.smtp_email = payload.smtp_email || null;
    if ('smtp_host' in payload) updateData.smtp_host = payload.smtp_host || null;
    if ('smtp_port' in payload) updateData.smtp_port = payload.smtp_port || 993;
    if ('smtp_enabled' in payload) updateData.smtp_enabled = payload.smtp_enabled;
    if ('smtp_poll_interval_min' in payload) updateData.smtp_poll_interval_min = payload.smtp_poll_interval_min;
    if ('smtp_password' in payload) {
        updateData.smtp_password_encrypted = payload.smtp_password
            ? encrypt(payload.smtp_password)
            : null;
    }

    const { data, error } = await settingsRepository.upsertSettings(userId, updateData, token);
    if (error) throw new Error(error.message);

    return {
        groq_token_set: !!(data?.groq_token && data.groq_token.length > 0),
        timezone: data?.timezone || 'Asia/Jerusalem',
        smtp_email: data?.smtp_email || null,
        smtp_host: data?.smtp_host || null,
        smtp_port: data?.smtp_port || 993,
        smtp_enabled: data?.smtp_enabled || false,
        smtp_poll_interval_min: data?.smtp_poll_interval_min || 15,
        smtp_password_set: !!data?.smtp_password_encrypted,
        smtp_last_polled_at: data?.smtp_last_polled_at || null,
    };
};

// Internal use only — never exposed via HTTP
const getRawGroqToken = async (userId, token) => {
    const { data, error } = await settingsRepository.findSettings(userId, token);
    if (error) return null;
    return data?.groq_token || null;
};

module.exports = { getSettings, saveSettings, getRawGroqToken };
