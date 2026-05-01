import React from 'react';

/**
 * Fullscreen-within-section animated loader.
 * Usage: <PageLoader label="Loading applications…" />
 */
const PageLoader = ({ label = 'Loading…' }) => (
    <div className="page-loader-wrap">
        <div className="page-loader-spinner" aria-label={label} />
        <p className="page-loader-label">{label}</p>
    </div>
);

export default PageLoader;
