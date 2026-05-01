import React, { useMemo } from 'react';
import { useApplications } from '../hooks/useApplications';
import PageLoader from '../components/PageLoader';

const AnalyticsPage = () => {
    const { applications, loading } = useApplications();

    const analytics = useMemo(() => {
        const now = new Date();
        const oneWeekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);

        // 1. Time-based Counts
        const thisWeek = applications.filter(app => new Date(app.DATE) >= oneWeekAgo).length;

        const monthlyGroups = applications.reduce((acc, app) => {
            const month = app.DATE ? app.DATE.substring(0, 7) : 'Unknown'; // YYYY-MM
            acc[month] = (acc[month] || 0) + 1;
            return acc;
        }, {});

        const months = Object.keys(monthlyGroups).sort().reverse();
        const thisMonthKey = now.toISOString().substring(0, 7);
        const lastMonthKey = months[1] || null;

        // 2. Rate Calculations
        const total = applications.length || 1; // Prevent division by zero
        const rejected = applications.filter(app => app.STATUS === 'Rejected').length;
        const interviews = applications.filter(app =>
            app.STATUS?.toLowerCase().includes('interview')
        ).length;
        const offers = applications.filter(app => app.STATUS === 'Offer').length;

        return {
            thisWeek,
            thisMonth: monthlyGroups[thisMonthKey] || 0,
            lastMonth: lastMonthKey ? monthlyGroups[lastMonthKey] : 0,
            monthlyGroups,
            months,
            rates: {
                rejected: ((rejected / total) * 100).toFixed(1),
                interview: ((interviews / total) * 100).toFixed(1),
                offer: ((offers / total) * 100).toFixed(1),
            }
        };
    }, [applications]);

    if (loading) return <PageLoader label="Loading analytics…" />;

    return (
        <div className="section">
            <div className="toolbar">
                <h2 className="section-title">Performance Analytics</h2>
            </div>

            {/* Primary Stats Grid */}
            <div className="analytics-grid">
                <div className="card stat-main">
                    <div className="stat-label">Applications This Week</div>
                    <div className="stat-value">{analytics.thisWeek}</div>
                    <div className="stat-hint">Active search momentum</div>
                </div>
                <div className="card stat-main">
                    <div className="stat-label">This Month vs Last</div>
                    <div className="stat-value">
                        {analytics.thisMonth}
                        <span className="vs-label"> vs {analytics.lastMonth}</span>
                    </div>
                    <div className="stat-hint">Monthly volume comparison</div>
                </div>
            </div>

            {/* Funnel Rates Section */}
            <h3 className="subsection-title">Conversion Funnel</h3>
            <div className="rates-row">
                <div className="rate-card">
                    <div className="rate-circle interview">
                        <span className="percent">{analytics.rates.interview}%</span>
                    </div>
                    <label>Interview Rate</label>
                </div>
                <div className="rate-card">
                    <div className="rate-circle reject">
                        <span className="percent">{analytics.rates.rejected}%</span>
                    </div>
                    <label>Rejection Rate</label>
                </div>
                <div className="rate-card">
                    <div className="rate-circle offer">
                        <span className="percent">{analytics.rates.offer}%</span>
                    </div>
                    <label>Offer Rate</label>
                </div>
            </div>

            {/* Monthly Trend List */}
            <h3 className="subsection-title">History by Month</h3>
            <div className="card trend-card">
                <div className="trend-list">
                    {analytics.months.map(month => (
                        <div key={month} className="trend-item">
                            <span className="trend-month">{month}</span>
                            <div className="trend-bar-bg">
                                <div
                                    className="trend-bar-fill"
                                    style={{ width: `${(analytics.monthlyGroups[month] / 50) * 100}%` }}
                                ></div>
                            </div>
                            <span className="trend-count">{analytics.monthlyGroups[month]} apps</span>
                        </div>
                    ))}
                </div>
            </div>
        </div>
    );
};

export default AnalyticsPage;