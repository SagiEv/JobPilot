import { useState, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import apiClient, { getAccessToken } from '../services/apiClient';
import { uploadCSV } from '../services/dataService';
import { useToast } from '../components/ToastProvider';

// Map between DB schema and frontend state
const fromDb = (row) => ({
    id: row.id,
    COMPANY: row.company || '',
    ROLE_ID: row.role_id || '',
    DATE: row.date || '',
    STATUS: row.status || '',
    STAGE: row.stage || '',
    LOCATION: row.location || '',
    INFO: row.info || '',
    REFERAL: row.referal || '',
    LINK: row.link || '',
    CV_FILE: row.cv_file || '',
    LAST_ACTIVITY_DATE: row.last_activity_date || row.date || '',
    REJECTION_REASON: row.rejection_reason || '',
    AUTOMATIC_REJECTION: row.automatic_rejection || false
});

const toDb = (app) => {
    const data = {
        company: app.COMPANY || '',
        role_id: app.ROLE_ID || '',
        date: app.DATE || null,
        status: app.STATUS || '',
        stage: app.STAGE || '',
        location: app.LOCATION || '',
        info: app.INFO || '',
        referal: app.REFERAL || '',
        link: app.LINK || '',
        cv_file: app.CV_FILE || '',
        rejection_reason: app.REJECTION_REASON || '',
        automatic_rejection: app.AUTOMATIC_REJECTION || false
    };
    if (typeof app.id === 'number') data.id = app.id;
    return data;
};

export function useApplications() {
    const queryClient = useQueryClient();
    const { addToast } = useToast();
    const [status, setStatus] = useState('');
    const [conflict, setConflict] = useState(null);
    const [dismissedGhostings, setDismissedGhostings] = useState(() => {
        try {
            return JSON.parse(localStorage.getItem('dismissedGhostings') || '{}');
        } catch {
            return {};
        }
    });

    const dismissGhosting = (appId) => {
        setDismissedGhostings(prev => {
            const next = { ...prev, [appId]: true };
            localStorage.setItem('dismissedGhostings', JSON.stringify(next));
            return next;
        });
    };

    const { data: applications = [], isLoading: loading } = useQuery({
        enabled: !!getAccessToken(),
        queryKey: ['applications'],
        queryFn: async () => {
            const { data } = await apiClient.get('/api/applications');
            return (data || []).map(fromDb);
        }
    });

    const updateApplicationMutation = useMutation({
        mutationFn: async ({ id, newStatus, newStage, date, eventDate, rejectionReason, automaticRejection, conflictResolution, notes, withWho }) => {
            const payload = {};
            if (newStatus !== undefined) payload.status = newStatus;
            if (newStage !== undefined) payload.stage = newStage;
            if (date) payload.date = date;
            if (eventDate) payload.event_date = eventDate;
            if (rejectionReason !== undefined) payload.rejection_reason = rejectionReason;
            if (automaticRejection !== undefined) payload.automatic_rejection = automaticRejection;
            if (conflictResolution !== undefined) payload.conflict_resolution = conflictResolution;
            if (notes !== undefined) payload.notes = notes;
            if (withWho !== undefined) payload.with_who = withWho;
            const { data } = await apiClient.put(`/api/applications/${id}`, payload);
            return data;
        },
        onMutate: async (newApp) => {
            await queryClient.cancelQueries({ queryKey: ['applications'] });
            await queryClient.cancelQueries({ queryKey: ['dailyStats'] });
            const previousApps = queryClient.getQueryData(['applications']);
            queryClient.setQueryData(['applications'], (old) => 
                old?.map(app => app.id === newApp.id ? { 
                    ...app, 
                    ...(newApp.newStatus !== undefined && !newApp.eventDate ? { STATUS: newApp.newStatus } : {}),
                    ...(newApp.newStage !== undefined && !newApp.eventDate ? { STAGE: newApp.newStage } : {})
                } : app)
            );
            return { previousApps };
        },
        onSuccess: (updatedApp, variables) => {
            queryClient.setQueryData(['applications'], (old) => 
                old?.map(app => app.id === variables.id ? { 
                    ...app, 
                    STATUS: updatedApp.status, 
                    STAGE: updatedApp.stage,
                    DATE: updatedApp.date,
                    REJECTION_REASON: updatedApp.rejection_reason
                } : app)
            );
        },
        onError: (err, newApp, context) => {
            if (context?.previousApps) {
                queryClient.setQueryData(['applications'], context.previousApps);
            }
            if (err.response?.data?.code === 'CONFLICTING_EVENT') {
                setConflict({
                    appId: newApp.id,
                    newStatus: newApp.newStatus,
                    newStage: newApp.newStage,
                    eventDate: newApp.eventDate,
                    rejectionReason: newApp.rejectionReason,
                    automaticRejection: newApp.automaticRejection,
                    notes: newApp.notes,
                    withWho: newApp.withWho,
                    conflictData: err.response.data.conflictData
                });
            } else {
                addToast(`Failed to update application: ${err.response?.data?.error || err.message || 'Unknown error'}`, 'error');
            }
        },
        onSettled: (data, error, variables) => {
            queryClient.invalidateQueries({ queryKey: ['applications'] });
            queryClient.invalidateQueries({ queryKey: ['applicationHistory', variables.id] });
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
            queryClient.invalidateQueries({ queryKey: ['dailyStats'] });
        }
    });

    const bulkAddMutation = useMutation({
        mutationFn: async (dbData) => {
            await apiClient.post('/api/applications/bulk', { applications: dbData });
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['applications'] });
            queryClient.invalidateQueries({ queryKey: ['dailyStats'] });
        }
    });

    const updateApplication = async (id, newStatus, newStage, customDate = null, rejectionReason = undefined, automaticRejection = undefined, notes = undefined, withWho = undefined) => {
        const today = new Date().toISOString().split('T')[0];
        const eventDateToUse = customDate || today;
        updateApplicationMutation.mutate({ 
            id, 
            newStatus, 
            newStage, 
            eventDate: eventDateToUse,
            rejectionReason,
            automaticRejection,
            notes,
            withWho
        });
    };

    const handleConflictResolution = (resolution) => {
        if (!conflict) return;
        if (resolution === 'abort') {
            setConflict(null);
            return;
        }
        updateApplicationMutation.mutate({
            id: conflict.appId,
            newStatus: conflict.newStatus,
            newStage: conflict.newStage,
            eventDate: conflict.eventDate,
            rejectionReason: conflict.rejectionReason,
            automaticRejection: conflict.automaticRejection,
            notes: conflict.notes,
            withWho: conflict.withWho,
            conflictResolution: resolution
        });
        setConflict(null);
    };

    const addApplication = async (newApp) => {
        return addApplicationMutation.mutateAsync(newApp);
    };

    const stats = useMemo(() => ({
        total: applications.length,
        active: applications.filter(a => !a.STATUS?.toLowerCase().includes('reject') && !a.STATUS?.toLowerCase().includes('offer') && !a.STATUS?.toLowerCase().includes('ignored')).length,
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
        } finally {
            e.target.value = null;
        }
    };

    const updateAppStatus = async (id, newStatus) => {
        updateApplicationMutation.mutate({ id, newStatus });
    };

    return { applications, stats, status, loading, handleUpload, updateAppStatus, updateApplication, addApplication, conflict, handleConflictResolution, dismissedGhostings, dismissGhosting };
}
