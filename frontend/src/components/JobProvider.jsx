import React, { createContext, useContext, useState, useEffect, useCallback, useRef } from 'react';
import api from '../api';
import { supabase } from '../supabaseClient';
import { useToast } from './ToastProvider';

const JobContext = createContext();

export const useJobs = () => useContext(JobContext);

export const JobProvider = ({ children }) => {
    const [jobs, setJobs] = useState({});
    const [lastTailorResult, setLastTailorResult] = useState(null);
    const pollingIntervals = useRef({});
    const { addToast, removeToast } = useToast();

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
        <JobContext.Provider value={{ jobs, startJob, lastTailorResult, setLastTailorResult }}>
            {children}
        </JobContext.Provider>
    );
};
