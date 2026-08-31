import React, { useState, useMemo } from 'react';
import { useApplications } from '../hooks/useApplications';
import { useSettings } from '../hooks/useSettings';
import ApplicationDetailPage from './ApplicationDetailPage';
import { statusBadgeClass, formatDate } from '../utils/helpers';
import PageLoader from '../components/PageLoader';

const ConflictModal = ({ conflict, onResolve }) => (
    <div className="modal-overlay" onClick={() => onResolve('abort')}>
        <div className="modal" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
                <h2>Event Conflict Detected</h2>
                <button className="modal-close" onClick={() => onResolve('abort')}>✕</button>
            </div>
            <div className="modal-body">
                <p>An event already exists on <strong>{conflict.conflictData.targetDate}</strong>:</p>
                <div style={{ padding: '10px', background: 'var(--bg-card-alt)', borderRadius: '6px', margin: '10px 0' }}>
                    <strong>Existing Event:</strong> {conflict.conflictData.existingEvent.event_type}
                    <br />
                    Status: {conflict.conflictData.existingEvent.new_status}
                    {conflict.conflictData.existingEvent.new_stage && ` (${conflict.conflictData.existingEvent.new_stage})`}
                </div>
                <p>You are trying to set:</p>
                <div style={{ padding: '10px', background: 'var(--bg-card-alt)', borderRadius: '6px', margin: '10px 0' }}>
                    Status: {conflict.newStatus}
                    {conflict.newStage && ` (${conflict.newStage})`}
                </div>
                <p>How would you like to handle this conflict?</p>
            </div>
            <div className="modal-footer" style={{ justifyContent: 'flex-end', gap: '10px' }}>
                <button className="btn btn-primary" onClick={() => onResolve('overwrite')}>Overwrite</button>
                <button className="btn" style={{ background: 'var(--bg-card-alt)', border: '1px solid var(--border-color)', color: 'var(--text-main)' }} onClick={() => onResolve('keep_both')}>Keep Both</button>
                <button className="btn" onClick={() => onResolve('abort')}>Abort</button>
            </div>
        </div>
    </div>
);

