import React, { useState, useEffect } from 'react';
import { useSettings } from '../hooks/useSettings';
import { getAccessToken } from '../services/apiClient';
import { useEmailIntegration } from '../hooks/useEmailIntegration';
import { supabase } from '../supabaseClient';
import PageLoader from '../components/PageLoader';

const GroqIcon = () => (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" style={{ flexShrink: 0 }}>
        <circle cx="12" cy="12" r="10" fill="#f55036" opacity="0.12" />
        <circle cx="12" cy="12" r="10" stroke="#f55036" strokeWidth="1.5" fill="none" />
        <path d="M8 12.5c0-2.2 1.8-4 4-4s4 1.8 4 4" stroke="#f55036" strokeWidth="1.5" strokeLinecap="round" />
        <circle cx="12" cy="14" r="1.5" fill="#f55036" />
    </svg>
);

const KeyIcon = () => (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <circle cx="7.5" cy="15.5" r="5.5" />
        <path d="M21 2l-9.6 9.6M15.5 7.5L19 11" />
    </svg>
);

const CheckIcon = () => (
    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
        <polyline points="20 6 9 17 4 12" />
    </svg>
);

const TrashIcon = () => (
    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <polyline points="3 6 5 6 21 6" />
        <path d="M19 6l-1 14H6L5 6" />
        <path d="M10 11v6M14 11v6" />
        <path d="M9 6V4h6v2" />
    </svg>
);

const MailIcon = () => (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" style={{ flexShrink: 0 }}>
        <path d="M4 7.00005L10.2 11.65C11.2667 12.45 12.7333 12.45 13.8 11.65L20 7" stroke="#0f6e56" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
        <rect x="3" y="5" width="18" height="14" rx="2" stroke="#0f6e56" strokeWidth="1.5" strokeLinecap="round" />
    </svg>
);

