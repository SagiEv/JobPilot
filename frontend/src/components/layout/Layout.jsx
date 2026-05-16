import React, { useState } from 'react';
import Sidebar from './Sidebar';
import Topbar from './Topbar';

const Layout = ({ children, activeTab, setActiveTab, backendStatus }) => {
    const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

    return (
        <div className="app">
            {isMobileMenuOpen && (
                <div 
                    className="mobile-sidebar-overlay"
                    onClick={() => setIsMobileMenuOpen(false)}
                />
            )}
            <Sidebar 
                activeTab={activeTab} 
                setActiveTab={(tab) => {
                    setActiveTab(tab);
                    setIsMobileMenuOpen(false); // Close sidebar on mobile when navigating
                }} 
                backendStatus={backendStatus} 
                isOpen={isMobileMenuOpen}
                onClose={() => setIsMobileMenuOpen(false)}
            />
            <div className="main">
                <Topbar 
                    activeTab={activeTab} 
                    onMenuClick={() => setIsMobileMenuOpen(true)}
                />
                <div className="content">
                    {children}
                </div>
            </div>
        </div>
    );
};

export default Layout;