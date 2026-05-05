const authorize = (allowedRoles = []) => {
    return (req, res, next) => {
        console.log('[AUTHORIZE] Checking access:', {
            path: req.path,
            allowedRoles,
        });

        if (!req.user) {
            console.warn('[AUTHORIZE] Missing req.user (not authenticated)');
            return res.status(401).json({ error: 'Authentication required' });
        }

        const userRole =
            req.user?.user_metadata?.role ||
            req.user?.app_metadata?.role ||
            'user';

        console.log('[AUTHORIZE] User role resolved:', {
            userId: req.user.id,
            email: req.user.email,
            role: userRole,
        });

        if (!allowedRoles.includes(userRole)) {
            console.warn('[AUTHORIZE] Access denied:', {
                userId: req.user.id,
                role: userRole,
                allowedRoles,
                path: req.path,
            });

            return res.status(403).json({
                error: `Access denied for role: ${userRole}`,
            });
        }

        console.log('[AUTHORIZE] Access granted');

        next();
    };
};

module.exports = { authorize };