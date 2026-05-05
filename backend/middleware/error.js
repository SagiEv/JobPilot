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

    return res.status(statusCode).json({
        status: 'error',
        message,
        stack: process.env.NODE_ENV === 'development'
            ? err.stack
            : undefined
    });
};

module.exports = { errorHandler };