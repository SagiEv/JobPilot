import { useState, useEffect } from 'react';
import Layout from './components/layout/Layout';
import ProfilePage from './pages/ProfilePage';
import ApplicationsPage from './pages/ApplicationsPage';
import NetworkPage from './pages/NetworkPage';
import SearchPage from './pages/SearchPage';
import TailorPage from './pages/TailorPage';
import InterviewInsightsPage from './pages/InterviewInsightsPage';
import ExperiencePage from './pages/ExperiencePage';
import SkillsPage from './pages/SkillsPage';
import AnalyticsPage from './pages/AnalyticsPage';
import { checkBackendHealth } from './services/apiService';

function App() {
    const [activeTab, setActiveTab] = useState('profile');
    const [backendStatus, setBackendStatus] = useState('checking');

    useEffect(() => {
        checkBackendHealth()
            .then(() => setBackendStatus('connected'))
            .catch(() => setBackendStatus('disconnected'));
    }, []);

    const renderContent = () => {
        switch (activeTab) {
            case 'profile': return <ProfilePage />;
            case 'applications': return <ApplicationsPage />;
            case 'network': return <NetworkPage />;
            case 'search': return <SearchPage />;
            case 'tailor': return <TailorPage />;
            case 'interview': return <InterviewInsightsPage />;
            case 'projects': return <ExperiencePage />;
            case 'skills-matrix': return <SkillsPage />;
            case 'analytics': return <AnalyticsPage />;
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