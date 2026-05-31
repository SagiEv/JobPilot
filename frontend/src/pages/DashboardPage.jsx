import React, { useState, useEffect } from 'react';
import { useApplications } from '../hooks/useApplications';
import { useEvents } from '../hooks/useEvents';
import { useNotifications } from '../hooks/useNotifications';
import PageLoader from '../components/PageLoader';
import apiClient from '../services/apiClient';

const DashboardPage = () => {
    const { applications, loading: appsLoading } = useApplications();
    const { events, loading: eventsLoading, addEvent } = useEvents();

    // Returns 'YYYY-MM-DD' in the USER'S local timezone (no UTC shift)
    const localDateStr = (date) => {
        const d = typeof date === 'string' ? new Date(date) : date;
        if (!d || isNaN(d.getTime())) return '';
        const y = d.getFullYear();
        const m = String(d.getMonth() + 1).padStart(2, '0');
        const day = String(d.getDate()).padStart(2, '0');
        return `${y}-${m}-${day}`;
    };

    const [stats, setStats] = useState({ active: 0, rejected: 0, appliedToday: 0, rejectedToday: 0 });
    const { notifications, isLoading: notifLoading, markAllRead, markRead } = useNotifications(10);
    // Calendar state
    const [currentDate, setCurrentDate] = useState(new Date());
    const [hoveredDay, setHoveredDay] = useState(null);

    // Modals state
    const [isEventModalOpen, setIsEventModalOpen] = useState(false);
    const [isInterviewModalOpen, setIsInterviewModalOpen] = useState(false);

    // Event Form
    const [eventForm, setEventForm] = useState({ title: '', date: '', time: '', allDay: false, type: 'generic', details: '' });
    
    // Interview Form
    const [interviewForm, setInterviewForm] = useState({
        title: '', company: '', date: '', type: 'phone', details: '', interviewers: '', application_id: ''
    });

    // Quick Email Composer state
    const [emailComposer, setEmailComposer] = useState({
        purpose: 'referral', jobLink: '', description: '', addresseeName: '', cvFile: null, githubPortfolio: ''
    });
    const [isComposing, setIsComposing] = useState(false);
    const [composedMessage, setComposedMessage] = useState('');

    useEffect(() => {
        if (!appsLoading) {
            const apps = applications || [];
            const todayStr = localDateStr(new Date());

            setStats({
                active: apps.filter(a => a.STATUS !== 'Rejected' && a.STATUS !== 'Offer').length,
                rejected: apps.filter(a => a.STATUS === 'Rejected').length,
                appliedToday: apps.filter(a => {
                    if (!a.DATE) return false;
                    return localDateStr(a.DATE) === todayStr;
                }).length,
                rejectedToday: apps.filter(a => {
                    if (a.STATUS !== 'Rejected') return false;
                    const dateToCheck = a.updated_at || a.updatedAt || a.DATE;
                    if (!dateToCheck) return false;
                    return localDateStr(dateToCheck) === todayStr;
                }).length
            });
        }
    }, [applications, appsLoading]);

    const timeAgo = (dateStr) => {
        if (!dateStr) return '';
        const diff = Date.now() - new Date(dateStr).getTime();
        const mins = Math.floor(diff / 60000);
        if (mins < 1) return 'Just now';
        if (mins < 60) return `${mins}m ago`;
        const hours = Math.floor(mins / 60);
        if (hours < 24) return `${hours}h ago`;
        const days = Math.floor(hours / 24);
        return `${days}d ago`;
    };

    // Calendar logic
    const daysInMonth = new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 0).getDate();
    const firstDayOfMonth = new Date(currentDate.getFullYear(), currentDate.getMonth(), 1).getDay();
    const prevMonth = () => setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() - 1, 1));
    const nextMonth = () => setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 1));
    const monthNames = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];

    // Filter events
    const upcomingInterviews = (events || [])
        .filter(e => e.type === 'interview' && new Date(e.date) >= new Date(new Date().setHours(0,0,0,0)))
        .sort((a, b) => new Date(a.date) - new Date(b.date));

    const handleEventSubmit = async (e) => {
        e.preventDefault();
        // Combine date + time into a single ISO string, or use date-only if all-day
        let finalDate = eventForm.date;
        if (!eventForm.allDay && eventForm.date && eventForm.time) {
            finalDate = new Date(`${eventForm.date}T${eventForm.time}`).toISOString();
        } else if (eventForm.allDay && eventForm.date) {
            finalDate = new Date(`${eventForm.date}T00:00:00`).toISOString();
        }
        await addEvent({ ...eventForm, date: finalDate, allDay: eventForm.allDay });
        setIsEventModalOpen(false);
        setEventForm({ title: '', date: '', time: '', allDay: false, type: 'generic', details: '' });
    };

    const handleInterviewSubmit = async (e) => {
        e.preventDefault();
        // Parse comma-separated interviewers into array
        const parsedInterviewers = interviewForm.interviewers
            .split(',')
            .map(i => i.trim())
            .filter(i => i);
            
        await addEvent({
            ...interviewForm,
            type: 'interview',
            interviewers: parsedInterviewers,
            application_id: interviewForm.application_id ? parseInt(interviewForm.application_id) : null
        });
        setIsInterviewModalOpen(false);
        setInterviewForm({ title: '', company: '', date: '', type: 'phone', details: '', interviewers: '', application_id: '' });
    };

    const handleFetchDescription = () => {
        alert("Fetching description from URL... (This is a placeholder, will be connected to web scraper agent)");
        setEmailComposer(prev => ({ ...prev, description: "Software Engineer role requiring React and Node.js..." }));
    };

    const handleGenerateMessage = async () => {
        if(!emailComposer.jobLink && !emailComposer.description) {
            alert("Please provide a job link or description.");
            return;
        }
        setIsComposing(true);
        setComposedMessage('');
        try {
            const formData = new FormData();
            formData.append('purpose', emailComposer.purpose);
            formData.append('jobLink', emailComposer.jobLink);
            formData.append('description', emailComposer.description);
            formData.append('addresseeName', emailComposer.addresseeName);
            formData.append('githubPortfolio', emailComposer.githubPortfolio);
            if(emailComposer.cvFile) formData.append('cvFile', emailComposer.cvFile);

            const res = await apiClient.post('/api/messages/generate', formData, {
                headers: { 'Content-Type': 'multipart/form-data' }
            });
            setComposedMessage(res.data.message);
        } catch(err) {
            console.error(err);
            alert("Failed to generate message. Ensure you have set your Groq API Key in settings.");
        } finally {
            setIsComposing(false);
        }
    };

    if (appsLoading || eventsLoading) return <PageLoader />;

    return (
        <div className="section dashboard-page" style={{ padding: '2rem', display: 'flex', flexDirection: 'column', gap: '2rem' }}>
            <div className="dashboard-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                <div>
                    <h1 style={{ fontSize: '2rem', fontWeight: 600, color: '#1a1a1a', margin: 0 }}>Welcome back, Job Hunter!</h1>
                    <p style={{ color: '#666', marginTop: '0.5rem' }}>Here is your career command center overview.</p>
                </div>
                <div style={{ display: 'flex', gap: '1.5rem', backgroundColor: '#fff', padding: '1rem', borderRadius: '12px', boxShadow: '0 4px 15px rgba(0,0,0,0.05)' }}>
                    <div style={{ textAlign: 'center' }}>
                        <div style={{ fontSize: '1.5rem', fontWeight: 'bold', color: '#0f6e56' }}>{stats.appliedToday}</div>
                        <div style={{ fontSize: '0.85rem', color: '#666' }}>Applied Today</div>
                    </div>
                    <div style={{ width: '1px', backgroundColor: '#eee' }}></div>
                    <div style={{ textAlign: 'center' }}>
                        <div style={{ fontSize: '1.5rem', fontWeight: 'bold', color: '#e63946' }}>{stats.rejectedToday}</div>
                        <div style={{ fontSize: '0.85rem', color: '#666' }}>Rejected Today</div>
                    </div>
                </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '1.5rem' }}>
                {/* Notifications & Recent Updates */}
                <div className="card" style={{ padding: '1.5rem', borderRadius: '12px', boxShadow: '0 4px 20px rgba(0,0,0,0.05)' }}>
                    <h2 style={{ fontSize: '1.25rem', marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"></path><path d="M13.73 21a2 2 0 0 1-3.46 0"></path></svg>
                        Notifications & Updates
                    </h2>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                        {notifications.length === 0 ? (
                            <div style={{ textAlign: 'center', padding: '2rem 0', color: '#888', fontSize: '0.9rem' }}>
                                {notifLoading ? 'Loading…' : 'No notifications yet. Email sync updates will appear here.'}
                            </div>
                        ) : notifications.map(update => (
                            <div key={update.id} onClick={() => { if (!update.read) markRead(update.id); }} style={{
                                display: 'flex', gap: '1rem', padding: '1rem',
                                backgroundColor: update.read ? '#f8f9fa' : '#f0fdf4',
                                borderRadius: '8px',
                                borderLeft: `4px solid ${update.read ? '#ccc' : '#0f6e56'}`,
                                transition: 'background 0.2s',
                                cursor: update.read ? 'default' : 'pointer'
                            }}>
                                <div style={{ flex: 1 }}>
                                    <div style={{ fontSize: '0.95rem', fontWeight: update.read ? 400 : 600, color: '#333' }}>{update.title}</div>
                                    {update.body && <div style={{ fontSize: '0.8rem', color: '#666', marginTop: '0.25rem' }}>{update.body}</div>}
                                    <div style={{ fontSize: '0.75rem', color: '#888', marginTop: '0.25rem' }}>{timeAgo(update.created_at)}</div>
                                </div>
                            </div>
                        ))}
                        {notifications.length > 0 && (
                            <div style={{ textAlign: 'center', marginTop: '0.5rem' }}>
                                <button className="btn btn-sm" style={{ color: '#0f6e56' }} onClick={() => markAllRead()}>Mark all as read</button>
                            </div>
                        )}
                    </div>
                </div>

                {/* Calendar */}
                <div className="card" style={{ padding: '1.5rem', borderRadius: '12px', boxShadow: '0 4px 20px rgba(0,0,0,0.05)' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
                        <h2 style={{ fontSize: '1.25rem', margin: 0, display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="3" y="4" width="18" height="18" rx="2" ry="2"></rect><line x1="16" y1="2" x2="16" y2="6"></line><line x1="8" y1="2" x2="8" y2="6"></line><line x1="3" y1="10" x2="21" y2="10"></line></svg>
                            Upcoming Events
                        </h2>
                        <button className="btn btn-sm btn-primary" onClick={() => setIsEventModalOpen(true)}>+ Add Event</button>
                    </div>
                    
                    {/* Simple Calendar */}
                    <div>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
                            <button className="btn btn-sm" onClick={prevMonth}>&lt;</button>
                            <div style={{ fontWeight: 'bold' }}>{monthNames[currentDate.getMonth()]} {currentDate.getFullYear()}</div>
                            <button className="btn btn-sm" onClick={nextMonth}>&gt;</button>
                        </div>
                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: '2px', textAlign: 'center', fontSize: '0.8rem' }}>
                            {['Su','Mo','Tu','We','Th','Fr','Sa'].map(d => <div key={d} style={{ fontWeight: 'bold', color: '#888' }}>{d}</div>)}
                            {Array.from({ length: firstDayOfMonth }).map((_, i) => <div key={`empty-${i}`} />)}
                            {Array.from({ length: daysInMonth }).map((_, i) => {
                                const day = i + 1;
                                // Build dateStr in LOCAL timezone to avoid UTC-shift
                                const cellDate = new Date(currentDate.getFullYear(), currentDate.getMonth(), day);
                                const dateStr = localDateStr(cellDate);
                                const dayEvents = events.filter(e => {
                                    if (!e.date) return false;
                                    return localDateStr(e.date) === dateStr;
                                });
                                const hasEvent = dayEvents.length > 0;
                                const isHovered = hoveredDay === dateStr;
                                return (
                                    <div
                                        key={day}
                                        style={{ position: 'relative', display: 'inline-block' }}
                                        onMouseEnter={() => hasEvent && setHoveredDay(dateStr)}
                                        onMouseLeave={() => setHoveredDay(null)}
                                    >
                                        <div style={{
                                            padding: '0.25rem',
                                            borderRadius: '4px',
                                            backgroundColor: hasEvent ? '#0f6e56' : 'transparent',
                                            color: hasEvent ? '#fff' : '#333',
                                            fontWeight: hasEvent ? 'bold' : 'normal',
                                            cursor: hasEvent ? 'pointer' : 'default',
                                            transition: 'transform 0.1s ease',
                                            transform: isHovered ? 'scale(1.15)' : 'scale(1)'
                                        }}>
                                            {day}
                                        </div>
                                        {isHovered && (
                                            <div style={{
                                                position: 'absolute',
                                                bottom: 'calc(100% + 8px)',
                                                left: '50%',
                                                transform: 'translateX(-50%)',
                                                zIndex: 100,
                                                backgroundColor: '#1a1a2e',
                                                color: '#f0f0f0',
                                                borderRadius: '10px',
                                                padding: '0.75rem',
                                                minWidth: '200px',
                                                maxWidth: '260px',
                                                boxShadow: '0 8px 24px rgba(0,0,0,0.25)',
                                                pointerEvents: 'none',
                                                fontSize: '0.8rem',
                                                display: 'flex',
                                                flexDirection: 'column',
                                                gap: '0.6rem'
                                            }}>
                                                {/* Arrow */}
                                                <div style={{
                                                    position: 'absolute',
                                                    bottom: '-6px',
                                                    left: '50%',
                                                    transform: 'translateX(-50%)',
                                                    width: 0,
                                                    height: 0,
                                                    borderLeft: '6px solid transparent',
                                                    borderRight: '6px solid transparent',
                                                    borderTop: '6px solid #1a1a2e'
                                                }} />
                                                {dayEvents.map((ev, idx) => (
                                                    <div key={idx} style={{
                                                        borderBottom: idx < dayEvents.length - 1 ? '1px solid rgba(255,255,255,0.1)' : 'none',
                                                        paddingBottom: idx < dayEvents.length - 1 ? '0.6rem' : 0
                                                    }}>
                                                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', marginBottom: '0.3rem' }}>
                                                            <span style={{
                                                                fontSize: '0.7rem',
                                                                padding: '1px 6px',
                                                                borderRadius: '999px',
                                                                backgroundColor: ev.type === 'interview' ? '#0f6e56' : '#3b4a6b',
                                                                color: '#fff',
                                                                textTransform: 'capitalize',
                                                                flexShrink: 0
                                                            }}>{ev.type || 'event'}</span>
                                                            <span style={{ fontWeight: 600, fontSize: '0.82rem', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{ev.title || ev.company || 'Event'}</span>
                                                        </div>
                                                        {ev.company && ev.type === 'interview' && (
                                                            <div style={{ color: '#a0aec0', marginBottom: '0.2rem' }}>🏢 {ev.company}</div>
                                                        )}
                                                        <div style={{ color: '#68d391' }}>🕐 {new Date(ev.date).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</div>
                                                        {ev.details && (
                                                            <div style={{ color: '#a0aec0', marginTop: '0.2rem', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>📝 {ev.details}</div>
                                                        )}
                                                        {ev.interviewers && ev.interviewers.length > 0 && (
                                                            <div style={{ color: '#a0aec0', marginTop: '0.2rem' }}>👤 {Array.isArray(ev.interviewers) ? ev.interviewers.join(', ') : ev.interviewers}</div>
                                                        )}
                                                    </div>
                                                ))}
                                            </div>
                                        )}
                                    </div>
                                );
                            })}
                        </div>
                    </div>
                </div>

                {/* Upcoming Interviews */}
                <div className="card" style={{ padding: '1.5rem', borderRadius: '12px', boxShadow: '0 4px 20px rgba(0,0,0,0.05)' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
                        <h2 style={{ fontSize: '1.25rem', margin: 0, display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="10"></circle><polyline points="12 6 12 12 16 14"></polyline></svg>
                            Upcoming Interviews
                        </h2>
                        <button className="btn btn-sm btn-primary" onClick={() => setIsInterviewModalOpen(true)}>+ Add Interview</button>
                    </div>

                    {upcomingInterviews.slice(0,3).length > 0 ? (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                            {upcomingInterviews.slice(0,3).map((interview, idx) => (
                                <div key={idx} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '1rem', border: '1px solid #eaeaea', borderRadius: '8px' }}>
                                    <div>
                                        <div style={{ fontWeight: 600 }}>{interview.title || interview.company}</div>
                                        <div style={{ fontSize: '0.9rem', color: '#666' }}>{interview.company} • {interview.type}</div>
                                    </div>
                                    <div style={{ textAlign: 'right', display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '0.25rem' }}>
                                        <div style={{ color: '#0f6e56', fontWeight: 500 }}>{new Date(interview.date).toLocaleDateString()}</div>
                                        <div style={{ fontSize: '0.85rem', color: '#888' }}>{new Date(interview.date).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</div>
                                        <button className="btn btn-sm btn-primary" onClick={() => window.dispatchEvent(new CustomEvent('jobpilot:navigate', { detail: 'interview' }))} style={{ marginTop: '4px', padding: '2px 8px', fontSize: '0.8rem' }}>Get Ready</button>
                                    </div>
                                </div>
                            ))}
                        </div>
                    ) : (
                        <div style={{ textAlign: 'center', padding: '1rem 0', color: '#888' }}>
                            <p>No upcoming interviews scheduled.</p>
                        </div>
                    )}
                </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '1.5rem' }}>
                {/* Auto Search Recent Results (Placeholder) */}
                <div className="card" style={{ padding: '1.5rem', borderRadius: '12px', border: '1px dashed #ccc', backgroundColor: '#fafafa' }}>
                    <h2 style={{ fontSize: '1.1rem', color: '#555', marginBottom: '0.5rem' }}>Auto Search Results</h2>
                    <p style={{ color: '#888', fontSize: '0.9rem', marginBottom: '1rem' }}>We are scanning the web for jobs matching your profile. Results will appear here.</p>
                    <div style={{ height: '100px', display: 'flex', alignItems: 'center', justifyContent: 'center', backgroundColor: '#f0f0f0', borderRadius: '8px' }}>
                        <span style={{ color: '#aaa' }}>Placeholder (Coming Soon)</span>
                    </div>
                </div>

                {/* Fast Mail Creation */}
                <div className="card" style={{ padding: '1.5rem', borderRadius: '12px', border: '1px solid #e0e0e0', backgroundColor: '#fff', boxShadow: '0 4px 20px rgba(0,0,0,0.05)' }}>
                    <h2 style={{ fontSize: '1.1rem', color: '#333', marginBottom: '0.5rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"></path><polyline points="22,6 12,13 2,6"></polyline></svg>
                        Quick Message Sender
                    </h2>
                    <p style={{ color: '#888', fontSize: '0.9rem', marginBottom: '1rem' }}>Instantly generate referral requests or application messages.</p>
                    
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                        <div style={{ display: 'flex', gap: '1rem' }}>
                            <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.9rem' }}>
                                <input type="radio" name="purpose" value="referral" checked={emailComposer.purpose === 'referral'} onChange={() => setEmailComposer({...emailComposer, purpose: 'referral'})} /> Ask for Referral
                            </label>
                            <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.9rem' }}>
                                <input type="radio" name="purpose" value="application" checked={emailComposer.purpose === 'application'} onChange={() => setEmailComposer({...emailComposer, purpose: 'application'})} /> Application Message
                            </label>
                        </div>

                        <div style={{ display: 'flex', gap: '0.5rem' }}>
                            <input type="text" className="field-input" placeholder="Job Link" value={emailComposer.jobLink} onChange={e => setEmailComposer({...emailComposer, jobLink: e.target.value})} style={{ flex: 1 }} />
                            <button className="btn" onClick={handleFetchDescription}>Fetch</button>
                        </div>

                        <textarea className="textarea" placeholder="Job Description (Optional if fetched)" value={emailComposer.description} onChange={e => setEmailComposer({...emailComposer, description: e.target.value})} style={{ minHeight: '60px' }}></textarea>
                        
                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                            <input type="text" className="field-input" placeholder="Addressee Name (Optional)" value={emailComposer.addresseeName} onChange={e => setEmailComposer({...emailComposer, addresseeName: e.target.value})} />
                            <input type="text" className="field-input" placeholder="GitHub Portfolio (Optional)" value={emailComposer.githubPortfolio} onChange={e => setEmailComposer({...emailComposer, githubPortfolio: e.target.value})} />
                        </div>

                        <div>
                            <label style={{ fontSize: '0.85rem', color: '#555', marginBottom: '0.25rem', display: 'block' }}>Upload CV (Optional):</label>
                            <input type="file" className="field-input" accept=".pdf" onChange={e => setEmailComposer({...emailComposer, cvFile: e.target.files[0]})} />
                        </div>

                        <button className="btn btn-primary" onClick={handleGenerateMessage} disabled={isComposing}>
                            {isComposing ? 'Generating...' : 'Generate Message'}
                        </button>

                        {composedMessage && (
                            <div style={{ marginTop: '1rem', padding: '1rem', backgroundColor: '#f0f9ff', border: '1px solid #bae6fd', borderRadius: '8px' }}>
                                <div style={{ fontWeight: 'bold', fontSize: '0.9rem', marginBottom: '0.5rem', color: '#0369a1' }}>Generated Message:</div>
                                <div style={{ fontSize: '0.9rem', whiteSpace: 'pre-wrap', color: '#333' }}>{composedMessage}</div>
                            </div>
                        )}
                    </div>
                </div>
            </div>

            {/* Add Event Modal */}
            {isEventModalOpen && (
                <div className="modal-overlay" onClick={() => setIsEventModalOpen(false)}>
                    <div className="modal" onClick={e => e.stopPropagation()}>
                        <div className="modal-header">
                            <h2>Add Event</h2>
                            <button className="modal-close" onClick={() => setIsEventModalOpen(false)}>✕</button>
                        </div>
                        <form onSubmit={handleEventSubmit}>
                            <div className="modal-body">
                                <div className="modal-section">
                                    <label>Event Title</label>
                                    <input className="field-input" required value={eventForm.title} onChange={e => setEventForm({...eventForm, title: e.target.value})} />
                                </div>
                                <div className="modal-section">
                                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
                                        <label style={{ margin: 0 }}>Date {eventForm.allDay ? '' : '& Time'}</label>
                                        <label style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', fontSize: '0.85rem', color: '#555', cursor: 'pointer', fontWeight: 'normal' }}>
                                            <div
                                                onClick={() => setEventForm(prev => ({ ...prev, allDay: !prev.allDay, time: '' }))}
                                                style={{
                                                    width: '36px', height: '20px', borderRadius: '999px', position: 'relative', cursor: 'pointer',
                                                    backgroundColor: eventForm.allDay ? '#0f6e56' : '#ccc',
                                                    transition: 'background-color 0.2s ease'
                                                }}
                                            >
                                                <div style={{
                                                    position: 'absolute', top: '2px',
                                                    left: eventForm.allDay ? '18px' : '2px',
                                                    width: '16px', height: '16px', borderRadius: '50%',
                                                    backgroundColor: '#fff',
                                                    transition: 'left 0.2s ease',
                                                    boxShadow: '0 1px 3px rgba(0,0,0,0.2)'
                                                }} />
                                            </div>
                                            All Day
                                        </label>
                                    </div>
                                    {eventForm.allDay ? (
                                        <input
                                            type="date"
                                            className="field-input"
                                            required
                                            value={eventForm.date}
                                            onChange={e => setEventForm({ ...eventForm, date: e.target.value })}
                                        />
                                    ) : (
                                        <div style={{ display: 'flex', gap: '0.75rem' }}>
                                            <input
                                                type="date"
                                                className="field-input"
                                                required
                                                value={eventForm.date}
                                                onChange={e => setEventForm({ ...eventForm, date: e.target.value })}
                                                style={{ flex: 1 }}
                                            />
                                            <input
                                                type="time"
                                                className="field-input"
                                                value={eventForm.time}
                                                onChange={e => setEventForm({ ...eventForm, time: e.target.value })}
                                                style={{ flex: 1 }}
                                                placeholder="Optional"
                                            />
                                        </div>
                                    )}
                                </div>
                                <div className="modal-section">
                                    <label>Details</label>
                                    <textarea className="textarea" value={eventForm.details} onChange={e => setEventForm({...eventForm, details: e.target.value})}></textarea>
                                </div>
                            </div>
                            <div className="modal-footer">
                                <button type="button" className="btn" onClick={() => setIsEventModalOpen(false)}>Cancel</button>
                                <button type="submit" className="btn btn-primary">Save Event</button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* Add Interview Modal */}
            {isInterviewModalOpen && (
                <div className="modal-overlay" onClick={() => setIsInterviewModalOpen(false)}>
                    <div className="modal" onClick={e => e.stopPropagation()}>
                        <div className="modal-header">
                            <h2>Schedule Interview</h2>
                            <button className="modal-close" onClick={() => setIsInterviewModalOpen(false)}>✕</button>
                        </div>
                        <form onSubmit={handleInterviewSubmit}>
                            <div className="modal-body">
                                <div className="modal-section">
                                    <label>Interview Title</label>
                                    <input className="field-input" required value={interviewForm.title} onChange={e => setInterviewForm({...interviewForm, title: e.target.value})} placeholder="e.g. First Round Technical" />
                                </div>
                                <div className="modal-section">
                                    <label>Company</label>
                                    <input className="field-input" required value={interviewForm.company} onChange={e => setInterviewForm({...interviewForm, company: e.target.value})} />
                                </div>
                                <div className="modal-section">
                                    <label>Date & Time</label>
                                    <input type="datetime-local" className="field-input" required value={interviewForm.date} onChange={e => setInterviewForm({...interviewForm, date: e.target.value})} />
                                </div>
                                <div className="modal-section">
                                    <label>Type</label>
                                    <select className="field-input" value={interviewForm.type} onChange={e => setInterviewForm({...interviewForm, type: e.target.value})}>
                                        <option value="phone">Phone Screen</option>
                                        <option value="technical">Technical</option>
                                        <option value="behavioral">Behavioral</option>
                                        <option value="onsite">On-site</option>
                                    </select>
                                </div>
                                <div className="modal-section">
                                    <label>Interviewers (comma separated)</label>
                                    <input className="field-input" value={interviewForm.interviewers} onChange={e => setInterviewForm({...interviewForm, interviewers: e.target.value})} placeholder="e.g. John Doe, Jane Smith" />
                                </div>
                                <div className="modal-section">
                                    <label>Link to Application</label>
                                    <select className="field-input" value={interviewForm.application_id} onChange={e => setInterviewForm({...interviewForm, application_id: e.target.value})}>
                                        <option value="">None</option>
                                        {applications.map(app => (
                                            <option key={app.id} value={app.id}>{app.COMPANY} - {app.ROLE_ID}</option>
                                        ))}
                                    </select>
                                </div>
                                <div className="modal-section">
                                    <label>Details (Optional)</label>
                                    <textarea className="textarea" value={interviewForm.details} onChange={e => setInterviewForm({...interviewForm, details: e.target.value})}></textarea>
                                </div>
                            </div>
                            <div className="modal-footer">
                                <button type="button" className="btn" onClick={() => setIsInterviewModalOpen(false)}>Cancel</button>
                                <button type="submit" className="btn btn-primary">Save Interview</button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
};

export default DashboardPage;
