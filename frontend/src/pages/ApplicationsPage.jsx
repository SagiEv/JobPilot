import React, { useState, useMemo } from 'react';
import { useApplications } from '../hooks/useApplications';
import { useSettings } from '../hooks/useSettings';
import ApplicationDetailPage from './ApplicationDetailPage';
import { statusBadgeClass, formatDate } from '../utils/helpers';
import PageLoader from '../components/PageLoader';

const ApplicationsPage = () => {
    const { applications, stats, handleUpload, updateApplication, addApplication, loading } = useApplications();
    const { settings } = useSettings();

    // UI State
    const [viewingAppId, setViewingAppId] = useState(null);
    const [searchTerm, setSearchTerm] = useState('');
    const [filterType, setFilterType] = useState('all'); // 'all' | 'active' | 'interview' | 'archived'
    const [isAddModalOpen, setIsAddModalOpen] = useState(false);
    const [newAppForm, setNewAppForm] = useState({ COMPANY: '', ROLE_ID: '', STATUS: 'Applied', LINK: '', INFO: '', DATE: new Date().toISOString().split('T')[0], CV_FILE: '' });

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
                    default:
                        // 'all' view hides rejected by default
                        return status !== 'rejected';
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
            <ApplicationDetailPage
                app={currentApp}
                onBack={() => setViewingAppId(null)}
                onUpdate={updateApplication}
            />
        );
    }

    return (
        <div className="section">
            {/* Interactive Stats Bar with Selection Indicators */}
            <div className="stats-bar">
                <div
                    className={`stat-card ${filterType === 'all' ? 'selected-stat' : ''}`}
                    onClick={() => setFilterType('all')}
                >
                    <div className="stat-num">{stats.total}</div>
                    <div className="stat-lbl">Total Tracking</div>
                </div>

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
                    <button className="btn btn-primary btn-sm">
                        <label htmlFor="app-csv" style={{ cursor: 'pointer', margin: 0 }}>
                            Import CSV
                            <input id="app-csv" type="file" accept=".csv" onChange={handleUpload} style={{ display: 'none' }} />
                        </label>
                    </button>
                </div>
            </div>

            {/* Table with Inline Update and Details Link */}
            <div className="tbl-wrap">
                <table>
                    <thead>
                        <tr>
                            <th>Company</th>
                            <th>Role ID</th>
                            <th>Date</th>
                            <th>Update Status</th>
                            <th>Actions</th>
                        </tr>
                    </thead>
                    <tbody>
                        {filteredApplications.map((app) => (
                            <tr key={app.id}>
                                <td style={{ fontWeight: '600' }}>{app.COMPANY}</td>
                                <td style={{ fontFamily: 'monospace', fontSize: '11px' }}>{app.ROLE_ID}</td>
                                <td style={{ fontSize: '11px' }}>{formatDate(app.DATE, settings?.timezone) || '—'}</td>
                                <td>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                        <select
                                            className={`status-select-table ${statusBadgeClass(app.STATUS)}`}
                                            value={
                                                ['Applied', 'Phone Interview', 'Technical Interview', 'Offer', 'Rejected']
                                                    .find(opt => opt.toLowerCase() === app.STATUS?.toLowerCase()) || app.STATUS
                                            }
                                            onChange={(e) => updateApplication(app.id, e.target.value)}
                                            style={{ margin: 0 }}
                                        >
                                            <option value="Applied">Applied</option>
                                            <option value="Phone Interview">Phone Interview</option>
                                            <option value="Technical Interview">Technical Interview</option>
                                            <option value="Offer">Offer</option>
                                            {app.STATUS?.toLowerCase() === 'rejected' && (
                                                <option value="Rejected">Rejected</option>
                                            )}
                                        </select>
                                        {app.STATUS?.toLowerCase() !== 'rejected' && (
                                            <button
                                                onClick={() => updateApplication(app.id, 'Rejected')}
                                                style={{
                                                    background: 'var(--danger-c, #ef4444)',
                                                    color: 'white',
                                                    border: 'none',
                                                    borderRadius: '4px',
                                                    width: '24px',
                                                    height: '24px',
                                                    display: 'flex',
                                                    alignItems: 'center',
                                                    justifyContent: 'center',
                                                    cursor: 'pointer',
                                                    fontSize: '14px',
                                                    fontWeight: 'bold',
                                                    padding: 0,
                                                    flexShrink: 0
                                                }}
                                                title="Fast Reject"
                                            >
                                                ✕
                                            </button>
                                        )}
                                    </div>
                                </td>
                                <td>
                                    <button className="btn-link" onClick={() => setViewingAppId(app.id)}>
                                        Details ↗
                                    </button>
                                </td>
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
                                setNewAppForm({ COMPANY: '', ROLE_ID: '', STATUS: 'Applied', LINK: '', INFO: '', DATE: new Date().toISOString().split('T')[0], CV_FILE: '' });
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
                                        <option value="Phone Interview">Phone Interview</option>
                                        <option value="Technical Interview">Technical Interview</option>
                                        <option value="Offer">Offer</option>
                                        <option value="Rejected">Rejected</option>
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
        </div>
    );
};

export default ApplicationsPage;