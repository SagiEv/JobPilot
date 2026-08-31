import React, { useState } from 'react';
import { statusBadgeClass, formatDate } from '../utils/helpers';
import { useSettings } from '../hooks/useSettings';
import { useApplicationHistory } from '../hooks/useApplicationHistory';
import { useEvents } from '../hooks/useEvents';
import { GHOSTING_THRESHOLD_DAYS } from '../utils/constants';

// ── Status pipeline order ─────────────────────────────────────────────────────
const STATUS_PIPELINE = [
    { label: 'Applied', icon: '📋' },
    { label: 'Screening', icon: '📞' },
    { label: 'Assessment', icon: '📝' },
    { label: 'Interviewing', icon: '💻' },
    { label: 'Offer', icon: '🎉' },
    { label: 'Hired', icon: '🏆' },
];

const ALL_STATUSES = [
    ...STATUS_PIPELINE,
    { label: 'Rejected', icon: '✕' },
    { label: 'Withdrawn', icon: '↩️' },
    { label: 'Ignored', icon: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" width="14" height="14"><path d="M9 10h.01M15 10h.01M12 2a8 8 0 0 0-8 8v12l3-3 2.5 2.5L12 19l2.5 2.5L17 19l3 3V10a8 8 0 0 0-8-8z"/></svg> }
];

const STAGES = [
    "Recruiter / HR Screen",
    "Introduction Interview",
    "Online Test",
    "Home Assignment",
    "Technical Interview",
    "Coding Interview",
    "System Design Interview",
    "Behavioral / Culture Interview",
    "Hiring Manager Interview",
    "Final Interview / On-site",
    "Team Matching",
    "Reference Check",
    "Background Check"
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
const IconStage = () => (
    <svg viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.7" width="15" height="15">
        <path d="M3 6l4 4-4 4M10 14h7" />
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
    const isWithdrawn = current?.toLowerCase() === 'withdrawn';
    const isIgnored = current?.toLowerCase() === 'ignored';
    const currentIdx = STATUS_PIPELINE.findIndex(
        s => s.label.toLowerCase() === current?.toLowerCase()
    );

    if (isRejected || isWithdrawn || isIgnored) {
        let label = 'Rejected';
        let icon = '✕';
        if (isWithdrawn) {
            label = 'Withdrawn';
            icon = '↩️';
        } else if (isIgnored) {
            label = 'Ignored';
            icon = <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" width="16" height="16"><path d="M9 10h.01M15 10h.01M12 2a8 8 0 0 0-8 8v12l3-3 2.5 2.5L12 19l2.5 2.5L17 19l3 3V10a8 8 0 0 0-8-8z"/></svg>;
        }

        return (
            <div className="adp-stepper">
                {STATUS_PIPELINE.map((s, i) => (
                    <React.Fragment key={s.label}>
                        <div className="adp-step adp-step--skipped">
                            <div className="adp-step-dot">✕</div>
                            <span>{s.label}</span>
                        </div>
                        {i < STATUS_PIPELINE.length - 1 && <div className="adp-step-line adp-step-line--skipped" />}
                    </React.Fragment>
                ))}
                <div className="adp-step-line adp-step-line--skipped" />
                <div className="adp-step adp-step--rejected">
                    <div className="adp-step-dot">{icon}</div>
                    <span>{label}</span>
                </div>
            </div>
        );
    }

    return (
        <div className="adp-stepper">
            {STATUS_PIPELINE.map((s, i) => {
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
                        {i < STATUS_PIPELINE.length - 1 && (
                            <div className={`adp-step-line ${done ? 'adp-step-line--done' : ''}`} />
                        )}
                    </React.Fragment>
                );
            })}
        </div>
    );
}

function calculateDaysDifference(date1, date2) {
    const diffTime = Math.abs(new Date(date1) - new Date(date2));
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24)); 
    return diffDays;
}

