import { useState, useMemo, useRef } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import apiClient, { getAccessToken } from '../services/apiClient';
import { uploadCSV } from '../services/dataService';
import { useToast } from '../components/ToastProvider';
import { isActiveStatus, isArchivedStatus } from '../utils/helpers';
import {
    QUERY_KEYS,
    applicationsQuery,
    fromDbApplication as fromDb,
} from '../queries/queryDefinitions';

export { fromDb };
export const fetchApplications = applicationsQuery.queryFn;

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
    const { addToast } = useToast() || {};
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
        addToast?.('Reminder dismissed for this application', 'info');
    };

    const { data: applications = [], isLoading: loading } = useQuery({
        ...applicationsQuery,
        enabled: !!getAccessToken(),
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
            await queryClient.cancelQueries({ queryKey: QUERY_KEYS.APPLICATIONS });
            await queryClient.cancelQueries({ queryKey: QUERY_KEYS.DAILY_STATS });
            const previousApps = queryClient.getQueryData(QUERY_KEYS.APPLICATIONS);
            queryClient.setQueryData(QUERY_KEYS.APPLICATIONS, (old) => 
                old?.map(app => app.id === newApp.id ? { 
                    ...app, 
                    ...(newApp.newStatus !== undefined && !newApp.eventDate ? { STATUS: newApp.newStatus } : {}),
                    ...(newApp.newStage !== undefined && !newApp.eventDate ? { STAGE: newApp.newStage } : {})
                } : app)
            );
            return { previousApps };
        },
        onSuccess: (updatedApp, variables, context) => {
            const prevApp = context?.previousApps?.find(a => a.id === variables.id);
            const company = updatedApp?.company || prevApp?.COMPANY || 'Application';
            const finalStatus = updatedApp?.status || variables.newStatus;
            const finalStage = updatedApp?.stage ?? variables.newStage;
            const statusLower = (finalStatus || '').toLowerCase();

            queryClient.setQueryData(QUERY_KEYS.APPLICATIONS, (old) => 
                old?.map(app => app.id === variables.id ? { 
                    ...app, 
                    STATUS: updatedApp.status, 
                    STAGE: updatedApp.stage,
                    DATE: updatedApp.date,
                    REJECTION_REASON: updatedApp.rejection_reason
                } : app)
            );

            if (statusLower === 'rejected' || statusLower === 'ignored' || statusLower === 'withdrawn') {
                addToast?.(`Marked ${company} as ${finalStatus}`, 'info');
            } else if (prevApp && prevApp.STATUS === finalStatus && finalStage && prevApp.STAGE !== finalStage) {
                addToast?.(`Updated ${company} stage to ${finalStage}`, 'success');
            } else if (finalStatus && finalStage && statusLower === 'interviewing') {
                addToast?.(`Updated ${company} to ${finalStatus} (${finalStage})`, 'success');
            } else if (finalStatus) {
                addToast?.(`Updated ${company} status to ${finalStatus}`, 'success');
            } else {
                addToast?.(`Updated ${company}`, 'success');
            }
        },
        onError: (err, newApp, context) => {
            if (context?.previousApps) {
                queryClient.setQueryData(QUERY_KEYS.APPLICATIONS, context.previousApps);
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
                addToast?.(`Failed to update application: ${err.response?.data?.error || err.message || 'Unknown error'}`, 'error');
            }
        },
        onSettled: (data, error, variables) => {
            queryClient.invalidateQueries({ queryKey: QUERY_KEYS.APPLICATIONS });
            queryClient.invalidateQueries({ queryKey: QUERY_KEYS.DAILY_STATS });
            queryClient.invalidateQueries({ queryKey: QUERY_KEYS.APPLICATION_HISTORY(variables.id) });
        }
    });

    const addApplicationMutation = useMutation({
        mutationFn: async (newApp) => {
            const dbData = toDb(newApp);
            const { data } = await apiClient.post('/api/applications', dbData);
            return data;
        },
        onSuccess: (createdApp, newApp) => {
            queryClient.invalidateQueries({ queryKey: QUERY_KEYS.APPLICATIONS });
            queryClient.invalidateQueries({ queryKey: QUERY_KEYS.DAILY_STATS });
            const company = createdApp?.company || newApp?.COMPANY || 'Application';
            addToast?.(`Added application for ${company}`, 'success');
        }
    });

    const bulkAddMutation = useMutation({
        mutationFn: async (dbData) => {
            await apiClient.post('/api/applications/bulk', { applications: dbData });
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: QUERY_KEYS.APPLICATIONS });
            queryClient.invalidateQueries({ queryKey: QUERY_KEYS.DAILY_STATS });
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
            addToast?.('Update cancelled', 'info');
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

    const isAddingRef = useRef(false);

    const addApplication = async (newApp) => {
        if (isAddingRef.current || addApplicationMutation.isPending) return;
        isAddingRef.current = true;
        try {
            return await addApplicationMutation.mutateAsync(newApp);
        } finally {
            isAddingRef.current = false;
        }
    };

    const stats = useMemo(() => ({
        total: applications.length,
        active: applications.filter(a => isActiveStatus(a.STATUS)).length,
        archived: applications.filter(a => isArchivedStatus(a.STATUS)).length,
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
            addToast?.(`Imported ${normalized.length} application${normalized.length === 1 ? '' : 's'} from CSV`, 'success');
        } catch (err) {
            const msg = err.response?.data?.error || err.response?.data?.message || err.message;
            setStatus(`✗ Error: ${msg}`);
            addToast?.(`CSV import failed: ${msg}`, 'error');
        } finally {
            e.target.value = null;
        }
    };

    const updateAppStatus = async (id, newStatus) => {
        updateApplicationMutation.mutate({ id, newStatus });
    };

    return { applications, stats, status, loading, isAdding: addApplicationMutation.isPending, handleUpload, updateAppStatus, updateApplication, addApplication, conflict, handleConflictResolution, dismissedGhostings, dismissGhosting };
}
