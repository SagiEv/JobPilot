import React, { createContext, useContext, useState, useCallback } from 'react';

const ConfirmContext = createContext();

export const useConfirm = () => useContext(ConfirmContext);

export const ConfirmProvider = ({ children }) => {
    const [confirmState, setConfirmState] = useState({
        isOpen: false,
        message: '',
        resolve: null,
    });

    const confirm = useCallback((message) => {
        return new Promise((resolve) => {
            setConfirmState({
                isOpen: true,
                message,
                resolve,
            });
        });
    }, []);

    const handleConfirm = useCallback(() => {
        if (confirmState.resolve) confirmState.resolve(true);
        setConfirmState({ isOpen: false, message: '', resolve: null });
    }, [confirmState]);

    const handleCancel = useCallback(() => {
        if (confirmState.resolve) confirmState.resolve(false);
        setConfirmState({ isOpen: false, message: '', resolve: null });
    }, [confirmState]);

    return (
        <ConfirmContext.Provider value={confirm}>
            {children}
            {confirmState.isOpen && (
                <div style={{
                    position: 'fixed',
                    top: 0,
                    left: 0,
                    right: 0,
                    bottom: 0,
                    backgroundColor: 'rgba(0, 0, 0, 0.5)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    zIndex: 10000,
                    animation: 'fadeIn 0.2s ease'
                }}>
                    <style>
                        {`
                        @keyframes fadeIn { from { opacity: 0; } to { opacity: 1; } }
                        @keyframes scaleIn { from { transform: scale(0.95); opacity: 0; } to { transform: scale(1); opacity: 1; } }
                        `}
                    </style>
                    <div style={{
                        backgroundColor: 'var(--bg, #fff)',
                        padding: '24px',
                        borderRadius: '12px',
                        boxShadow: '0 20px 25px -5px rgba(0,0,0,0.1), 0 10px 10px -5px rgba(0,0,0,0.04)',
                        maxWidth: '400px',
                        width: '90%',
                        animation: 'scaleIn 0.2s ease',
                        fontFamily: 'sans-serif'
                    }}>
                        <h3 style={{ margin: '0 0 12px 0', fontSize: '18px', color: 'var(--t1, #111318)' }}>Confirm Action</h3>
                        <p style={{ margin: '0 0 24px 0', color: 'var(--t2, #5a6073)', lineHeight: '1.5' }}>
                            {confirmState.message}
                        </p>
                        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '12px' }}>
                            <button 
                                onClick={handleCancel}
                                style={{
                                    padding: '8px 16px',
                                    border: '1px solid var(--border2, #ccc)',
                                    background: 'transparent',
                                    borderRadius: '6px',
                                    cursor: 'pointer',
                                    fontWeight: '500',
                                    color: 'var(--t2, #5a6073)'
                                }}
                            >
                                Cancel
                            </button>
                            <button 
                                onClick={handleConfirm}
                                style={{
                                    padding: '8px 16px',
                                    border: 'none',
                                    background: 'var(--accent, #1a6cf5)',
                                    color: '#fff',
                                    borderRadius: '6px',
                                    cursor: 'pointer',
                                    fontWeight: '500'
                                }}
                            >
                                Confirm
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </ConfirmContext.Provider>
    );
};
