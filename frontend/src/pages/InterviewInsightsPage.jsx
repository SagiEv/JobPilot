import React, { useState } from 'react';
import { useInterviews } from '../hooks/useInterviews';
import PageLoader from '../components/PageLoader';

const InterviewInsightsPage = () => {
    const { interviews, loading, addInterview } = useInterviews();
    const [viewMode, setViewMode] = useState('all');
    const [showModal, setShowModal] = useState(false);
    const [formData, setFormData] = useState({ company: '', date: '', keep: '', improve: '' });

    const handleSubmit = (e) => {
        e.preventDefault();
        addInterview(formData);
        setFormData({ company: '', date: '', keep: '', improve: '' });
        setShowModal(false);
    };

    if (loading) return <PageLoader label="Loading interview insights…" />;

    return (
        <div className="section">
            <div className="toolbar">
                <div className="btn-group">
                    <button className={`btn ${viewMode === 'all' ? 'active-filter' : ''}`} onClick={() => setViewMode('all')}>All Details</button>
                    <button className={`btn ${viewMode === 'keep' ? 'active-filter' : ''}`} onClick={() => setViewMode('keep')}>Keep Only</button>
                    <button className={`btn ${viewMode === 'improve' ? 'active-filter' : ''}`} onClick={() => setViewMode('improve')}>Improve Only</button>
                </div>
                <button className="btn btn-primary" style={{ marginLeft: 'auto' }} onClick={() => setShowModal(true)}>
                    + Add Insights
                </button>
            </div>

            {/* Insight Entries List */}
            <div className="insights-list">
                {interviews.map((int) => (
                    <div key={int.id} className="card insight-card">
                        {viewMode === 'all' && (
                            <div className="insight-header">
                                <h3 dir="auto">{int.company}</h3>
                                <span className="insight-date">{int.date}</span>
                            </div>
                        )}
                        <div className="insight-body">
                            {(viewMode === 'all' || viewMode === 'keep') && (
                                <div className="insight-section keep">
                                    {viewMode === 'all' && <h4>Good Points</h4>}
                                    <ul>{(Array.isArray(int.keep) ? int.keep : []).map((pt, i) => <li key={i} dir="auto">{pt}</li>)}</ul>
                                </div>
                            )}
                            {(viewMode === 'all' || viewMode === 'improve') && (
                                <div className="insight-section improve">
                                    {viewMode === 'all' && <h4>To Improve</h4>}
                                    <ul>{(Array.isArray(int.improve) ? int.improve : []).map((pt, i) => <li key={i} dir="auto">{pt}</li>)}</ul>
                                </div>
                            )}
                        </div>
                    </div>
                ))}
            </div>

            {/* Modal for Creating New Insight */}
            {showModal && (
                <div className="modal-overlay" onClick={() => setShowModal(false)}>
                    <div className="modal" onClick={(e) => e.stopPropagation()}>
                        <div className="modal-header">
                            <h2>New Interview Insight</h2>
                            <button className="modal-close" onClick={() => setShowModal(false)}>✕</button>
                        </div>
                        <form onSubmit={handleSubmit}>
                            <div className="modal-body">
                                <div className="modal-section">
                                    <label>Company Name</label>
                                    <input
                                        className="field-input"
                                        value={formData.company}
                                        onChange={e => setFormData({ ...formData, company: e.target.value })}
                                        placeholder="e.g. Google"
                                        dir="auto"
                                        required
                                    />
                                </div>
                                <div className="modal-section">
                                    <label>Date</label>
                                    <input
                                        className="field-input"
                                        type="date"
                                        value={formData.date}
                                        onChange={e => setFormData({ ...formData, date: e.target.value })}
                                        required
                                    />
                                </div>
                                <div className="modal-section">
                                    <label>Keep (What went well?)</label>
                                    <textarea
                                        className="textarea"
                                        style={{ minHeight: '80px' }}
                                        value={formData.keep}
                                        onChange={e => setFormData({ ...formData, keep: e.target.value })}
                                        placeholder="Handled the technical questions well..."
                                        dir="auto"
                                    />
                                </div>
                                <div className="modal-section">
                                    <label>Improve (Future focus)</label>
                                    <textarea
                                        className="textarea"
                                        style={{ minHeight: '80px' }}
                                        value={formData.improve}
                                        onChange={e => setFormData({ ...formData, improve: e.target.value })}
                                        placeholder="Need to be more concise in behavioral answers..."
                                        dir="auto"
                                    />
                                </div>
                            </div>
                            <div className="modal-footer">
                                <button type="button" className="btn" onClick={() => setShowModal(false)}>Cancel</button>
                                <button type="submit" className="btn btn-primary">Save Insights</button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
};

export default InterviewInsightsPage;