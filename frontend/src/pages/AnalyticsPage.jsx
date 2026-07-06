import React, { useMemo } from 'react';
import { useApplications } from '../hooks/useApplications';
import PageLoader from '../components/PageLoader';

/* ── Tiny SVG ring meter ──────────────────────────────────────────────────── */
const RingMeter = ({ pct, color, size = 80, stroke = 7 }) => {
    const r = (size - stroke) / 2;
    const circ = 2 * Math.PI * r;
    const filled = (Math.min(pct, 100) / 100) * circ;
    return (
        <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} style={{ transform: 'rotate(-90deg)' }}>
            <circle
                cx={size / 2} cy={size / 2} r={r}
                fill="none" stroke="var(--bg3)" strokeWidth={stroke}
            />
            <circle
                cx={size / 2} cy={size / 2} r={r}
                fill="none" stroke={color} strokeWidth={stroke}
                strokeDasharray={`${filled} ${circ}`}
                strokeLinecap="round"
                style={{ transition: 'stroke-dasharray .6s cubic-bezier(.4,0,.2,1)' }}
            />
        </svg>
    );
};

/* ── KPI stat card ────────────────────────────────────────────────────────── */
const KpiCard = ({ icon, label, value, sub, accent }) => (
    <div className="an-kpi-card" style={{ '--kpi-accent': accent }}>
        <div className="an-kpi-icon">{icon}</div>
        <div className="an-kpi-body">
            <div className="an-kpi-value">{value}</div>
            <div className="an-kpi-label">{label}</div>
            {sub && <div className="an-kpi-sub">{sub}</div>}
        </div>
    </div>
);

/* ── Icons ────────────────────────────────────────────────────────────────── */
const IconSend    = () => <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="22" y1="2" x2="11" y2="13"/><polygon points="22 2 15 22 11 13 2 9 22 2"/></svg>;
const IconCalWeek = () => <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="4" width="18" height="18" rx="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg>;
const IconTrend   = () => <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="23 6 13.5 15.5 8.5 10.5 1 18"/><polyline points="17 6 23 6 23 12"/></svg>;
const IconStar    = () => <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/></svg>;

