import React, { createContext, useContext, useState, useEffect, useCallback, useRef } from 'react';
import api from '../api';
import { supabase } from '../supabaseClient';

const JobContext = createContext();

export const useJobs = () => useContext(JobContext);

export const JobProvider = ({ children }) => {
    const [jobs, setJobs] = useState({});
    const [toasts, setToasts] = useState([]);
    const pollingIntervals = useRef({});

    const addToast = useCallback((message, type = 'info') => {
        const id = Date.now();
        setToasts(prev => [...prev, { id, message, type }]);
        setTimeout(() => {
            setToasts(prev => prev.filter(t => t.id !== id));
        }, 5000);
    }, []);

    const startJob = useCallback((jobId, onComplete = null) => {
        setJobs(prev => ({ ...prev, [jobId]: { status: 'pending' } }));
        
        if (pollingIntervals.current[jobId]) return;

        const poll = async () => {
            try {
                const { data: { session } } = await supabase.auth.getSession();
                const token = session?.access_token;
                
                const response = await api.get(`/api/tailor/jobs/${jobId}`, {
                    headers: token ? { Authorization: `Bearer ${token}` } : {}
                });
                const jobData = response.data;

                setJobs(prev => ({ ...prev, [jobId]: jobData }));

                if (jobData.status === 'completed' || jobData.status === 'failed') {
                    clearInterval(pollingIntervals.current[jobId]);
                    delete pollingIntervals.current[jobId];
                    
                    if (onComplete) {
                        onComplete(jobData);
                    }
                    
                    // If the user navigates away, onComplete might still fire if it's a closure, 
                    // but we can also just show a global toast unconditionally if we want.
                    // Let's assume onComplete handles local UI, and if it's not provided we use a global toast.
                    if (!onComplete) {
                        if (jobData.status === 'completed') {
                            addToast('Your AI task is ready!', 'success');
                        } else {
                            const errorMsg = jobData.error_message || 'Task failed';
                            const suggestion = jobData.result_data?.suggested_model ? ` Try switching to ${jobData.result_data.suggested_model}.` : '';
                            addToast(`Error: ${errorMsg}.${suggestion}`, 'error');
                        }
                    }
                }
            } catch (err) {
                console.error("Polling error:", err);
            }
        };

        pollingIntervals.current[jobId] = setInterval(poll, 3000);
        poll(); 

    }, [addToast]);

    useEffect(() => {
        return () => {
            Object.values(pollingIntervals.current).forEach(clearInterval);
        };
    }, []);

    return (
        <JobContext.Provider value={{ jobs, startJob, addToast }}>
            {children}
            <div style={{
                position: 'fixed',
                bottom: '20px',
                right: '20px',
                zIndex: 9999,
                display: 'flex',
                flexDirection: 'column',
                gap: '10px'
            }}>
                {toasts.map(toast => (
                    <div key={toast.id} style={{
                        padding: '12px 20px',
                        background: toast.type === 'error' ? '#ef4444' : toast.type === 'success' ? '#10b981' : '#3b82f6',
                        color: 'white',
                        borderRadius: '8px',
                        boxShadow: '0 4px 6px rgba(0,0,0,0.1)',
                        fontFamily: 'sans-serif',
                        transition: 'opacity 0.3s'
                    }}>
                        {toast.message}
                    </div>
                ))}
            </div>
        </JobContext.Provider>
    );
};
