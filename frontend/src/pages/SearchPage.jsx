import React, { useState, useMemo } from 'react';
import { useSearch } from '../hooks/useSearch';
import { useRss } from '../hooks/useRss';
import { useToast } from '../components/ToastProvider';
import { useScrapedJobs } from '../hooks/useScrapedJobs';
import { useContacts } from '../hooks/useContacts';
import { useSettings } from '../hooks/useSettings';
import ScrapedJobsQueue from '../components/search/ScrapedJobsQueue';
import NetworkSiteSuggestions from '../components/search/NetworkSiteSuggestions';

/* ── inline editable site row ─────────────────────────────────── */
const SiteRow = ({ site, referralContacts = [], onToggle, onDelete, onSave }) => {
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
                    <button type="button" className="btn btn-primary btn-sm" onClick={handleSave}>Save</button>
                    <button type="button" className="btn btn-sm" onClick={handleCancel}>Cancel</button>
                </div>
            </div>
        );
    }

    return (
        <div className={`site-item ${!site.enabled ? 'sp-site-item--disabled' : ''}`}>
            <button
                type="button"
                className={`tog ${site.enabled ? 'on' : 'off'}`}
                onClick={() => onToggle(site.id)}
                aria-checked={site.enabled}
                role="switch"
                aria-label={`Toggle ${site.name}`}
            />
            <div className="site-info" style={{ minWidth: 0, overflow: 'hidden', flex: 1 }}>
                <div className="sp-site-name-row">
                    <strong style={{ opacity: site.enabled ? 1 : 0.5 }}>{site.name}</strong>
                    {referralContacts.length > 0 && (
                        <span
                            className="sp-referral-badge"
                            title={`Network contact${referralContacts.length > 1 ? 's' : ''}: ${referralContacts.join(', ')}`}
                        >
                            👤 {referralContacts.length === 1 ? referralContacts[0] : `${referralContacts.length} contacts`}
                        </span>
                    )}
                </div>
                <span
                    className="site-url"
                    style={{ opacity: site.enabled ? 1 : 0.45, display: 'block', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}
                    title={site.url}
                >
                    {site.url}
                </span>
            </div>
            <div className="site-row-actions">
                <button type="button" className="site-action-btn" onClick={() => setEditing(true)} title="Edit">✎</button>
                <button type="button" className="site-action-btn site-action-del" onClick={() => onDelete(site.id)} title="Delete">✕</button>
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
                    <button type="button" className="btn btn-primary btn-sm" onClick={handleSave}>Save</button>
                    <button type="button" className="btn btn-sm" onClick={handleCancel}>Cancel</button>
                </div>
            </div>
        );
    }

    return (
        <div className={`site-item ${!feed.enabled ? 'sp-site-item--disabled' : ''}`}>
            <button
                type="button"
                className={`tog ${feed.enabled ? 'on' : 'off'}`}
                onClick={() => onToggle(feed.id, feed.enabled)}
                aria-checked={feed.enabled}
                role="switch"
                aria-label={`Toggle ${feed.category || 'Feed'}`}
            />
            <div className="site-info" style={{ minWidth: 0, overflow: 'hidden', flex: 1 }}>
                <strong style={{ opacity: feed.enabled ? 1 : 0.5 }}>{feed.category || 'General'}</strong>
                <span
                    className="site-url"
                    style={{ opacity: feed.enabled ? 1 : 0.45, display: 'block', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}
                    title={feed.url}
                >
                    {feed.url}
                </span>
            </div>
            <div className="site-row-actions">
                <button type="button" className="site-action-btn" onClick={() => setEditing(true)} title="Edit">✎</button>
                <button type="button" className="site-action-btn site-action-del" onClick={() => onDelete(feed.id)} title="Delete">✕</button>
            </div>
        </div>
    );
};

