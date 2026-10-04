// Centralized error logic
const errorHandler = (err, req, res, next) => {
    console.error('[Error]', err);

    let statusCode = err.status || 500;
    let message = err.message || 'Internal Server Error';

    // Supabase unique constraint error
    if (err.code === '23505') {
        statusCode = 409;
        message = 'Resource already exists.';
    }

    const response = {
        status: 'error',
        message,
    };

    // Include machine-readable error code if present (e.g. 'CONFLICTING_EVENT')
    if (err.code && err.code !== '23505') {
        response.code = err.code;
    }

    // Include additional details if present (e.g. conflict data)
    if (err.details) {
        response.details = err.details;
    }

    // Include stack trace in development
    if (process.env.NODE_ENV === 'development') {
        response.stack = err.stack;
    }

    return res.status(statusCode).json(response);
};

module.exports = { errorHandler };