const AnalyticsPage = () => {
    const { applications, loading } = useApplications();

    const an = useMemo(() => {
        const now = new Date();
        const oneWeekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);

        // --- time-based ---
        const thisWeek = applications.filter(a => new Date(a.DATE) >= oneWeekAgo).length;

        const monthlyGroups = applications.reduce((acc, a) => {
            const m = a.DATE ? a.DATE.substring(0, 7) : 'Unknown';
            acc[m] = (acc[m] || 0) + 1;
            return acc;
        }, {});
        const months = Object.keys(monthlyGroups).sort().reverse();
        const thisMonthKey = now.toISOString().substring(0, 7);
        const lastMonthKey = months[1] || null;

        // --- status breakdown ---
        const total = applications.length;
        const safeTotal = total || 1;
        const statusCounts = applications.reduce((acc, a) => {
            const s = a.STATUS || 'Applied';
            acc[s] = (acc[s] || 0) + 1;
            return acc;
        }, {});

        const rejected  = statusCounts['Rejected'] || 0;
        const interviews = applications.filter(a => a.STATUS?.toLowerCase().includes('interview')).length;
        const offers    = statusCounts['Offer'] || 0;
        const pending   = applications.filter(a =>
            !a.STATUS || a.STATUS === 'Applied' || a.STATUS === 'Pending'
        ).length;

        // bar chart: scale relative to max
        const maxMonth = Math.max(...Object.values(monthlyGroups), 1);

        return {
            total,
            thisWeek,
            thisMonth: monthlyGroups[thisMonthKey] || 0,
            lastMonth: lastMonthKey ? monthlyGroups[lastMonthKey] : 0,
            monthlyGroups,
            months: months.slice(0, 8),      // cap at 8 months
            maxMonth,
            statusCounts,
            rates: {
                interview: +((interviews / safeTotal) * 100).toFixed(1),
                rejected:  +((rejected  / safeTotal) * 100).toFixed(1),
                offer:     +((offers    / safeTotal) * 100).toFixed(1),
                pending:   +((pending   / safeTotal) * 100).toFixed(1),
            },
            counts: { rejected, interviews, offers, pending },
        };
    }, [applications]);

    if (loading) return <PageLoader label="Loading analytics…" />;

    const monthDelta = an.thisMonth - an.lastMonth;
    const deltaLabel = monthDelta > 0
        ? `+${monthDelta} vs last month`
        : monthDelta < 0
        ? `${monthDelta} vs last month`
        : 'Same as last month';

    return (
        <div className="section an-page" id="sec-analytics">

            {/* ── Page header ───────────────────────────────────────── */}


            {/* ── KPI hero row ───────────────────────────────────────── */}
            <div className="an-kpi-row">
                <KpiCard
                    icon={<IconSend />}
                    label="Total Applications"
                    value={an.total}
                    sub="all time"
                    accent="#1a6cf5"
                />
                <KpiCard
                    icon={<IconCalWeek />}
                    label="This Week"
                    value={an.thisWeek}
                    sub="last 7 days"
                    accent="#7c3aed"
                />
                <KpiCard
                    icon={<IconTrend />}
                    label="This Month"
                    value={an.thisMonth}
                    sub={deltaLabel}
                    accent={monthDelta >= 0 ? '#0f6e56' : '#a32d2d'}
                />
                <KpiCard
                    icon={<IconStar />}
                    label="Interviews"
                    value={an.counts.interviews}
                    sub={`${an.rates.interview}% rate`}
                    accent="#d97706"
                />
            </div>

            {/* ── Conversion funnel ─────────────────────────────────── */}
            <h3 className="subsection-title">Conversion Funnel</h3>
            <div className="an-funnel-row">

                <div className="an-funnel-card">
                    <div className="an-ring-wrap">
                        <RingMeter pct={an.rates.interview} color="#d97706" />
                        <span className="an-ring-pct">{an.rates.interview}%</span>
                    </div>
                    <div className="an-funnel-label">Interview Rate</div>
                    <div className="an-funnel-count">{an.counts.interviews} applications</div>
                </div>

                <div className="an-funnel-sep">→</div>

                <div className="an-funnel-card">
                    <div className="an-ring-wrap">
                        <RingMeter pct={an.rates.offer} color="#0f6e56" />
                        <span className="an-ring-pct">{an.rates.offer}%</span>
                    </div>
                    <div className="an-funnel-label">Offer Rate</div>
                    <div className="an-funnel-count">{an.counts.offers} applications</div>
                </div>

                <div className="an-funnel-sep">→</div>

                <div className="an-funnel-card">
                    <div className="an-ring-wrap">
                        <RingMeter pct={an.rates.rejected} color="#a32d2d" />
                        <span className="an-ring-pct">{an.rates.rejected}%</span>
                    </div>
                    <div className="an-funnel-label">Rejection Rate</div>
                    <div className="an-funnel-count">{an.counts.rejected} applications</div>
                </div>

                <div className="an-funnel-sep">·</div>

                <div className="an-funnel-card">
                    <div className="an-ring-wrap">
                        <RingMeter pct={an.rates.pending} color="#9499ae" />
                        <span className="an-ring-pct">{an.rates.pending}%</span>
                    </div>
                    <div className="an-funnel-label">Awaiting Reply</div>
                    <div className="an-funnel-count">{an.counts.pending} applications</div>
                </div>

            </div>

            {/* ── Monthly bar chart ─────────────────────────────────── */}
            <h3 className="subsection-title">Monthly Volume</h3>
            <div className="card an-chart-card">
                {an.months.length === 0 ? (
                    <div className="an-empty">No application data yet.</div>
                ) : (
                    <div className="an-chart">
                        {an.months.map((month, i) => {
                            const count = an.monthlyGroups[month];
                            const barPct = (count / an.maxMonth) * 100;
                            const isCurrentMonth = month === new Date().toISOString().substring(0, 7);
                            const [yr, mo] = month.split('-');
                            const label = new Date(+yr, +mo - 1).toLocaleString('default', { month: 'short', year: '2-digit' });
                            return (
                                <div key={month} className={`an-bar-item${isCurrentMonth ? ' an-bar-item--current' : ''}`}>
                                    <div className="an-bar-track">
                                        <div
                                            className="an-bar-fill"
                                            style={{
                                                height: `${barPct}%`,
                                                animationDelay: `${i * 60}ms`,
                                            }}
                                        />
                                    </div>
                                    <div className="an-bar-count">{count}</div>
                                    <div className="an-bar-label">{label}</div>
                                </div>
                            );
                        })}
                    </div>
                )}
            </div>

            {/* ── Status breakdown ──────────────────────────────────── */}
            {Object.keys(an.statusCounts).length > 0 && (
                <>
                    <h3 className="subsection-title">Status Breakdown</h3>
                    <div className="card an-status-card">
                        {Object.entries(an.statusCounts)
                            .sort((a, b) => b[1] - a[1])
                            .map(([status, count]) => {
                                const pct = +((count / (an.total || 1)) * 100).toFixed(1);
                                return (
                                    <div key={status} className="an-status-row">
                                        <span className="an-status-name">{status}</span>
                                        <div className="an-status-bar-bg">
                                            <div
                                                className="an-status-bar-fill"
                                                style={{ width: `${pct}%` }}
                                            />
                                        </div>
                                        <span className="an-status-meta">{count} <span className="an-status-pct">({pct}%)</span></span>
                                    </div>
                                );
                            })}
                    </div>
                </>
            )}

        </div>
    );
};

export default AnalyticsPage;