import { useState, useEffect } from 'react';
import Layout from './components/layout/Layout';
import LoginPage from './pages/LoginPage';
import ProfilePage from './pages/ProfilePage';
import ApplicationsPage from './pages/ApplicationsPage';
import NetworkPage from './pages/NetworkPage';
import SearchPage from './pages/SearchPage';
import TailorPage from './pages/TailorPage';
import InterviewInsightsPage from './pages/InterviewInsightsPage';
import ExperiencePage from './pages/ExperiencePage';
import SkillsPage from './pages/SkillsPage';
import AnalyticsPage from './pages/AnalyticsPage';
import SettingsPage from './pages/SettingsPage';
import { checkBackendHealth } from './services/apiService';
import { restoreSession } from './services/authService';

function App() {
    const [activeTab, setActiveTab] = useState('profile');
    const [isAuthenticated, setIsAuthenticated] = useState(false);
    const [backendStatus, setBackendStatus] = useState('checking');
    const [isInitialising, setIsInitialising] = useState(true);

    // 1. Check Backend Health
    useEffect(() => {
        checkBackendHealth()
            .then(() => setBackendStatus('connected'))
            .catch(() => setBackendStatus('disconnected'));
    }, []);

    // 2. Restore Session on Load
    useEffect(() => {
        const initAuth = async () => {
            const session = await restoreSession();
            if (session) {
                setIsAuthenticated(true);
            }
            setIsInitialising(false);
        };
        initAuth();
    }, []);

    // 3. Listen for Navigation/Login Events
    useEffect(() => {
        const handler = (e) => {
            setActiveTab(e.detail);
            // If we navigate to anything other than login, we assume authenticated
            if (e.detail !== 'login') {
                setIsAuthenticated(true);
            }
        };
        window.addEventListener('jobpilot:navigate', handler);
        return () => window.removeEventListener('jobpilot:navigate', handler);
    }, []);

    if (isInitialising) {
        return (
            <div style={{ display: 'flex', height: '100vh', justifyContent: 'center', alignItems: 'center', fontFamily: 'sans-serif' }}>
                <p>Establishing Secure Session...</p>
            </div>
        );
    }

    const renderContent = () => {
        const contentKey = `${activeTab}-${isAuthenticated}`;
        switch (activeTab) {
            case 'profile': return <ProfilePage key={contentKey} />;
            case 'applications': return <ApplicationsPage key={contentKey} />;
            case 'network': return <NetworkPage key={contentKey} />;
            case 'search': return <SearchPage key={contentKey} />;
            case 'tailor': return <TailorPage key={contentKey} />;
            case 'interview': return <InterviewInsightsPage key={contentKey} />;
            case 'projects': return <ExperiencePage key={contentKey} />;
            case 'skills-matrix': return <SkillsPage key={contentKey} />;
            case 'analytics': return <AnalyticsPage key={contentKey} />;
            case 'settings': return <SettingsPage key={contentKey} />;
            default: return <ProfilePage key={contentKey} />;
        }
    };

    return (
        <div style={{ position: 'relative', height: '100vh', width: '100vw', overflow: 'hidden' }}>
            {/* DASHBOARD LAYER */}
            <div style={{
                filter: isAuthenticated ? 'none' : 'blur(10px) grayscale(20%)',
                pointerEvents: isAuthenticated ? 'auto' : 'none',
                transition: 'filter 0.5s ease, transform 0.5s ease',
                transform: isAuthenticated ? 'scale(1)' : 'scale(0.98)',
                height: '100%'
            }}>
                <Layout
                    activeTab={activeTab}
                    setActiveTab={setActiveTab}
                    backendStatus={backendStatus}
                >
                    {renderContent()}
                </Layout>
            </div>

            {/* LOGIN OVERLAY LAYER */}
            {!isAuthenticated && (
                <div style={{
                    position: 'absolute',
                    top: 0,
                    left: 0,
                    right: 0,
                    bottom: 0,
                    zIndex: 999,
                    display: 'flex',
                    justifyContent: 'center',
                    alignItems: 'center',
                    backgroundColor: 'rgba(255, 255, 255, 0.3)', // Glass effect
                    backdropFilter: 'brightness(0.9)'
                }}>
                    <LoginPage />
                </div>
            )}
        </div>
    );
}

export default App;