import React, { useState, useEffect } from 'react';
import { useSettings } from '../hooks/useSettings';
import { authService } from '../services/authService';
import PageLoader from '../components/PageLoader';

// ── Icons ────────────────────────────────────────────────────────────────────
const GroqIcon = () => (
    <svg width="18" height="18" viewBox="0 0 560 400" fill="currentColor" style={{ flexShrink: 0, color: '#f55036' }}>
        <g><path d="M47.7883.05664c-5.5135 0-9.9914 4.47795-9.9914 9.99146 0 5.5134 4.4779 9.9914 9.9914 9.9914 5.5135 0 9.9914-4.478 9.9914-9.9914 0-5.51351-4.4779-9.977466-9.9914-9.99146Zm0 16.23256c-3.4424 0-6.2411-2.7987-6.2411-6.2411 0-3.44246 2.7987-6.24118 6.2411-6.24118s6.2411 2.79872 6.2411 6.24118c0 3.4424-2.7987 6.2411-6.2411 6.2411ZM10.0759.000524C4.56244-.05545.056498 4.38052.000524 9.894-.05545 15.4075 4.38052 19.9274 9.894 19.9694h3.4704v-3.7363h-3.2885c-3.44241.042-6.26912-2.7148-6.3111-6.1712-.04198-3.44241 2.71476-6.26911 6.17118-6.31109h.13992c3.4424 0 6.2552 2.79872 6.2552 6.24114v9.19375c0 3.4145-2.7848 6.1992-6.1992 6.2412-1.63726 0-3.19055-.6717-4.33803-1.8332l-2.64479 2.6448c1.83316 1.8472 4.32402 2.8967 6.92682 2.9247h.1399c5.4436-.084 9.8236-4.492 9.8515-9.9355V9.74007C19.9274 4.32454 15.5054.000524 10.0899.000524h-.014ZM79.9987 28.744V9.79671c-.14-5.41552-4.562-9.739545-9.9775-9.739545C64.5077.00119 59.9878 4.43716 59.9458 9.95064c-.0559 5.51346 4.38 10.03336 9.8935 10.07536h3.4704v-3.7363h-3.2885c-3.4424.042-6.2691-2.7147-6.3111-6.1711-.042-3.44247 2.7148-6.26917 6.1712-6.31115h.1399c3.4425 0 6.2552 2.79872 6.2552 6.24115V28.716l3.7223.042v-.014ZM22.9202 20.0255h3.7223v-9.9914c0-3.44245 2.7988-6.24117 6.2412-6.24117 1.1335 0 2.197.30786 3.1206.83962l1.8751-3.24652C36.4101.532423 34.7029.05664 32.8977.05664c-5.5135 0-9.9915 4.47795-9.9915 9.99146v9.9914l.014-.014Z" transform="translate(100.0, 134.3817337793672) scale(4.500073129185994) translate(-5.3290591032649146e-08, -5.3290591032649146e-08)" /></g>
    </svg>
);

