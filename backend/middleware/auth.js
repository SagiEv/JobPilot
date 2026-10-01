const supabase = require('../supabaseClient');
const logger = require('../utils/logger');


const authenticate = async (req, res, next) => {
    try {
        logger.debug({
            method: req.method,
            path: req.path,
        }, '[AUTH] Incoming request');

        const authHeader = req.headers.authorization;

        if (!authHeader?.startsWith('Bearer ')) {
            logger.warn('[AUTH] Missing or malformed Authorization header');
            return res.status(401).json({ error: 'No token provided' });
        }

        const token = authHeader.split(' ')[1];

        logger.debug({ token: token?.slice(0, 10) + '...' }, '[AUTH] Token received (truncated)');

        let user;
        try {
            const { data, error } = await supabase.auth.getUser(token);
            if (error || !data?.user) {
                logger.error({ error: error?.message }, '[AUTH] Supabase verification error');
                return res.status(401).json({ error: 'Invalid or expired token' });
            }
            user = {
                id: data.user.id,
                email: data.user.email,
                role: data.user.role || 'authenticated'
            };
        } catch (error) {
            logger.error({ error: error.message }, '[AUTH] Unexpected verification error');
            return res.status(401).json({ error: 'Invalid or expired token' });
        }

        logger.debug({
            id: user.id,
            email: user.email,
        }, '[AUTH] Auth success for user');

        req.user = user;
        req.token = token;
        // Inject dynamic authenticated client for DI
        req.supabase = supabase.createAuthClient(token);
        
        next();

    } catch (err) {
        logger.error({ err }, '[AUTH] Unexpected authentication failure');
        return res.status(500).json({
            error: 'Authentication failed',
        });
    }
};

module.exports = { authenticate };