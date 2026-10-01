const { google } = require('googleapis');
const { encrypt } = require('../utils/encryption');
const emailIntegrationsRepo = require('../repositories/emailIntegrations.repository');
const AppError = require('../utils/AppError');
const { adminSupabase } = require('../supabaseClient');

const getOAuth2Client = () => {
    return new google.auth.OAuth2(
        process.env.GOOGLE_CLIENT_ID || 'mock_client_id',
        process.env.GOOGLE_CLIENT_SECRET || 'mock_client_secret',
        process.env.GOOGLE_REDIRECT_URI || 'http://localhost:5000/api/email/auth/google/callback'
    );
};

const getStatus = async (userId, supabaseClient) => {
    const { data, error } = await emailIntegrationsRepo.findByUser(userId, supabaseClient);

    if (error && error.code !== 'PGRST116') { // PGRST116 is not found
        throw new AppError(error.message, error.status || 400, error.code);
    }

    return { connected: !!data, integration: data || null };
};

const getGoogleAuthUrl = (userId) => {
    const oauth2Client = getOAuth2Client();
    const scopes = ['https://www.googleapis.com/auth/gmail.readonly'];

    return oauth2Client.generateAuthUrl({
        access_type: 'offline',
        scope: scopes,
        state: userId // pass user id through state
    });
};

const handleGoogleCallback = async (code, userId) => {
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
        await saveIntegration(userId, 'mock-proxy@gmail.com', {
            access_token: 'mock_access',
            refresh_token: 'mock_refresh'
        });
    }
};

const saveIntegration = async (userId, email, tokens) => {
    const encryptedAccess = encrypt(tokens.access_token);
    const encryptedRefresh = encrypt(tokens.refresh_token);

    const { error } = await emailIntegrationsRepo.upsert({
        user_id: userId,
        provider: 'google',
        connected_email: email,
        encrypted_access_token: encryptedAccess,
        encrypted_refresh_token: encryptedRefresh,
        sync_status: 'idle',
        updated_at: new Date().toISOString()
    }, adminSupabase);

    if (error) throw error;
};

const startSync = async (userId, supabaseClient) => {
    // Update status to syncing
    await emailIntegrationsRepo.updateSyncStatus(userId, { sync_status: 'syncing' }, adminSupabase);

    // Here we would use the decrypted token to fetch emails via Google APIs.
    // For now, we simulate a delay and mark as done since this is a mock/placeholder.
    setTimeout(async () => {
        await emailIntegrationsRepo.updateSyncStatus(userId, {
            sync_status: 'idle',
            last_synced_at: new Date().toISOString()
        }, adminSupabase);
    }, 2000);
};

const disconnect = async (userId, supabaseClient) => {
    const { error } = await emailIntegrationsRepo.remove(userId, adminSupabase);
    if (error) throw error;
};

module.exports = {
    getStatus,
    getGoogleAuthUrl,
    handleGoogleCallback,
    startSync,
    disconnect
};
