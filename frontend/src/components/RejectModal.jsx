import React, { useState } from 'react';

const RejectModal = ({ isOpen, companyName, onClose, onConfirm }) => {
    const [rejectReason, setRejectReason] = useState('');
    const [autoReject, setAutoReject] = useState(false);

    if (!isOpen) return null;

    const handleClose = () => {
        setRejectReason('');
        setAutoReject(false);
        onClose();
    };

    const handleSubmit = (e) => {
        e.preventDefault();
        onConfirm({ reason: rejectReason, autoReject });
        setRejectReason('');
        setAutoReject(false);
    };

    return (
        <div className="modal-overlay" onClick={handleClose}>
            <div className="modal" onClick={(e) => e.stopPropagation()}>
                <div className="modal-header">
                    <h2>Reject Application: {companyName}</h2>
                    <button className="modal-close" onClick={handleClose}>✕</button>
                </div>
                <form onSubmit={handleSubmit}>
                    <div className="modal-body">
                        <div className="modal-section">
                            <label>Rejection Reason / Comments <span style={{ opacity: 0.5, fontWeight: 400 }}>(optional)</span></label>
                            <textarea
                                className="textarea"
                                style={{ minHeight: '80px' }}
                                value={rejectReason}
                                onChange={e => setRejectReason(e.target.value)}
                                placeholder="e.g. They went with an internal candidate"
                                dir="auto"
                            />
                        </div>
                        <div className="modal-section" style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer' }}>
                            <input 
                                type="checkbox" 
                                id="autoRejectCheck"
                                checked={autoReject} 
                                onChange={e => setAutoReject(e.target.checked)} 
                                style={{ width: '16px', height: '16px', cursor: 'pointer' }}
                            />
                            <label htmlFor="autoRejectCheck" style={{ margin: 0, cursor: 'pointer' }}>Automatically rejected (e.g. CV screening failed without call)</label>
                        </div>
                    </div>
                    <div className="modal-footer">
                        <button type="button" className="btn" onClick={handleClose}>Cancel</button>
                        <button type="submit" className="btn" style={{ background: 'var(--danger-c)', color: 'white', border: 'none' }}>
                            Confirm Rejection
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
};

export default RejectModal;