/* ── main page ────────────────────────────────────────────────── */
const SearchPage = () => {
    const { addToast } = useToast();
    const { settings } = useSettings();
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
        removeJob,
        bulkRemoveJobs,
        bulkMarkSeen,
        bulkBookmark,
        isBulkRemoving,
    } = useScrapedJobs();

    const { contacts = [] } = useContacts();
    const { feeds, feedsLoading, addFeed, toggleFeed, deleteFeed, updateFeed } = useRss();

    const [activeView, setActiveView] = useState('queue'); // 'queue' | 'config'
    const [newSite, setNewSite] = useState({ name: '', url: '' });
    const [newFeed, setNewFeed] = useState({ url: '', category: '' });
    const [showRssHelp, setShowRssHelp] = useState(false);

    // Map normalized company name -> referring contact names
    const contactsByCompany = useMemo(() => {
        const map = new Map();
        (contacts || []).forEach(c => {
            const comp = (c.company || '').trim().toLowerCase();
            if (!comp) return;
            if (!map.has(comp)) map.set(comp, []);
            if (c.name && !map.get(comp).includes(c.name)) {
                map.get(comp).push(c.name);
            }
        });
        return map;
    }, [contacts]);

    const activeSitesCount = useMemo(
        () => searchSettings.targetSites.filter(s => s.enabled).length,
        [searchSettings.targetSites]
    );
    const unseenJobsCount = useMemo(
        () => (scrapedJobs || []).filter(j => !j.seen).length,
        [scrapedJobs]
    );

    const handleAddSite = async () => {
        if (!newSite.name.trim() || !newSite.url.trim()) return;
        try {
            await addSite(newSite.name.trim(), newSite.url.trim());
            setNewSite({ name: '', url: '' });
            addToast(`Added ${newSite.name.trim()} to target sites`, 'success');
        } catch (err) {
            addToast(`Failed to add site: ${err.response?.data?.message || err.message || 'Unknown error'}`, 'error');
        }
    };

    const handleAddSuggestedSite = async (name, url) => {
        try {
            await addSite(name, url);
            addToast(`Added ${name} from your network`, 'success');
        } catch (err) {
            addToast(`Failed to add ${name}: ${err.response?.data?.message || err.message || 'Unknown error'}`, 'error');
        }
    };

    const handleAddAllSuggestedSites = async (items) => {
        let added = 0;
        for (const item of items) {
            try {
                await addSite(item.name, item.url);
                added++;
            } catch {
                // continue adding remaining items
            }
        }
        if (added > 0) {
            addToast(`Added ${added} career site${added === 1 ? '' : 's'} from your network`, 'success');
        }
    };

    const handleAddFeed = () => {
        if (newFeed.url.trim()) {
            addFeed(newFeed.url.trim(), newFeed.category.trim() || 'General');
            setNewFeed({ url: '', category: '' });
        }
    };

    const handleRunSearch = async () => {
        addToast('Starting manual search...', 'info');
        try {
            const res = await runSearch();
            addToast(`Search complete! Found ${res.totalFound} jobs across ${res.sitesScraped} sites.`, 'success');
            setActiveView('queue');
        } catch (err) {
            addToast(`Search failed: ${err.response?.data?.message || err.message}`, 'error');
        }
    };

    return (
        <div className="section sp-root" id="sec-search">
            {/* ── Top Command Bar ────────────────────────────────── */}
            <div className="sp-command-bar">
                <div className="sp-command-bar__left">
                    <h2 className="section-title" style={{ margin: 0 }}>Auto Job Search</h2>
                    <div className="sp-metrics-strip">
                        <span className="sp-metric-chip">
                            <strong>{activeSitesCount}/{searchSettings.targetSites.length}</strong> active sites
                        </span>
                        <span className="sp-metric-chip">
                            <strong>{searchSettings.keywords.length}</strong> keywords
                        </span>
                        <span className={`sp-metric-chip ${unseenJobsCount > 0 ? 'sp-metric-chip--accent' : ''}`}>
                            <strong>{unseenJobsCount}</strong> unseen matches
                        </span>
                    </div>
                </div>

                <div className="sp-command-bar__right">
                    <label className="sp-schedule-control">
                        <span>Schedule</span>
                        <select
                            className="field-input sp-schedule-select"
                            aria-label="Search schedule"
                            value={searchSettings.scheduleFrequency || 'Manual only'}
                            onChange={async (e) => {
                                const newVal = e.target.value;
                                try {
                                    await updateSettings('scheduleFrequency', newVal);
                                    addToast('Schedule setting updated', 'success');
                                } catch {
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
                    </label>

                    <button
                        type="button"
                        className="btn btn-primary sp-run-btn"
                        onClick={handleRunSearch}
                        disabled={isSearching}
                    >
                        {isSearching ? 'Searching…' : '▶ Run Search Now'}
                    </button>
                </div>
            </div>

            {/* ── Workspace Tabs ─────────────────────────────────── */}
            <div className="sp-tabs" role="tablist" aria-label="Auto Search sections">
                <button
                    type="button"
                    role="tab"
                    aria-selected={activeView === 'queue'}
                    className={`sp-tab ${activeView === 'queue' ? 'sp-tab--active' : ''}`}
                    onClick={() => setActiveView('queue')}
                >
                    <span>Job Matches Queue</span>
                    <span className="sp-tab-badge">{scrapedJobs.length}</span>
                </button>
                <button
                    type="button"
                    role="tab"
                    aria-selected={activeView === 'config'}
                    className={`sp-tab ${activeView === 'config' ? 'sp-tab--active' : ''}`}
                    onClick={() => setActiveView('config')}
                >
                    <span>Sources & Keywords</span>
                    <span className="sp-tab-badge">{activeSitesCount}</span>
                </button>
            </div>

            {/* ── Tab 1: Scraped Job Matches Queue ───────────────── */}
            {activeView === 'queue' && (
                <ScrapedJobsQueue
                    scrapedJobs={scrapedJobs}
                    loading={jobsLoading}
                    contactsByCompany={contactsByCompany}
                    timezone={settings?.timezone}
                    onToggleBookmark={toggleBookmark}
                    onMarkAsSeen={markAsSeen}
                    onRemoveJob={removeJob}
                    onBulkRemove={bulkRemoveJobs}
                    onBulkMarkSeen={bulkMarkSeen}
                    onBulkBookmark={bulkBookmark}
                    isBulkRemoving={isBulkRemoving}
                />
            )}

            {/* ── Tab 2: Sources, Keywords, RSS & Run History ────── */}
            {activeView === 'config' && (
                <div className="sp-config-layout">
                    {/* Keywords & Excludes side-by-side */}
                    <div className="sp-keywords-grid">
                        <div className="card sp-config-card">
                            <div className="sp-card-header">
                                <div>
                                    <div className="card-title" style={{ marginBottom: '2px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                                        Search Keywords
                                        {loading && <span className="card-inline-spinner" />}
                                    </div>
                                    <p className="sp-card-hint">Press Enter to add. Scraped jobs must match at least one keyword (leave empty to collect all roles).</p>
                                </div>
                            </div>
                            <div className="tags-box" onClick={() => document.getElementById('kw-inp')?.focus()}>
                                {searchSettings.keywords.map((kw, i) => (
                                    <span key={`${kw}-${i}`} className="skill-tag-pill">
                                        {kw}
                                        <button type="button" className="tag-delete-btn" onClick={() => removeTag('keyword', i)} aria-label={`Remove ${kw}`}>✕</button>
                                    </span>
                                ))}
                                <input
                                    id="kw-inp"
                                    className="tag-inp"
                                    placeholder="e.g. Full Stack, Backend, Python…"
                                    onKeyDown={(e) => {
                                        if (e.key === 'Enter' && e.target.value.trim()) {
                                            e.preventDefault();
                                            addTag('keyword', e.target.value.trim());
                                            e.target.value = '';
                                        }
                                    }}
                                />
                            </div>
                        </div>

                        <div className="card sp-config-card">
                            <div className="sp-card-header">
                                <div>
                                    <div className="card-title" style={{ color: 'var(--danger-c)', marginBottom: '2px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                                        Exclude Keywords
                                        {loading && <span className="card-inline-spinner card-inline-spinner--red" />}
                                    </div>
                                    <p className="sp-card-hint">Press Enter to add. Any scraped job matching an excluded term is automatically skipped.</p>
                                </div>
                            </div>
                            <div
                                className="tags-box tags-box-anti"
                                onClick={() => document.getElementById('anti-inp')?.focus()}
                            >
                                {searchSettings.excludeKeywords.map((kw, i) => (
                                    <span key={`${kw}-${i}`} className="skill-tag-pill skill-tag-anti">
                                        {kw}
                                        <button type="button" className="tag-delete-btn" onClick={() => removeTag('exclude', i)} aria-label={`Remove ${kw}`}>✕</button>
                                    </span>
                                ))}
                                <input
                                    id="anti-inp"
                                    className="tag-inp"
                                    placeholder="e.g. Senior, Staff, Manager, Intern…"
                                    onKeyDown={(e) => {
                                        if (e.key === 'Enter' && e.target.value.trim()) {
                                            e.preventDefault();
                                            addTag('exclude', e.target.value.trim());
                                            e.target.value = '';
                                        }
                                    }}
                                />
                            </div>
                        </div>
                    </div>

                    {/* Target Sites + Network Suggestions */}
                    <div className="card sp-config-card">
                        <div className="label-row">
                            <div className="card-title" style={{ marginBottom: 0 }}>Target Sites</div>
                            <span className="count-badge">
                                {activeSitesCount}/{searchSettings.targetSites.length} active
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
                                        <p className="empty-hint" style={{ padding: '8px 0' }}>No sites yet — add one below or import from your Network</p>
                                    )}
                                    {searchSettings.targetSites.map(site => (
                                        <SiteRow
                                            key={site.id}
                                            site={site}
                                            referralContacts={contactsByCompany.get((site.name || '').trim().toLowerCase()) || []}
                                            onToggle={toggleSite}
                                            onDelete={removeSite}
                                            onSave={updateSite}
                                        />
                                    ))}
                                </>
                            )}
                        </div>

                        {/* Add site */}
                        <div className="skills-input-wrapper" style={{ marginTop: '12px' }}>
                            <input
                                className="field-input"
                                placeholder="Company name"
                                value={newSite.name}
                                onChange={e => setNewSite({ ...newSite, name: e.target.value })}
                                onKeyDown={e => e.key === 'Enter' && handleAddSite()}
                            />
                            <input
                                className="field-input"
                                placeholder="Careers page URL (https://...)"
                                value={newSite.url}
                                onChange={e => setNewSite({ ...newSite, url: e.target.value })}
                                onKeyDown={e => e.key === 'Enter' && handleAddSite()}
                            />
                            <button type="button" className="btn btn-primary btn-sm" onClick={handleAddSite}>+ Add Site</button>
                        </div>

                        {/* Network Careers Suggestions */}
                        <NetworkSiteSuggestions
                            contacts={contacts}
                            targetSites={searchSettings.targetSites}
                            onAddSite={handleAddSuggestedSite}
                            onAddMultipleSites={handleAddAllSuggestedSites}
                        />
                    </div>

                    {/* Bottom 2-column grid: Google Alerts RSS & Run History */}
                    <div className="sp-secondary-grid">
                        <div className="card sp-config-card">
                            <div className="label-row">
                                <div className="card-title" style={{ marginBottom: 0, display: 'flex', alignItems: 'center', gap: '8px' }}>
                                    Google Alerts RSS
                                    <button
                                        type="button"
                                        onClick={() => setShowRssHelp(!showRssHelp)}
                                        style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#0f6e56', padding: 0, display: 'flex', alignItems: 'center' }}
                                        title="How to set up RSS Feeds"
                                    >
                                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="10"></circle><line x1="12" y1="16" x2="12" y2="12"></line><line x1="12" y1="8" x2="12.01" y2="8"></line></svg>
                                    </button>
                                </div>
                                <span className="count-badge">
                                    {feeds.filter(f => f.enabled).length}/{feeds.length} active
                                </span>
                            </div>

                            {showRssHelp && (
                                <div className="sp-rss-help">
                                    <strong>How to set up Google Alerts:</strong>
                                    <ol>
                                        <li>Go to <a href="https://www.google.com/alerts" target="_blank" rel="noreferrer">Google Alerts</a>.</li>
                                        <li>Enter a search query (e.g., <em>"Junior Software Engineer" "Tel Aviv"</em>).</li>
                                        <li>Click <strong>Show options</strong>, change "Deliver to" to <strong>RSS feed</strong>, and click <strong>Create Alert</strong>.</li>
                                        <li>Right-click the RSS icon, copy the link, and paste it below.</li>
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

                            <div className="skills-input-wrapper" style={{ marginTop: '12px' }}>
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
                                <button type="button" className="btn btn-sm" onClick={handleAddFeed}>+ Add</button>
                            </div>
                        </div>

                        <div className="card sp-config-card">
                            <div className="label-row">
                                <div className="card-title" style={{ marginBottom: 0 }}>Run History</div>
                                {searchSettings.lastResults.length > 0 && (
                                    <button type="button" className="btn btn-sm" onClick={clearResults}>Clear</button>
                                )}
                            </div>

                            <div className="sp-run-history">
                                {searchSettings.lastResults.length === 0 ? (
                                    <div className="empty-results">No runs recorded yet</div>
                                ) : (
                                    searchSettings.lastResults.map((res, i) => (
                                        <div key={i} className="sp-run-history__item">
                                            <span className="sp-run-history__date">{new Date(res.date).toLocaleString()}</span>
                                            <span className="sp-run-history__summary">
                                                Found <strong>{res.totalFound}</strong> jobs across <strong>{res.sitesScraped}</strong> sites
                                            </span>
                                        </div>
                                    ))
                                )}
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default SearchPage;
