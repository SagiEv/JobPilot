import React, { useState, useMemo } from 'react';

const normalizeUrl = (raw = '') => {
    const trimmed = String(raw).trim();
    if (!trimmed) return '';
    const withProtocol = /^https?:\/\//i.test(trimmed) ? trimmed : `https://${trimmed}`;
    try {
        const u = new URL(withProtocol);
        return `${u.hostname.replace(/^www\./i, '').toLowerCase()}${u.pathname.replace(/\/+$/, '').toLowerCase()}`;
    } catch {
        return '';
    }
};

const toValidHref = (raw = '') => {
    const trimmed = String(raw).trim();
    if (!trimmed) return '';
    const withProtocol = /^https?:\/\//i.test(trimmed) ? trimmed : `https://${trimmed}`;
    try {
        const u = new URL(withProtocol);
        return u.hostname.includes('.') ? u.href : '';
    } catch {
        return '';
    }
};

const NetworkSiteSuggestions = ({ contacts = [], targetSites = [], onAddSite, onAddMultipleSites }) => {
    const [isExpanded, setIsExpanded] = useState(false);
    const [addingKey, setAddingKey] = useState(null);
    const [isAddingAll, setIsAddingAll] = useState(false);

    const suggestions = useMemo(() => {
        const existingUrls = new Set((targetSites || []).map(s => normalizeUrl(s.url)).filter(Boolean));
        const existingCompanies = new Set((targetSites || []).map(s => (s.name || '').trim().toLowerCase()).filter(Boolean));

        const grouped = new Map();
        (contacts || []).forEach((contact) => {
            const company = (contact.company || '').trim();
            const href = toValidHref(contact.link);
            if (!company || !href) return;

            const normUrl = normalizeUrl(href);
            const normCompany = company.toLowerCase();
            if (!normUrl || existingUrls.has(normUrl) || existingCompanies.has(normCompany)) {
                return;
            }

            if (!grouped.has(normUrl)) {
                grouped.set(normUrl, {
                    key: normUrl,
                    name: company,
                    url: href,
                    contacts: [],
                });
            }
            if (contact.name && !grouped.get(normUrl).contacts.includes(contact.name)) {
                grouped.get(normUrl).contacts.push(contact.name);
            }
        });

        return Array.from(grouped.values()).sort((a, b) => a.name.localeCompare(b.name));
    }, [contacts, targetSites]);

    if (suggestions.length === 0) return null;

    const handleAddOne = async (item) => {
        setAddingKey(item.key);
        try {
            await onAddSite?.(item.name, item.url);
        } finally {
            setAddingKey(null);
        }
    };

    const handleAddAll = async () => {
        setIsAddingAll(true);
        try {
            await onAddMultipleSites?.(suggestions);
        } finally {
            setIsAddingAll(false);
        }
    };

    return (
        <div className="sp-network-suggestions">
            <div className="sp-network-suggestions__header">
                <button
                    type="button"
                    className="sp-network-suggestions__toggle"
                    onClick={() => setIsExpanded(prev => !prev)}
                    aria-expanded={isExpanded}
                >
                    <span className="sp-network-suggestions__chevron">{isExpanded ? '▾' : '▸'}</span>
                    <span>Suggested from Your Network</span>
                    <span className="count-badge">{suggestions.length} available</span>
                </button>
                <button
                    type="button"
                    className="btn btn-sm btn-primary"
                    onClick={handleAddAll}
                    disabled={isAddingAll}
                >
                    {isAddingAll ? 'Adding…' : `+ Add All (${suggestions.length})`}
                </button>
            </div>

            {isExpanded && (
                <div className="sp-network-suggestions__list">
                    {suggestions.map((item) => (
                        <div key={item.key} className="sp-network-suggestions__item">
                            <div className="sp-network-suggestions__info">
                                <div className="sp-network-suggestions__name-row">
                                    <strong>{item.name}</strong>
                                    {item.contacts.length > 0 && (
                                        <span className="sp-referral-badge">
                                            👤 {item.contacts.join(', ')}
                                        </span>
                                    )}
                                </div>
                                <span className="site-url" title={item.url}>{item.url}</span>
                            </div>
                            <button
                                type="button"
                                className="btn btn-sm"
                                onClick={() => handleAddOne(item)}
                                disabled={addingKey === item.key || isAddingAll}
                            >
                                {addingKey === item.key ? 'Adding…' : '+ Add'}
                            </button>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
};

export default NetworkSiteSuggestions;
