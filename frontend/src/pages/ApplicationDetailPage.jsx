import React, { useState } from 'react';
import { statusBadgeClass, formatDate } from '../utils/helpers';
import { useSettings } from '../hooks/useSettings';

// ── Status pipeline order ─────────────────────────────────────────────────────
const STATUS_PIPELINE = [
    { label: 'Applied', icon: '📋' },
    { label: 'Phone Interview', icon: '📞' },
    { label: 'Technical Interview', icon: '💻' },
    { label: 'Offer', icon: '🎉' },
    { label: 'Rejected', icon: '✕' },
];

// ── Tiny icon helpers ─────────────────────────────────────────────────────────
const IconCal  = () => (
    <svg viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.7" width="15" height="15">
        <rect x="2" y="4" width="16" height="14" rx="2"/>
        <path d="M2 8h16M7 2v4M13 2v4"/>
    </svg>
);
const IconPin  = () => (
    <svg viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.7" width="15" height="15">
        <path d="M10 11a4 4 0 1 0 0-8 4 4 0 0 0 0 8z"/>
        <path d="M10 11v7M7 18h6"/>
    </svg>
);
const IconUser = () => (
    <svg viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.7" width="15" height="15">
        <circle cx="10" cy="6" r="4"/>
        <path d="M2 18c0-4 3.6-7 8-7s8 3 8 7"/>
    </svg>
);
const IconFile = () => (
    <svg viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.7" width="15" height="15">
        <path d="M6 2h6l4 4v12a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2z"/>
        <path d="M12 2v4h4M8 13h4M8 10h4M8 7h2"/>
    </svg>
);
const IconLink = () => (
    <svg viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.7" width="15" height="15">
        <path d="M11 5h4v4M15 5l-6 6M9 6H5a2 2 0 0 0-2 2v7a2 2 0 0 0 2 2h7a2 2 0 0 0 2-2v-4"/>
    </svg>
);

// ── Company initial avatar ────────────────────────────────────────────────────
function CompanyAvatar({ name }) {
    const initials = name
        ? name.split(' ').map(w => w[0]).slice(0, 2).join('').toUpperCase()
        : '?';
    // deterministic hue from name
    const hue = [...(name || '')].reduce((acc, c) => acc + c.charCodeAt(0), 0) % 360;
    return (
        <div className="adp-avatar" style={{ '--avatar-hue': hue }}>
            {initials}
        </div>
    );
}

// ── Status stepper ────────────────────────────────────────────────────────────
function StatusStepper({ current }) {
    const isRejected = current?.toLowerCase() === 'rejected';
    const currentIdx = STATUS_PIPELINE.findIndex(
        s => s.label.toLowerCase() === current?.toLowerCase()
    );

    if (isRejected) {
        return (
            <div className="adp-stepper">
                {STATUS_PIPELINE.filter(s => s.label !== 'Rejected').map((s, i) => (
                    <React.Fragment key={s.label}>
                        <div className="adp-step adp-step--skipped">
                            <div className="adp-step-dot">✕</div>
                            <span>{s.label}</span>
                        </div>
                        {i < 3 && <div className="adp-step-line adp-step-line--skipped" />}
                    </React.Fragment>
                ))}
                <div className="adp-step adp-step--rejected">
                    <div className="adp-step-dot">✕</div>
                    <span>Rejected</span>
                </div>
            </div>
        );
    }

    return (
        <div className="adp-stepper">
            {STATUS_PIPELINE.filter(s => s.label !== 'Rejected').map((s, i) => {
                const done    = i < currentIdx;
                const active  = i === currentIdx;
                const future  = i > currentIdx;
                return (
                    <React.Fragment key={s.label}>
                        <div className={`adp-step ${done ? 'adp-step--done' : ''} ${active ? 'adp-step--active' : ''} ${future ? 'adp-step--future' : ''}`}>
                            <div className="adp-step-dot">
                                {done ? '✓' : s.icon}
                            </div>
                            <span>{s.label}</span>
                        </div>
                        {i < 3 && (
                            <div className={`adp-step-line ${done ? 'adp-step-line--done' : ''}`} />
                        )}
                    </React.Fragment>
                );
            })}
        </div>
    );
}

