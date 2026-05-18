import dayjs from 'dayjs';
import utc from 'dayjs/plugin/utc';
import timezonePlugin from 'dayjs/plugin/timezone';

dayjs.extend(utc);
dayjs.extend(timezonePlugin);

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

export const formatDate = (dateStr, timezone) => {
    if (!dateStr) return '';
    
    // Map timezone to preferred local format
    let format = 'MM/DD/YYYY'; // US default
    if (timezone === 'Asia/Jerusalem') {
        format = 'DD-MM-YYYY';
    } else if (timezone?.startsWith('Europe/') || timezone === 'UTC') {
        format = 'DD/MM/YYYY';
    }
    
    // Parse the date as UTC since the DB stores YYYY-MM-DD
    // and format it. We don't want timezone offset to shift the day back.
    // If dateStr is just YYYY-MM-DD, parsing it as UTC keeps it exactly on that day.
    const d = dayjs.utc(dateStr);
    if (!d.isValid()) return dateStr;
    
    return d.format(format);
};