const OpenAIIcon = () => (
    <svg width="18" height="18" viewBox="0 0 16 16" fill="currentColor" style={{ flexShrink: 0, color: '#10a37f' }}>
        <path d="M14.949 6.547a3.94 3.94 0 0 0-.348-3.273 4.11 4.11 0 0 0-4.4-1.934A4.1 4.1 0 0 0 8.423.2 4.15 4.15 0 0 0 6.305.086a4.1 4.1 0 0 0-1.891.948 4.04 4.04 0 0 0-1.158 1.753 4.1 4.1 0 0 0-1.563.679A4 4 0 0 0 .554 4.72a3.99 3.99 0 0 0 .502 4.731 3.94 3.94 0 0 0 .346 3.274 4.11 4.11 0 0 0 4.402 1.933c.382.425.852.764 1.377.995.526.231 1.095.35 1.67.346 1.78.002 3.358-1.132 3.901-2.804a4.1 4.1 0 0 0 1.563-.68 4 4 0 0 0 1.14-1.253 3.99 3.99 0 0 0-.506-4.716m-6.097 8.406a3.05 3.05 0 0 1-1.945-.694l.096-.054 3.23-1.838a.53.53 0 0 0 .265-.455v-4.49l1.366.778q.02.011.025.035v3.722c-.003 1.653-1.361 2.992-3.037 2.996m-6.53-2.75a2.95 2.95 0 0 1-.36-2.01l.095.057L5.29 12.09a.53.53 0 0 0 .527 0l3.949-2.246v1.555a.05.05 0 0 1-.022.041L6.473 13.3c-1.454.826-3.311.335-4.15-1.098m-.85-6.94A3.02 3.02 0 0 1 3.07 3.949v3.785a.51.51 0 0 0 .262.451l3.93 2.237-1.366.779a.05.05 0 0 1-.048 0L2.585 9.342a2.98 2.98 0 0 1-1.113-4.094zm11.216 2.571L8.747 5.576l1.362-.776a.05.05 0 0 1 .048 0l3.265 1.86a3 3 0 0 1 1.173 1.207 2.96 2.96 0 0 1-.27 3.2 3.05 3.05 0 0 1-1.36.997V8.279a.52.52 0 0 0-.276-.445m1.36-2.015-.097-.057-3.226-1.855a.53.53 0 0 0-.53 0L6.249 6.153V4.598a.04.04 0 0 1 .019-.04L9.533 2.7a3.07 3.07 0 0 1 3.257.139c.474.325.843.778 1.066 1.303.223.526.289 1.103.191 1.664zM5.503 8.575 4.139 7.8a.05.05 0 0 1-.026-.037V4.049c0-.57.166-1.127.476-1.607s.752-.864 1.275-1.105a3.08 3.08 0 0 1 1.942-.693l-.096.054-3.23 1.838a.53.53 0 0 0-.265.455v4.49Z" />
    </svg>
);

const ClaudeIcon = () => (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor" style={{ flexShrink: 0, color: '#d97757' }}>
        <path d="M17.3041 3.541h-3.6718l6.696 16.918H24Zm-10.6082 0L0 20.459h3.7442l1.3693-3.5527h7.0052l1.3693 3.5528h3.7442L10.5363 3.541Z" />
    </svg>
);

const GeminiIcon = () => (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor" style={{ flexShrink: 0, color: '#1a73e8' }}>
        <path d="M11.04 19.32Q12 21.51 12 24q0-2.49.93-4.68.96-2.19 2.58-3.81t3.81-2.55Q21.51 12 24 12q-2.49 0-4.68-.93a12.3 12.3 0 0 1-3.81-2.58 12.3 12.3 0 0 1-2.58-3.81Q12 2.49 12 0q0 2.49-.93 4.68a12.3 12.3 0 0 1-2.58 3.81 12.3 12.3 0 0 1-3.81 2.58Q2.49 12 0 12q2.49 0 4.68.93.96.39 1.77.93.81.54 1.5 1.23.69.69 1.23 1.5t.93 1.77Z" />
    </svg>
);

const PROVIDER_CONFIGS = {
    groq: {
        name: 'Groq',
        placeholder: 'gsk_...',
        regex: /^gsk_.{20,}$/,
        icon: <GroqIcon />
    },
    openai: {
        name: 'OpenAI',
        placeholder: 'sk-...',
        regex: /^sk-.{20,}$/,
        icon: <OpenAIIcon />
    },
    claude: {
        name: 'Claude',
        placeholder: 'sk-ant-...',
        regex: /^sk-ant-.{20,}$/,
        icon: <ClaudeIcon />
    },
    gemini: {
        name: 'Gemini',
        placeholder: 'AIza...',
        regex: /^AIza.{30,}$/,
        icon: <GeminiIcon />
    }
};

const ProviderIcon = ({ provider }) => {
    return PROVIDER_CONFIGS[provider]?.icon || null;
};

