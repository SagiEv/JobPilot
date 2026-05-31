import React from 'react';
import { useNotifications } from '../../hooks/useNotifications';

const Sidebar = ({ activeTab, setActiveTab, backendStatus, isOpen, onClose }) => {
    const { unreadCount } = useNotifications(0);
    const tabs = [
        { id: 'dashboard', label: 'Dashboard' },
        { id: 'profile', label: 'Profile' },
        { id: 'applications', label: 'Applications' },
        { id: 'network', label: 'Network Edge' },
        { id: 'search', label: 'Auto Search' },
        { id: 'tailor', label: 'CV Tailoring' },
        { id: 'projects', label: 'Portfolio' },
        { id: 'skills-matrix', label: 'Skills Matrix' },
        { id: 'interview', label: 'Interview Insights' },
        { id: 'analytics', label: 'Analytics' },
    ];

    const bottomTabs = [
        { id: 'settings', label: 'Settings' },
    ];

    return (
        <div className={`sidebar ${isOpen ? 'mobile-open' : ''}`}>
            <div className="logo" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div>
                    <div className="logo-mark">JobPilot</div>
                    <div className="logo-sub">Career command center</div>
                </div>
                {/* Mobile close button */}
                <button className="sidebar-close-btn mobile-only" onClick={onClose} aria-label="Close Menu">
                    &times;
                </button>
            </div>

            <nav className="nav">
                {tabs.map((tab) => (
                    <div
                        key={tab.id}
                        className={`nav-item ${activeTab === tab.id ? 'active' : ''}`}
                        onClick={() => setActiveTab(tab.id)}
                    >
                        <span>{tab.label}</span>
                        {tab.id === 'dashboard' && unreadCount > 0 && (
                            <span style={{ 
                                background: '#e63946', color: '#fff', fontSize: '0.7rem', 
                                padding: '2px 6px', borderRadius: '10px', marginLeft: 'auto',
                                fontWeight: 'bold'
                            }}>
                                {unreadCount}
                            </span>
                        )}
                    </div>
                ))}
                <div className="nav-divider" />
                {bottomTabs.map((tab) => (
                    <div
                        key={tab.id}
                        className={`nav-item ${activeTab === tab.id ? 'active' : ''}`}
                        onClick={() => setActiveTab(tab.id)}
                    >
                        <span>{tab.label}</span>
                    </div>
                ))}
            </nav>

            <div className="sidebar-footer">
                JobPilot v2.0
                <div
                    style={{
                        fontSize: '10px',
                        marginTop: '4px',
                        color: backendStatus === 'connected' ? '#0f6e56' : '#a32d2d'
                    }}
                >
                    Backend: {backendStatus}
                </div>
            </div>
        </div>
    );
};

export default Sidebar;