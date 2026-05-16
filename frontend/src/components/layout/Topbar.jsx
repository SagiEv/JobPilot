import React from 'react';

const Topbar = ({ activeTab }) => {
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
        <div className="topbar">
            <div className="topbar-title">
                {titles[activeTab] || 'Dashboard'}
            </div>
        </div>
    );
};

export default Topbar;