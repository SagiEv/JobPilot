import React, { useState, useEffect } from 'react';
import { useSettings } from '../hooks/useSettings';
import { authService } from '../services/authService';
import PageLoader from '../components/PageLoader';

// ── Icons ────────────────────────────────────────────────────────────────────
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
        <circle cx="7.5" cy="15.5" r="5.5" /><path d="M21 2l-9.6 9.6M15.5 7.5L19 11" />
    </svg>
);

const CheckIcon = () => (
    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
        <polyline points="20 6 9 17 4 12" />
    </svg>
);

const TrashIcon = () => (
    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <polyline points="3 6 5 6 21 6" /><path d="M19 6l-1 14H6L5 6" /><path d="M10 11v6M14 11v6" /><path d="M9 6V4h6v2" />
    </svg>
);

const MailIcon = () => (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" style={{ flexShrink: 0 }}>
        <path d="M4 7L10.2 11.65C11.267 12.45 12.733 12.45 13.8 11.65L20 7" stroke="#0f6e56" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
        <rect x="3" y="5" width="18" height="14" rx="2" stroke="#0f6e56" strokeWidth="1.5" strokeLinecap="round" />
    </svg>
);

const ChevronIcon = ({ open }) => (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" style={{ transition: 'transform .2s', transform: open ? 'rotate(180deg)' : 'rotate(0deg)' }}>
        <polyline points="6 9 12 15 18 9" />
    </svg>
);

// ── IMAP provider presets ─────────────────────────────────────────────────────
const PRESETS = {
    'gmail.com':       { host: 'imap.gmail.com',           port: 993 },
    'googlemail.com':  { host: 'imap.gmail.com',           port: 993 },
    'outlook.com':     { host: 'outlook.office365.com',    port: 993 },
    'hotmail.com':     { host: 'outlook.office365.com',    port: 993 },
    'live.com':        { host: 'outlook.office365.com',    port: 993 },
    'yahoo.com':       { host: 'imap.mail.yahoo.com',      port: 993 },
    'icloud.com':      { host: 'imap.mail.me.com',         port: 993 },
};

const STATUS_COLORS = {
    interview:   { bg: '#eefdf8', color: '#0f6e56' },
    offer:       { bg: '#eef5ff', color: '#1a6cf5' },
    rejected:    { bg: '#fff0f0', color: '#a32d2d' },
    assessment:  { bg: '#fffbeb', color: '#92400e' },
    follow_up:   { bg: '#f5f0ff', color: '#6d28d9' },
    unknown:     { bg: '#f4f4f5', color: '#71717a' },
};

