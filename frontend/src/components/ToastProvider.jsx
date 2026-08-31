import React, { createContext, useContext, useState, useCallback } from 'react';

const ToastContext = createContext();

export const useToast = () => useContext(ToastContext);

export const ToastProvider = ({ children }) => {
    const [toasts, setToasts] = useState([]);

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

    const getToastBackground = (type) => {
        switch(type) {
            case 'error': return '#ef4444'; // danger red
            case 'success': return '#10b981'; // success green
            case 'warn': return '#f59e0b'; // warn amber
            case 'processing': return '#6366f1'; // processing indigo
            case 'info':
            default: return '#3b82f6'; // info blue
        }
    };

    return (
        <ToastContext.Provider value={{ addToast, removeToast }}>
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
                            background: getToastBackground(toast.type),
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
                        {toast.type === 'warn' && (
                            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"></path><line x1="12" y1="9" x2="12" y2="13"></line><line x1="12" y1="17" x2="12.01" y2="17"></line></svg>
                        )}
                        {(toast.type === 'error' || toast.type === 'info' || !['processing', 'success', 'warn'].includes(toast.type)) && (
                            toast.type === 'error' ? 
                            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"></circle><line x1="12" y1="8" x2="12" y2="12"></line><line x1="12" y1="16" x2="12.01" y2="16"></line></svg>
                            :
                            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"></circle><line x1="12" y1="16" x2="12" y2="12"></line><line x1="12" y1="8" x2="12.01" y2="8"></line></svg>
                        )}
                        <span style={toast.type === 'processing' ? { animation: 'pulseText 1.5s cubic-bezier(0.4, 0, 0.6, 1) infinite' } : { fontWeight: 500 }}>
                            {toast.message}
                        </span>
                    </div>
                ))}
            </div>
        </ToastContext.Provider>
    );
};
