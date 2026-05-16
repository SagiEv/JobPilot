import React from 'react';

const Topbar = ({ activeTab, onMenuClick }) => {
    const titles = {
        dashboard: 'Dashboard',
        profile: 'My Profile',
        applications: 'Application Tracker',
        network: 'Network Edge',
        search: 'Automated Job Search',
        tailor: 'CV Tailoring',
        settings: 'Settings',
        projects: 'Projects',
        'skills-matrix': 'Skills Matrix',
        interview: 'Interview Insights',
        analytics: 'Analytics'
    };

    return (
        <div className="topbar mobile-only">
            <button className="hamburger-btn" onClick={onMenuClick} aria-label="Open Menu">
                <svg viewBox="0 0 24 24" width="24" height="24" stroke="currentColor" strokeWidth="2" fill="none" strokeLinecap="round" strokeLinejoin="round">
                    <line x1="3" y1="12" x2="21" y2="12"></line>
                    <line x1="3" y1="6" x2="21" y2="6"></line>
                    <line x1="3" y1="18" x2="21" y2="18"></line>
                </svg>
            </button>
            <div className="topbar-title">
                {titles[activeTab] || 'Dashboard'}
            </div>
            <div style={{ width: 24 }}></div> {/* Spacer for centering */}
        </div>
    );
};

export default Topbar;