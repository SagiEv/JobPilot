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

        let user;
        try {
            const { data, error } = await supabase.auth.getUser(token);
            if (error || !data?.user) {
                console.error('[AUTH] Supabase verification error:', error?.message);
                return res.status(401).json({ error: 'Invalid or expired token' });
            }
            user = {
                id: data.user.id,
                email: data.user.email,
                role: data.user.role || 'authenticated'
            };
        } catch (error) {
            console.error('[AUTH] Unexpected verification error:', error.message);
            return res.status(401).json({ error: 'Invalid or expired token' });
        }

        console.log('[AUTH] Auth success for user:', {
            id: user.id,
            email: user.email,
        });

        req.user = user;
        req.token = token;
        // Inject dynamic authenticated client for DI
        req.supabase = supabase.createAuthClient(token);
        
        next();

    } catch (err) {
        console.error('[AUTH] Unexpected authentication failure:', err);
        return res.status(500).json({
            error: 'Authentication failed',
        });
    }
};

module.exports = { authenticate };