// ── Main component ────────────────────────────────────────────────────────────
const ApplicationDetailPage = ({ app, onBack, onUpdate, dismissedGhostings = {}, dismissGhosting = () => {} }) => {
    const { settings } = useSettings();
    const { history, isLoading: historyLoading, addNote } = useApplicationHistory(app.id);
    const { events } = useEvents();
    const [isEditing, setIsEditing] = useState(false);
    
    const [tempStatus, setTempStatus] = useState(app.STATUS);
    const [tempStage, setTempStage] = useState(app.STAGE);
    const [tempDate, setTempDate] = useState(app.DATE || new Date().toISOString().split('T')[0]);
    const [tempNotes, setTempNotes] = useState('');
    const [tempWithWho, setTempWithWho] = useState('');
    const [isActivityLogOpen, setIsActivityLogOpen] = useState(false);
    
    const [newNote, setNewNote] = useState('');
    const [withWho, setWithWho] = useState('');
    const [expandedEvents, setExpandedEvents] = useState({});

    const toggleEvent = (id) => {
        setExpandedEvents(prev => ({ ...prev, [id]: !prev[id] }));
    };

    const handleConfirm = () => {
        onUpdate(app.id, tempStatus, tempStage, tempDate, undefined, undefined, tempNotes, tempWithWho);
        setIsEditing(false);
        setTempNotes('');
        setTempWithWho('');
    };
    
    const handleCancel = () => {
        setTempStatus(app.STATUS);
        setTempStage(app.STAGE);
        setTempDate(app.DATE || new Date().toISOString().split('T')[0]);
        setTempNotes('');
        setTempWithWho('');
        setIsEditing(false);
    };

    const handleAddNote = async (e) => {
        e.preventDefault();
        if (!newNote) return;
        await addNote(newNote, withWho);
        setNewNote('');
        setWithWho('');
    };

    const jobLink = app.LINK
        ? (app.LINK.startsWith('http') ? app.LINK : `https://${app.LINK}`)
        : null;

    const isAppActive = !app.STATUS?.toLowerCase().includes('reject') && !app.STATUS?.toLowerCase().includes('offer') && !app.STATUS?.toLowerCase().includes('ignored');
    const daysSinceActivity = app.LAST_ACTIVITY_DATE ? Math.floor((new Date() - new Date(app.LAST_ACTIVITY_DATE)) / (1000 * 60 * 60 * 24)) : 0;
    const isGhosting = isAppActive && daysSinceActivity >= GHOSTING_THRESHOLD_DAYS && !dismissedGhostings[app.id];

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
                        <div className="adp-status-display" style={{ display: 'flex', flexDirection: 'column', gap: '8px', alignItems: 'flex-end' }}>
                            <div style={{ display: 'flex', gap: '10px' }}>
                                <span className={`badge ${statusBadgeClass(app.STATUS)} adp-badge-lg`}>
                                    {app.STATUS || 'Applied'}
                                </span>
                                {app.STAGE && (
                                    <span className="badge adp-badge-lg" style={{ background: 'var(--bg-card-alt)', color: 'var(--text-main)', border: '1px solid var(--border-color)' }}>
                                        {app.STAGE}
                                    </span>
                                )}
                            </div>
                            <button className="adp-btn-edit" onClick={() => setIsEditing(true)}>
                                ✏ Update
                            </button>
                        </div>
                    ) : (
                        <div className="adp-status-edit" style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                            <div style={{ display: 'flex', gap: '8px' }}>
                                <select
                                    className="adp-select"
                                    value={ALL_STATUSES.find(opt => opt.label.toLowerCase() === tempStatus?.toLowerCase())?.label || tempStatus || 'Applied'}
                                    onChange={e => setTempStatus(e.target.value)}
                                >
                                    {ALL_STATUSES.map(s => (
                                        <option key={s.label} value={s.label}>{s.label}</option>
                                    ))}
                                </select>
                                {tempStatus?.toLowerCase() === 'interviewing' && (
                                    <select
                                        className="adp-select"
                                        value={tempStage || ''}
                                        onChange={e => setTempStage(e.target.value)}
                                    >
                                        <option value="">- No Stage -</option>
                                        {STAGES.map(s => (
                                            <option key={s} value={s}>{s}</option>
                                        ))}
                                    </select>
                                )}
                                <input
                                    type="date"
                                    className="field-input"
                                    value={tempDate}
                                    onChange={e => setTempDate(e.target.value)}
                                    style={{ width: '130px', margin: 0 }}
                                />
                                </div>
                            <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end' }}>
                                <button className="btn btn-primary btn-sm" onClick={handleConfirm}>Confirm</button>
                                <button className="btn btn-sm" onClick={handleCancel}>Cancel</button>
                            </div>
                        </div>
                    )}
                </div>
            </div>

            {/* ── HR Screen Notes (outside hero for stable layout) ── */}
            {isEditing && tempStage === 'Recruiter / HR Screen' && (
                <div style={{ padding: '16px', background: 'var(--bg)', borderRadius: 'var(--r-lg)', border: '1px solid var(--border)', marginBottom: '14px', boxShadow: '0 1px 6px rgba(0,0,0,.05)' }}>
                    <h4 style={{ margin: '0 0 10px 0', fontSize: '13px', color: 'var(--text-main)' }}>HR Screen Notes (Optional)</h4>
                    <div style={{ display: 'flex', gap: '10px' }}>
                        <input 
                            type="text" 
                            className="field-input" 
                            placeholder="Recruiter Name" 
                            value={tempWithWho}
                            onChange={e => setTempWithWho(e.target.value)}
                            style={{ margin: 0, fontSize: '12px', padding: '8px', flex: '0 0 200px' }}
                        />
                        <textarea 
                            className="textarea" 
                            placeholder="Topics discussed, salary expectations, next steps..." 
                            value={tempNotes}
                            onChange={e => setTempNotes(e.target.value)}
                            style={{ minHeight: '44px', margin: 0, fontSize: '12px', padding: '8px', flex: 1 }}
                        />
                    </div>
                </div>
            )}

            {/* ── Ghosting Suggestion Banner ── */}
            {isGhosting && (
                <div style={{ marginTop: '20px', padding: '16px', background: 'var(--bg-card-alt)', borderRadius: '8px', border: '1px solid var(--border-color)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <div>
                        <h4 style={{ margin: '0 0 4px 0', fontSize: '14px', color: 'var(--text-main)', display: 'flex', alignItems: 'center', gap: '6px' }}>
                            <span style={{ display: 'flex' }}><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" width="16" height="16"><path d="M9 10h.01M15 10h.01M12 2a8 8 0 0 0-8 8v12l3-3 2.5 2.5L12 19l2.5 2.5L17 19l3 3V10a8 8 0 0 0-8-8z"/></svg></span> No updates in a while
                        </h4>
                        <p style={{ margin: 0, fontSize: '12px', color: 'var(--text-muted)' }}>
                            It's been {daysSinceActivity} days since the last activity on this application. Would you like to mark it as Ignored/Ghosting to keep your active list clean?
                        </p>
                    </div>
                    <div style={{ display: 'flex', gap: '8px', marginLeft: '20px' }}>
                        <button className="btn btn-sm" style={{ border: '1px solid var(--border-color)', background: 'transparent' }} onClick={() => dismissGhosting(app.id)}>Dismiss</button>
                        <button className="btn btn-sm btn-primary" onClick={() => onUpdate(app.id, 'Ignored', app.STAGE)}>Mark as Ignored</button>
                    </div>
                </div>
            )}

            {/* ── Progress stepper ── */}
            <div className="adp-stepper-card">
                <p className="adp-stepper-label">Application Progress</p>
                <StatusStepper current={tempStatus || app.STATUS || 'Applied'} />
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

            {/* ── Rejection Details ── */}
            {app.STATUS?.toLowerCase() === 'rejected' && (app.REJECTION_REASON || app.AUTOMATIC_REJECTION) && (
                <div style={{ marginTop: '20px', padding: '15px', background: 'rgba(239, 68, 68, 0.05)', border: '1px solid rgba(239, 68, 68, 0.2)', borderRadius: '8px' }}>
                    <h3 style={{ margin: '0 0 8px 0', fontSize: '14px', color: 'var(--danger-c)' }}>Rejection Details</h3>
                    {app.REJECTION_REASON && <p style={{ margin: '0 0 4px 0', fontSize: '13px', color: 'var(--text-main)' }}><strong>Reason:</strong> {app.REJECTION_REASON}</p>}
                    {app.AUTOMATIC_REJECTION && <p style={{ margin: 0, fontSize: '13px', color: 'var(--text-muted)' }}><em>Automatically Rejected</em></p>}
                </div>
            )}

            <div style={{ marginTop: '20px' }}>
                {/* ── Activity Log ── */}
                <div className="card" style={{ display: 'flex', flexDirection: 'column', marginBottom: isActivityLogOpen ? '20px' : '0', transition: 'margin 0.2s' }}>
                    <div 
                        style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', cursor: 'pointer', paddingBottom: isActivityLogOpen ? '10px' : '0', borderBottom: isActivityLogOpen ? '1px solid var(--border-color)' : 'none' }}
                        onClick={() => setIsActivityLogOpen(!isActivityLogOpen)}
                    >
                        <h2 className="section-title" style={{ margin: 0, fontSize: '14px' }}>Activity Log</h2>
                        <span style={{ transform: isActivityLogOpen ? 'rotate(180deg)' : 'rotate(0deg)', transition: 'transform 0.2s', color: 'var(--text-muted)' }}>▼</span>
                    </div>

                    {isActivityLogOpen && (
                        <div style={{ marginTop: '15px', display: 'flex', flexDirection: 'column', flex: 1 }}>
                            <div className="activity-timeline" style={{ flex: 1, overflowY: 'auto', paddingRight: '10px', maxHeight: '400px' }}>
                                {historyLoading ? (
                                    <p style={{ opacity: 0.5, fontSize: '12px' }}>Loading history...</p>
                                ) : (() => {
                                    const appEvents = (events || []).filter(e => e.application_id === app.id).map(e => ({
                                        id: `event-${e.id}`,
                                        event_type: e.type === 'interview' ? 'Interview Scheduled' : 'Event',
                                        event_date: e.date,
                                        notes: e.details,
                                        with_who: Array.isArray(e.interviewers) ? e.interviewers.join(', ') : e.interviewers,
                                        title: e.title,
                                        isEvent: true,
                                        type: e.type
                                    }));
                                    const rawHistoryList = history.filter(evt => evt.event_type !== 'Application Added' && evt.event_type !== 'Initial Import' && !(evt.notes && evt.notes.includes('Migrated to new status')));
                                    const combinedHistory = [...rawHistoryList, ...appEvents].sort((a, b) => new Date(b.event_date) - new Date(a.event_date));
                                    
                                    if (combinedHistory.length === 0) {
                                        return <p style={{ opacity: 0.5, fontSize: '12px' }}>No activity logged yet.</p>;
                                    }

                                    return (
                                        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                                            {combinedHistory.map((evt, idx) => {
                                                const prevEvt = combinedHistory[idx + 1];
                                                const diffDays = prevEvt ? calculateDaysDifference(evt.event_date, prevEvt.event_date) : 0;
                                                
                                                // Handling interview details state
                                                const isMostRecentInterview = evt.event_type === 'Interview Scheduled' && idx === combinedHistory.findIndex(e => e.event_type === 'Interview Scheduled');
                                                const hasInterviewDetails = evt.isEvent || evt.interviews || (evt.interview_id && evt.notes) || evt.with_who;
                                                const isExpanded = expandedEvents[evt.id] !== undefined ? expandedEvents[evt.id] : isMostRecentInterview;
                                                
                                                return (
                                                    <div key={evt.id} style={{ display: 'flex', gap: '10px' }}>
                                                        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                                                            <div style={{ width: '8px', height: '8px', borderRadius: '50%', background: 'var(--accent)', marginTop: '4px' }} />
                                                            {idx < combinedHistory.length - 1 && <div style={{ width: '2px', flex: 1, background: 'var(--border-color)', margin: '4px 0' }} />}
                                                        </div>
                                                        <div style={{ flex: 1, paddingBottom: '12px' }}>
                                                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                                                                <div style={{ flex: 1 }}>
                                                                    <div 
                                                                        style={{ fontWeight: '600', fontSize: '12px', color: 'var(--text-main)', cursor: hasInterviewDetails ? 'pointer' : 'default', display: 'flex', alignItems: 'center', gap: '4px' }}
                                                                        onClick={() => hasInterviewDetails && toggleEvent(evt.id)}
                                                                    >
                                                                        {evt.event_type} {evt.title ? `- ${evt.title}` : ''} {evt.interviews?.stage ? `- ${evt.interviews.stage}` : ''}
                                                                        {hasInterviewDetails && (
                                                                            <span style={{ fontSize: '9px', color: 'var(--text-muted)', transform: isExpanded ? 'rotate(180deg)' : 'rotate(0deg)', transition: 'transform 0.2s' }}>▼</span>
                                                                        )}
                                                                    </div>
                                                                    <div style={{ fontSize: '11px', color: 'var(--text-muted)', marginTop: '2px' }}>
                                                                        {evt.new_status && <span>Status: {evt.new_status} </span>}
                                                                        {evt.new_stage && <span>• Stage: {evt.new_stage}</span>}
                                                                    </div>
                                                                    {isExpanded && (
                                                                        <div style={{ marginTop: '4px' }}>
                                                                            {evt.notes && (
                                                                                <div style={{ fontSize: '11px', padding: '6px', background: 'var(--bg-card-alt)', borderRadius: '6px', border: '1px solid var(--border-color)', marginBottom: '4px' }}>
                                                                                    {evt.notes}
                                                                                </div>
                                                                            )}
                                                                            {evt.with_who && (
                                                                                <div style={{ fontSize: '11px', color: 'var(--accent)' }}>
                                                                                    👤 Interviewer(s): {evt.with_who}
                                                                                </div>
                                                                            )}
                                                                        </div>
                                                                    )}
                                                                </div>
                                                                <div style={{ textAlign: 'right', minWidth: '100px' }}>
                                                                    <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>
                                                                        {formatDate(evt.event_date, settings?.timezone)}
                                                                    </div>
                                                                    {diffDays > 0 && (
                                                                        <div style={{ fontSize: '10px', color: '#888', marginTop: '4px' }}>
                                                                            {diffDays} {diffDays === 1 ? 'day' : 'days'} later
                                                                        </div>
                                                                    )}
                                                                </div>
                                                            </div>
                                                        </div>
                                                    </div>
                                                );
                                            })}
                                        </div>
                                    );
                                })()}
                            </div>
                            <form onSubmit={handleAddNote} style={{ marginTop: '20px', borderTop: '1px solid var(--border-color)', paddingTop: '15px' }}>
                                <div style={{ display: 'flex', gap: '10px', marginBottom: '10px' }}>
                                    <input 
                                        type="text" 
                                        className="field-input" 
                                        placeholder="Add a note..." 
                                        value={newNote}
                                        onChange={e => setNewNote(e.target.value)}
                                        style={{ flex: 2, margin: 0, fontSize: '12px', padding: '6px' }}
                                        required
                                    />
                                    <input 
                                        type="text" 
                                        className="field-input" 
                                        placeholder="With who? (optional)" 
                                        value={withWho}
                                        onChange={e => setWithWho(e.target.value)}
                                        style={{ flex: 1, margin: 0, fontSize: '12px', padding: '6px' }}
                                    />
                                </div>
                                <button type="submit" className="btn btn-primary btn-sm" disabled={!newNote}>
                                    Add Note
                                </button>
                            </form>
                        </div>
                    )}
                </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: '20px', marginTop: '20px' }}>
                {/* ── Notes card ── */}
                <div className="adp-notes-card" style={{ margin: 0 }}>
                    <div className="adp-notes-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                            <span className="adp-notes-icon">📝</span>
                            <h2 className="adp-notes-title">Description</h2>
                        </div>
                        {app.INFO && (
                            <button 
                                className="btn btn-sm"
                                style={{ padding: '4px 8px', fontSize: '0.8rem', display: 'flex', alignItems: 'center', gap: '4px' }}
                                onClick={() => {
                                    navigator.clipboard.writeText(app.INFO);
                                    alert("Description copied to clipboard!");
                                }}
                            >
                                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="9" y="9" width="13" height="13" rx="2" ry="2"></rect><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path></svg>
                                Copy
                            </button>
                        )}
                    </div>
                    <div className="adp-notes-body">
                        {app.INFO
                            ? <p className="adp-notes-text">{app.INFO}</p>
                            : <p className="adp-notes-empty">No description provided for this job.</p>
                        }
                    </div>
                </div>

            </div>

        </div>
    );
};

export default ApplicationDetailPage;