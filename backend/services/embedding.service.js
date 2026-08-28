const axios = require('axios');

/**
 * Calls the Python AI service to get the embedding vector for a given text.
 * @param {string} text 
 * @returns {Promise<number[] | null>}
 */
const getEmbedding = async (text) => {
    if (!text || text.trim() === '') return null;
    try {
        const response = await axios.post('http://127.0.0.1:8001/embed', {
            text: text
        }, { timeout: 10000 });
        return response.data.embedding;
    } catch (error) {
        console.error('Error getting embedding:', error.message);
        return null; // Fail gracefully so it doesn't break standard CRUD
    }
};

module.exports = {
    getEmbedding
};
