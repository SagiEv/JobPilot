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
    const [activeTab, setActiveTab] = useState('login');
    const [backendStatus, setBackendStatus] = useState('checking');
    const [isInitialising, setIsInitialising] = useState(true); // prevent flicker


    useEffect(() => {
        checkBackendHealth()
            .then(() => setBackendStatus('connected'))
            .catch(() => setBackendStatus('disconnected'));
    }, []);


    useEffect(() => {
        const initAuth = async () => {
            await restoreSession();
            setIsInitialising(false); // Auth is now ready
        };
        initAuth();
    }, []);

    useEffect(() => {
        const handler = (e) => setActiveTab(e.detail);
        window.addEventListener('jobpilot:navigate', handler);
        return () => window.removeEventListener('jobpilot:navigate', handler);
    }, []);

    if (isInitialising) {
        return (
            <div style={{ display: 'flex', height: '100vh', justifyContent: 'center', alignItems: 'center' }}>
                <p>Establishing Secure Session...</p>
            </div>
        );
    }

    const renderContent = () => {
        switch (activeTab) {
            case 'login': return <LoginPage />;
            case 'profile': return <ProfilePage />;
            case 'applications': return <ApplicationsPage />;
            case 'network': return <NetworkPage />;
            case 'search': return <SearchPage />;
            case 'tailor': return <TailorPage />;
            case 'interview': return <InterviewInsightsPage />;
            case 'projects': return <ExperiencePage />;
            case 'skills-matrix': return <SkillsPage />;
            case 'analytics': return <AnalyticsPage />;
            case 'settings': return <SettingsPage />;
            default: return <ProfilePage />;
        }
    };

    return (
        <Layout
            activeTab={activeTab}
            setActiveTab={setActiveTab}
            backendStatus={backendStatus}
        >
            {renderContent()}
        </Layout>
    );
}

export default App;