const settingsRepository = require('../repositories/settings.repository');

const MASKED = '••••••••••••••••••••••••••••••••••••••••';

const getSettings = async (userId) => {
    const { data, error } = await settingsRepository.findSettings(userId);
    if (error && error.code !== 'PGRST116') throw new Error(error.message);

    const settings = data || {};

    // Mask the token — never send the raw key to the frontend
    return {
        groq_token_set: !!(settings.groq_token && settings.groq_token.length > 0),
        groq_token_preview: settings.groq_token
            ? `${settings.groq_token.slice(0, 6)}${MASKED.slice(6)}`
            : null,
    };
};

const saveSettings = async (userId, payload) => {
    const updateData = {};

    if ('groq_token' in payload) {
        // Allow clearing (empty string) or setting a new token
        updateData.groq_token = payload.groq_token || null;
    }

    const { data, error } = await settingsRepository.upsertSettings(userId, updateData);
    if (error) throw new Error(error.message);

    return {
        groq_token_set: !!(data?.groq_token && data.groq_token.length > 0),
    };
};

// Internal use only — never exposed via HTTP
const getRawGroqToken = async (userId) => {
    const { data, error } = await settingsRepository.findSettings(userId);
    if (error) return null;
    return data?.groq_token || null;
};

module.exports = { getSettings, saveSettings, getRawGroqToken };
