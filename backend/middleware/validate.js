const validate = (schema) => (req, res, next) => {
    console.log("📥 [VALIDATE] Incoming request:", {
        method: req.method,
        url: req.originalUrl,
        body: req.body
    });

    try {
        const result = schema.parse(req.body);

        console.log("✅ [VALIDATE] Passed:", result);

        next();
    } catch (error) {
        console.log("❌ [VALIDATE] FAILED");

        console.log("RAW ERROR:", error);

        const issues = error?.issues || error?.errors || [];

        const formatted = Array.isArray(issues)
            ? issues.map(err => ({
                field: err?.path ? err.path.join('.') : 'unknown',
                issue: err?.message || 'Invalid value'
            }))
            : [];

        console.log("DETAILS:", formatted);

        return res.status(400).json({
            status: 'error',
            message: 'Invalid request data',
            details: formatted
        });
    }
};

module.exports = { validate };