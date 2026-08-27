const settingsRepository = require('../repositories/settings.repository');
const { encrypt, decrypt } = require('../utils/encryption');
const { validateAiToken } = require('../utils/ai_validator');

const MASKED = '••••••••••••••••••••••••••••••••••••••••';

const getSettings = async (userId, token) => {
    const { data, error } = await settingsRepository.findSettings(userId, token);
    if (error && error.code !== 'PGRST116') throw new Error(error.message);

    const settings = data || {};

    let groqDecrypted = settings.groq_token_encrypted ? decrypt(settings.groq_token_encrypted) : (settings.groq_token || null);
    let openaiDecrypted = settings.openai_token_encrypted ? decrypt(settings.openai_token_encrypted) : null;
    let claudeDecrypted = settings.claude_token_encrypted ? decrypt(settings.claude_token_encrypted) : null;
    let geminiDecrypted = settings.gemini_token_encrypted ? decrypt(settings.gemini_token_encrypted) : null;

    // Mask the tokens — never send the raw keys to the frontend
    return {
        groq_token_set: !!groqDecrypted,
        groq_token_preview: groqDecrypted ? `${groqDecrypted.slice(0, 6)}${MASKED.slice(6)}` : null,
        openai_token_set: !!openaiDecrypted,
        openai_token_preview: openaiDecrypted ? `${openaiDecrypted.slice(0, 6)}${MASKED.slice(6)}` : null,
        claude_token_set: !!claudeDecrypted,
        claude_token_preview: claudeDecrypted ? `${claudeDecrypted.slice(0, 6)}${MASKED.slice(6)}` : null,
        gemini_token_set: !!geminiDecrypted,
        gemini_token_preview: geminiDecrypted ? `${geminiDecrypted.slice(0, 6)}${MASKED.slice(6)}` : null,
        ai_routing: settings.ai_routing || {},
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

    const validateAndSetToken = async (provider, payloadKey, encryptedKey) => {
        if (payloadKey in payload) {
            const rawToken = payload[payloadKey];
            if (rawToken) {
                const { valid, error } = await validateAiToken(provider, rawToken);
                if (!valid) throw new Error(error || `Invalid ${provider} token`);
                updateData[encryptedKey] = encrypt(rawToken);
            } else {
                updateData[encryptedKey] = null;
            }
        }
    };

    await validateAndSetToken('groq', 'groq_token', 'groq_token_encrypted');
    if ('groq_token' in payload) updateData.groq_token = null; // Clear unencrypted legacy token
    
    await validateAndSetToken('openai', 'openai_token', 'openai_token_encrypted');
    await validateAndSetToken('claude', 'claude_token', 'claude_token_encrypted');
    await validateAndSetToken('gemini', 'gemini_token', 'gemini_token_encrypted');

    if ('ai_routing' in payload) {
        updateData.ai_routing = payload.ai_routing;
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
        groq_token_set: !!data?.groq_token_encrypted || !!data?.groq_token,
        openai_token_set: !!data?.openai_token_encrypted,
        claude_token_set: !!data?.claude_token_encrypted,
        gemini_token_set: !!data?.gemini_token_encrypted,
        ai_routing: data?.ai_routing || {},
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
const getAllAiConfigs = async (userId, token) => {
    const { data, error } = await settingsRepository.findSettings(userId, token);
    if (error) return null;
    
    return {
        groq_token: data?.groq_token_encrypted ? decrypt(data.groq_token_encrypted) : (data?.groq_token || null),
        openai_token: data?.openai_token_encrypted ? decrypt(data.openai_token_encrypted) : null,
        claude_token: data?.claude_token_encrypted ? decrypt(data.claude_token_encrypted) : null,
        gemini_token: data?.gemini_token_encrypted ? decrypt(data.gemini_token_encrypted) : null,
        ai_routing: data?.ai_routing || {}
    };
};

module.exports = { getSettings, saveSettings, getAllAiConfigs };
