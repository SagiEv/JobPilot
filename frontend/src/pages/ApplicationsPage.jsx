import React, { useState, useMemo } from 'react';
import { useApplications } from '../hooks/useApplications';
import ApplicationDetailPage from './ApplicationDetailPage';
import { statusBadgeClass } from '../utils/helpers';
import PageLoader from '../components/PageLoader';

const ApplicationsPage = () => {
    const { applications, stats, handleUpload, updateApplication, loading } = useApplications();

    // UI State
    const [viewingAppId, setViewingAppId] = useState(null);
    const [searchTerm, setSearchTerm] = useState('');
    const [filterType, setFilterType] = useState('all'); // 'all' | 'active' | 'interview' | 'archived'

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

                <button className="btn btn-primary btn-sm">
                    <label htmlFor="app-csv" style={{ cursor: 'pointer', margin: 0 }}>
                        Import CSV
                        <input id="app-csv" type="file" accept=".csv" onChange={handleUpload} style={{ display: 'none' }} />
                    </label>
                </button>
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
                                <td style={{ fontSize: '11px' }}>{app.DATE || '—'}</td>
                                <td>
                                    {/* The "Update" dropdown is back! */}
                                    <select
                                        className={`status-select-table ${statusBadgeClass(app.STATUS)}`}
                                        value={app.STATUS}
                                        onChange={(e) => updateApplication(app.id, e.target.value)}
                                    >
                                        <option value="Applied">Applied</option>
                                        <option value="Phone Interview">Phone Interview</option>
                                        <option value="Technical Interview">Technical Interview</option>
                                        <option value="Offer">Offer</option>
                                        <option value="Rejected">Rejected</option>
                                    </select>
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
        </div>
    );
};

export default ApplicationsPage;