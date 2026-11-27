import React, { useState, useMemo, useRef, useEffect } from 'react';
import { useConfirm } from '../ConfirmProvider';
import { formatDate } from '../../utils/helpers';

const ScrapedJobsQueue = ({
    scrapedJobs = [],
    loading = false,
    contactsByCompany = new Map(),
    timezone,
    onToggleBookmark,
    onMarkAsSeen,
    onRemoveJob,
    onBulkRemove,
    onBulkMarkSeen,
    onBulkBookmark,
    isBulkRemoving = false,
}) => {
    const confirm = useConfirm();

    // Filter, sort & selection state
    const [searchText, setSearchText] = useState('');
    const [selectedCompany, setSelectedCompany] = useState('all');
    const [statusFilter, setStatusFilter] = useState('all'); // 'all' | 'unseen' | 'bookmarked'
    const [sortBy, setSortBy] = useState('date'); // 'date' | 'company' | 'title' | 'bookmarked'
    const [sortOrder, setSortOrder] = useState('desc'); // 'desc' | 'asc'
    const [selectedIds, setSelectedIds] = useState([]);
    const selectAllRef = useRef(null);

    // Distinct companies with job counts
    const companyOptions = useMemo(() => {
        const counts = new Map();
        (scrapedJobs || []).forEach(job => {
            const name = (job.company || 'Unknown').trim();
            counts.set(name, (counts.get(name) || 0) + 1);
        });
        return Array.from(counts.entries())
            .sort((a, b) => a[0].localeCompare(b[0]));
    }, [scrapedJobs]);

    const unseenCount = useMemo(() => (scrapedJobs || []).filter(j => !j.seen).length, [scrapedJobs]);
    const bookmarkedCount = useMemo(() => (scrapedJobs || []).filter(j => j.bookmarked).length, [scrapedJobs]);

    // Filtered & sorted jobs
    const displayedJobs = useMemo(() => {
        const q = searchText.trim().toLowerCase();

        return [...(scrapedJobs || [])]
            .filter(job => {
                if (selectedCompany !== 'all' && (job.company || 'Unknown').trim() !== selectedCompany) {
                    return false;
                }
                if (statusFilter === 'unseen' && job.seen) return false;
                if (statusFilter === 'bookmarked' && !job.bookmarked) return false;
                if (q) {
                    const hay = `${job.title || ''} ${job.company || ''} ${job.location || ''}`.toLowerCase();
                    if (!hay.includes(q)) return false;
                }
                return true;
            })
            .sort((a, b) => {
                const dateA = new Date(a.scraped_at || a.created_at || 0).getTime();
                const dateB = new Date(b.scraped_at || b.created_at || 0).getTime();

                if (sortBy === 'bookmarked') {
                    const bmDiff = Number(Boolean(b.bookmarked)) - Number(Boolean(a.bookmarked));
                    if (bmDiff !== 0) return sortOrder === 'desc' ? bmDiff : -bmDiff;
                    return dateB - dateA;
                }

                let comparison = 0;
                if (sortBy === 'company') {
                    comparison = (a.company || '').localeCompare(b.company || '');
                    return sortOrder === 'asc' ? comparison : -comparison;
                }
                if (sortBy === 'title') {
                    comparison = (a.title || '').localeCompare(b.title || '');
                    return sortOrder === 'asc' ? comparison : -comparison;
                }

                // default: date
                comparison = dateB - dateA;
                return sortOrder === 'desc' ? comparison : -comparison;
            });
    }, [scrapedJobs, selectedCompany, statusFilter, searchText, sortBy, sortOrder]);

    // Derive visible selected IDs without cascading effect setState
    const visibleSelectedIds = useMemo(() => {
        const visibleSet = new Set(displayedJobs.map(j => j.id));
        return selectedIds.filter(id => visibleSet.has(id));
    }, [displayedJobs, selectedIds]);

    const allVisibleSelected = displayedJobs.length > 0 && visibleSelectedIds.length === displayedJobs.length;
    const someVisibleSelected = visibleSelectedIds.length > 0 && visibleSelectedIds.length < displayedJobs.length;

    useEffect(() => {
        if (selectAllRef.current) {
            selectAllRef.current.indeterminate = someVisibleSelected;
        }
    }, [someVisibleSelected]);

    const toggleSelect = (id) => {
        setSelectedIds(prev => (prev.includes(id) ? prev.filter(item => item !== id) : [...prev, id]));
    };

    const handleToggleSelectAll = (e) => {
        if (e.target.checked) {
            setSelectedIds(displayedJobs.map(j => j.id));
        } else {
            setSelectedIds([]);
        }
    };

    const handleBulkRemove = async () => {
        if (visibleSelectedIds.length === 0) return;
        const ok = await confirm(`Remove ${visibleSelectedIds.length} selected job${visibleSelectedIds.length === 1 ? '' : 's'} from the queue?`);
        if (!ok) return;
        const idsToRemove = [...visibleSelectedIds];
        setSelectedIds([]);
        await onBulkRemove?.(idsToRemove);
    };

    const handleBulkMarkSeen = async () => {
        if (visibleSelectedIds.length === 0) return;
        const unseenSelected = visibleSelectedIds.filter(id => {
            const job = displayedJobs.find(j => j.id === id);
            return job && !job.seen;
        });
        if (unseenSelected.length > 0) {
            await onBulkMarkSeen?.(unseenSelected);
        }
        setSelectedIds([]);
    };

    const handleBulkBookmark = async () => {
        if (visibleSelectedIds.length === 0) return;
        await onBulkBookmark?.([...visibleSelectedIds]);
        setSelectedIds([]);
    };

    const sortDirLabel = sortBy === 'date'
        ? (sortOrder === 'desc' ? '↓ Newest' : '↑ Oldest')
        : sortBy === 'bookmarked'
            ? (sortOrder === 'desc' ? '★ First' : '☆ First')
            : (sortOrder === 'asc' ? '↑ A–Z' : '↓ Z–A');

    const handleSortByChange = (nextSort) => {
        setSortBy(nextSort);
        if (nextSort === 'company' || nextSort === 'title') {
            setSortOrder('asc');
        } else {
            setSortOrder('desc');
        }
    };

    return (
        <div className="card sp-queue-card">
            {/* Queue Controls Toolbar */}
            <div className="sp-queue-toolbar">
                <div className="sp-queue-filters">
                    <div className="sp-status-pills" role="tablist" aria-label="Filter jobs by status">
                        <button
                            type="button"
                            className={`sp-pill ${statusFilter === 'all' ? 'sp-pill--active' : ''}`}
                            onClick={() => setStatusFilter('all')}
                        >
                            All ({scrapedJobs.length})
                        </button>
                        <button
                            type="button"
                            className={`sp-pill ${statusFilter === 'unseen' ? 'sp-pill--active' : ''}`}
                            onClick={() => setStatusFilter('unseen')}
                        >
                            Unseen ({unseenCount})
                        </button>
                        <button
                            type="button"
                            className={`sp-pill ${statusFilter === 'bookmarked' ? 'sp-pill--active' : ''}`}
                            onClick={() => setStatusFilter('bookmarked')}
                        >
                            ★ Bookmarked ({bookmarkedCount})
                        </button>
                    </div>

                    <input
                        type="text"
                        className="field-input sp-queue-search"
                        placeholder="Search job title, company, location..."
                        aria-label="Search scraped jobs"
                        value={searchText}
                        onChange={(e) => setSearchText(e.target.value)}
                    />
                </div>

                <div className="sp-queue-sort-group">
                    <select
                        className="field-input sp-queue-select"
                        aria-label="Filter by company"
                        value={selectedCompany}
                        onChange={(e) => setSelectedCompany(e.target.value)}
                    >
                        <option value="all">All Companies ({companyOptions.length})</option>
                        {companyOptions.map(([company, count]) => (
                            <option key={company} value={company}>
                                {company} ({count})
                            </option>
                        ))}
                    </select>

                    <select
                        className="field-input sp-queue-select"
                        aria-label="Sort scraped jobs"
                        value={sortBy}
                        onChange={(e) => handleSortByChange(e.target.value)}
                    >
                        <option value="date">Sort by Date</option>
                        <option value="company">Sort by Company</option>
                        <option value="title">Sort by Title</option>
                        <option value="bookmarked">Sort by Bookmarked</option>
                    </select>

                    <button
                        type="button"
                        className="btn sp-sort-dir-btn"
                        onClick={() => setSortOrder(prev => (prev === 'desc' ? 'asc' : 'desc'))}
                    >
                        {sortDirLabel}
                    </button>
                </div>
            </div>

            {/* Bulk Selection Bar */}
            {!loading && displayedJobs.length > 0 && (
                <div className={`sp-bulk-bar ${visibleSelectedIds.length > 0 ? 'sp-bulk-bar--active' : ''}`}>
                    <label className="sp-select-all">
                        <input
                            ref={selectAllRef}
                            type="checkbox"
                            checked={allVisibleSelected}
                            onChange={handleToggleSelectAll}
                        />
                        <span>
                            {allVisibleSelected
                                ? `All ${displayedJobs.length} selected`
                                : `Select all (${displayedJobs.length})`}
                        </span>
                    </label>

                    {visibleSelectedIds.length > 0 ? (
                        <div className="sp-bulk-actions">
                            <span className="sp-bulk-count">{visibleSelectedIds.length} selected</span>
                            <button type="button" className="btn btn-sm" onClick={handleBulkBookmark}>
                                ★ Bookmark
                            </button>
                            <button type="button" className="btn btn-sm" onClick={handleBulkMarkSeen}>
                                ✓ Mark Seen
                            </button>
                            <button
                                type="button"
                                className="btn btn-sm sp-btn-danger"
                                onClick={handleBulkRemove}
                                disabled={isBulkRemoving}
                            >
                                ✕ Remove Selected ({visibleSelectedIds.length})
                            </button>
                            <button
                                type="button"
                                className="btn btn-sm"
                                onClick={() => setSelectedIds([])}
                            >
                                Clear
                            </button>
                        </div>
                    ) : (
                        <span className="sp-queue-showing">
                            Showing {displayedJobs.length} of {scrapedJobs.length} job{scrapedJobs.length === 1 ? '' : 's'}
                        </span>
                    )}
                </div>
            )}

            {/* Queue Grid / States */}
            {loading ? (
                <div className="sp-queue-empty">Loading scraped jobs…</div>
            ) : scrapedJobs.length === 0 ? (
                <div className="sp-queue-empty">
                    No scraped job matches yet. Configure your keywords & target sites, then click <strong>Run Search Now</strong>.
                </div>
            ) : displayedJobs.length === 0 ? (
                <div className="sp-queue-empty">
                    No jobs match the current filters.
                    <div style={{ marginTop: '10px' }}>
                        <button
                            type="button"
                            className="btn btn-sm"
                            onClick={() => {
                                setSearchText('');
                                setSelectedCompany('all');
                                setStatusFilter('all');
                            }}
                        >
                            Reset Filters
                        </button>
                    </div>
                </div>
            ) : (
                <div className="sp-jobs-grid">
                    {displayedJobs.map((job) => {
                        const isSelected = visibleSelectedIds.includes(job.id);
                        const referralContacts = contactsByCompany.get((job.company || '').trim().toLowerCase()) || [];
                        const jobDate = job.scraped_at || job.created_at;

                        return (
                            <div
                                key={job.id}
                                className={`sp-job-card ${!job.seen ? 'sp-job-card--unseen' : ''} ${isSelected ? 'sp-job-card--selected' : ''}`}
                            >
                                <div className="sp-job-card__top">
                                    <label className="sp-job-card__check" title={`Select ${job.title}`}>
                                        <input
                                            type="checkbox"
                                            checked={isSelected}
                                            onChange={() => toggleSelect(job.id)}
                                            aria-label={`Select ${job.title}`}
                                        />
                                    </label>
                                    <div className="sp-job-card__heading">
                                        <h4 className="sp-job-card__title" title={job.title}>
                                            {!job.seen && <span className="sp-unseen-dot" title="Unseen" />}
                                            {job.title}
                                        </h4>
                                        <div className="sp-job-card__company-row">
                                            <span className="sp-job-card__company">{job.company}</span>
                                            {referralContacts.length > 0 && (
                                                <span
                                                    className="sp-referral-badge"
                                                    title={`Network contact${referralContacts.length > 1 ? 's' : ''}: ${referralContacts.join(', ')}`}
                                                >
                                                    👤 {referralContacts.length === 1 ? referralContacts[0] : `${referralContacts.length} contacts`}
                                                </span>
                                            )}
                                        </div>
                                    </div>
                                    <button
                                        type="button"
                                        className={`sp-bookmark-btn ${job.bookmarked ? 'sp-bookmark-btn--active' : ''}`}
                                        onClick={() => onToggleBookmark?.(job.id, job.bookmarked)}
                                        title={job.bookmarked ? 'Remove Bookmark' : 'Bookmark Job'}
                                        aria-label={job.bookmarked ? 'Remove Bookmark' : 'Bookmark Job'}
                                    >
                                        {job.bookmarked ? '★' : '☆'}
                                    </button>
                                </div>

                                {job.location && (
                                    <div className="sp-job-card__location">📍 {job.location}</div>
                                )}

                                <div className="sp-job-card__footer">
                                    <span className="sp-job-card__date">
                                        {jobDate ? (formatDate(jobDate, timezone) || new Date(jobDate).toLocaleDateString()) : ''}
                                    </span>
                                    <div className="sp-job-card__actions">
                                        {!job.seen && (
                                            <button
                                                type="button"
                                                className="btn btn-sm"
                                                onClick={() => onMarkAsSeen?.(job.id)}
                                                title="Mark as seen"
                                            >
                                                ✓ Seen
                                            </button>
                                        )}
                                        <button
                                            type="button"
                                            className="btn btn-sm sp-btn-danger"
                                            onClick={() => onRemoveJob?.(job.id)}
                                        >
                                            Delete
                                        </button>
                                        <a
                                            href={job.url}
                                            target="_blank"
                                            rel="noreferrer"
                                            className="btn btn-sm btn-primary"
                                            onClick={() => {
                                                if (!job.seen) onMarkAsSeen?.(job.id);
                                            }}
                                        >
                                            Apply / View
                                        </a>
                                    </div>
                                </div>
                            </div>
                        );
                    })}
                </div>
            )}
        </div>
    );
};

export default ScrapedJobsQueue;