const ApplicationsPage = () => {
    const { applications, stats, status, handleUpload, updateApplication, addApplication, loading, conflict, handleConflictResolution } = useApplications();
    const { settings } = useSettings();

    // UI State
    const [viewingAppId, setViewingAppId] = useState(null);
    const [searchTerm, setSearchTerm] = useState('');
    const [filterType, setFilterType] = useState('active'); // 'all' | 'active' | 'interview' | 'archived'
    const [isAddModalOpen, setIsAddModalOpen] = useState(false);
    const [rejectModalApp, setRejectModalApp] = useState(null);
    const [rejectReason, setRejectReason] = useState('');
    const [autoReject, setAutoReject] = useState(false);
    const [newAppForm, setNewAppForm] = useState({ COMPANY: '', ROLE_ID: '', STATUS: 'Applied', STAGE: '', LINK: '', INFO: '', DATE: new Date().toISOString().split('T')[0], CV_FILE: '', REFERAL: '', LOCATION: '' });

    // Sorting State
    const [sortBy, setSortBy] = useState('date');
    const [sortOrder, setSortOrder] = useState('desc'); // 'desc' (Newest) or 'asc' (Oldest)

    const currentApp = applications.find(a => a.id === viewingAppId);

    // Filtering & Sorting Logic
    const filteredApplications = useMemo(() => {
        return applications
            .filter(app => {
                const matchesSearch = app.COMPANY.toLowerCase().includes(searchTerm.toLowerCase()) ||
                    app.ROLE_ID.toLowerCase().includes(searchTerm.toLowerCase());
                if (searchTerm) return matchesSearch;

                const status = (app.STATUS || '').toLowerCase();

                switch (filterType) {
                    case 'active':
                        return !status.includes('reject') && !status.includes('offer');
                    case 'interview':
                        return status.includes('interview') || status.includes('phone') || status.includes('tech');
                    case 'archived':
                        return status === 'rejected';
                    case 'all':
                    default:
                        // 'all' view shows everything including rejected
                        return true;
                }
            })
            .sort((a, b) => {
                let comparison = 0;
                if (sortBy === 'date') {
                    comparison = new Date(b.DATE || 0) - new Date(a.DATE || 0);
                } else {
                    comparison = (a.STATUS || '').localeCompare(b.STATUS || '');
                }
                return sortOrder === 'desc' ? comparison : -comparison;
            });
    }, [applications, searchTerm, filterType, sortBy, sortOrder]);

    if (loading) return <PageLoader label="Loading applications…" />;

    if (viewingAppId && currentApp) {
        return (
            <>
                <ApplicationDetailPage
                    app={currentApp}
                    onBack={() => setViewingAppId(null)}
                    onUpdate={updateApplication}
                />
                {conflict && <ConflictModal conflict={conflict} onResolve={handleConflictResolution} />}
            </>
        );
    }

    return (
        <div className="section">
            {/* Interactive Stats Bar with Selection Indicators */}
            <div className="stats-bar">
                <div
                    className={`stat-card ${filterType === 'active' ? 'selected-stat' : ''}`}
                    onClick={() => setFilterType('active')}
                >
                    <div className="stat-num" style={{ color: 'var(--accent)' }}>{stats.active}</div>
                    <div className="stat-lbl">Active</div>
                </div>

                <div
                    className={`stat-card ${filterType === 'interview' ? 'selected-stat' : ''}`}
                    onClick={() => setFilterType('interview')}
                >
                    <div className="stat-num" style={{ color: 'var(--success-c)' }}>{stats.interview}</div>
                    <div className="stat-lbl">Interviews</div>
                </div>

                <div
                    className={`stat-card ${filterType === 'archived' ? 'selected-stat-danger' : ''}`}
                    onClick={() => setFilterType('archived')}
                >
                    <div className="stat-num" style={{ color: 'var(--danger-c)' }}>
                        {applications.filter(a => a.STATUS?.toLowerCase() === 'rejected').length}
                    </div>
                    <div className="stat-lbl">Archived</div>
                </div>

                <div
                    className={`stat-card ${filterType === 'all' ? 'selected-stat' : ''}`}
                    onClick={() => setFilterType('all')}
                >
                    <div className="stat-num">{stats.total}</div>
                    <div className="stat-lbl">Total Tracking</div>
                </div>
            </div>

            {/* Toolbar: Search + Sort Logic */}
            <div className="toolbar">
                <input
                    type="text"
                    placeholder="Search company or role..."
                    className="search-input"
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                />

                <div className="sort-group">
                    <select className="sort-select" value={sortBy} onChange={(e) => setSortBy(e.target.value)}>
                        <option value="date">Sort by Date</option>
                        <option value="status">Sort by Status</option>
                    </select>
                    <button
                        className="btn-sort-dir"
                        onClick={() => setSortOrder(prev => prev === 'desc' ? 'asc' : 'desc')}
                    >
                        {sortOrder === 'desc' ? '↓ Newest' : '↑ Oldest'}
                    </button>
                </div>

                <div style={{ display: 'flex', gap: '8px' }}>
                    <button className="btn btn-primary btn-sm" onClick={() => setIsAddModalOpen(true)}>
                        + New Application
                    </button>
                    <label className="btn btn-primary btn-sm" htmlFor="app-csv" style={{ cursor: 'pointer', margin: 0, display: 'inline-block', lineHeight: 'normal' }}>
                        Import CSV
                        <input id="app-csv" type="file" accept=".csv" onChange={handleUpload} style={{ display: 'none' }} />
                    </label>
                </div>
            </div>

            {status && <div className="status-msg" style={{ marginBottom: '20px' }}>{status}</div>}

            {/* Table with Inline Update and Details Link */}
            <div className="tbl-wrap">
                <table>
                    <thead>
                        <tr>
                            <th>Company</th>
                            <th>Role ID</th>
                            <th>Date</th>
                            <th>Status</th>
                            {filterType !== 'archived' && <th>Stage</th>}
                        </tr>
                    </thead>
                    <tbody>
                        {filteredApplications.map((app) => (
                            <tr 
                                key={app.id} 
                                onClick={() => setViewingAppId(app.id)}
                                style={{ cursor: 'pointer' }}
                                className="clickable-row"
                            >
                                <td style={{ fontWeight: '600' }}>{app.COMPANY}</td>
                                <td style={{ fontFamily: 'monospace', fontSize: '11px' }}>{app.ROLE_ID}</td>
                                <td style={{ fontSize: '11px' }}>{formatDate(app.DATE, settings?.timezone) || '—'}</td>
                                <td style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                                    <select
                                        className={`status-select-table ${statusBadgeClass(app.STATUS)}`}
                                        value={
                                            ['Applied', 'Screening', 'Assessment', 'Interviewing', 'Offer', 'Hired', 'Rejected', 'Withdrawn']
                                                .find(opt => opt.toLowerCase() === app.STATUS?.toLowerCase()) || app.STATUS || 'Applied'
                                        }
                                        onChange={(e) => {
                                            const newStatus = e.target.value;
                                            if (newStatus === 'Rejected') {
                                                setRejectModalApp(app);
                                                setRejectReason('');
                                                setAutoReject(false);
                                            } else {
                                                updateApplication(app.id, newStatus, app.STAGE);
                                            }
                                        }}
                                        onClick={(e) => e.stopPropagation()}
                                        style={{ margin: 0, width: '130px' }}
                                    >
                                        <option value="Applied">Applied</option>
                                        <option value="Screening">Screening</option>
                                        <option value="Assessment">Assessment</option>
                                        <option value="Interviewing">Interviewing</option>
                                        <option value="Offer">Offer</option>
                                        <option value="Hired">Hired</option>
                                        <option value="Rejected">Rejected</option>
                                        <option value="Withdrawn">Withdrawn</option>
                                    </select>
                                    {app.STATUS?.toLowerCase() !== 'rejected' && (
                                        <button 
                                            title="Quick Reject"
                                            onClick={(e) => {
                                                e.stopPropagation();
                                                setRejectModalApp(app);
                                                setRejectReason('');
                                                setAutoReject(false);
                                            }}
                                            style={{ 
                                                background: 'var(--danger-c)', 
                                                border: 'none', 
                                                color: '#fff', 
                                                cursor: 'pointer', 
                                                fontSize: '12px', 
                                                width: '24px',
                                                height: '24px',
                                                borderRadius: '4px',
                                                display: 'flex',
                                                alignItems: 'center',
                                                justifyContent: 'center',
                                                lineHeight: 1,
                                                padding: 0
                                            }}
                                        >
                                            ✕
                                        </button>
                                    )}
                                </td>
                                {filterType !== 'archived' && (
                                    <td>
                                        {app.STATUS?.toLowerCase() === 'interviewing' ? (
                                            <select
                                                className="status-select-table badge-pending"
                                                style={{ margin: 0, width: '150px' }}
                                                value={app.STAGE || ''}
                                                onChange={(e) => updateApplication(app.id, app.STATUS, e.target.value)}
                                                onClick={(e) => e.stopPropagation()}
                                            >
                                                <option value="">- No Stage -</option>
                                                <option value="Recruiter / HR Screen">Recruiter / HR Screen</option>
                                                <option value="Introduction Interview">Introduction Interview</option>
                                                <option value="Online Test">Online Test</option>
                                                <option value="Home Assignment">Home Assignment</option>
                                                <option value="Technical Interview">Technical Interview</option>
                                                <option value="Coding Interview">Coding Interview</option>
                                                <option value="System Design Interview">System Design Interview</option>
                                                <option value="Behavioral / Culture Interview">Behavioral / Culture</option>
                                                <option value="Hiring Manager Interview">Hiring Manager</option>
                                                <option value="Final Interview / On-site">Final / On-site</option>
                                                <option value="Team Matching">Team Matching</option>
                                                <option value="Reference Check">Reference Check</option>
                                                <option value="Background Check">Background Check</option>
                                            </select>
                                        ) : (
                                            <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>-</span>
                                        )}
                                    </td>
                                )}
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>

            {/* Add Application Modal */}
            {isAddModalOpen && (
                <div className="modal-overlay" onClick={() => setIsAddModalOpen(false)}>
                    <div className="modal" onClick={(e) => e.stopPropagation()} style={{ maxHeight: '90vh', overflowY: 'auto' }}>
                        <div className="modal-header">
                            <h2>New Application</h2>
                            <button className="modal-close" onClick={() => setIsAddModalOpen(false)}>✕</button>
                        </div>
                        <form onSubmit={async (e) => {
                            e.preventDefault();
                            try {
                                await addApplication(newAppForm);
                                setIsAddModalOpen(false);
                                setNewAppForm({ COMPANY: '', ROLE_ID: '', STATUS: 'Applied', LINK: '', INFO: '', DATE: new Date().toISOString().split('T')[0], CV_FILE: '', REFERAL: '', LOCATION: '' });
                            } catch (error) {
                                alert("Failed to create application");
                            }
                        }}>
                            <div className="modal-body">
                                <div className="modal-section">
                                    <label>Company *</label>
                                    <input
                                        className="field-input"
                                        value={newAppForm.COMPANY}
                                        onChange={e => setNewAppForm({...newAppForm, COMPANY: e.target.value})}
                                        placeholder="e.g. Google"
                                        dir="auto"
                                        required
                                    />
                                </div>
                                <div className="modal-section">
                                    <label>Role ID / Title *</label>
                                    <input
                                        className="field-input"
                                        value={newAppForm.ROLE_ID}
                                        onChange={e => setNewAppForm({...newAppForm, ROLE_ID: e.target.value})}
                                        placeholder="e.g. Frontend Engineer"
                                        dir="auto"
                                        required
                                    />
                                </div>
                                <div className="modal-section">
                                    <label>Date</label>
                                    <input
                                        type="date"
                                        className="field-input"
                                        value={newAppForm.DATE}
                                        onChange={e => setNewAppForm({...newAppForm, DATE: e.target.value})}
                                        required
                                    />
                                </div>
                                <div className="modal-section">
                                    <label>Status</label>
                                    <select
                                        className="field-input"
                                        value={newAppForm.STATUS}
                                        onChange={e => setNewAppForm({...newAppForm, STATUS: e.target.value})}
                                    >
                                        <option value="Applied">Applied</option>
                                        <option value="Screening">Screening</option>
                                        <option value="Assessment">Assessment</option>
                                        <option value="Interviewing">Interviewing</option>
                                        <option value="Offer">Offer</option>
                                        <option value="Hired">Hired</option>
                                        <option value="Rejected">Rejected</option>
                                        <option value="Withdrawn">Withdrawn</option>
                                    </select>
                                </div>
                                <div className="modal-section">
                                    <label>Stage <span style={{ opacity: 0.5, fontWeight: 400 }}>(optional)</span></label>
                                    <select
                                        className="field-input"
                                        value={newAppForm.STAGE}
                                        onChange={e => setNewAppForm({...newAppForm, STAGE: e.target.value})}
                                    >
                                        <option value="">- No Stage -</option>
                                        <option value="Recruiter / HR Screen">Recruiter / HR Screen</option>
                                        <option value="Introduction Interview">Introduction Interview</option>
                                        <option value="Online Test">Online Test</option>
                                        <option value="Home Assignment">Home Assignment</option>
                                        <option value="Technical Interview">Technical Interview</option>
                                        <option value="Coding Interview">Coding Interview</option>
                                        <option value="System Design Interview">System Design Interview</option>
                                        <option value="Behavioral / Culture Interview">Behavioral / Culture Interview</option>
                                        <option value="Hiring Manager Interview">Hiring Manager Interview</option>
                                        <option value="Final Interview / On-site">Final Interview / On-site</option>
                                        <option value="Team Matching">Team Matching</option>
                                        <option value="Reference Check">Reference Check</option>
                                        <option value="Background Check">Background Check</option>
                                    </select>
                                </div>
                                <div className="modal-section">
                                    <label>Job Link</label>
                                    <input
                                        className="field-input"
                                        value={newAppForm.LINK}
                                        onChange={e => setNewAppForm({...newAppForm, LINK: e.target.value})}
                                        placeholder="https://..."
                                        dir="auto"
                                    />
                                </div>
                                <div className="modal-section">
                                    <label>Description</label>
                                    <textarea
                                        className="textarea"
                                        style={{ minHeight: '80px' }}
                                        value={newAppForm.INFO}
                                        onChange={e => setNewAppForm({...newAppForm, INFO: e.target.value})}
                                        placeholder="Job description, notes, etc."
                                        dir="auto"
                                    />
                                </div>
                                <div className="modal-section">
                                    <label>Referral Name <span style={{ opacity: 0.5, fontWeight: 400 }}>(optional)</span></label>
                                    <input
                                        className="field-input"
                                        value={newAppForm.REFERAL}
                                        onChange={e => setNewAppForm({...newAppForm, REFERAL: e.target.value})}
                                        placeholder="e.g. Jane Smith"
                                        dir="auto"
                                    />
                                </div>
                                <div className="modal-section">
                                    <label>Location <span style={{ opacity: 0.5, fontWeight: 400 }}>(optional)</span></label>
                                    <input
                                        className="field-input"
                                        value={newAppForm.LOCATION}
                                        onChange={e => setNewAppForm({...newAppForm, LOCATION: e.target.value})}
                                        placeholder="e.g. Tel Aviv / Remote"
                                        dir="auto"
                                    />
                                </div>
                                <div className="modal-section">
                                    <label>CV File Applied</label>
                                    <input
                                        className="field-input"
                                        value={newAppForm.CV_FILE}
                                        onChange={e => setNewAppForm({...newAppForm, CV_FILE: e.target.value})}
                                        placeholder="e.g. John_Doe_Resume_Backend.pdf"
                                        dir="auto"
                                    />
                                </div>
                            </div>
                            <div className="modal-footer">
                                <button type="button" className="btn" onClick={() => setIsAddModalOpen(false)}>Cancel</button>
                                <button type="submit" className="btn btn-primary" disabled={!newAppForm.COMPANY || !newAppForm.ROLE_ID}>
                                    Save Application
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* Reject Application Modal */}
            {rejectModalApp && (
                <div className="modal-overlay" onClick={() => setRejectModalApp(null)}>
                    <div className="modal" onClick={(e) => e.stopPropagation()}>
                        <div className="modal-header">
                            <h2>Reject Application: {rejectModalApp.COMPANY}</h2>
                            <button className="modal-close" onClick={() => setRejectModalApp(null)}>✕</button>
                        </div>
                        <form onSubmit={(e) => {
                            e.preventDefault();
                            updateApplication(
                                rejectModalApp.id, 
                                'Rejected', 
                                rejectModalApp.STAGE, 
                                null, 
                                rejectReason, 
                                autoReject
                            );
                            setRejectModalApp(null);
                        }}>
                            <div className="modal-body">
                                <div className="modal-section">
                                    <label>Rejection Reason / Comments <span style={{ opacity: 0.5, fontWeight: 400 }}>(optional)</span></label>
                                    <textarea
                                        className="textarea"
                                        style={{ minHeight: '80px' }}
                                        value={rejectReason}
                                        onChange={e => setRejectReason(e.target.value)}
                                        placeholder="e.g. They went with an internal candidate"
                                        dir="auto"
                                    />
                                </div>
                                <div className="modal-section" style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer' }}>
                                    <input 
                                        type="checkbox" 
                                        id="autoRejectCheck"
                                        checked={autoReject} 
                                        onChange={e => setAutoReject(e.target.checked)} 
                                        style={{ width: '16px', height: '16px', cursor: 'pointer' }}
                                    />
                                    <label htmlFor="autoRejectCheck" style={{ margin: 0, cursor: 'pointer' }}>Automatically rejected (e.g. CV screening failed without call)</label>
                                </div>
                            </div>
                            <div className="modal-footer">
                                <button type="button" className="btn" onClick={() => setRejectModalApp(null)}>Cancel</button>
                                <button type="submit" className="btn" style={{ background: 'var(--danger-c)', color: 'white', border: 'none' }}>
                                    Confirm Rejection
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
            {conflict && <ConflictModal conflict={conflict} onResolve={handleConflictResolution} />}
        </div>
    );
};

export default ApplicationsPage;