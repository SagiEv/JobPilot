import React, { createContext, useContext, useState, useEffect, useCallback, useRef } from 'react';
import api from '../api';
import { supabase } from '../supabaseClient';

const JobContext = createContext();

export const useJobs = () => useContext(JobContext);

export const JobProvider = ({ children }) => {
    const [jobs, setJobs] = useState({});
    const [toasts, setToasts] = useState([]);
    const [lastTailorResult, setLastTailorResult] = useState(null);
    const pollingIntervals = useRef({});

    const removeToast = useCallback((id) => {
        setToasts(prev => prev.filter(t => t.id !== id));
    }, []);

    const addToast = useCallback((message, type = 'info', onClick = null, idOverride = null) => {
        const id = idOverride || Date.now();
        setToasts(prev => {
            const exists = prev.find(t => t.id === id);
            if (exists) {
                return prev.map(t => t.id === id ? { ...t, message, type, onClick } : t);
            }
            return [...prev, { id, message, type, onClick }];
        });
        
        if (type !== 'processing') {
            setTimeout(() => {
                setToasts(prev => prev.filter(t => t.id !== id));
            }, 5000);
        }
        return id;
    }, []);

    const startJob = useCallback((jobId, onComplete = null, jobName = null) => {
        setJobs(prev => ({ ...prev, [jobId]: { status: 'pending' } }));
        
        let toastId = null;
        if (jobName) {
            toastId = addToast(`Processing: ${jobName}...`, 'processing');
        }

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
                    if (toastId) removeToast(toastId);
                    
                    if (onComplete) {
                        try {
                            onComplete(jobData);
                        } catch (e) {
                            console.error("onComplete callback failed", e);
                        }
                    }
                    
                    if (jobData.status === 'completed') {
                        setLastTailorResult(jobData.result_data);
                        addToast('Your AI task is ready! Click to view.', 'success', () => {
                            window.dispatchEvent(new CustomEvent('jobpilot:navigate', { detail: 'tailor' }));
                        });
                    } else {
                        let humanMsg = "The AI service encountered an error.";
                        const rawError = jobData.error_message || '';
                        
                        if (rawError.includes('Service busy')) {
                            humanMsg = "The selected AI model is currently busy.";
                        } else if (rawError.includes('413') || rawError.includes('Payload Too Large')) {
                            humanMsg = "The text is too large for this model.";
                        } else if (rawError) {
                            humanMsg = rawError;
                        }

                        const suggested = jobData.result_data?.suggested_model;
                        if (suggested) {
                            const capitalize = (s) => s.charAt(0).toUpperCase() + s.slice(1);
                            humanMsg += ` Click here to switch to ${capitalize(suggested)} in Settings.`;
                            addToast(humanMsg, 'error', () => {
                                window.dispatchEvent(new CustomEvent('jobpilot:navigate', { detail: 'settings' }));
                            });
                        } else {
                            addToast(`Error: ${humanMsg}`, 'error');
                        }
                    }
                }
            } catch (err) {
                console.error("Polling error:", err);
            }
        };

        pollingIntervals.current[jobId] = setInterval(poll, 3000);
        poll(); 

    }, [addToast, removeToast]);

    useEffect(() => {
        return () => {
            Object.values(pollingIntervals.current).forEach(clearInterval);
        };
    }, []);

    return (
        <JobContext.Provider value={{ jobs, startJob, addToast, removeToast, lastTailorResult, setLastTailorResult }}>
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
                <style>
                    {`
                    @keyframes pulseText {
                        0% { opacity: 0.5; }
                        50% { opacity: 1; }
                        100% { opacity: 0.5; }
                    }
                    `}
                </style>
                {toasts.map(toast => (
                    <div 
                        key={toast.id} 
                        onClick={toast.onClick ? () => {
                            toast.onClick();
                            setToasts(prev => prev.filter(t => t.id !== toast.id));
                        } : undefined}
                        style={{
                            padding: '12px 20px',
                            background: toast.type === 'error' ? '#ef4444' : toast.type === 'success' ? '#10b981' : toast.type === 'processing' ? '#6366f1' : '#3b82f6',
                            color: 'white',
                            borderRadius: '8px',
                            boxShadow: '0 10px 15px -3px rgba(0,0,0,0.1), 0 4px 6px -2px rgba(0,0,0,0.05)',
                            fontFamily: 'sans-serif',
                            transition: 'opacity 0.3s',
                            cursor: toast.onClick ? 'pointer' : 'default',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '12px',
                            opacity: 0.95
                        }}
                    >
                        {toast.type === 'processing' && (
                            <svg className="animate-spin" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ animation: 'spin 2s linear infinite' }}>
                                <line x1="12" y1="2" x2="12" y2="6"></line><line x1="12" y1="18" x2="12" y2="22"></line><line x1="4.93" y1="4.93" x2="7.76" y2="7.76"></line><line x1="16.24" y1="16.24" x2="19.07" y2="19.07"></line><line x1="2" y1="12" x2="6" y2="12"></line><line x1="18" y1="12" x2="22" y2="12"></line><line x1="4.93" y1="19.07" x2="7.76" y2="16.24"></line><line x1="16.24" y1="4.93" x2="19.07" y2="7.76"></line>
                            </svg>
                        )}
                        {toast.type === 'success' && (
                            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"></polyline></svg>
                        )}
                        {toast.type === 'error' && (
                            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"></circle><line x1="12" y1="8" x2="12" y2="12"></line><line x1="12" y1="16" x2="12.01" y2="16"></line></svg>
                        )}
                        <span style={toast.type === 'processing' ? { animation: 'pulseText 1.5s cubic-bezier(0.4, 0, 0.6, 1) infinite' } : { fontWeight: 500 }}>
                            {toast.message}
                        </span>
                    </div>
                ))}
            </div>
        </JobContext.Provider>
    );
};