// ── Main component ────────────────────────────────────────────────────────────
const ApplicationDetailPage = ({ app, onBack, onUpdate }) => {
    const { settings } = useSettings();
    const [isEditing, setIsEditing] = useState(false);
    const [tempStatus, setTempStatus] = useState(app.STATUS);

    const handleConfirm = () => {
        onUpdate(app.id, tempStatus);
        setIsEditing(false);
    };
    const handleCancel = () => {
        setTempStatus(app.STATUS);
        setIsEditing(false);
    };

    const jobLink = app.LINK
        ? (app.LINK.startsWith('http') ? app.LINK : `https://${app.LINK}`)
        : null;

    return (
        <div className="adp-root section">

            {/* ── Top navigation ── */}
            <div className="adp-nav">
                <button className="adp-btn-back" onClick={onBack}>
                    <svg viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="2" width="14" height="14">
                        <path d="M13 4l-6 6 6 6"/>
                    </svg>
                    Back to Tracker
                </button>
                {jobLink && (
                    <a href={jobLink} target="_blank" rel="noopener noreferrer" className="adp-btn-job-link">
                        <IconLink /> View Job Posting
                    </a>
                )}
            </div>

            {/* ── Hero header ── */}
            <div className="adp-hero">
                <CompanyAvatar name={app.COMPANY} />
                <div className="adp-hero-text">
                    <h1 className="adp-company">{app.COMPANY}</h1>
                    {app.ROLE_ID && (
                        <p className="adp-role">{app.ROLE_ID}</p>
                    )}
                </div>
                <div className="adp-hero-status">
                    {!isEditing ? (
                        <div className="adp-status-display">
                            <span className={`badge ${statusBadgeClass(app.STATUS)} adp-badge-lg`}>
                                {app.STATUS || 'No Status'}
                            </span>
                            <button className="adp-btn-edit" onClick={() => setIsEditing(true)}>
                                ✏ Update Status
                            </button>
                        </div>
                    ) : (
                        <div className="adp-status-edit">
                            <select
                                className="adp-select"
                                value={
                                    STATUS_PIPELINE.map(s => s.label)
                                        .find(opt => opt.toLowerCase() === tempStatus?.toLowerCase()) || tempStatus
                                }
                                onChange={e => setTempStatus(e.target.value)}
                            >
                                {STATUS_PIPELINE.map(s => (
                                    <option key={s.label} value={s.label}>{s.label}</option>
                                ))}
                            </select>
                            <button className="adp-btn-confirm" onClick={handleConfirm}>Confirm</button>
                            <button className="adp-btn-cancel" onClick={handleCancel}>Cancel</button>
                        </div>
                    )}
                </div>
            </div>

            {/* ── Progress stepper ── */}
            <div className="adp-stepper-card">
                <p className="adp-stepper-label">Application Progress</p>
                <StatusStepper current={tempStatus || app.STATUS} />
            </div>

            {/* ── Stat chips row ── */}
            <div className="adp-stats-row">
                <div className="adp-stat-chip">
                    <span className="adp-stat-icon"><IconCal /></span>
                    <div>
                        <div className="adp-stat-lbl">Last Updated</div>
                        <div className="adp-stat-val">{formatDate(app.DATE, settings?.timezone) || 'N/A'}</div>
                    </div>
                </div>
                <div className="adp-stat-chip">
                    <span className="adp-stat-icon"><IconPin /></span>
                    <div>
                        <div className="adp-stat-lbl">Location</div>
                        <div className="adp-stat-val">{app.LOCATION || 'Remote / N/A'}</div>
                    </div>
                </div>
                <div className="adp-stat-chip">
                    <span className="adp-stat-icon"><IconUser /></span>
                    <div>
                        <div className="adp-stat-lbl">Referral</div>
                        <div className="adp-stat-val">{app.REFERAL || 'None'}</div>
                    </div>
                </div>
                <div className="adp-stat-chip">
                    <span className="adp-stat-icon"><IconFile /></span>
                    <div>
                        <div className="adp-stat-lbl">CV Used</div>
                        <div className="adp-stat-val">{app.CV_FILE || 'None'}</div>
                    </div>
                </div>
            </div>

            {/* ── Notes card ── */}
            <div className="adp-notes-card">
                <div className="adp-notes-header">
                    <span className="adp-notes-icon">📝</span>
                    <h2 className="adp-notes-title">Notes & Details</h2>
                </div>
                <div className="adp-notes-body">
                    {app.INFO
                        ? <p className="adp-notes-text">{app.INFO}</p>
                        : <p className="adp-notes-empty">No notes have been added yet for this application.</p>
                    }
                </div>
            </div>

        </div>
    );
};

export default ApplicationDetailPage;