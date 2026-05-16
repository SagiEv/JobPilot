import { useState, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
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
    LINK: row.link || '',
    CV_FILE: row.cv_file || ''
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
        link: app.LINK || '',
        cv_file: app.CV_FILE || ''
    };
    if (typeof app.id === 'number') data.id = app.id;
    return data;
};

export function useApplications() {
    const queryClient = useQueryClient();
    const [status, setStatus] = useState('');

    const { data: applications = [], isLoading: loading } = useQuery({
        queryKey: ['applications'],
        queryFn: async () => {
            const { data } = await apiClient.get('/api/applications');
            return (data || []).map(fromDb);
        }
    });

    const updateApplicationMutation = useMutation({
        mutationFn: async ({ id, newStatus, date }) => {
            const payload = { status: newStatus };
            if (date) payload.date = date;
            await apiClient.put(`/api/applications/${id}`, payload);
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['applications'] });
        }
    });

    const addApplicationMutation = useMutation({
        mutationFn: async (newApp) => {
            const dbData = toDb(newApp);
            const { data } = await apiClient.post('/api/applications', dbData);
            return data;
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['applications'] });
        }
    });

    const bulkAddMutation = useMutation({
        mutationFn: async (dbData) => {
            await apiClient.post('/api/applications/bulk', { applications: dbData });
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['applications'] });
        }
    });

    const updateApplication = async (id, newStatus) => {
        const today = new Date().toISOString().split('T')[0];
        // Optimistic update
        queryClient.setQueryData(['applications'], (old) => 
            old.map(app => app.id === id ? { ...app, STATUS: newStatus, DATE: today } : app)
        );
        updateApplicationMutation.mutate({ id, newStatus, date: today });
    };

    const addApplication = async (newApp) => {
        return addApplicationMutation.mutateAsync(newApp);
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
                LINK: row.LINK || row.link || row['Link'] || '',
                CV_FILE: row.CV_FILE || row.cv_file || row['CV File'] || row['CV_FILE'] || row['cv_file'] || row['cv file'] || ''
            }));

            // Bulk insert to DB
            setStatus('Saving to database...');
            const dbData = normalized.map(toDb);
            await bulkAddMutation.mutateAsync(dbData);

            setStatus(`✓ Loaded successfully`);
        } catch (err) {
            const msg = err.response?.data?.error || err.response?.data?.message || err.message;
            setStatus(`✗ Error: ${msg}`);
        }
    };

    const updateAppStatus = async (id, newStatus) => {
        queryClient.setQueryData(['applications'], (old) => 
            old.map(app => app.id === id ? { ...app, STATUS: newStatus } : app)
        );
        updateApplicationMutation.mutate({ id, newStatus });
    };

    return { applications, stats, status, loading, handleUpload, updateAppStatus, updateApplication, addApplication };
}
