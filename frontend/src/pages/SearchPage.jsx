import React, { useState } from 'react';
import { useSearch } from '../hooks/useSearch';
import { useRss } from '../hooks/useRss';
import { useToast } from '../components/ToastProvider';
import { useScrapedJobs } from '../hooks/useScrapedJobs';

/* ── inline editable site row ─────────────────────────────────── */
const SiteRow = ({ site, onToggle, onDelete, onSave }) => {
    const [editing, setEditing] = useState(false);
    const [name, setName] = useState(site.name);
    const [url, setUrl] = useState(site.url);

    const handleSave = () => {
        if (name.trim() && url.trim()) {
            onSave(site.id, name.trim(), url.trim());
        }
        setEditing(false);
    };

    const handleCancel = () => {
        setName(site.name);
        setUrl(site.url);
        setEditing(false);
    };

    if (editing) {
        return (
            <div className="site-item site-item-editing">
                <input
                    className="field-input site-edit-inp"
                    value={name}
                    onChange={e => setName(e.target.value)}
                    placeholder="Company name"
                    autoFocus
                />
                <input
                    className="field-input site-edit-inp"
                    value={url}
                    onChange={e => setUrl(e.target.value)}
                    placeholder="URL"
                    onKeyDown={e => e.key === 'Enter' && handleSave()}
                />
                <div className="site-edit-actions">
                    <button className="btn btn-primary btn-sm" onClick={handleSave}>Save</button>
                    <button className="btn btn-sm" onClick={handleCancel}>Cancel</button>
                </div>
            </div>
        );
    }

    return (
        <div className="site-item">
            <button
                className={`tog ${site.enabled ? 'on' : 'off'}`}
                onClick={() => onToggle(site.id)}
                aria-checked={site.enabled}
                role="switch"
                aria-label={`Toggle ${site.name}`}
            />
            <div className="site-info" style={{ minWidth: 0, overflow: 'hidden', flex: 1 }}>
                <strong style={{ opacity: site.enabled ? 1 : 0.45 }}>{site.name}</strong>
                <span className="site-url" style={{ opacity: site.enabled ? 1 : 0.45, display: 'block', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{site.url}</span>
            </div>
            <div className="site-row-actions">
                <button className="site-action-btn" onClick={() => setEditing(true)} title="Edit">✎</button>
                <button className="site-action-btn site-action-del" onClick={() => onDelete(site.id)} title="Delete">✕</button>
            </div>
        </div>
    );
};

/* ── inline editable rss feed row ─────────────────────────────── */
const RssFeedRow = ({ feed, onToggle, onDelete, onSave }) => {
    const [editing, setEditing] = useState(false);
    const [category, setCategory] = useState(feed.category || 'General');
    const [url, setUrl] = useState(feed.url);

    const handleSave = () => {
        if (url.trim()) {
            onSave(feed.id, url.trim(), category.trim());
        }
        setEditing(false);
    };

    const handleCancel = () => {
        setCategory(feed.category || 'General');
        setUrl(feed.url);
        setEditing(false);
    };

    if (editing) {
        return (
            <div className="site-item site-item-editing">
                <input
                    className="field-input site-edit-inp"
                    value={category}
                    onChange={e => setCategory(e.target.value)}
                    placeholder="Category (e.g., General)"
                    autoFocus
                />
                <input
                    className="field-input site-edit-inp"
                    value={url}
                    onChange={e => setUrl(e.target.value)}
                    placeholder="RSS Feed URL"
                    onKeyDown={e => e.key === 'Enter' && handleSave()}
                />
                <div className="site-edit-actions">
                    <button className="btn btn-primary btn-sm" onClick={handleSave}>Save</button>
                    <button className="btn btn-sm" onClick={handleCancel}>Cancel</button>
                </div>
            </div>
        );
    }

    return (
        <div className="site-item">
            <button
                className={`tog ${feed.enabled ? 'on' : 'off'}`}
                onClick={() => onToggle(feed.id, feed.enabled)}
                aria-checked={feed.enabled}
                role="switch"
                aria-label={`Toggle Feed`}
            />
            <div className="site-info" style={{ minWidth: 0, overflow: 'hidden', flex: 1 }}>
                <strong style={{ opacity: feed.enabled ? 1 : 0.45 }}>{feed.category || 'General'}</strong>
                <span className="site-url" style={{ opacity: feed.enabled ? 1 : 0.45, display: 'block', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{feed.url}</span>
            </div>
            <div className="site-row-actions">
                <button className="site-action-btn" onClick={() => setEditing(true)} title="Edit">✎</button>
                <button className="site-action-btn site-action-del" onClick={() => onDelete(feed.id)} title="Delete">✕</button>
            </div>
        </div>
    );
};

/* ── main page ────────────────────────────────────────────────── */
const SearchPage = () => {
    const { addToast } = useToast();
    const {
        loading,
        searchSettings, addTag, removeTag,
        addSite, removeSite, updateSite, toggleSite,
        updateSettings,
        clearResults,
        runSearch, isSearching
    } = useSearch();

    const {
        scrapedJobs,
        loading: jobsLoading,
        toggleBookmark,
        markAsSeen,
        removeJob
    } = useScrapedJobs();

    const [newSite, setNewSite] = useState({ name: '', url: '' });
    
    // RSS Feeds
    const { feeds, feedsLoading, addFeed, toggleFeed, deleteFeed, updateFeed } = useRss();
    const [newFeed, setNewFeed] = useState({ url: '', category: '' });
    const [showRssHelp, setShowRssHelp] = useState(false);

    const handleAddSite = () => {
        if (newSite.name.trim() && newSite.url.trim()) {
            addSite(newSite.name.trim(), newSite.url.trim());
            setNewSite({ name: '', url: '' });
        }
    };

    const handleAddFeed = () => {
        if (newFeed.url.trim()) {
            addFeed(newFeed.url.trim(), newFeed.category.trim() || 'General');
            setNewFeed({ url: '', category: '' });
        }
    };

    return (
        <div className="section" id="sec-search">
            <div className="page-header desktop-only">
                <div className="page-header__left">
                    <h2 className="section-title">Job Search</h2>
                </div>
            </div>

            <div className="search-outer">
                {/* ── Left column ───────────────────────────────── */}
                <div style={{ minWidth: 0 }}>
                    {/* Keywords */}
                    <div className="card" style={{ marginBottom: '14px' }}>
                        <div className="card-title" style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                            Search Keywords — Enter to add
                            {loading && <span className="card-inline-spinner" />}
                        </div>
                        <div className="tags-box" onClick={() => document.getElementById('kw-inp').focus()}>
                            {searchSettings.keywords.map((kw, i) => (
                                <span key={i} className="skill-tag-pill">
                                    {kw}
                                    <button className="tag-delete-btn" onClick={() => removeTag('keyword', i)}>✕</button>
                                </span>
                            ))}
                            <input
                                id="kw-inp"
                                className="tag-inp"
                                placeholder="e.g. Python…"
                                onKeyDown={(e) => {
                                    if (e.key === 'Enter' && e.target.value.trim()) {
                                        addTag('keyword', e.target.value.trim());
                                        e.target.value = '';
                                    }
                                }}
                            />
                        </div>
                    </div>

                    {/* Anti-keywords */}
                    <div className="card" style={{ marginBottom: '14px' }}>
                        <div className="card-title" style={{ color: 'var(--danger-c)', display: 'flex', alignItems: 'center', gap: '8px' }}>
                            Exclude Keywords — Enter to add
                            {loading && <span className="card-inline-spinner card-inline-spinner--red" />}
                        </div>
                        <div
                            className="tags-box tags-box-anti"
                            onClick={() => document.getElementById('anti-inp').focus()}
                        >
                            {searchSettings.excludeKeywords.map((kw, i) => (
                                <span key={i} className="skill-tag-pill skill-tag-anti">
                                    {kw}
                                    <button className="tag-delete-btn" onClick={() => removeTag('exclude', i)}>✕</button>
                                </span>
                            ))}
                            <input
                                id="anti-inp"
                                className="tag-inp"
                                placeholder="e.g. Senior Manager, 3+ years…"
                                onKeyDown={(e) => {
                                    if (e.key === 'Enter' && e.target.value.trim()) {
                                        addTag('exclude', e.target.value.trim());
                                        e.target.value = '';
                                    }
                                }}
                            />
                        </div>
                    </div>

                    {/* Target Sites */}
                    <div className="card">
                        <div className="label-row">
                            <div className="card-title" style={{ marginBottom: 0 }}>Target Sites</div>
                            <span className="count-badge">
                                {searchSettings.targetSites.filter(s => s.enabled).length}
                                /{searchSettings.targetSites.length} active
                            </span>
                        </div>

                        <div className="sites-list">
                            {loading ? (
                                <div className="search-skeleton-box search-skeleton-box--col">
                                    <span className="sk-site-row" />
                                    <span className="sk-site-row sk-site-row--short" />
                                    <span className="sk-site-row" />
                                </div>
                            ) : (
                                <>
                                    {searchSettings.targetSites.length === 0 && (
                                        <p className="empty-hint" style={{ padding: '8px 0' }}>No sites yet — add one below</p>
                                    )}
                                    {searchSettings.targetSites.map(site => (
                                        <SiteRow
                                            key={site.id}
                                            site={site}
                                            onToggle={toggleSite}
                                            onDelete={removeSite}
                                            onSave={updateSite}
                                        />
                                    ))}
                                </>
                            )}
                        </div>

                        {/* Add site */}
                        <div className="skills-input-wrapper" style={{ marginTop: '10px' }}>
                            <input
                                className="field-input"
                                placeholder="Company name"
                                value={newSite.name}
                                onChange={e => setNewSite({ ...newSite, name: e.target.value })}
                                onKeyDown={e => e.key === 'Enter' && handleAddSite()}
                            />
                            <input
                                className="field-input"
                                placeholder="URL"
                                value={newSite.url}
                                onChange={e => setNewSite({ ...newSite, url: e.target.value })}
                                onKeyDown={e => e.key === 'Enter' && handleAddSite()}
                            />
                            <button className="btn btn-sm" onClick={handleAddSite}>+ Add</button>
                        </div>

                        <div style={{ marginTop: '14px', paddingTop: '12px', borderTop: '1px solid var(--border)', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '10px' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                <label style={{ fontSize: '14px', fontWeight: '500' }}>Schedule:</label>
                                <select 
                                    className="field-input" 
                                    style={{ width: 'auto', padding: '4px 8px' }}
                                    value={searchSettings.scheduleFrequency || 'Manual only'}
                                    onChange={async (e) => {
                                        const newVal = e.target.value;
                                        try {
                                            await updateSettings('scheduleFrequency', newVal);
                                            addToast('Schedule setting updated', 'success');
                                        } catch (err) {
                                            addToast('Failed to update schedule', 'error');
                                        }
                                    }}
                                >
                                    <option value="Manual only">Manual only</option>
                                    <option value="daily">Daily</option>
                                    <option value="weekly">Weekly</option>
                                    <option value="2 weeks">2 weeks</option>
                                    <option value="monthly">Monthly</option>
                                </select>
                            </div>
                            <button className="btn btn-primary" onClick={async () => {
                                addToast('Starting manual search...', 'info');
                                try {
                                    const res = await runSearch();
                                    addToast(`Search complete! Found ${res.totalFound} jobs across ${res.sitesScraped} sites.`, 'success');
                                } catch (err) {
                                    addToast(`Search failed: ${err.message}`, 'error');
                                }
                            }} disabled={isSearching}>
                                {isSearching ? 'Searching...' : 'Run Search Now'}
                            </button>
                        </div>
                    </div>



                    {/* Google Alerts RSS Feeds */}
                    <div className="card" style={{ marginTop: '14px' }}>
                        <div className="label-row">
                            <div className="card-title" style={{ marginBottom: 0, display: 'flex', alignItems: 'center', gap: '8px' }}>
                                Google Alerts RSS
                                <button 
                                    onClick={() => setShowRssHelp(!showRssHelp)} 
                                    style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#0f6e56', padding: 0, display: 'flex', alignItems: 'center' }}
                                    title="How to set up RSS Feeds"
                                >
                                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="10"></circle><line x1="12" y1="16" x2="12" y2="12"></line><line x1="12" y1="8" x2="12.01" y2="8"></line></svg>
                                </button>
                            </div>
                            <span className="count-badge">
                                {feeds.filter(f => f.enabled).length}
                                /{feeds.length} active
                            </span>
                        </div>
                        {showRssHelp && (
                            <div style={{ backgroundColor: '#f0fdf4', padding: '12px 16px', borderRadius: '8px', marginBottom: '14px', borderLeft: '4px solid #0f6e56', fontSize: '0.9rem', color: '#333' }}>
                                <strong style={{ display: 'block', marginBottom: '8px', color: '#0f6e56' }}>How to set up Google Alerts:</strong>
                                <ol style={{ margin: 0, paddingLeft: '20px', display: 'flex', flexDirection: 'column', gap: '6px' }}>
                                    <li>Go to <a href="https://www.google.com/alerts" target="_blank" rel="noreferrer" style={{ color: '#0369a1', textDecoration: 'underline' }}>Google Alerts</a>.</li>
                                    <li>Enter a search query (e.g., <em>"Junior Software Engineer" "Tel Aviv"</em> or <em>"Junior Full Stack Developer" Israel</em>).</li>
                                    <li>Click <strong>Show options</strong> and change "Deliver to" to <strong>RSS feed</strong>, then click <strong>Create Alert</strong>.</li>
                                    <li>Right-click the <svg width="12" height="12" viewBox="0 0 24 24" fill="orange" stroke="orange" strokeWidth="2" style={{ verticalAlign: 'middle', margin: '0 2px' }}><path d="M4 11a9 9 0 0 1 9 9"></path><path d="M4 4a16 16 0 0 1 16 16"></path><circle cx="5" cy="19" r="1"></circle></svg> RSS icon next to your new alert and copy the link.</li>
                                    <li>Paste it below to start receiving automated AI-filtered job suggestions!</li>
                                </ol>
                            </div>
                        )}

                        <div className="sites-list">
                            {feedsLoading ? (
                                <div className="search-skeleton-box search-skeleton-box--col">
                                    <span className="sk-site-row" />
                                    <span className="sk-site-row sk-site-row--short" />
                                </div>
                            ) : (
                                <>
                                    {feeds.length === 0 && (
                                        <p className="empty-hint" style={{ padding: '8px 0' }}>No feeds yet — add an RSS URL below</p>
                                    )}
                                    {feeds.map(feed => (
                                        <RssFeedRow
                                            key={feed.id}
                                            feed={feed}
                                            onToggle={toggleFeed}
                                            onDelete={deleteFeed}
                                            onSave={updateFeed}
                                        />
                                    ))}
                                </>
                            )}
                        </div>

                        {/* Add Feed */}
                        <div className="skills-input-wrapper" style={{ marginTop: '10px' }}>
                            <input
                                className="field-input"
                                placeholder="Category (e.g. Backend)"
                                value={newFeed.category}
                                onChange={e => setNewFeed({ ...newFeed, category: e.target.value })}
                                onKeyDown={e => e.key === 'Enter' && handleAddFeed()}
                            />
                            <input
                                className="field-input"
                                placeholder="RSS URL"
                                value={newFeed.url}
                                onChange={e => setNewFeed({ ...newFeed, url: e.target.value })}
                                onKeyDown={e => e.key === 'Enter' && handleAddFeed()}
                            />
                            <button className="btn btn-sm" onClick={handleAddFeed}>+ Add</button>
                        </div>
                    </div>
                </div>

                {/* ── Right column: Results ─────────────────────── */}
                <div className="card search-rp">
                    <div className="label-row">
                        <div className="card-title" style={{ marginBottom: 0 }}>Last Run Results</div>
                        <button className="btn btn-sm" onClick={clearResults}>Clear</button>
                    </div>

                    <div className="search-list-content">
                        {searchSettings.lastResults.length === 0 ? (
                            <div className="empty-results">No results yet</div>
                        ) : (
                            searchSettings.lastResults.map((res, i) => (
                                <div key={i} className="site-item" style={{ flexDirection: 'column', alignItems: 'flex-start', padding: '10px' }}>
                                    <strong>{new Date(res.date).toLocaleString()}</strong>
                                    <span style={{ fontSize: '13px', color: 'var(--t3)', marginTop: '4px' }}>
                                        Found {res.totalFound} jobs across {res.sitesScraped} sites.
                                    </span>
                                </div>
                            ))
                        )}
                    </div>

                </div>
            </div>

            {/* ── Bottom Section: Scraped Jobs Queue ─────────────────────── */}
            <div className="card" style={{ marginTop: '20px' }}>
                <div className="label-row" style={{ borderBottom: '1px solid var(--border)', paddingBottom: '10px', marginBottom: '14px' }}>
                    <div className="card-title" style={{ marginBottom: 0 }}>Scraped Job Matches Queue</div>
                    <span className="count-badge">
                        {scrapedJobs.filter(j => !j.seen).length} unseen
                    </span>
                </div>

                {jobsLoading ? (
                    <div style={{ textAlign: 'center', padding: '20px', color: 'var(--text-muted)' }}>Loading scraped jobs...</div>
                ) : scrapedJobs.length === 0 ? (
                    <div style={{ textAlign: 'center', padding: '30px', color: 'var(--text-muted)' }}>
                        No scraped jobs available yet. Add target sites or RSS feeds above, and wait for background scraper to run.
                    </div>
                ) : (
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: '16px' }}>
                        {scrapedJobs.map((job) => (
                            <div 
                                key={job.id} 
                                className={`card ${!job.seen ? 'unseen-job' : ''}`}
                                style={{ 
                                    padding: '16px', 
                                    display: 'flex', 
                                    flexDirection: 'column', 
                                    gap: '10px', 
                                    border: !job.seen ? '1px solid var(--primary-color)' : '1px solid var(--border)',
                                    boxShadow: 'none',
                                    position: 'relative'
                                }}
                                onMouseEnter={() => !job.seen && markAsSeen(job.id)}
                            >
                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                                    <h4 style={{ margin: 0, fontSize: '1.1rem', color: 'var(--text-color)', paddingRight: '20px' }}>{job.title}</h4>
                                    <button 
                                        style={{ 
                                            background: 'none', 
                                            border: 'none', 
                                            cursor: 'pointer', 
                                            color: job.bookmarked ? '#eab308' : 'var(--text-muted)',
                                            padding: 0,
                                            fontSize: '1.2rem',
                                            lineHeight: 1
                                        }}
                                        onClick={() => toggleBookmark(job.id, job.bookmarked)}
                                        title={job.bookmarked ? 'Remove Bookmark' : 'Bookmark Job'}
                                    >
                                        {job.bookmarked ? '★' : '☆'}
                                    </button>
                                </div>
                                <div style={{ fontWeight: '500', color: 'var(--primary-color)' }}>{job.company}</div>
                                {job.location && <div style={{ fontSize: '0.9rem', color: 'var(--text-muted)' }}>📍 {job.location}</div>}
                                
                                <div style={{ marginTop: 'auto', paddingTop: '12px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                    <span style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>
                                        {new Date(job.created_at).toLocaleDateString()}
                                    </span>
                                    <div style={{ display: 'flex', gap: '8px' }}>
                                        <button className="btn btn-sm" style={{ color: 'var(--danger-c)', border: '1px solid var(--danger-c)' }} onClick={() => removeJob(job.id)}>Delete</button>
                                        <a href={job.url} target="_blank" rel="noreferrer" className="btn btn-sm btn-primary">Apply / View</a>
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>

        </div>
    );
};

export default SearchPage;