const CustomSelect = ({ value, options, onChange, disabled, placeholder }) => {
    const [open, setOpen] = useState(false);
    
    // options format: [{ value: 'groq', label: 'Groq', icon: <GroqIcon /> }]
    const selectedOpt = options.find(o => o.value === value);

    return (
        <div className="custom-select-container" style={{ position: 'relative', width: '220px' }}>
            <div 
                className={`field-input custom-select-trigger ${disabled ? 'disabled' : ''}`}
                onClick={() => !disabled && setOpen(!open)}
                style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', cursor: disabled ? 'not-allowed' : 'pointer' }}
            >
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    {selectedOpt?.icon}
                    {selectedOpt?.label || placeholder || 'Select...'}
                </div>
                <ChevronIcon open={open} />
            </div>
            
            {open && (
                <>
                    <div style={{ position: 'fixed', inset: 0, zIndex: 9 }} onClick={() => setOpen(false)} />
                    <div className="custom-select-dropdown" style={{ position: 'absolute', top: '100%', left: 0, right: 0, background: '#fff', border: '1px solid var(--border)', borderRadius: 'var(--r)', marginTop: '4px', zIndex: 10, boxShadow: '0 4px 12px rgba(0,0,0,0.1)' }}>
                        {options.map(opt => (
                            <div 
                                key={opt.value}
                                className="custom-select-option"
                                style={{ padding: '8px 12px', display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer', borderBottom: '1px solid var(--border2)' }}
                                onClick={() => { onChange(opt.value); setOpen(false); }}
                            >
                                {opt.icon}
                                {opt.label}
                            </div>
                        ))}
                    </div>
                </>
            )}
        </div>
    );
};

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
        saveAiToken, saveAiRouting, saveTimezone,
        saveSmtpSettings, testSmtpConnection, testing, testResult, setTestResult,
        getEmailLogs, testAiToken,
    } = useSettings();

    // UI Navigation state
    const [activeMainTab, setActiveMainTab] = useState('general');
    const [activeProviderTab, setActiveProviderTab] = useState('groq');

    // AI Integration state
    const [tokenInputs, setTokenInputs] = useState({});
    const [showInputs, setShowInputs] = useState({});
    const [showTokens, setShowTokens] = useState({});
    const [testingTokens, setTestingTokens] = useState({});
    const [tokenTestResults, setTokenTestResults] = useState({});

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

                {/* Main Tabs */}
                <div className="settings-tabs-container">
                    <button className={`settings-tab ${activeMainTab === 'general' ? 'active' : ''}`} onClick={() => setActiveMainTab('general')}>General</button>
                    <button className={`settings-tab ${activeMainTab === 'ai' ? 'active' : ''}`} onClick={() => setActiveMainTab('ai')}>AI Integration</button>
                    <button className={`settings-tab ${activeMainTab === 'mail' ? 'active' : ''}`} onClick={() => setActiveMainTab('mail')}>Mail SMTP Integration</button>
                </div>

                {/* Feedback toast */}
                {feedback && (
                    <div className={`settings-toast ${feedback.type === 'success' ? 'toast-success' : 'toast-error'}`} role="alert">
                        {feedback.type === 'success' ? <CheckIcon /> : '⚠'} {feedback.msg}
                    </div>
                )}

                {/* =========================================================================
                    TAB: GENERAL
                   ========================================================================= */}
                {activeMainTab === 'general' && (
                    <>
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
                    </>
                )}

                {/* =========================================================================
                    TAB: AI INTEGRATION
                   ========================================================================= */}
                {activeMainTab === 'ai' && (
                    <div className="ai-integration-layout">
                        {/* LEFT COLUMN: Providers */}
                        <div>
                            <div className="settings-section-label">AI Providers</div>
                            <div className="provider-tabs-container">
                                {Object.keys(PROVIDER_CONFIGS).map(provider => {
                                    const isSet = settings[`${provider}_token_set`];
                                    return (
                                        <button 
                                            key={provider}
                                            className={`provider-tab ${activeProviderTab === provider ? 'active' : ''}`}
                                            onClick={() => {
                                                setActiveProviderTab(provider);
                                                setTokenTestResults(prev => ({...prev, [provider]: null}));
                                            }}
                                        >
                                            <ProviderIcon provider={provider} />
                                            <span style={{ textTransform: 'capitalize' }}>{PROVIDER_CONFIGS[provider].name}</span>
                                            <span className={`provider-status-dot ${isSet ? 'configured' : ''}`} style={{ marginLeft: 4 }} />
                                        </button>
                                    );
                                })}
                            </div>

                            {/* Active Provider Content */}
                            {(() => {
                                const provider = activeProviderTab;
                                const config = PROVIDER_CONFIGS[provider];
                                const isSet = settings[`${provider}_token_set`];
                                const preview = settings[`${provider}_token_preview`];
                                const maskedPreview = preview ? (showTokens[provider] ? preview : preview.slice(0, 10) + '••••••••••••••••••') : null;
                                const showInput = showInputs[provider];
                                const tokenInput = tokenInputs[provider] || '';

                                let badge;
                                if (isSet) {
                                    if (tokenTestResults[provider]) {
                                        if (tokenTestResults[provider].success) {
                                            badge = <span className="token-badge token-badge-active"><CheckIcon /> Valid</span>;
                                        } else {
                                            badge = <span className="token-badge" style={{ background: '#fff0f0', color: '#a32d2d', border: '1px solid #fca5a5' }}>⚠ {tokenTestResults[provider].error || 'Invalid'}</span>;
                                        }
                                    } else {
                                        badge = <span className="token-badge token-badge-active"><CheckIcon /> Connected</span>;
                                    }
                                } else {
                                    badge = <span className="token-badge token-badge-missing">Not set</span>;
                                }

                                return (
                                    <div className="card settings-card" style={{ marginBottom: '2rem' }}>
                                        <div className="settings-service-row">
                                            <div className="settings-service-info">
                                                <div className="settings-service-name">{config.name} API Key</div>
                                                <div className="settings-service-desc">
                                                    Configure your {provider} API token for AI features.
                                                </div>
                                            </div>
                                            <div className="settings-service-status">
                                                {badge}
                                            </div>
                                        </div>

                                        {isSet && !showInput && (
                                            <div className="token-preview-row">
                                                <div className="token-preview-label"><KeyIcon /> Saved key</div>
                                                <code className="token-preview-value">{maskedPreview}</code>
                                                <button className="btn btn-sm" onClick={() => setShowTokens(prev => ({...prev, [provider]: !prev[provider]}))}>{showTokens[provider] ? 'Hide' : 'Show'}</button>
                                                <button className="btn btn-sm" onClick={async () => {
                                                    setTestingTokens(prev => ({...prev, [provider]: true}));
                                                    setTokenTestResults(prev => ({...prev, [provider]: null}));
                                                    const res = await testAiToken(provider);
                                                    setTokenTestResults(prev => ({...prev, [provider]: res}));
                                                    setTestingTokens(prev => ({...prev, [provider]: false}));
                                                }} disabled={testingTokens[provider]}>{testingTokens[provider] ? 'Testing...' : 'Test'}</button>
                                                <button className="btn btn-sm" onClick={() => { setShowInputs(prev => ({...prev, [provider]: true})); setTokenInputs(prev => ({...prev, [provider]: ''})); }}>Replace</button>
                                                <button className="btn btn-sm btn-danger-ghost" onClick={async () => {
                                                    if (!window.confirm(`Remove the saved ${provider} API key?`)) return;
                                                    try { await saveAiToken(provider, ''); flash('success', `${provider} API key removed.`); setTokenTestResults(prev => ({...prev, [provider]: null})); }
                                                    catch { flash('error', 'Failed to remove key.'); }
                                                }} disabled={saving}><TrashIcon /> Remove</button>
                                            </div>
                                        )}

                                        {(!isSet || showInput) && (
                                            <div className="token-input-section">
                                                <div className="field-label" style={{ marginBottom: 6 }}>
                                                    {isSet ? 'Enter new key to replace' : `Paste your ${provider} API key`}
                                                </div>
                                                <form className="token-input-row" onSubmit={async (e) => {
                                                    e.preventDefault();
                                                    const token = tokenInput.trim();
                                                    if (!token) return;
                                                    if (config.regex && !config.regex.test(token)) {
                                                        return flash('error', `Invalid ${config.name} token structure. Please check your key.`);
                                                    }
                                                    try {
                                                        await saveAiToken(provider, token);
                                                        setTokenInputs(prev => ({...prev, [provider]: ''})); 
                                                        setShowInputs(prev => ({...prev, [provider]: false}));
                                                        setTokenTestResults(prev => ({...prev, [provider]: { success: true }}));
                                                        flash('success', `${config.name} API key saved successfully.`);
                                                    } catch (err) { 
                                                        flash('error', err.response?.data?.error || `Failed to save ${config.name} key. Invalid token.`); 
                                                    }
                                                }}>
                                                    <input className="field-input token-input" type="password"
                                                        placeholder={config.placeholder}
                                                        value={tokenInput} onChange={e => setTokenInputs(prev => ({...prev, [provider]: e.target.value}))}
                                                        autoComplete="off" spellCheck={false} />
                                                    <button className="btn btn-primary" type="submit" disabled={saving || !tokenInput.trim()}>
                                                        {saving ? 'Saving…' : 'Save Key'}
                                                    </button>
                                                    {showInput && <button type="button" className="btn" onClick={() => { setShowInputs(prev => ({...prev, [provider]: false})); setTokenInputs(prev => ({...prev, [provider]: ''})); }}>Cancel</button>}
                                                </form>
                                            </div>
                                        )}
                                    </div>
                                );
                            })()}
                        </div>

                        {/* RIGHT COLUMN: AI Feature Routing */}
                        <div>
                            <div className="settings-section-label">AI Feature Routing</div>
                            <div className="card settings-card">
                                {['cvTailoring', 'mailCreator', 'interviewInsights'].map(feature => {
                                    const routing = settings.ai_routing?.[feature] || { provider: 'groq', model: '' };
                                    const availableProviders = Object.keys(PROVIDER_CONFIGS).filter(p => settings[`${p}_token_set`]);
                                    
                                    const customOptions = availableProviders.map(p => ({
                                        value: p,
                                        label: PROVIDER_CONFIGS[p].name,
                                        icon: PROVIDER_CONFIGS[p].icon
                                    }));
                                    
                                    return (
                                        <div key={feature} className="ai-routing-row">
                                            <div className="ai-routing-label">
                                                <div className="settings-service-name" style={{ textTransform: 'capitalize' }}>{feature.replace(/([A-Z])/g, ' $1').trim()}</div>
                                                <div className="settings-service-desc">Select the LLM provider for this feature.</div>
                                            </div>
                                            <div className="ai-routing-select">
                                                {availableProviders.length > 0 ? (
                                                    <CustomSelect 
                                                        value={routing.provider} 
                                                        options={customOptions}
                                                        onChange={async (newVal) => {
                                                            const newRouting = { ...settings.ai_routing, [feature]: { provider: newVal, model: '' } };
                                                            try { await saveAiRouting(newRouting); flash('success', 'Routing updated.'); }
                                                            catch { flash('error', 'Failed to update routing.'); }
                                                        }}
                                                        disabled={saving}
                                                    />
                                                ) : (
                                                    <CustomSelect 
                                                        value=""
                                                        options={[]}
                                                        placeholder="No keys configured"
                                                        disabled={true}
                                                    />
                                                )}
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        </div>
                    </div>
                )}

                {/* =========================================================================
                    TAB: MAIL SMTP
                   ========================================================================= */}
                {activeMainTab === 'mail' && (
                    <>
                        <div className="settings-section-label">Mail SMTP Integration</div>
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
                    </>
                )}

            </div>
        </div>
    );
};

export default SettingsPage;
