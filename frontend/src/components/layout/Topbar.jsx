import React from 'react';

const Topbar = ({ activeTab }) => {
    const titles = {
        profile: 'My Profile',
        applications: 'Application Tracker',
        network: 'Network Edge',
        search: 'Automated Job Search',
        tailor: 'CV Tailoring'
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