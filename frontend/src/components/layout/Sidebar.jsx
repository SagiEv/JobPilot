import React from 'react';

const Sidebar = ({ activeTab, setActiveTab, backendStatus }) => {
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
        <div className="sidebar">
            <div className="logo">
                <div className="logo-mark">JobPilot</div>
                <div className="logo-sub">Career command center</div>
            </div>

            <nav className="nav">
                {tabs.map((tab) => (
                    <div
                        key={tab.id}
                        className={`nav-item ${activeTab === tab.id ? 'active' : ''}`}
                        onClick={() => setActiveTab(tab.id)}
                    >
                        <span>{tab.label}</span>
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