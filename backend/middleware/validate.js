const validate = (schema) => (req, res, next) => {
    try {
        schema.parse(req.body);
        next();
    } catch (error) {
        const issues = error?.issues || error?.errors || [];

        const formatted = Array.isArray(issues)
            ? issues.map(err => ({
                field: err?.path ? err.path.join('.') : 'unknown',
                issue: err?.message || 'Invalid value'
            }))
            : [];

        return res.status(400).json({
            status: 'error',
            message: 'Invalid request data',
            details: formatted
        });
    }
};

module.exports = { validate };