import React, { useState } from 'react';
import { useSearch } from '../hooks/useSearch';

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
            <div className="site-info">
                <strong style={{ opacity: site.enabled ? 1 : 0.45 }}>{site.name}</strong>
                <span className="site-url" style={{ opacity: site.enabled ? 1 : 0.45 }}>{site.url}</span>
            </div>
            <div className="site-row-actions">
                <button className="site-action-btn" onClick={() => setEditing(true)} title="Edit">✎</button>
                <button className="site-action-btn site-action-del" onClick={() => onDelete(site.id)} title="Delete">✕</button>
            </div>
        </div>
    );
};

/* ── main page ────────────────────────────────────────────────── */
const SearchPage = () => {
    const {
        searchSettings, addTag, removeTag,
        addSite, removeSite, updateSite, toggleSite,
        clearResults
    } = useSearch();

    const [newSite, setNewSite] = useState({ name: '', url: '' });

    const handleAddSite = () => {
        if (newSite.name.trim() && newSite.url.trim()) {
            addSite(newSite.name.trim(), newSite.url.trim());
            setNewSite({ name: '', url: '' });
        }
    };

    return (
        <div className="section" id="sec-search">
            <div className="toolbar">
                <h2 className="section-title">Job Search</h2>
            </div>

            <div className="search-outer">
                {/* ── Left column ───────────────────────────────── */}
                <div>
                    {/* Keywords */}
                    <div className="card" style={{ marginBottom: '14px' }}>
                        <div className="card-title">Search Keywords — Enter to add</div>
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
                        <div className="card-title" style={{ color: 'var(--danger-c)' }}>
                            Exclude Keywords — Enter to add
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
                    </div>

                    {/* Actions */}
                    <div className="btn-group" style={{ marginTop: '14px' }}>
                        <button className="btn btn-primary">Run Search Now</button>
                        <button className="btn">Save Settings</button>
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
                                <div key={i} className="site-item">
                                    <span>{res.title}</span>
                                </div>
                            ))
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
};

export default SearchPage;