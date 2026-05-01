export const getInitials = (name) => {
    return name.split(/\s+/).map(w => w[0]).join('').toUpperCase().slice(0, 2) || '?';
};

export const statusBadgeClass = (status) => {
    const v = (status || '').toLowerCase();
    if (v.includes('offer')) return 'badge-offer';
    if (v.includes('reject')) return 'badge-rejected';
    if (v.includes('tech')) return 'badge-tech';
    if (v.includes('phone')) return 'badge-phone';
    if (v.includes('applied')) return 'badge-applied';
    return 'badge-pending';
};