// ── Main Component ────────────────────────────────────────────────────────────
const SettingsPage = () => {
    const {
        settings, loading, saving,
        saveGroqToken, clearGroqToken, saveTimezone,
        saveSmtpSettings, testSmtpConnection, testing, testResult, setTestResult,
        getEmailLogs,
    } = useSettings();

    // Groq state
    const [tokenInput, setTokenInput]   = useState('');
    const [showInput, setShowInput]     = useState(false);
    const [showToken, setShowToken]     = useState(false);

    // SMTP form state
    const [smtpForm, setSmtpForm] = useState({
        smtp_email: '', smtp_host: '', smtp_port: 993,
        smtp_password: '', smtp_poll_interval_min: 15, smtp_enabled: false,
    });
    const [smtpDirty, setSmtpDirty]     = useState(false);
    const [showPassword, setShowPassword] = useState(false);
    const [smtpExpanded, setSmtpExpanded] = useState(false);

    // Email logs state
    const [logs, setLogs]               = useState([]);
    const [logsLoading, setLogsLoading] = useState(false);
    const [logsOpen, setLogsOpen]       = useState(false);

    // Global feedback
    const [feedback, setFeedback] = useState(null);

    // Account & Security state
    const [passwordForm, setPasswordForm] = useState({ newPassword: '', confirmPassword: '' });
    const [passwordLoading, setPasswordLoading] = useState(false);
    const [passwordExpanded, setPasswordExpanded] = useState(false);

    const handleChangePassword = async (e) => {
        e.preventDefault();
        if (!passwordForm.newPassword || !passwordForm.confirmPassword) {
            return flash('error', 'Please fill in both password fields.');
        }
        if (passwordForm.newPassword !== passwordForm.confirmPassword) {
            return flash('error', 'Passwords do not match.');
        }
        if (passwordForm.newPassword.length < 6) {
            return flash('error', 'Password must be at least 6 characters.');
        }
        setPasswordLoading(true);
        try {
            await authService.changePassword(passwordForm.newPassword);
            flash('success', 'Password updated successfully.');
            setPasswordForm({ newPassword: '', confirmPassword: '' });
            setPasswordExpanded(false);
        } catch (err) {
            flash('error', err.message || 'Failed to update password.');
        } finally {
            setPasswordLoading(false);
        }
    };

    const handleLogout = async () => {
        if (!window.confirm('Are you sure you want to log out?')) return;
        try {
            await authService.logout();
        } catch {
            flash('error', 'Failed to log out.');
        }
    };

    // Sync SMTP form from loaded settings
    useEffect(() => {
        if (!loading && settings) {
            setSmtpForm(f => ({
                ...f,
                smtp_email:            settings.smtp_email || '',
                smtp_host:             settings.smtp_host  || '',
                smtp_port:             settings.smtp_port  || 993,
                smtp_poll_interval_min: settings.smtp_poll_interval_min || 15,
                smtp_enabled:          settings.smtp_enabled || false,
            }));
            // Auto-expand if already configured
            if (settings.smtp_email) setSmtpExpanded(true);
        }
    }, [loading, settings?.smtp_email]);

    if (loading) return <PageLoader />;

    // ── Helpers ──────────────────────────────────────────────────────────────
    const flash = (type, msg) => {
        setFeedback({ type, msg });
        setTimeout(() => setFeedback(null), 3500);
    };

    const setSmtpField = (key, value) => {
        setSmtpForm(f => ({ ...f, [key]: value }));
        setSmtpDirty(true);
        setTestResult(null);

        // Auto-fill host/port when user types an email
        if (key === 'smtp_email') {
            const domain = value.split('@')[1]?.toLowerCase();
            if (domain && PRESETS[domain]) {
                setSmtpForm(f => ({ ...f, smtp_email: value, ...PRESETS[domain] }));
            }
        }
    };

    const handleSmtpSave = async () => {
        try {
            const payload = {
                smtp_email:             smtpForm.smtp_email || null,
                smtp_host:              smtpForm.smtp_host  || null,
                smtp_port:              Number(smtpForm.smtp_port) || 993,
                smtp_poll_interval_min: Number(smtpForm.smtp_poll_interval_min) || 15,
                smtp_enabled:           smtpForm.smtp_enabled,
            };
            if (smtpForm.smtp_password) payload.smtp_password = smtpForm.smtp_password;
            await saveSmtpSettings(payload);
            setSmtpDirty(false);
            setSmtpForm(f => ({ ...f, smtp_password: '' }));
            flash('success', 'Mail settings saved.');
        } catch {
            flash('error', 'Failed to save mail settings.');
        }
    };

    const handleTest = async () => {
        const override = {
            smtp_email:    smtpForm.smtp_email,
            smtp_host:     smtpForm.smtp_host,
            smtp_port:     Number(smtpForm.smtp_port),
            smtp_password: smtpForm.smtp_password || undefined,
        };
        await testSmtpConnection(override);
    };

    const handleLoadLogs = async () => {
        if (logsOpen) { setLogsOpen(false); return; }
        setLogsOpen(true);
        setLogsLoading(true);
        try {
            const data = await getEmailLogs(30);
            setLogs(data || []);
        } catch {
            setLogs([]);
        } finally {
            setLogsLoading(false);
        }
    };

    const maskedPreview = settings.groq_token_preview
        ? (showToken ? settings.groq_token_preview : settings.groq_token_preview.slice(0, 10) + '••••••••••••••••••')
        : null;

    const smtpConnected = !!(settings.smtp_email && settings.smtp_password_set);

    // ── Render ────────────────────────────────────────────────────────────────
    return (
        <div className="section settings-page">
            <div className="settings-grid">

                {/* Header */}
                <div className="settings-header">
                    <h1 className="settings-title desktop-only">Settings</h1>
                    <p className="settings-subtitle">Manage your API tokens and application preferences.</p>
                </div>

                {/* Feedback toast */}
                {feedback && (
                    <div className={`settings-toast ${feedback.type === 'success' ? 'toast-success' : 'toast-error'}`} role="alert">
                        {feedback.type === 'success' ? <CheckIcon /> : '⚠'} {feedback.msg}
                    </div>
                )}

                {/* ── Account & Security ── */}
                <div className="settings-section-label">Account & Security</div>
                <div className="card settings-card" style={{ marginBottom: '2rem' }}>
                    <div className="settings-service-row">
                        <div className="settings-service-info" style={{ flex: 1 }}>
                            <div className="settings-service-name">Change Password</div>
                            <div className="settings-service-desc">Update your account password.</div>
                        </div>
                        <div className="settings-service-status">
                            <button className="btn btn-sm" onClick={() => setPasswordExpanded(v => !v)} style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                                {passwordExpanded ? 'Cancel' : 'Change'} <ChevronIcon open={passwordExpanded} />
                            </button>
                        </div>
                    </div>
                    <div 
                        style={{ 
                            maxHeight: passwordExpanded ? '500px' : '0',
                            opacity: passwordExpanded ? 1 : 0,
                            overflow: 'hidden',
                            transition: 'max-height 0.3s ease-in-out, opacity 0.3s ease-in-out, margin-top 0.3s ease-in-out',
                            marginTop: passwordExpanded ? '10px' : '0'
                        }}
                    >
                        <div className="settings-service-row" style={{ paddingTop: 0 }}>
                            <div style={{ flex: 1 }}>
                                <form className="smtp-form-grid" style={{ marginTop: 0 }} onSubmit={handleChangePassword}>
                                    <div className="smtp-field smtp-field-full">
                                        <label className="field-label">New Password</label>
                                        <input 
                                            className="field-input" 
                                            type="password" 
                                            placeholder="Enter new password"
                                            value={passwordForm.newPassword}
                                            onChange={e => setPasswordForm(f => ({ ...f, newPassword: e.target.value }))}
                                            minLength={6}
                                            disabled={passwordLoading}
                                        />
                                    </div>
                                    <div className="smtp-field smtp-field-full">
                                        <label className="field-label">Confirm Password</label>
                                        <input 
                                            className="field-input" 
                                            type="password" 
                                            placeholder="Confirm new password"
                                            value={passwordForm.confirmPassword}
                                            onChange={e => setPasswordForm(f => ({ ...f, confirmPassword: e.target.value }))}
                                            minLength={6}
                                            disabled={passwordLoading}
                                        />
                                    </div>
                                    <div className="smtp-field smtp-field-full" style={{ display: 'flex', gap: 8, marginTop: 8 }}>
                                        <button type="submit" className="btn btn-primary" disabled={passwordLoading || !passwordForm.newPassword}>
                                            {passwordLoading ? 'Updating...' : 'Update Password'}
                                        </button>
                                    </div>
                                </form>
                            </div>
                        </div>
                    </div>
                    
                    <div className="settings-service-row" style={{ borderTop: '1px solid var(--border)', paddingTop: 16, marginTop: 16 }}>
                        <div className="settings-service-info">
                            <div className="settings-service-name">Log Out</div>
                            <div className="settings-service-desc">Sign out of your account on this device.</div>
                        </div>
                        <div className="settings-service-status">
                            <button className="btn btn-danger-ghost" onClick={handleLogout} style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                                <TrashIcon /> Log Out
                            </button>
                        </div>
                    </div>
                </div>

                {/* ── Localization ── */}
                <div className="settings-section-label">Localization</div>
                <div className="card settings-card">
                    <div className="settings-service-row">
                        <div className="settings-service-info">
                            <div className="settings-service-name">Timezone</div>
                            <div className="settings-service-desc">Default timezone for date parsing and display.</div>
                        </div>
                        <div className="settings-service-status">
                            <select
                                className="field-input"
                                value={settings.timezone || 'Asia/Jerusalem'}
                                onChange={async (e) => {
                                    try { await saveTimezone(e.target.value); flash('success', 'Timezone updated.'); }
                                    catch { flash('error', 'Failed to update timezone.'); }
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

                {/* ── AI Integration ── */}
                <div className="settings-section-label" style={{ marginTop: '2rem' }}>AI Integration</div>
                <div className="card settings-card">
                    <div className="settings-service-row">
                        <div className="settings-service-icon"><GroqIcon /></div>
                        <div className="settings-service-info">
                            <div className="settings-service-name">Groq API Key</div>
                            <div className="settings-service-desc">
                                Powers the CV Tailoring pipeline — Job Analysis, Scoring, ATS Validation, and Rewriting agents.{' '}
                                <a href="https://console.groq.com/keys" target="_blank" rel="noopener noreferrer">Get your key →</a>
                            </div>
                        </div>
                        <div className="settings-service-status">
                            {settings.groq_token_set
                                ? <span className="token-badge token-badge-active"><CheckIcon /> Connected</span>
                                : <span className="token-badge token-badge-missing">Not set</span>}
                        </div>
                    </div>

                    {settings.groq_token_set && !showInput && (
                        <div className="token-preview-row">
                            <div className="token-preview-label"><KeyIcon /> Saved key</div>
                            <code className="token-preview-value">{maskedPreview}</code>
                            <button className="btn btn-sm" onClick={() => setShowToken(v => !v)}>{showToken ? 'Hide' : 'Show'}</button>
                            <button className="btn btn-sm" onClick={() => { setShowInput(true); setTokenInput(''); }}>Replace</button>
                            <button className="btn btn-sm btn-danger-ghost" onClick={async () => {
                                if (!window.confirm('Remove the saved Groq API key?')) return;
                                try { await clearGroqToken(); flash('success', 'Groq API key removed.'); }
                                catch { flash('error', 'Failed to remove key.'); }
                            }} disabled={saving}><TrashIcon /> Remove</button>
                        </div>
                    )}

                    {(!settings.groq_token_set || showInput) && (
                        <div className="token-input-section">
                            <div className="field-label" style={{ marginBottom: 6 }}>
                                {settings.groq_token_set ? 'Enter new key to replace' : 'Paste your Groq API key'}
                            </div>
                            <form className="token-input-row" onSubmit={async (e) => {
                                e.preventDefault();
                                if (!tokenInput.trim()) return;
                                try {
                                    await saveGroqToken(tokenInput.trim());
                                    setTokenInput(''); setShowInput(false);
                                    flash('success', 'Groq API key saved successfully.');
                                } catch { flash('error', 'Failed to save. Check your connection.'); }
                            }}>
                                <input id="groq-api-key-input" className="field-input token-input" type="password"
                                    placeholder="gsk_••••••••••••••••••••••••••••••••••••••••••••••••••••••••••••••"
                                    value={tokenInput} onChange={e => setTokenInput(e.target.value)}
                                    autoComplete="off" spellCheck={false} />
                                <button id="save-groq-key-btn" className="btn btn-primary" type="submit" disabled={saving || !tokenInput.trim()}>
                                    {saving ? 'Saving…' : 'Save Key'}
                                </button>
                                {showInput && <button type="button" className="btn" onClick={() => { setShowInput(false); setTokenInput(''); }}>Cancel</button>}
                            </form>
                            <div className="token-input-hint">Your key is stored in the database and never sent to the frontend in plain text.</div>
                        </div>
                    )}
                </div>

                {/* ── Mail SMTP Integration ── */}
                <div className="settings-section-label" style={{ marginTop: '2rem' }}>Mail SMTP Integration</div>
                <div className="card settings-card">
                    {/* Header row */}
                    <div className="settings-service-row">
                        <div className="settings-service-icon" style={{ backgroundColor: '#eefdf8', borderColor: 'rgba(15,110,86,.2)' }}>
                            <MailIcon />
                        </div>
                        <div className="settings-service-info">
                            <div className="settings-service-name">Email Auto-Sync</div>
                            <div className="settings-service-desc">
                                Connect your inbox via IMAP. The backend polls for new emails and automatically updates application statuses based on company &amp; role matching.
                            </div>
                        </div>
                        <div className="settings-service-status" style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                            {smtpConnected
                                ? <span className="token-badge token-badge-active"><CheckIcon /> Connected</span>
                                : <span className="token-badge token-badge-missing">Not set</span>}
                            <button className="btn btn-sm" onClick={() => setSmtpExpanded(v => !v)}
                                style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                                {smtpExpanded ? 'Hide' : 'Configure'} <ChevronIcon open={smtpExpanded} />
                            </button>
                        </div>
                    </div>

                    {/* Last polled info */}
                    {settings.smtp_last_polled_at && (
                        <div className="token-input-hint" style={{ marginTop: 8 }}>
                            Last polled: {new Date(settings.smtp_last_polled_at).toLocaleString()}
                        </div>
                    )}

                    {/* Expanded form */}
                    <div 
                        style={{ 
                            maxHeight: smtpExpanded ? '800px' : '0',
                            opacity: smtpExpanded ? 1 : 0,
                            overflow: 'hidden',
                            transition: 'max-height 0.3s ease-in-out, opacity 0.3s ease-in-out'
                        }}
                    >
                        <div className="token-input-section" style={{ borderTopColor: smtpExpanded ? 'var(--border)' : 'transparent', transition: 'border-color 0.3s ease-in-out' }}>
                            {/* Enable toggle */}
                            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
                                <div>
                                    <div className="field-label">Enable Auto-Polling</div>
                                    <div className="token-input-hint" style={{ marginTop: 2 }}>
                                        When enabled, the backend will poll your inbox automatically.
                                    </div>
                                </div>
                                <label className="smtp-toggle" htmlFor="smtp-enabled-toggle">
                                    <input
                                        id="smtp-enabled-toggle"
                                        type="checkbox"
                                        checked={smtpForm.smtp_enabled}
                                        onChange={e => setSmtpField('smtp_enabled', e.target.checked)}
                                    />
                                    <span className="smtp-toggle-track" />
                                </label>
                            </div>

                            {/* Form grid */}
                            <div className="smtp-form-grid">
                                <div className="smtp-field smtp-field-full">
                                    <label className="field-label" htmlFor="smtp-email">Email Address</label>
                                    <input
                                        id="smtp-email"
                                        className="field-input"
                                        type="email"
                                        placeholder="you@gmail.com"
                                        value={smtpForm.smtp_email}
                                        onChange={e => setSmtpField('smtp_email', e.target.value)}
                                        autoComplete="off"
                                    />
                                    <div className="token-input-hint">Host &amp; port are auto-filled for Gmail, Outlook, Yahoo.</div>
                                </div>

                                <div className="smtp-field">
                                    <label className="field-label" htmlFor="smtp-host">IMAP Host</label>
                                    <input
                                        id="smtp-host"
                                        className="field-input"
                                        type="text"
                                        placeholder="imap.gmail.com"
                                        value={smtpForm.smtp_host}
                                        onChange={e => setSmtpField('smtp_host', e.target.value)}
                                        autoComplete="off"
                                    />
                                </div>

                                <div className="smtp-field smtp-field-sm">
                                    <label className="field-label" htmlFor="smtp-port">Port</label>
                                    <input
                                        id="smtp-port"
                                        className="field-input"
                                        type="number"
                                        placeholder="993"
                                        value={smtpForm.smtp_port}
                                        onChange={e => setSmtpField('smtp_port', e.target.value)}
                                    />
                                </div>

                                <div className="smtp-field smtp-field-full" style={{ position: 'relative' }}>
                                    <label className="field-label" htmlFor="smtp-password">
                                        App Password {settings.smtp_password_set && !smtpForm.smtp_password && (
                                            <span className="token-badge token-badge-active" style={{ fontSize: 10, marginLeft: 6 }}>
                                                <CheckIcon /> Saved
                                            </span>
                                        )}
                                    </label>
                                    <div style={{ display: 'flex', gap: 8 }}>
                                        <input
                                            id="smtp-password"
                                            className="field-input"
                                            type={showPassword ? 'text' : 'password'}
                                            placeholder={settings.smtp_password_set ? '••••••••••••••••' : 'Enter app password'}
                                            value={smtpForm.smtp_password}
                                            onChange={e => setSmtpField('smtp_password', e.target.value)}
                                            autoComplete="new-password"
                                            style={{ flex: 1 }}
                                        />
                                        <button type="button" className="btn btn-sm" onClick={() => setShowPassword(v => !v)}>
                                            {showPassword ? 'Hide' : 'Show'}
                                        </button>
                                    </div>
                                    <div className="token-input-hint">
                                        Use an <strong>App Password</strong>, not your main password.{' '}
                                        {smtpForm.smtp_email?.includes('gmail') && (
                                            <a href="https://myaccount.google.com/apppasswords" target="_blank" rel="noopener noreferrer">Generate one for Gmail →</a>
                                        )}
                                    </div>
                                </div>

                                <div className="smtp-field smtp-field-full">
                                    <label className="field-label" htmlFor="smtp-interval">Poll Interval</label>
                                    <select
                                        id="smtp-interval"
                                        className="field-input"
                                        value={smtpForm.smtp_poll_interval_min}
                                        onChange={e => setSmtpField('smtp_poll_interval_min', Number(e.target.value))}
                                        style={{ width: 200 }}
                                    >
                                        <option value={5}>Every 5 minutes</option>
                                        <option value={15}>Every 15 minutes</option>
                                        <option value={30}>Every 30 minutes</option>
                                        <option value={60}>Every hour</option>
                                        <option value={360}>Every 6 hours</option>
                                    </select>
                                </div>
                            </div>

                            {/* Test result banner */}
                            {testResult && (
                                <div className={`settings-toast ${testResult.success ? 'toast-success' : 'toast-error'}`}
                                    style={{ marginTop: 12 }}>
                                    {testResult.success ? <><CheckIcon /> Connection successful!</> : <>⚠ {testResult.error}</>}
                                </div>
                            )}

                            {/* Action buttons */}
                            <div style={{ display: 'flex', gap: 8, marginTop: 14, flexWrap: 'wrap' }}>
                                <button
                                    id="test-smtp-btn"
                                    className="btn"
                                    onClick={handleTest}
                                    disabled={testing || !smtpForm.smtp_email || !smtpForm.smtp_host}
                                >
                                    {testing ? 'Testing…' : 'Test Connection'}
                                </button>
                                <button
                                    id="save-smtp-btn"
                                    className="btn btn-primary"
                                    onClick={handleSmtpSave}
                                    disabled={saving || (!smtpDirty && !smtpForm.smtp_password)}
                                >
                                    {saving ? 'Saving…' : 'Save Settings'}
                                </button>
                            </div>
                        </div>
                    </div>

                    {/* Email Logs viewer */}
                    {smtpConnected && (
                        <div style={{ marginTop: 14, borderTop: '1px solid var(--border)', paddingTop: 14 }}>
                            <button
                                className="btn btn-sm"
                                onClick={handleLoadLogs}
                                style={{ display: 'flex', alignItems: 'center', gap: 5 }}
                            >
                                {logsOpen ? 'Hide' : 'View'} Email Logs <ChevronIcon open={logsOpen} />
                            </button>

                            <div 
                                style={{ 
                                    maxHeight: logsOpen ? '500px' : '0',
                                    opacity: logsOpen ? 1 : 0,
                                    overflow: 'hidden',
                                    transition: 'max-height 0.3s ease-in-out, opacity 0.3s ease-in-out'
                                }}
                            >
                                <div style={{ marginTop: 12 }}>
                                    {logsLoading ? (
                                        <div className="token-input-hint" style={{ padding: '16px 0' }}>Loading…</div>
                                    ) : logs.length === 0 ? (
                                        <div className="token-input-hint" style={{ padding: '16px 0' }}>No emails processed yet.</div>
                                    ) : (
                                        <div className="smtp-logs-list">
                                            {logs.map(log => {
                                                const sc = STATUS_COLORS[log.classified_status] || STATUS_COLORS.unknown;
                                                return (
                                                    <div key={log.id} className="smtp-log-row">
                                                        <div className="smtp-log-meta">
                                                            <span className="smtp-log-from">{log.from_address}</span>
                                                            <span className="smtp-log-date">
                                                                {log.received_at ? new Date(log.received_at).toLocaleDateString() : '—'}
                                                            </span>
                                                        </div>
                                                        <div className="smtp-log-subject">{log.subject || '(no subject)'}</div>
                                                        <div className="smtp-log-footer">
                                                            {log.matched_company && (
                                                                <span className="smtp-log-match">
                                                                    {log.matched_company}{log.matched_role ? ` · ${log.matched_role}` : ''}
                                                                </span>
                                                            )}
                                                            <span className="smtp-log-status" style={{ background: sc.bg, color: sc.color }}>
                                                                {log.classified_status}
                                                            </span>
                                                            <span className="smtp-log-confidence">
                                                                {Math.round((log.confidence_score || 0) * 100)}%
                                                            </span>
                                                        </div>
                                                    </div>
                                                );
                                            })}
                                        </div>
                                    )}
                                </div>
                            </div>
                        </div>
                    )}
                </div>

                {/* ── More Integrations ── */}
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
