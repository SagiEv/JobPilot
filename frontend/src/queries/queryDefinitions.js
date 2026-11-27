import apiClient from '../services/apiClient';

export const QUERY_KEYS = {
    APPLICATIONS: ['applications'],
    APPLICATION_HISTORY: (id) => (id !== undefined ? ['applicationHistory', id] : ['applicationHistory']),
    EVENTS: ['events'],
    DAILY_STATS: ['dailyStats'],
    NOTIFICATIONS: ['notifications'],
    NOTIFICATIONS_UNREAD: ['notifications', 'unread-count'],
    SETTINGS: ['settings'],
    RSS_FEEDS: ['rssFeeds'],
    RSS_JOBS: ['rssJobs'],
    SCRAPED_JOBS: ['scrapedJobs'],
    PROFILE: ['profile'],
    CONTACTS: ['contacts'],
    INTERVIEWS: ['interviews'],
    AI_REPORTS: ['aiReports'],
    SKILLS: ['skills'],
    EXPERIENCE: ['experience'],
};

// Map between DB schema and frontend application state
export const fromDbApplication = (row) => ({
    id: row.id,
    COMPANY: row.company || '',
    ROLE_ID: row.role_id || '',
    DATE: row.date || '',
    STATUS: row.status || '',
    STAGE: row.stage || '',
    LOCATION: row.location || '',
    INFO: row.info || '',
    REFERAL: row.referal || '',
    LINK: row.link || '',
    CV_FILE: row.cv_file || '',
    LAST_ACTIVITY_DATE: row.last_activity_date || row.date || '',
    REJECTION_REASON: row.rejection_reason || '',
    AUTOMATIC_REJECTION: row.automatic_rejection || false,
    fit_score_deterministic: row.fit_score_deterministic,
    fit_analysis_ai: row.fit_analysis_ai,
});

export const applicationsQuery = {
    queryKey: QUERY_KEYS.APPLICATIONS,
    queryFn: async () => {
        const { data } = await apiClient.get('/api/applications');
        return (data || []).map(fromDbApplication);
    },
};

export const eventsQuery = {
    queryKey: QUERY_KEYS.EVENTS,
    queryFn: async () => {
        const { data } = await apiClient.get('/api/events');
        return data || [];
    },
};

export const dailyStatsQuery = {
    queryKey: QUERY_KEYS.DAILY_STATS,
    queryFn: async () => {
        const today = new Date();
        const startOfDay = new Date(today.getFullYear(), today.getMonth(), today.getDate());
        const endOfDay = new Date(today.getFullYear(), today.getMonth(), today.getDate(), 23, 59, 59, 999);
        const { data } = await apiClient.get(
            `/api/applications/stats/daily?start=${startOfDay.toISOString()}&end=${endOfDay.toISOString()}`
        );
        return data;
    },
};

export const notificationsQuery = {
    queryKey: QUERY_KEYS.NOTIFICATIONS,
    queryFn: async () => {
        const res = await apiClient.get('/api/notifications');
        return res.data || [];
    },
    staleTime: 30_000,
};

export const unreadCountQuery = {
    queryKey: QUERY_KEYS.NOTIFICATIONS_UNREAD,
    queryFn: async () => {
        const res = await apiClient.get('/api/notifications/unread-count');
        return res.data?.count ?? 0;
    },
    staleTime: 30_000,
};

export const settingsQuery = {
    queryKey: QUERY_KEYS.SETTINGS,
    queryFn: async () => {
        const res = await apiClient.get('/api/settings');
        return res.data;
    },
};

export const rssFeedsQuery = {
    queryKey: QUERY_KEYS.RSS_FEEDS,
    queryFn: async () => {
        const { data } = await apiClient.get('/api/rss-feeds/feeds');
        return data || [];
    },
};

export const rssJobsQuery = {
    queryKey: QUERY_KEYS.RSS_JOBS,
    queryFn: async () => {
        const { data } = await apiClient.get('/api/rss-feeds/jobs');
        return data || [];
    },
};

export const scrapedJobsQuery = {
    queryKey: QUERY_KEYS.SCRAPED_JOBS,
    queryFn: async () => {
        const { data } = await apiClient.get('/api/search-settings/scraped-jobs');
        return data || [];
    },
};

export const profileQuery = {
    queryKey: QUERY_KEYS.PROFILE,
    queryFn: async () => {
        const response = await apiClient.get('/api/profile/');
        return response.data || {};
    },
};

export const contactsQuery = {
    queryKey: QUERY_KEYS.CONTACTS,
    queryFn: async () => {
        const { data } = await apiClient.get('/api/contacts');
        return data || [];
    },
};

export const interviewsQuery = {
    queryKey: QUERY_KEYS.INTERVIEWS,
    queryFn: async () => {
        const { data } = await apiClient.get('/api/interviews');
        return data || [];
    },
};

export const aiReportsQuery = {
    queryKey: QUERY_KEYS.AI_REPORTS,
    queryFn: async () => {
        const { data } = await apiClient.get('/api/interviews/reports');
        return data || [];
    },
};

export const skillsQuery = {
    queryKey: QUERY_KEYS.SKILLS,
    queryFn: async () => {
        const { data } = await apiClient.get('/api/skills');
        return data || [];
    },
};

export const experienceQuery = {
    queryKey: QUERY_KEYS.EXPERIENCE,
    queryFn: async () => {
        const projRes = await apiClient.get('/api/experience/projects');
        return { projects: projRes.data || [] };
    },
};

export const CORE_INITIAL_QUERIES = [
    applicationsQuery,
    eventsQuery,
    dailyStatsQuery,
    settingsQuery,
];

export const BACKGROUND_INITIAL_QUERIES = [
    notificationsQuery,
    unreadCountQuery,
    rssJobsQuery,
    scrapedJobsQuery,
];

export const TAB_PREFETCH_QUERIES = {
    dashboard: CORE_INITIAL_QUERIES,
    applications: [applicationsQuery, settingsQuery],
    analytics: [applicationsQuery],
    profile: [profileQuery],
    network: [contactsQuery],
    search: [rssFeedsQuery, rssJobsQuery, scrapedJobsQuery, contactsQuery],
    projects: [experienceQuery],
    'skills-matrix': [skillsQuery],
    interview: [interviewsQuery, aiReportsQuery, applicationsQuery],
    settings: [settingsQuery],
};
