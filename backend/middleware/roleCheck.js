const logger = require('../utils/logger');

const authorize = (allowedRoles = []) => {
    return (req, res, next) => {
        logger.debug({
            path: req.path,
            allowedRoles,
        }, '[AUTHORIZE] Checking access');

        if (!req.user) {
            logger.warn('[AUTHORIZE] Missing req.user (not authenticated)');
            return res.status(401).json({ error: 'Authentication required' });
        }

        const userRole =
            req.user?.user_metadata?.role ||
            req.user?.app_metadata?.role ||
            'user';

        logger.debug({
            userId: req.user.id,
            email: req.user.email,
            role: userRole,
        }, '[AUTHORIZE] User role resolved');

        if (!allowedRoles.includes(userRole)) {
            logger.warn({
                userId: req.user.id,
                role: userRole,
                allowedRoles,
                path: req.path,
            }, '[AUTHORIZE] Access denied');

            return res.status(403).json({
                error: `Access denied for role: ${userRole}`,
            });
        }

        logger.debug('[AUTHORIZE] Access granted');

        next();
    };
};

module.exports = { authorize };