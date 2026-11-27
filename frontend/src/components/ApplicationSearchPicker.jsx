import React, { useState, useMemo, useRef, useEffect } from 'react';
import { statusBadgeClass, formatDate } from '../utils/helpers';

/**
 * Reusable searchable application combobox.
 * - variant="dashboard": elevated header search bar with icon, recent apps on focus, optional date metadata.
 * - variant="modal": form field picker with selected-application pill & unlink button.
 */
const ApplicationSearchPicker = ({
    applications = [],
    onSelect,
    selectedApp = null,
    onClearSelection,
    variant = 'modal',
    id,
    placeholder = 'Search application by company or role...',
    ariaLabel = 'Search applications',
    listboxLabel = 'Matching applications',
    loading = false,
    timezone,
    maxResults = 8,
    recentLimit = 5,
    showRecentOnFocus = false,
    showDate = false,
    showStage = false,
    emptySearchText = 'No matching applications found.',
    emptyListText = 'No matching applications',
}) => {
    const [query, setQuery] = useState('');
    const [isOpen, setIsOpen] = useState(false);
    const [highlightedIdx, setHighlightedIdx] = useState(0);
    const containerRef = useRef(null);

    const results = useMemo(() => {
        const sorted = showRecentOnFocus
            ? [...applications].sort((a, b) => new Date(b.DATE || 0) - new Date(a.DATE || 0))
            : applications;

        const q = query.trim().toLowerCase();
        if (!q) {
            return sorted.slice(0, showRecentOnFocus ? recentLimit : maxResults);
        }

        return sorted
            .filter((app) =>
                (app.COMPANY || '').toLowerCase().includes(q) ||
                (app.ROLE_ID || '').toLowerCase().includes(q) ||
                (app.STATUS || '').toLowerCase().includes(q) ||
                (app.STAGE || '').toLowerCase().includes(q) ||
                (app.LOCATION || '').toLowerCase().includes(q)
            )
            .slice(0, maxResults);
    }, [applications, query, showRecentOnFocus, recentLimit, maxResults]);

    useEffect(() => {
        if (!isOpen) return;
        const handleClickOutside = (e) => {
            if (containerRef.current && !containerRef.current.contains(e.target)) {
                setIsOpen(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, [isOpen]);

    const handlePick = (app) => {
        onSelect?.(app);
        setQuery('');
        setIsOpen(false);
        setHighlightedIdx(0);
    };

    const handleKeyDown = (e) => {
        if (!isOpen && (e.key === 'ArrowDown' || e.key === 'Enter')) {
            setIsOpen(true);
            return;
        }
        if (e.key === 'ArrowDown') {
            e.preventDefault();
            setHighlightedIdx((prev) => (results.length > 0 ? (prev + 1) % results.length : 0));
        } else if (e.key === 'ArrowUp') {
            e.preventDefault();
            setHighlightedIdx((prev) => (results.length > 0 ? (prev - 1 + results.length) % results.length : 0));
        } else if (e.key === 'Enter' && isOpen && results[highlightedIdx]) {
            e.preventDefault();
            handlePick(results[highlightedIdx]);
        } else if (e.key === 'Escape') {
            setIsOpen(false);
        }
    };

    if (variant === 'modal' && selectedApp) {
        return (
            <div className="insight-app-picker" ref={containerRef}>
                <div className="insight-app-picker__selected">
                    <div className="insight-app-picker__selected-info">
                        <span className="insight-app-picker__selected-label">
                            {selectedApp.COMPANY}{selectedApp.ROLE_ID ? ` — ${selectedApp.ROLE_ID}` : ''}
                        </span>
                        {selectedApp.STATUS && (
                            <span className={`badge ${statusBadgeClass(selectedApp.STATUS)}`}>
                                {selectedApp.STATUS}
                            </span>
                        )}
                    </div>
                    <button
                        type="button"
                        className="insight-app-picker__clear"
                        onClick={() => {
                            onClearSelection?.();
                            setQuery('');
                        }}
                        title="Unlink application"
                        aria-label="Unlink application"
                    >
                        ✕
                    </button>
                </div>
            </div>
        );
    }

    const isDashboard = variant === 'dashboard';
    const rootClass = isDashboard ? 'dashboard-quick-search' : 'insight-app-picker';
    const dropdownClass = isDashboard ? 'dashboard-quick-search__dropdown' : 'insight-app-picker__dropdown';
    const itemClass = isDashboard ? 'dashboard-quick-search__item' : 'insight-app-picker__option';
    const emptyClass = isDashboard ? 'dashboard-quick-search__empty' : 'insight-app-picker__empty';

    return (
        <div className={rootClass} ref={containerRef}>
            {isDashboard ? (
                <div className="dashboard-quick-search__box">
                    <span className="dashboard-quick-search__icon" aria-hidden="true">
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                            <circle cx="11" cy="11" r="8"></circle>
                            <line x1="21" y1="21" x2="16.65" y2="16.65"></line>
                        </svg>
                    </span>
                    <input
                        id={id}
                        type="text"
                        className="dashboard-quick-search__input"
                        placeholder={placeholder}
                        aria-label={ariaLabel}
                        value={query}
                        onFocus={() => setIsOpen(true)}
                        onChange={(e) => {
                            setQuery(e.target.value);
                            setHighlightedIdx(0);
                            setIsOpen(true);
                        }}
                        onKeyDown={handleKeyDown}
                        autoComplete="off"
                    />
                    {query && (
                        <button
                            type="button"
                            className="dashboard-quick-search__clear"
                            aria-label="Clear search"
                            onClick={() => {
                                setQuery('');
                                setHighlightedIdx(0);
                            }}
                        >
                            ✕
                        </button>
                    )}
                </div>
            ) : (
                <input
                    id={id}
                    type="text"
                    className="field-input"
                    placeholder={placeholder}
                    aria-label={ariaLabel}
                    value={query}
                    onFocus={() => setIsOpen(true)}
                    onChange={(e) => {
                        setQuery(e.target.value);
                        setHighlightedIdx(0);
                        setIsOpen(true);
                    }}
                    onKeyDown={handleKeyDown}
                    autoComplete="off"
                />
            )}

            {isOpen && (
                <div className={dropdownClass} role="listbox" aria-label={listboxLabel}>
                    {loading ? (
                        <div className={emptyClass}>Loading applications…</div>
                    ) : results.length === 0 ? (
                        <div className={emptyClass}>
                            {query.trim() ? emptySearchText : emptyListText}
                        </div>
                    ) : (
                        results.map((app, idx) => (
                            <button
                                key={app.id}
                                type="button"
                                role="option"
                                aria-selected={idx === highlightedIdx}
                                className={`${itemClass} ${idx === highlightedIdx ? `${itemClass}--active` : ''}`}
                                onMouseEnter={() => setHighlightedIdx(idx)}
                                onClick={() => handlePick(app)}
                            >
                                <div className="dashboard-quick-search__item-main">
                                    <div className="dashboard-quick-search__company">{app.COMPANY}</div>
                                    {(app.ROLE_ID || (showStage && app.STAGE)) && (
                                        <div className="dashboard-quick-search__role">
                                            {app.ROLE_ID}{showStage && app.STAGE ? ` • ${app.STAGE}` : ''}
                                        </div>
                                    )}
                                </div>
                                <div className="dashboard-quick-search__meta">
                                    {app.STATUS && (
                                        <span className={`badge ${statusBadgeClass(app.STATUS)}`}>
                                            {app.STATUS}
                                        </span>
                                    )}
                                    {showDate && app.DATE && (
                                        <span className="dashboard-quick-search__date">
                                            {formatDate(app.DATE, timezone)}
                                        </span>
                                    )}
                                </div>
                            </button>
                        ))
                    )}
                </div>
            )}
        </div>
    );
};

export default ApplicationSearchPicker;
