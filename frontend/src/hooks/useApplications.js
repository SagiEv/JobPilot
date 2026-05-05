import { useState, useEffect, useMemo } from 'react';
// import api from '../api';
// import { uploadData } from '../services/apiService';
import apiClient from '../services/apiClient';
import { uploadCSV } from '../services/dataService';

// Map between DB schema and frontend state
const fromDb = (row) => ({
    id: row.id,
    COMPANY: row.company || '',
    ROLE_ID: row.role_id || '',
    DATE: row.date || '',
    STATUS: row.status || '',
    LOCATION: row.location || '',
    INFO: row.info || '',
    REFERAL: row.referal || '',
    LINK: row.link || ''
});

const toDb = (app) => {
    const data = {
        company: app.COMPANY || '',
        role_id: app.ROLE_ID || '',
        date: app.DATE || null,
        status: app.STATUS || '',
        location: app.LOCATION || '',
        info: app.INFO || '',
        referal: app.REFERAL || '',
        link: app.LINK || ''
    };
    if (typeof app.id === 'number') data.id = app.id;
    return data;
};

export function useApplications() {
    const [applications, setApplications] = useState([]);
    const [status, setStatus] = useState('');
    const [loading, setLoading] = useState(true);

    const fetchApplications = async () => {
        try {
            // Use apiClient directly
            console.log("Fetching applications...");
            const { data } = await apiClient.get('/api/applications');
            console.log("Applications fetched:", data);
            setApplications((data || []).map(fromDb));
        } catch (error) {
            console.error("Fetch failed:", error);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchApplications();
    }, []);

    const updateApplication = async (id, newStatus) => {
        const today = new Date().toISOString().split('T')[0];
        setApplications(prev => prev.map(app =>
            app.id === id ? { ...app, STATUS: newStatus, DATE: today } : app
        ));

        try {
            await apiClient.put(`/api/applications/${id}`, { status: newStatus, date: today });
        } catch (error) {
            console.error("Failed to update application:", error);
        }
    };

    const stats = useMemo(() => ({
        total: applications.length,
        active: applications.filter(a => !a.STATUS?.toLowerCase().includes('reject') && !a.STATUS?.toLowerCase().includes('offer')).length,
        interview: applications.filter(a => a.STATUS?.toLowerCase().includes('interview') || a.STATUS?.toLowerCase().includes('phone')).length,
        offer: applications.filter(a => a.STATUS?.toLowerCase().includes('offer')).length
    }), [applications]);

    const handleUpload = async (e) => {
        const file = e.target.files?.[0];
        if (!file) return;

        try {
            setStatus('Uploading and processing...');
            const result = await uploadCSV(file, 'applications');

            const normalized = result.data.map(row => ({
                COMPANY: row.COMPANY || row.company || row['Company'] || '',
                ROLE_ID: row.ROLE_ID || row.role_id || row['Role ID'] || '',
                DATE: row.DATE || row.date || row['Date'] || '',
                STATUS: row.STATUS || row.status || row['Status'] || '',
                LOCATION: row.LOCATION || row.location || row['Location'] || '',
                INFO: row.INFO || row.info || row['Info'] || '',
                REFERAL: row.REFERAL || row.referal || row['Referral'] || '',
                LINK: row.LINK || row.link || row['Link'] || ''
            }));

            // Bulk insert to DB
            setStatus('Saving to database...');
            const dbData = normalized.map(toDb);
            await apiClient.post('/api/applications/bulk', { applications: dbData });

            // Refetch to get real IDs
            await fetchApplications();
            setStatus(`✓ Loaded successfully`);
        } catch (err) {
            const msg = err.response?.data?.error || err.response?.data?.message || err.message;
            setStatus(`✗ Error: ${msg}`);
        }
    };

    const updateAppStatus = async (id, newStatus) => {
        setApplications(prev => prev.map(app =>
            app.id === id ? { ...app, STATUS: newStatus } : app
        ));
        try {
            await apiClient.put(`/api/applications/${id}`, { status: newStatus });
        } catch (error) {
            console.error("Failed to update application status:", error);
        }
    };

    return { applications, stats, status, loading, handleUpload, updateAppStatus, updateApplication };
}
