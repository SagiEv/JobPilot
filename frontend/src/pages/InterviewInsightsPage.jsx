import React, { useState, useMemo, useEffect } from 'react';
import { useInterviews } from '../hooks/useInterviews';
import PageLoader from '../components/PageLoader';

const InterviewInsightsPage = () => {
    const { 
        interviews, loading, addInterview, updateInterview, deleteInterview,
        aiReports, loadingReports, generateAiReport, isGeneratingReport
    } = useInterviews();
    
    const [viewMode, setViewMode] = useState('all'); // all, keep, improve
    const [sortOrder, setSortOrder] = useState('desc'); // desc, asc
    const [showModal, setShowModal] = useState(false);
    const [editingId, setEditingId] = useState(null);
    const [formData, setFormData] = useState({ company: '', date: '', keep: '', improve: '' });

    // AI Reports state
    const [showAiModal, setShowAiModal] = useState(false);
    const [selectedAiReportIndex, setSelectedAiReportIndex] = useState(0);

    // Flashcard state
    const [showFlashcards, setShowFlashcards] = useState(false);
    const [flashcardIndex, setFlashcardIndex] = useState(0);

    const sortedInterviews = useMemo(() => {
        return [...interviews].sort((a, b) => {
            const dateA = new Date(a.date || 0).getTime();
            const dateB = new Date(b.date || 0).getTime();
            return sortOrder === 'desc' ? dateB - dateA : dateA - dateB;
        });
    }, [interviews, sortOrder]);

    const allFlashcards = useMemo(() => {
        const cards = [];
        sortedInterviews.forEach(int => {
            if (viewMode === 'all' || viewMode === 'keep') {
                (Array.isArray(int.keep) ? int.keep : []).forEach(pt => {
                    cards.push({ type: 'keep', text: pt, company: int.company, date: int.date });
                });
            }
            if (viewMode === 'all' || viewMode === 'improve') {
                (Array.isArray(int.improve) ? int.improve : []).forEach(pt => {
                    cards.push({ type: 'improve', text: pt, company: int.company, date: int.date });
                });
            }
        });
        return cards;
    }, [sortedInterviews, viewMode]);

    const handleSubmit = (e) => {
        e.preventDefault();
        if (editingId) {
            updateInterview(editingId, formData);
        } else {
            addInterview(formData);
        }
        setFormData({ company: '', date: '', keep: '', improve: '' });
        setShowModal(false);
        setEditingId(null);
    };

    const handleEdit = (int) => {
        setFormData({
            company: int.company || '',
            date: int.date ? new Date(int.date).toISOString().split('T')[0] : '',
            keep: Array.isArray(int.keep) ? int.keep.join('\n') : '',
            improve: Array.isArray(int.improve) ? int.improve.join('\n') : ''
        });
        setEditingId(int.id);
        setShowModal(true);
    };

    const handleDelete = (id) => {
        if (window.confirm("Are you sure you want to delete this interview insight?")) {
            deleteInterview(id);
        }
    };

    const startFlashcards = () => {
        if (allFlashcards.length === 0) {
            alert("No insights available for flashcards.");
            return;
        }
        setFlashcardIndex(0);
        setShowFlashcards(true);
    };

    const nextFlashcard = () => {
        setFlashcardIndex(prev => (prev + 1) % allFlashcards.length);
    };

    const prevFlashcard = () => {
        setFlashcardIndex(prev => (prev - 1 + allFlashcards.length) % allFlashcards.length);
    };

    const [touchStartX, setTouchStartX] = useState(null);

    useEffect(() => {
        if (!showFlashcards) return;
        const handleKeyDown = (e) => {
            if (e.key === 'ArrowRight') setFlashcardIndex(prev => (prev + 1) % allFlashcards.length);
            if (e.key === 'ArrowLeft') setFlashcardIndex(prev => (prev - 1 + allFlashcards.length) % allFlashcards.length);
            if (e.key === 'Escape') setShowFlashcards(false);
        };
        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [showFlashcards, allFlashcards.length]);

    const handleTouchStart = (e) => {
        setTouchStartX(e.targetTouches[0].clientX);
    };

    const handleTouchEnd = (e) => {
        if (touchStartX === null) return;
        const touchEndX = e.changedTouches[0].clientX;
        const diffX = touchStartX - touchEndX;

        if (diffX > 50) {
            nextFlashcard();
        } else if (diffX < -50) {
            prevFlashcard();
        }
        setTouchStartX(null);
    };

    if (loading) return <PageLoader label="Loading interview insights…" />;

    return (
        <div className="section" id="sec-interview-insights">
            <div className="page-header">
                <div className="page-header__actions" style={{ marginLeft: 'auto' }}>
                    <button className="btn btn-secondary" onClick={() => setShowAiModal(true)} title="AI Analysis" style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                            <path d="M12 2v4M12 18v4M4.93 4.93l2.83 2.83M16.24 16.24l2.83 2.83M2 12h4M18 12h4M4.93 19.07l2.83-2.83M16.24 7.76l2.83-2.83" />
                        </svg>
                        AI Insights
                    </button>
                    <button className="btn btn-secondary" onClick={startFlashcards}>
                        Flashcards
                    </button>
                    <button className="btn btn-primary" onClick={() => {
                        setFormData({ company: '', date: '', keep: '', improve: '' });
                        setEditingId(null);
                        setShowModal(true);
                    }}>
                        + Add Insights
                    </button>
                </div>
            </div>

            <div className="toolbar">
                <div className="btn-group">
                    <button className={`btn ${viewMode === 'all' ? 'active-filter' : ''}`} onClick={() => setViewMode('all')}>All Details</button>
                    <button className={`btn ${viewMode === 'keep' ? 'active-filter' : ''}`} onClick={() => setViewMode('keep')}>Keep Only</button>
                    <button className={`btn ${viewMode === 'improve' ? 'active-filter' : ''}`} onClick={() => setViewMode('improve')}>Improve Only</button>
                </div>

                <div className="btn-group">
                    <button className={`btn ${sortOrder === 'desc' ? 'active-filter' : ''}`} onClick={() => setSortOrder('desc')}>Newest First</button>
                    <button className={`btn ${sortOrder === 'asc' ? 'active-filter' : ''}`} onClick={() => setSortOrder('asc')}>Oldest First</button>
                </div>
            </div>

            {/* Insight Entries List */}
            <div className="insights-list">
                {sortedInterviews.map((int) => (
                    <div key={int.id} className="card insight-card">
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '15px' }}>
                            {viewMode === 'all' ? (
                                <div className="insight-header" style={{ flex: 1, paddingRight: '15px' }}>
                                    <h3 dir="auto" style={{ margin: 0 }}>{int.company}</h3>
                                    <span className="insight-date" style={{ color: 'var(--text-muted)' }}>{int.date ? new Date(int.date).toLocaleDateString() : ''}</span>
                                </div>
                            ) : <div style={{ flex: 1 }}></div>}
                            <div style={{ display: 'flex', gap: '8px' }}>
                                <button className="btn" onClick={() => handleEdit(int)} title="Edit" style={{ padding: '4px 12px', fontSize: '13px', background: 'transparent', color: 'var(--text-color)', border: '1px solid var(--border-color)', borderRadius: '6px' }}>Edit</button>
                                <button className="btn" onClick={() => handleDelete(int.id)} title="Delete" style={{ padding: '4px 12px', fontSize: '13px', background: 'transparent', color: '#ff4d4f', border: '1px solid rgba(255, 77, 79, 0.5)', borderRadius: '6px' }}>Delete</button>
                            </div>
                        </div>
                        <div className="insight-body">
                            {(viewMode === 'all' || viewMode === 'keep') && (
                                <div className="insight-section keep">
                                    {viewMode === 'all' && <h4 style={{ color: 'var(--success-color, #28a745)' }}>Good Points</h4>}
                                    <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginTop: '10px' }}>
                                        {(Array.isArray(int.keep) ? int.keep : []).map((pt, i) => (
                                            <div key={i} dir="auto" style={{
                                                backgroundColor: 'rgba(40, 167, 69, 0.1)',
                                                borderLeft: '4px solid #28a745',
                                                padding: '12px 16px',
                                                borderRadius: '6px',
                                                color: 'var(--text-color)',
                                                lineHeight: '1.5'
                                            }}>
                                                {pt}
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            )}
                            {(viewMode === 'all' || viewMode === 'improve') && (
                                <div className="insight-section improve" style={{ marginTop: viewMode === 'all' ? '24px' : '0' }}>
                                    {viewMode === 'all' && <h4 style={{ color: 'var(--danger-color, #dc3545)' }}>To Improve</h4>}
                                    <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginTop: '10px' }}>
                                        {(Array.isArray(int.improve) ? int.improve : []).map((pt, i) => (
                                            <div key={i} dir="auto" style={{
                                                backgroundColor: 'rgba(220, 53, 69, 0.1)',
                                                borderLeft: '4px solid #dc3545',
                                                padding: '12px 16px',
                                                borderRadius: '6px',
                                                color: 'var(--text-color)',
                                                lineHeight: '1.5'
                                            }}>
                                                {pt}
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>
                ))}
                {sortedInterviews.length === 0 && (
                    <div style={{ textAlign: 'center', color: 'var(--text-muted)', padding: '40px' }}>
                        No interview insights found. Add one to get started!
                    </div>
                )}
            </div>

            {/* Flashcards Overlay */}
            {showFlashcards && (
                <div className="modal-overlay" 
                     style={{ zIndex: 1000, display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center' }}
                     onTouchStart={handleTouchStart}
                     onTouchEnd={handleTouchEnd}
                >
                    <div style={{ position: 'absolute', top: '20px', right: '30px' }}>
                        <button className="btn" style={{ fontSize: '24px', background: 'transparent', color: 'white', border: 'none', cursor: 'pointer' }} onClick={() => setShowFlashcards(false)}>✕</button>
                    </div>
                    
                    <h2 style={{ color: 'white', marginBottom: '30px', fontWeight: '500' }}>
                        Flashcards ({flashcardIndex + 1} / {allFlashcards.length})
                    </h2>
                    
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', width: '100%', maxWidth: '800px', padding: '0 10px', gap: '15px' }}>
                        <button className="btn" onClick={prevFlashcard} style={{ fontSize: '24px', padding: '10px 15px', background: 'rgba(255,255,255,0.2)', color: 'white', border: 'none', borderRadius: '50%', cursor: 'pointer', flexShrink: 0 }}>❮</button>

                        <div className="card flashcard" style={{
                            width: '100%',
                            maxWidth: '600px',
                            minHeight: '350px',
                            maxHeight: '80vh',
                            display: 'flex',
                            flexDirection: 'column',
                            justifyContent: 'flex-start',
                            alignItems: 'center',
                            padding: '40px',
                            textAlign: 'center',
                            backgroundColor: allFlashcards[flashcardIndex].type === 'keep' ? '#f0fdf4' : '#fef2f2',
                            border: `2px solid ${allFlashcards[flashcardIndex].type === 'keep' ? '#22c55e' : '#ef4444'}`,
                            borderRadius: '20px',
                            boxShadow: '0 20px 40px rgba(0,0,0,0.4)',
                            transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
                            overflowY: 'auto'
                        }}>
                            <div style={{ margin: 'auto 0', width: '100%', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                                <div style={{
                                    textTransform: 'uppercase',
                                    fontWeight: 'bold',
                                    letterSpacing: '1px',
                                    color: allFlashcards[flashcardIndex].type === 'keep' ? '#166534' : '#991b1b',
                                    marginBottom: '20px',
                                    fontSize: '14px',
                                    flexShrink: 0
                                }}>
                                    {allFlashcards[flashcardIndex].type === 'keep' ? 'Keep Doing' : 'To Improve'}
                                </div>
                                <h3 dir="auto" style={{ fontSize: '28px', color: '#1f2937', lineHeight: '1.4', margin: '0 0 30px 0', fontWeight: '600', wordBreak: 'break-word', width: '100%', flexShrink: 0 }}>
                                    "{allFlashcards[flashcardIndex].text}"
                                </h3>
                                <div style={{ color: '#4b5563', fontSize: '15px', fontWeight: '500', flexShrink: 0 }}>
                                    {allFlashcards[flashcardIndex].company} • {allFlashcards[flashcardIndex].date ? new Date(allFlashcards[flashcardIndex].date).toLocaleDateString() : 'No date'}
                                </div>
                            </div>
                        </div>

                        <button className="btn" onClick={nextFlashcard} style={{ fontSize: '24px', padding: '10px 15px', background: 'rgba(255,255,255,0.2)', color: 'white', border: 'none', borderRadius: '50%', cursor: 'pointer', flexShrink: 0 }}>❯</button>
                    </div>
                </div>
            )}

            {/* Modal for Creating/Editing Insight */}
            {showModal && (
                <div className="modal-overlay" onClick={() => setShowModal(false)}>
                    <div className="modal" onClick={(e) => e.stopPropagation()}>
                        <div className="modal-header">
                            <h2>{editingId ? 'Edit Interview Insight' : 'New Interview Insight'}</h2>
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
                                        style={{ minHeight: '100px' }}
                                        value={formData.keep}
                                        onChange={e => setFormData({ ...formData, keep: e.target.value })}
                                        placeholder="Handled the technical questions well... (One point per line)"
                                        dir="auto"
                                    />
                                </div>
                                <div className="modal-section">
                                    <label>Improve (Future focus)</label>
                                    <textarea
                                        className="textarea"
                                        style={{ minHeight: '100px' }}
                                        value={formData.improve}
                                        onChange={e => setFormData({ ...formData, improve: e.target.value })}
                                        placeholder="Need to be more concise in behavioral answers... (One point per line)"
                                        dir="auto"
                                    />
                                </div>
                            </div>
                            <div className="modal-footer">
                                <button type="button" className="btn" onClick={() => setShowModal(false)}>Cancel</button>
                                <button type="submit" className="btn btn-primary">{editingId ? 'Update Insights' : 'Save Insights'}</button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
            {/* AI Reports Modal */}
            {showAiModal && (
                <div className="modal-overlay" onClick={() => setShowAiModal(false)}>
                    <div className="modal" onClick={(e) => e.stopPropagation()} style={{ width: '900px', maxWidth: '95vw', height: '80vh', display: 'flex', flexDirection: 'column' }}>
                        <div className="modal-header">
                            <h2 style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ color: 'var(--primary-color)' }}>
                                    <path d="M12 2v4M12 18v4M4.93 4.93l2.83 2.83M16.24 16.24l2.83 2.83M2 12h4M18 12h4M4.93 19.07l2.83-2.83M16.24 7.76l2.83-2.83" />
                                </svg>
                                AI Insights Analysis
                            </h2>
                            <div style={{ display: 'flex', gap: '10px' }}>
                                <button className="btn btn-primary" onClick={() => generateAiReport()} disabled={isGeneratingReport} style={{ padding: '6px 12px', fontSize: '13px' }}>
                                    {isGeneratingReport ? 'Analyzing...' : '+ New Analysis'}
                                </button>
                                <button className="modal-close" onClick={() => setShowAiModal(false)}>✕</button>
                            </div>
                        </div>
                        
                        <div className="modal-body" style={{ flex: 1, display: 'flex', padding: 0, overflow: 'hidden' }}>
                            {loadingReports ? (
                                <div style={{ flex: 1, display: 'flex', justifyContent: 'center', alignItems: 'center' }}>
                                    Loading reports...
                                </div>
                            ) : aiReports.length === 0 ? (
                                <div style={{ flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center', color: 'var(--text-muted)' }}>
                                    <p>No AI reports generated yet.</p>
                                    <p>Click "+ New Analysis" to generate one based on your interview insights.</p>
                                </div>
                            ) : (
                                <>
                                    {/* Sidebar: List of Reports */}
                                    <div style={{ width: '250px', borderRight: '1px solid var(--border-color)', overflowY: 'auto', background: 'var(--bg-secondary)' }}>
                                        {aiReports.map((report, idx) => (
                                            <div 
                                                key={report.id} 
                                                onClick={() => setSelectedAiReportIndex(idx)}
                                                style={{ 
                                                    padding: '15px', 
                                                    borderBottom: '1px solid var(--border-color)', 
                                                    cursor: 'pointer',
                                                    background: selectedAiReportIndex === idx ? 'var(--bg-card)' : 'transparent',
                                                    borderLeft: selectedAiReportIndex === idx ? '4px solid var(--primary-color)' : '4px solid transparent',
                                                    transition: 'all 0.2s'
                                                }}
                                            >
                                                <div style={{ fontWeight: '500', color: 'var(--text-color)' }}>Report #{aiReports.length - idx}</div>
                                                <div style={{ fontSize: '12px', color: 'var(--text-muted)', marginTop: '4px' }}>
                                                    {new Date(report.created_at).toLocaleString()}
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                    
                                    {/* Main Content: Selected Report */}
                                    <div style={{ flex: 1, overflowY: 'auto', padding: '24px', background: 'var(--bg-card)' }}>
                                        {aiReports[selectedAiReportIndex] && (
                                            <div>
                                                <div style={{ marginBottom: '30px' }}>
                                                    <h3 style={{ color: 'var(--text-color)', marginBottom: '10px', borderBottom: '1px solid var(--border-color)', paddingBottom: '8px' }}>Overall Trends</h3>
                                                    <p dir="auto" style={{ lineHeight: '1.6', color: 'var(--text-color)', fontSize: '15px' }}>
                                                        {aiReports[selectedAiReportIndex].overall_trends || 'No trends available.'}
                                                    </p>
                                                </div>

                                                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px' }}>
                                                    <div className="insight-section keep" style={{ marginTop: 0 }}>
                                                        <h4 style={{ color: 'var(--success-color, #28a745)', marginBottom: '15px', borderBottom: '1px solid rgba(40, 167, 69, 0.2)', paddingBottom: '8px' }}>Keep Doing</h4>
                                                        <ul style={{ paddingLeft: '20px', margin: 0, color: 'var(--text-color)', lineHeight: '1.6' }}>
                                                            {(aiReports[selectedAiReportIndex].keep_report || []).map((pt, i) => (
                                                                <li key={i} dir="auto" style={{ marginBottom: '8px' }}>{pt}</li>
                                                            ))}
                                                        </ul>
                                                    </div>
                                                    
                                                    <div className="insight-section improve" style={{ marginTop: 0 }}>
                                                        <h4 style={{ color: 'var(--danger-color, #dc3545)', marginBottom: '15px', borderBottom: '1px solid rgba(220, 53, 69, 0.2)', paddingBottom: '8px' }}>To Improve</h4>
                                                        <ul style={{ paddingLeft: '20px', margin: 0, color: 'var(--text-color)', lineHeight: '1.6' }}>
                                                            {(aiReports[selectedAiReportIndex].improve_report || []).map((pt, i) => (
                                                                <li key={i} dir="auto" style={{ marginBottom: '8px' }}>{pt}</li>
                                                            ))}
                                                        </ul>
                                                    </div>
                                                </div>
                                            </div>
                                        )}
                                    </div>
                                </>
                            )}
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default InterviewInsightsPage;