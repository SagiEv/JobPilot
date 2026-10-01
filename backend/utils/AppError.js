/**
 * Custom application error with HTTP status code and optional error code.
 * Throw from services; the centralized error middleware handles the response.
 */
class AppError extends Error {
    /**
     * @param {string} message - Human-readable error message
     * @param {number} status - HTTP status code (default 500)
     * @param {string} [code] - Machine-readable error code (e.g. 'CONFLICTING_EVENT')
     * @param {object} [details] - Additional data to include in the response
     */
    constructor(message, status = 500, code = undefined, details = undefined) {
        super(message);
        this.name = 'AppError';
        this.status = status;
        this.code = code;
        this.details = details;
    }
}

module.exports = AppError;
