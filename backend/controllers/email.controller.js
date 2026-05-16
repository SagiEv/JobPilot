const supabase = require('../supabaseClient');
const crypto = require('crypto');
const { google } = require('googleapis');

// Note: Ensure process.env.ENCRYPTION_KEY is exactly 32 chars long in production.
const ENCRYPTION_KEY = process.env.ENCRYPTION_KEY || '12345678901234567890123456789012'; // Default for dev
const IV_LENGTH = 16;

function encrypt(text) {
    if (!text) return null;
    let iv = crypto.randomBytes(IV_LENGTH);
    let cipher = crypto.createCipheriv('aes-256-cbc', Buffer.from(ENCRYPTION_KEY), iv);
    let encrypted = cipher.update(text);
    encrypted = Buffer.concat([encrypted, cipher.final()]);
    return iv.toString('hex') + ':' + encrypted.toString('hex');
}

function decrypt(text) {
    if (!text) return null;
    let textParts = text.split(':');
    let iv = Buffer.from(textParts.shift(), 'hex');
    let encryptedText = Buffer.from(textParts.join(':'), 'hex');
    let decipher = crypto.createDecipheriv('aes-256-cbc', Buffer.from(ENCRYPTION_KEY), iv);
    let decrypted = decipher.update(encryptedText);
    decrypted = Buffer.concat([decrypted, decipher.final()]);
    return decrypted.toString();
}

const getOAuth2Client = () => {
    return new google.auth.OAuth2(
        process.env.GOOGLE_CLIENT_ID || 'mock_client_id',
        process.env.GOOGLE_CLIENT_SECRET || 'mock_client_secret',
        process.env.GOOGLE_REDIRECT_URI || 'http://localhost:5000/api/email/auth/google/callback'
    );
};

exports.getStatus = async (req, res) => {
    try {
        const userId = req.user.id;
        const { data, error } = await supabase
            .from('email_integrations')
            .select('connected_email, sync_status, last_synced_at')
            .eq('user_id', userId)
            .single();

        if (error && error.code !== 'PGRST116') { // PGRST116 is not found
            console.error('[EMAIL STATUS ERROR] Database error:', error);
            return res.status(500).json({ error: 'Database error', message: error.message });
        }

        res.json({ connected: !!data, integration: data || null });
    } catch (err) {
        console.error('[EMAIL STATUS ERROR] Server error:', err);
        res.status(500).json({ error: 'Server error', message: err.message });
    }
};

exports.googleAuth = (req, res) => {
    const userId = req.query.userId;
    if (!userId) {
        return res.status(400).send('User ID is required');
    }

    const oauth2Client = getOAuth2Client();
    const scopes = ['https://www.googleapis.com/auth/gmail.readonly'];

    const url = oauth2Client.generateAuthUrl({
        access_type: 'offline',
        scope: scopes,
        state: userId // pass user id through state
    });

    res.redirect(url);
};

exports.googleCallback = async (req, res) => {
    const code = req.query.code;
    const userId = req.query.state;

    if (!code || !userId) {
        return res.status(400).send('Missing code or state');
    }

    try {
        if (process.env.GOOGLE_CLIENT_ID) {
            const oauth2Client = getOAuth2Client();
            const { tokens } = await oauth2Client.getToken(code);
            oauth2Client.setCredentials(tokens);

            // Fetch user email
            const gmail = google.gmail({ version: 'v1', auth: oauth2Client });
            const profile = await gmail.users.getProfile({ userId: 'me' });
            const email = profile.data.emailAddress;

            await saveIntegration(userId, email, tokens);
        } else {
            // MOCK MODE if no Google Client ID is configured
            await saveIntegration(userId, 'mock-proxy@gmail.com', { access_token: 'mock_access', refresh_token: 'mock_refresh' });
        }

        // Redirect back to settings page
        const frontendUrl = process.env.VITE_FRONTEND_URL || 'http://localhost:3000';
        res.redirect(`${frontendUrl}/?tab=settings&emailConnected=true`);
    } catch (err) {
        console.error(err);
        res.status(500).send('Authentication failed');
    }
};

async function saveIntegration(userId, email, tokens) {
    const encryptedAccess = encrypt(tokens.access_token);
    const encryptedRefresh = encrypt(tokens.refresh_token);

    const { error } = await supabase
        .from('email_integrations')
        .upsert({
            user_id: userId,
            provider: 'google',
            connected_email: email,
            encrypted_access_token: encryptedAccess,
            encrypted_refresh_token: encryptedRefresh,
            sync_status: 'idle',
            updated_at: new Date().toISOString()
        }, { onConflict: 'user_id' });

    if (error) throw error;
}

exports.syncEmail = async (req, res) => {
    try {
        const userId = req.user.id;
        
        // Update status to syncing
        await supabase.from('email_integrations').update({ sync_status: 'syncing' }).eq('user_id', userId);

        // Here we would use the decrypted token to fetch emails via Google APIs.
        // For now, we simulate a delay and mark as done since this is a mock/placeholder.
        setTimeout(async () => {
            await supabase.from('email_integrations').update({
                sync_status: 'idle',
                last_synced_at: new Date().toISOString()
            }).eq('user_id', userId);
        }, 2000);

        res.json({ message: 'Sync started' });
    } catch (err) {
        res.status(500).json({ error: 'Sync failed', message: err.message });
    }
};

exports.disconnectEmail = async (req, res) => {
    try {
        const userId = req.user.id;
        const { error } = await supabase.from('email_integrations').delete().eq('user_id', userId);
        if (error) throw error;
        res.json({ message: 'Disconnected successfully' });
    } catch (err) {
        res.status(500).json({ error: 'Disconnect failed', message: err.message });
    }
};
