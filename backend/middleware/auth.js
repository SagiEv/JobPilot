const supabase = require('../supabaseClient');

const authenticate = async (req, res, next) => {
    try {
        console.log('[AUTH] Incoming request:', {
            method: req.method,
            path: req.path,
        });

        const authHeader = req.headers.authorization;

        if (!authHeader?.startsWith('Bearer ')) {
            console.warn('[AUTH] Missing or malformed Authorization header');
            return res.status(401).json({ error: 'No token provided' });
        }

        const token = authHeader.split(' ')[1];

        console.log('[AUTH] Token received (truncated):', token?.slice(0, 10) + '...');

        const { data, error } = await supabase.auth.getUser(token);

        if (error) {
            console.error('[AUTH] Supabase error while verifying token:', error.message || error);
        }

        if (!data?.user) {
            console.warn('[AUTH] Invalid or expired token');
            return res.status(401).json({ error: 'Invalid or expired token' });
        }

        console.log('[AUTH] Auth success for user:', {
            id: data.user.id,
            email: data.user.email,
        });

        req.user = data.user;
        req.token = token;
        next();

    } catch (err) {
        console.error('[AUTH] Unexpected authentication failure:', err);
        return res.status(500).json({
            error: 'Authentication failed',
        });
    }
};

module.exports = { authenticate };