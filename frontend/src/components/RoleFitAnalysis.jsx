import React from 'react';

const RoleFitAnalysis = ({ app }) => {
    if (app.fit_score_deterministic == null) {
        return null;
    }

    const aiData = app.fit_analysis_ai;
    const score = aiData?.overall_score || app.fit_score_deterministic;
    const isGoodFit = score >= 80;
    const isPartialFit = score >= 50 && score < 80;

    let badgeClass = 'badge-danger';
    let label = 'Poor Fit';
    if (isGoodFit) {
        badgeClass = 'badge-success';
        label = 'Good Fit';
    } else if (isPartialFit) {
        badgeClass = 'badge-warning';
        label = 'Partial Fit';
    }

    return (
        <div className="adp-notes-card" style={{ margin: 0 }}>
            <div className="adp-notes-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <span className="adp-notes-icon">🎯</span>
                    <h2 className="adp-notes-title">Role Fit Analysis</h2>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                    <div style={{ fontSize: '1.2rem', fontWeight: 'bold' }}>{score}%</div>
                    <span className={`badge ${badgeClass}`}>{label}</span>
                </div>
            </div>
            <div className="adp-notes-body">
                {aiData?.analysis ? (
                    <div style={{ fontSize: '13px', color: 'var(--text-main)', lineHeight: '1.5' }}>
                        {aiData.analysis.split('\n').map((paragraph, index) => (
                            <p key={index} style={{ marginBottom: '8px' }}>{paragraph}</p>
                        ))}
                    </div>
                ) : (
                    <div style={{ fontSize: '13px', color: 'var(--text-muted)' }}>
                        <p>This is a deterministically calculated baseline score based on keyword matching.</p>
                        <p>No AI analysis is available for this application yet. Ensure AI Role Fit Analysis is enabled in settings.</p>
                    </div>
                )}
            </div>
        </div>
    );
};

export default RoleFitAnalysis;