const SettingsPage = () => {
    const { settings, loading, saving, saveGroqToken, clearGroqToken, saveTimezone } = useSettings();
    const { integration, loading: emailLoading, syncing, connectGoogle, disconnectGoogle, syncEmails } = useEmailIntegration();
    const [tokenInput, setTokenInput] = useState('');
    const [showInput, setShowInput] = useState(false);
    const [showToken, setShowToken] = useState(false);
    const [feedback, setFeedback] = useState(null); // { type: 'success'|'error', msg }

    if (loading || emailLoading) return <PageLoader />;

    const handleSave = async () => {
        if (!tokenInput.trim()) return;
        try {
            await saveGroqToken(tokenInput.trim());
            setTokenInput('');
            setShowInput(false);
            setFeedback({ type: 'success', msg: 'Groq API key saved successfully.' });
            setTimeout(() => setFeedback(null), 3500);
        } catch {
            setFeedback({ type: 'error', msg: 'Failed to save. Check your connection.' });
        }
    };

    const handleClear = async () => {
        if (!window.confirm('Remove the saved Groq API key?')) return;
        try {
            await clearGroqToken();
            setShowInput(false);
            setTokenInput('');
            setFeedback({ type: 'success', msg: 'Groq API key removed.' });
            setTimeout(() => setFeedback(null), 3500);
        } catch {
            setFeedback({ type: 'error', msg: 'Failed to remove key.' });
        }
    };

    const maskedPreview = settings.groq_token_preview
        ? (showToken ? settings.groq_token_preview : settings.groq_token_preview.slice(0, 10) + '••••••••••••••••••')
        : null;

    return (
        <div className="section settings-page">
            <div className="settings-grid">

                {/* Page Header */}
                <div className="settings-header">
                    <h1 className="settings-title">Settings</h1>
                    <p className="settings-subtitle">Manage your API tokens and application preferences.</p>
                </div>

                {/* Feedback toast */}
                {feedback && (
                    <div
                        className={`settings-toast ${feedback.type === 'success' ? 'toast-success' : 'toast-error'}`}
                        role="alert"
                    >
                        {feedback.type === 'success' ? <CheckIcon /> : '⚠'}
                        {feedback.msg}
                    </div>
                )}

                {/* Localization Section */}
                <div className="settings-section-label">Localization</div>
                
                <div className="card settings-card">
                    <div className="settings-service-row">
                        <div className="settings-service-info">
                            <div className="settings-service-name">Timezone</div>
                            <div className="settings-service-desc">
                                Default timezone for date parsing and display.
                            </div>
                        </div>
                        <div className="settings-service-status">
                            <select 
                                className="field-input" 
                                value={settings.timezone || 'Asia/Jerusalem'}
                                onChange={async (e) => {
                                    try {
                                        await saveTimezone(e.target.value);
                                        setFeedback({ type: 'success', msg: 'Timezone updated.' });
                                        setTimeout(() => setFeedback(null), 3500);
                                    } catch {
                                        setFeedback({ type: 'error', msg: 'Failed to update timezone.' });
                                    }
                                }}
                                disabled={saving}
                                style={{ width: '200px' }}
                            >
                                <option value="Asia/Jerusalem">Israel Time (Asia/Jerusalem)</option>
                                <option value="UTC">UTC</option>
                                <option value="America/New_York">Eastern Time (US)</option>
                                <option value="America/Los_Angeles">Pacific Time (US)</option>
                                <option value="Europe/London">London (GMT/BST)</option>
                                <option value="Europe/Paris">Central Europe (CET/CEST)</option>
                            </select>
                        </div>
                    </div>
                </div>

                {/* AI Integration Section */}
                <div className="settings-section-label" style={{ marginTop: '2rem' }}>AI Integration</div>

                <div className="card settings-card">
                    <div className="settings-service-row">
                        <div className="settings-service-icon">
                            <GroqIcon />
                        </div>
                        <div className="settings-service-info">
                            <div className="settings-service-name">Groq API Key</div>
                            <div className="settings-service-desc">
                                Powers the CV Tailoring pipeline — Job Analysis, Scoring, ATS Validation, and Rewriting agents.
                                {' '}
                                <a
                                    href="https://console.groq.com/keys"
                                    target="_blank"
                                    rel="noopener noreferrer"
                                >
                                    Get your key →
                                </a>
                            </div>
                        </div>
                        <div className="settings-service-status">
                            {settings.groq_token_set ? (
                                <span className="token-badge token-badge-active">
                                    <CheckIcon /> Connected
                                </span>
                            ) : (
                                <span className="token-badge token-badge-missing">
                                    Not set
                                </span>
                            )}
                        </div>
                    </div>

                    {/* Token preview when set */}
                    {settings.groq_token_set && !showInput && (
                        <div className="token-preview-row">
                            <div className="token-preview-label">
                                <KeyIcon /> Saved key
                            </div>
                            <code className="token-preview-value">{maskedPreview}</code>
                            <button
                                className="btn btn-sm"
                                onClick={() => setShowToken(v => !v)}
                            >
                                {showToken ? 'Hide' : 'Show'}
                            </button>
                            <button
                                className="btn btn-sm"
                                onClick={() => { setShowInput(true); setTokenInput(''); }}
                            >
                                Replace
                            </button>
                            <button
                                className="btn btn-sm btn-danger-ghost"
                                onClick={handleClear}
                                disabled={saving}
                            >
                                <TrashIcon /> Remove
                            </button>
                        </div>
                    )}

                    {/* Token input form */}
                    {(!settings.groq_token_set || showInput) && (
                        <div className="token-input-section">
                            <div className="field-label" style={{ marginBottom: 6 }}>
                                {settings.groq_token_set ? 'Enter new key to replace' : 'Paste your Groq API key'}
                            </div>
                            <form 
                                className="token-input-row" 
                                onSubmit={(e) => { e.preventDefault(); handleSave(); }}
                            >
                                <input
                                    id="groq-api-key-input"
                                    className="field-input token-input"
                                    type="password"
                                    placeholder="gsk_••••••••••••••••••••••••••••••••••••••••••••••••••••••••••••••"
                                    value={tokenInput}
                                    onChange={e => setTokenInput(e.target.value)}
                                    autoComplete="off"
                                    spellCheck={false}
                                />
                                <button
                                    id="save-groq-key-btn"
                                    className="btn btn-primary"
                                    type="submit"
                                    disabled={saving || !tokenInput.trim()}
                                >
                                    {saving ? 'Saving…' : 'Save Key'}
                                </button>
                                {showInput && (
                                    <button
                                        type="button"
                                        className="btn"
                                        onClick={() => { setShowInput(false); setTokenInput(''); }}
                                    >
                                        Cancel
                                    </button>
                                )}
                            </form>
                            <div className="token-input-hint">
                                Your key is stored in the database and never sent to the frontend in plain text.
                            </div>
                        </div>
                    )}
                </div>

                {/* Email Integration Section */}
                <div className="settings-section-label" style={{ marginTop: '2rem' }}>Email Integrations</div>

                <div className="card settings-card">
                    <div className="settings-service-row">
                        <div className="settings-service-icon" style={{ backgroundColor: '#eefdf8' }}>
                            <MailIcon />
                        </div>
                        <div className="settings-service-info">
                            <div className="settings-service-name">Gmail Proxy Inbox</div>
                            <div className="settings-service-desc">
                                Automatically sync job applications, interview invites, and rejections from a dedicated Gmail account.
                            </div>
                        </div>
                        <div className="settings-service-status">
                            {integration ? (
                                <span className="token-badge token-badge-active">
                                    <CheckIcon /> Connected
                                </span>
                            ) : (
                                <span className="token-badge token-badge-missing">
                                    Not connected
                                </span>
                            )}
                        </div>
                    </div>

                    {integration ? (
                        <div className="token-preview-row">
                            <div className="token-preview-label">
                                <MailIcon /> {integration.connected_email}
                            </div>
                            <div style={{ flex: 1, fontSize: '0.85rem', color: '#666' }}>
                                Status: <strong>{integration.sync_status}</strong> 
                                {integration.last_synced_at && ` (Last synced: ${new Date(integration.last_synced_at).toLocaleString()})`}
                            </div>
                            <button
                                className="btn btn-sm"
                                onClick={syncEmails}
                                disabled={syncing}
                            >
                                {syncing ? 'Syncing...' : 'Sync Now'}
                            </button>
                            <button
                                className="btn btn-sm btn-danger-ghost"
                                onClick={disconnectGoogle}
                            >
                                <TrashIcon /> Disconnect
                            </button>
                        </div>
                    ) : (
                        <div className="token-input-section" style={{ borderTop: 'none', paddingTop: 0 }}>
                            <p className="token-input-hint" style={{ marginBottom: '1rem' }}>
                                Connect a dedicated Gmail proxy account. Your emails will be securely parsed on our backend.
                            </p>
                            <button
                                className="btn btn-primary"
                                onClick={() => {
                                    const token = getAccessToken();
                                    if (!token) {
                                        alert("Authentication token not found. Please log in again.");
                                        return;
                                    }
                                    try {
                                        const payload = JSON.parse(atob(token.split('.')[1]));
                                        const id = payload.sub;
                                        if (!id) throw new Error("Invalid token payload");
                                        connectGoogle(id);
                                    } catch (e) {
                                        console.error("JWT parse error:", e);
                                        alert("Failed to extract user session.");
                                    }
                                }}
                            >
                                Connect Google Account
                            </button>
                        </div>
                    )}
                </div>

                {/* Future integrations placeholder */}
                <div className="settings-section-label" style={{ marginTop: 8 }}>More Integrations</div>
                <div className="card settings-card settings-coming-soon">
                    <div className="coming-soon-row">
                        <div className="coming-soon-dot" />
                        <span>OpenAI, Anthropic, and LinkedIn integrations — coming soon</span>
                    </div>
                </div>

            </div>
        </div>
    );
};

export default SettingsPage;
