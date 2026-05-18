import React, { useState } from 'react';
import { statusBadgeClass, formatDate } from '../utils/helpers';
import { useSettings } from '../hooks/useSettings';

const ApplicationDetailPage = ({ app, onBack, onUpdate }) => {
    const { settings } = useSettings();
    const [isEditing, setIsEditing] = useState(false);
    const [tempStatus, setTempStatus] = useState(app.STATUS);


    const handleConfirm = () => {
        onUpdate(app.id, tempStatus); // Calls updateApplication from hook
        setIsEditing(false);
        // onBack();
    };

    const handleCancel = () => {
        setTempStatus(app.STATUS);
        setIsEditing(false);
    };

    return (
        <div className="section detail-view">
            <div className="detail-nav">
                <button className="btn-back" onClick={onBack}>← Back to Tracker</button>
            </div>

            <header className="detail-header">
                <div className="header-main">
                    <h1>{app.COMPANY}</h1>

                    {!isEditing ? (
                        <div className="status-display-group">
                            <span className={`badge ${statusBadgeClass(app.STATUS)}`}>
                                {app.STATUS || 'No Status'}
                            </span>
                            <button className="btn-edit-inline" onClick={() => setIsEditing(true)}>
                                Update Status
                            </button>
                        </div>
                    ) : (
                        <div className="status-edit-group">
                            <select
                                className="status-select-large"
                                value={
                                    ['Applied', 'Phone Interview', 'Technical Interview', 'Offer', 'Rejected']
                                        .find(opt => opt.toLowerCase() === tempStatus?.toLowerCase()) || tempStatus
                                }
                                onChange={(e) => setTempStatus(e.target.value)}
                            >
                                <option value="Applied">Applied</option>
                                <option value="Phone Interview">Phone Interview</option>
                                <option value="Technical Interview">Technical Interview</option>
                                <option value="Offer">Offer</option>
                                <option value="Rejected">Rejected</option>
                            </select>
                            <button className="btn-confirm" onClick={handleConfirm}>Confirm</button>
                            <button className="btn-cancel" onClick={handleCancel}>Cancel</button>
                        </div>
                    )}
                </div>
                <p className="role-id">{app.ROLE_ID}</p>
            </header>

            <div className="quick-stats-row">
                <div className="stat-item">
                    <label>Last Updated</label>
                    <span>{formatDate(app.DATE, settings?.timezone) || 'N/A'}</span>
                </div>
                <div className="stat-item">
                    <label>Location</label>
                    <span>{app.LOCATION || 'Remote / N/A'}</span>
                </div>
                <div className="stat-item">
                    <label>Referral</label>
                    <span>{app.REFERAL || 'None'}</span>
                </div>
                <div className="stat-item">
                    <label>CV Applied</label>
                    <span>{app.CV_FILE || 'None'}</span>
                </div>
                {app.LINK && (
                    <div className="stat-item">
                        <label>Job Link</label>
                        <span>
                            <a href={app.LINK.startsWith('http') ? app.LINK : `https://${app.LINK}`} target="_blank" rel="noopener noreferrer" style={{ color: 'var(--accent, #3b82f6)', textDecoration: 'none' }}>
                                View Posting ↗
                            </a>
                        </span>
                    </div>
                )}
            </div>

            <div className="detail-content-area">
                <div className="content-card">
                    <h2 className="content-title">Notes & Detailed Information</h2>
                    <div className="info-text-block">
                        {app.INFO || 'No detailed notes provided.'}
                    </div>
                </div>
            </div>
        </div>
    );
};

export default ApplicationDetailPage;