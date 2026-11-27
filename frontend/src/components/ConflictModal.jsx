import React from 'react';

const ConflictModal = ({ conflict, onResolve }) => (
    <div className="modal-overlay" onClick={() => onResolve('abort')}>
        <div className="modal" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
                <h2>Event Conflict Detected</h2>
                <button className="modal-close" onClick={() => onResolve('abort')}>✕</button>
            </div>
            <div className="modal-body">
                <p>An event already exists on <strong>{conflict.conflictData.targetDate}</strong>:</p>
                <div style={{ padding: '10px', background: 'var(--bg-card-alt)', borderRadius: '6px', margin: '10px 0' }}>
                    <strong>Existing Event:</strong> {conflict.conflictData.existingEvent.event_type}
                    <br />
                    Status: {conflict.conflictData.existingEvent.new_status}
                    {conflict.conflictData.existingEvent.new_stage && ` (${conflict.conflictData.existingEvent.new_stage})`}
                </div>
                <p>You are trying to set:</p>
                <div style={{ padding: '10px', background: 'var(--bg-card-alt)', borderRadius: '6px', margin: '10px 0' }}>
                    Status: {conflict.newStatus}
                    {conflict.newStage && ` (${conflict.newStage})`}
                </div>
                <p>How would you like to handle this conflict?</p>
            </div>
            <div className="modal-footer" style={{ justifyContent: 'flex-end', gap: '10px' }}>
                <button className="btn btn-primary" onClick={() => onResolve('overwrite')}>Overwrite</button>
                <button className="btn" style={{ background: 'var(--bg-card-alt)', border: '1px solid var(--border-color)', color: 'var(--text-main)' }} onClick={() => onResolve('keep_both')}>Keep Both</button>
                <button className="btn" onClick={() => onResolve('abort')}>Abort</button>
            </div>
        </div>
    </div>
);

export default ConflictModal;
