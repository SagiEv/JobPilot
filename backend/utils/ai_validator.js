const axios = require('axios');

const STRUCTURAL_RULES = {
    groq: /^gsk_.{20,}$/,
    openai: /^sk-.{20,}$/,
    claude: /^sk-ant-.{20,}$/,
    gemini: /^AIza.{30,}$/
};

/**
 * Validates an AI provider token both structurally and by pinging the provider API.
 * @param {string} provider The AI provider (groq, openai, claude, gemini)
 * @param {string} token The API token to validate
 * @returns {Promise<{valid: boolean, error?: string}>}
 */
const validateAiToken = async (provider, token) => {
    if (!token) return { valid: false, error: "Token is empty" };

    // 1. Structural Validation
    const regex = STRUCTURAL_RULES[provider];
    if (regex && !regex.test(token)) {
        return { valid: false, error: `Invalid ${provider} token structure.` };
    }

    // 2. API Validation
    try {
        switch (provider) {
            case 'groq':
                await axios.get('https://api.groq.com/openai/v1/models', {
                    headers: { Authorization: `Bearer ${token}` },
                    timeout: 5000
                });
                break;
            case 'openai':
                await axios.get('https://api.openai.com/v1/models', {
                    headers: { Authorization: `Bearer ${token}` },
                    timeout: 5000
                });
                break;
            case 'claude':
                // Anthropic's models endpoint or failing message endpoint
                await axios.get('https://api.anthropic.com/v1/models', {
                    headers: {
                        'x-api-key': token,
                        'anthropic-version': '2023-06-01'
                    },
                    timeout: 5000
                }).catch(err => {
                    // Anthropic might return 400 for model endpoint depending on org access, 
                    // but 401 Unauthorized means bad key.
                    if (err.response?.status === 401) {
                        throw new Error('Invalid token');
                    }
                });
                break;
            case 'gemini':
                await axios.get(`https://generativelanguage.googleapis.com/v1beta/models?key=${token}`, {
                    timeout: 5000
                });
                break;
            default:
                return { valid: false, error: "Unknown provider" };
        }
        
        return { valid: true };
    } catch (err) {
        if (err.response?.status === 401 || err.response?.status === 403 || err.message === 'Invalid token') {
            return { valid: false, error: `API rejected the ${provider} token. Invalid or revoked.` };
        }
        // If it's a network error (e.g. timeout), we might still want to reject, 
        // but let's give a specific message.
        return { valid: false, error: `Failed to verify ${provider} token: ${err.message}` };
    }
};

module.exports = { validateAiToken, STRUCTURAL_RULES };
