import React, { useState, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import apiClient from '../services/apiClient';
import { useApplications } from '../hooks/useApplications';
import { useInterviews } from '../hooks/useInterviews';
import { useEvents } from '../hooks/useEvents';
import { calculateCompanyFunnelMetrics, calculateMonthlyVolume, calculateReferralMetrics } from '../utils/analyticsCalculations';
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
    const { applications = [], loading: appLoading } = useApplications();
    const { interviews = [], loading: interviewsLoading } = useInterviews();
    const { events = [], loading: eventsLoading } = useEvents();
    const [funnelView, setFunnelView] = useState('company');
    const [expandedCategory, setExpandedCategory] = useState(null);
    
    const { data: metrics, isLoading: metricsLoading } = useQuery({
        queryKey: ['analytics', 'metrics'],
        queryFn: async () => {
            const { data } = await apiClient.get('/api/applications/analytics/metrics');
            return data;
        }
    });

    const loading = appLoading || metricsLoading || interviewsLoading || eventsLoading;

    const eventInterviewAppIds = useMemo(() => {
        return (events || [])
            .filter(e => e.type === 'interview' && e.application_id)
            .map(e => e.application_id);
    }, [events]);

    const companyMetrics = useMemo(() => {
        return calculateCompanyFunnelMetrics(applications, interviews, metrics?.historicalInterviewAppIds, eventInterviewAppIds);
    }, [applications, interviews, metrics?.historicalInterviewAppIds, eventInterviewAppIds]);

    const monthlyData = useMemo(() => {
        return calculateMonthlyVolume(applications, interviews, metrics?.historicalInterviewAppIds, eventInterviewAppIds, events);
    }, [applications, interviews, metrics?.historicalInterviewAppIds, eventInterviewAppIds, events]);

    const referralMetrics = useMemo(() => {
        return calculateReferralMetrics(applications, interviews, metrics?.historicalInterviewAppIds, eventInterviewAppIds);
    }, [applications, interviews, metrics?.historicalInterviewAppIds, eventInterviewAppIds]);

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
            let s = a.STATUS || 'Applied';
            s = s.charAt(0).toUpperCase() + s.slice(1).toLowerCase();
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

        // --- job fit stats ---
        let totalFitScore = 0;
        let fitCount = 0;
        let interviewFitScore = 0;
        let interviewFitCount = 0;
        let rejectedFitScore = 0;
        let rejectedFitCount = 0;
        let goodFitCount = 0;
        let partialFitCount = 0;
        let poorFitCount = 0;

        applications.forEach(a => {
            const score = a.fit_analysis_ai?.ai_score ?? a.fit_analysis_ai?.overall_score ?? a.fit_score_deterministic;
            if (score != null) {
                totalFitScore += score;
                fitCount++;
                const s = (a.STATUS || '').toLowerCase();
                
                if (s.includes('interview') || s.includes('offer') || s.includes('hired')) {
                    interviewFitScore += score;
                    interviewFitCount++;
                } else if (s.includes('reject')) {
                    rejectedFitScore += score;
                    rejectedFitCount++;
                }

                if (score >= 80) goodFitCount++;
                else if (score >= 50) partialFitCount++;
                else poorFitCount++;
            }
        });

        const avgFitScore = fitCount > 0 ? Math.round(totalFitScore / fitCount) : 0;
        const avgInterviewFitScore = interviewFitCount > 0 ? Math.round(interviewFitScore / interviewFitCount) : 0;
        const avgRejectedFitScore = rejectedFitCount > 0 ? Math.round(rejectedFitScore / rejectedFitCount) : 0;

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
            fitStats: {
                hasFitData: fitCount > 0,
                avgFitScore,
                avgInterviewFitScore,
                avgRejectedFitScore,
                goodFitCount,
                partialFitCount,
                poorFitCount,
                totalFitCount: fitCount
            }
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
            <div className="page-header desktop-only">
                <div className="page-header__left">
                    <h2 className="section-title">Performance Analytics</h2>
                    <p className="section-subtitle">Track your job-search momentum at a glance</p>
                </div>
            </div>

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
            
            <div className="an-kpi-row" style={{ marginTop: '20px', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))' }}>
                <KpiCard
                    icon={<span style={{ fontSize: '18px' }}>⏱️</span>}
                    label="Time to 1st Interview"
                    value={metrics?.timeToInterview?.count > 0 ? `${metrics.timeToInterview.averageDays} days` : 'N/A'}
                    sub={`Based on ${metrics?.timeToInterview?.count || 0} interviews`}
                    accent="#d97706"
                />
                <KpiCard
                    icon={<span style={{ fontSize: '18px' }}>🔄</span>}
                    label="Avg. Interview Cycle"
                    value={metrics?.interviewCycle?.count > 0 ? `${metrics.interviewCycle.averageDays} days` : 'N/A'}
                    sub={metrics?.interviewCycle?.count > 0 ? `Apply to decision (${metrics.interviewCycle.count} loops)` : 'No completed loops'}
                    accent="#8b5cf6"
                />
                <KpiCard
                    icon={<span style={{ fontSize: '18px' }}>⏳</span>}
                    label="Longest Interview Cycle"
                    value={metrics?.longestInterviewCycle?.days > 0 ? `${metrics.longestInterviewCycle.days} days` : 'N/A'}
                    sub={metrics?.longestInterviewCycle?.company ? `${metrics.longestInterviewCycle.company} • ${metrics.longestInterviewCycle.outcome}` : 'No loops completed'}
                    accent="#ec4899"
                />
                <KpiCard
                    icon={<span style={{ fontSize: '18px' }}>🏢</span>}
                    label="Interviewed This Year"
                    value={`${monthlyData.companiesInterviewedThisYear} companies`}
                    sub={`in ${new Date().getFullYear()}`}
                    accent="#10b981"
                />
                <KpiCard
                    icon={<span style={{ fontSize: '18px' }}>📉</span>}
                    label="Avg. Time to Reject"
                    value={metrics?.timeToReject?.count > 0 ? `${metrics.timeToReject.averageDays} days` : 'N/A'}
                    sub={`Based on ${metrics?.timeToReject?.count || 0} rejections`}
                    accent="#64748b"
                />
            </div>

            {/* ── Conversion funnel ─────────────────────────────────── */}
            <div className="an-funnel-header-row">
                <div>
                    <h3 className="subsection-title" style={{ margin: 0 }}>Conversion Funnel</h3>
                    <p className="an-funnel-subtitle">
                        {funnelView === 'company'
                            ? 'Overall company progression across your entire search'
                            : 'Current status snapshot across all submitted applications'}
                    </p>
                </div>
                <div className="an-toggle-group">
                    <button
                        type="button"
                        className={`an-toggle-btn ${funnelView === 'company' ? 'active' : ''}`}
                        onClick={() => setFunnelView('company')}
                    >
                        Overall (By Company)
                    </button>
                    <button
                        type="button"
                        className={`an-toggle-btn ${funnelView === 'snapshot' ? 'active' : ''}`}
                        onClick={() => setFunnelView('snapshot')}
                    >
                        Current Snapshot (By App)
                    </button>
                </div>
            </div>

            {funnelView === 'snapshot' ? (
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
            ) : (
                <div className="an-company-funnel-container">
                    <div className="an-funnel-row" style={{ paddingBottom: '16px' }}>
                        <div className="an-funnel-card">
                            <div className="an-ring-wrap">
                                <RingMeter pct={100} color="#1a6cf5" />
                                <span className="an-ring-pct">100%</span>
                            </div>
                            <div className="an-funnel-label">Total Applied</div>
                            <div className="an-funnel-count">{companyMetrics.totalCompanies} companies</div>
                        </div>

                        <div className="an-funnel-sep">→</div>

                        <div className="an-funnel-card">
                            <div className="an-ring-wrap">
                                <RingMeter pct={companyMetrics.interviewRate} color="#d97706" />
                                <span className="an-ring-pct">{companyMetrics.interviewRate}%</span>
                            </div>
                            <div className="an-funnel-label">Interview Rate</div>
                            <div className="an-funnel-count">{companyMetrics.interviewedCount} companies</div>
                        </div>

                        <div className="an-funnel-sep">→</div>

                        <div className="an-funnel-card">
                            <div className="an-ring-wrap">
                                <RingMeter pct={companyMetrics.interviewed.offer.rateOfInterviewed} color="#0f6e56" />
                                <span className="an-ring-pct">{companyMetrics.interviewed.offer.rateOfInterviewed}%</span>
                            </div>
                            <div className="an-funnel-label">Offer Conversion</div>
                            <div className="an-funnel-count">{companyMetrics.interviewed.offer.count} of {companyMetrics.interviewedCount || 0} interviewed</div>
                        </div>
                    </div>

                    <div className="an-breakdown-grid">
                        {/* Interviewed Companies Section */}
                        <div className="card an-status-card" style={{ padding: '18px 20px', margin: 0 }}>
                            <div className="an-breakdown-card-header">
                                <div>
                                    <h4 style={{ margin: 0, fontSize: '14px', fontWeight: 600, color: 'var(--text-main)' }}>
                                        Companies Reached Interview ({companyMetrics.interviewedCount})
                                    </h4>
                                    <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>
                                        All companies where you had at least 1 interview
                                    </span>
                                </div>
                                <span className="badge" style={{ background: 'rgba(217, 119, 6, 0.1)', color: '#d97706', fontWeight: 600 }}>
                                    {companyMetrics.interviewRate}% of total
                                </span>
                            </div>

                            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', marginTop: '14px' }}>
                                {/* Active */}
                                <div 
                                    className="an-outcome-item"
                                    onClick={() => setExpandedCategory(expandedCategory === 'active' ? null : 'active')}
                                >
                                    <div className="an-outcome-row">
                                        <span className="an-status-name" style={{ color: '#d97706', fontWeight: 600 }}>
                                            🎤 Still Interviewing
                                        </span>
                                        <div className="an-status-bar-bg">
                                            <div 
                                                className="an-status-bar-fill" 
                                                style={{ width: `${companyMetrics.interviewed.active.rateOfInterviewed}%`, background: '#d97706' }} 
                                            />
                                        </div>
                                        <span className="an-status-meta">
                                            {companyMetrics.interviewed.active.count} <span className="an-status-pct">({companyMetrics.interviewed.active.rateOfInterviewed}%)</span>
                                        </span>
                                    </div>
                                    {companyMetrics.interviewed.active.companies.length > 0 && (
                                        <div className="an-company-chips">
                                            {companyMetrics.interviewed.active.companies.map((c, i) => (
                                                <span key={i} className="an-company-chip chip-active">{c}</span>
                                            ))}
                                        </div>
                                    )}
                                </div>

                                {/* Offers */}
                                <div 
                                    className="an-outcome-item"
                                    onClick={() => setExpandedCategory(expandedCategory === 'offer' ? null : 'offer')}
                                >
                                    <div className="an-outcome-row">
                                        <span className="an-status-name" style={{ color: 'var(--success-c)', fontWeight: 600 }}>
                                            🏆 Received Offers
                                        </span>
                                        <div className="an-status-bar-bg">
                                            <div 
                                                className="an-status-bar-fill" 
                                                style={{ width: `${companyMetrics.interviewed.offer.rateOfInterviewed}%`, background: 'var(--success-c)' }} 
                                            />
                                        </div>
                                        <span className="an-status-meta">
                                            {companyMetrics.interviewed.offer.count} <span className="an-status-pct">({companyMetrics.interviewed.offer.rateOfInterviewed}%)</span>
                                        </span>
                                    </div>
                                    {companyMetrics.interviewed.offer.companies.length > 0 && (
                                        <div className="an-company-chips">
                                            {companyMetrics.interviewed.offer.companies.map((c, i) => (
                                                <span key={i} className="an-company-chip chip-offer">{c}</span>
                                            ))}
                                        </div>
                                    )}
                                </div>

                                {/* Rejected post-interview */}
                                <div 
                                    className="an-outcome-item"
                                    onClick={() => setExpandedCategory(expandedCategory === 'rejected-post' ? null : 'rejected-post')}
                                >
                                    <div className="an-outcome-row">
                                        <span className="an-status-name" style={{ color: '#a32d2d', fontWeight: 600 }}>
                                            🛑 Rejected Post-Interview
                                        </span>
                                        <div className="an-status-bar-bg">
                                            <div 
                                                className="an-status-bar-fill" 
                                                style={{ width: `${companyMetrics.interviewed.rejected.rateOfInterviewed}%`, background: '#a32d2d' }} 
                                            />
                                        </div>
                                        <span className="an-status-meta">
                                            {companyMetrics.interviewed.rejected.count} <span className="an-status-pct">({companyMetrics.interviewed.rejected.rateOfInterviewed}%)</span>
                                        </span>
                                    </div>
                                    {companyMetrics.interviewed.rejected.companies.length > 0 && (
                                        <div className="an-company-chips">
                                            {companyMetrics.interviewed.rejected.companies.map((c, i) => (
                                                <span key={i} className="an-company-chip chip-rejected">{c}</span>
                                            ))}
                                        </div>
                                    )}
                                </div>
                            </div>
                        </div>

                        {/* Non-Interviewed Companies Section */}
                        <div className="card an-status-card" style={{ padding: '18px 20px', margin: 0 }}>
                            <div className="an-breakdown-card-header">
                                <div>
                                    <h4 style={{ margin: 0, fontSize: '14px', fontWeight: 600, color: 'var(--text-main)' }}>
                                        No Interview Reached ({companyMetrics.noInterviewCount})
                                    </h4>
                                    <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>
                                        Pre-interview stage applications
                                    </span>
                                </div>
                                <span className="badge" style={{ background: 'rgba(100, 116, 139, 0.1)', color: '#64748b', fontWeight: 600 }}>
                                    {companyMetrics.noInterviewRate}% of total
                                </span>
                            </div>

                            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', marginTop: '14px' }}>
                                {/* Awaiting Reply */}
                                <div 
                                    className="an-outcome-item"
                                    onClick={() => setExpandedCategory(expandedCategory === 'pending' ? null : 'pending')}
                                >
                                    <div className="an-outcome-row">
                                        <span className="an-status-name" style={{ color: '#64748b', fontWeight: 600 }}>
                                            ⏳ Awaiting Reply
                                        </span>
                                        <div className="an-status-bar-bg">
                                            <div 
                                                className="an-status-bar-fill" 
                                                style={{ width: `${companyMetrics.noInterview.pending.rateOfNoInterview}%`, background: '#9499ae' }} 
                                            />
                                        </div>
                                        <span className="an-status-meta">
                                            {companyMetrics.noInterview.pending.count} <span className="an-status-pct">({companyMetrics.noInterview.pending.rateOfNoInterview}%)</span>
                                        </span>
                                    </div>
                                    {companyMetrics.noInterview.pending.companies.length > 0 && (
                                        <div className="an-company-chips">
                                            {companyMetrics.noInterview.pending.companies.map((c, i) => (
                                                <span key={i} className="an-company-chip chip-pending">{c}</span>
                                            ))}
                                        </div>
                                    )}
                                </div>

                                {/* Screening Rejection */}
                                <div 
                                    className="an-outcome-item"
                                    onClick={() => setExpandedCategory(expandedCategory === 'screening-reject' ? null : 'screening-reject')}
                                >
                                    <div className="an-outcome-row">
                                        <span className="an-status-name" style={{ color: 'var(--danger-c)', fontWeight: 600 }}>
                                            ❌ Rejected at CV / Screening
                                        </span>
                                        <div className="an-status-bar-bg">
                                            <div 
                                                className="an-status-bar-fill" 
                                                style={{ width: `${companyMetrics.noInterview.rejected.rateOfNoInterview}%`, background: 'var(--danger-c)' }} 
                                            />
                                        </div>
                                        <span className="an-status-meta">
                                            {companyMetrics.noInterview.rejected.count} <span className="an-status-pct">({companyMetrics.noInterview.rejected.rateOfNoInterview}%)</span>
                                        </span>
                                    </div>
                                    {companyMetrics.noInterview.rejected.companies.length > 0 && (
                                        <div className="an-company-chips">
                                            {companyMetrics.noInterview.rejected.companies.map((c, i) => (
                                                <span key={i} className="an-company-chip chip-screening">{c}</span>
                                            ))}
                                        </div>
                                    )}
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* ── Monthly bar chart ─────────────────────────────────── */}
            <div className="an-chart-header" style={{ margin: '24px 22px 10px' }}>
                <h3 className="subsection-title" style={{ margin: 0 }}>Monthly Volume</h3>
                <div className="an-chart-legend">
                    <span className="an-legend-item">
                        <span className="an-legend-dot" style={{ background: 'var(--accent)' }}></span>
                        Applications Applied
                    </span>
                    <span className="an-legend-item">
                        <span className="an-legend-dot" style={{ background: '#d97706' }}></span>
                        Companies Interviewed
                    </span>
                </div>
            </div>
            <div className="card an-chart-card">
                {monthlyData.months.length === 0 ? (
                    <div className="an-empty">No application data yet.</div>
                ) : (
                    <div className="an-chart">
                        {monthlyData.months.map((month, i) => {
                            const applied = monthlyData.monthlyApplied[month] || 0;
                            const interviewed = monthlyData.monthlyInterviewCounts[month] || 0;
                            const appliedPct = (applied / monthlyData.maxVolume) * 100;
                            const interviewedPct = (interviewed / monthlyData.maxVolume) * 100;
                            const isCurrentMonth = month === new Date().toISOString().substring(0, 7);
                            const [yr, mo] = month.split('-');
                            const label = new Date(+yr, +mo - 1).toLocaleString('default', { month: 'short', year: '2-digit' });
                            const interviewedCompaniesList = monthlyData.monthlyInterviewCompanies[month] || [];

                            return (
                                <div key={month} className={`an-bar-item${isCurrentMonth ? ' an-bar-item--current' : ''}`}>
                                    <div className="an-bar-tooltip">
                                        <span style={{ color: 'var(--accent)', fontWeight: 600 }}>{applied} applied</span>
                                        <span style={{ color: '#d97706', fontWeight: 600 }}>{interviewed} interviewed</span>
                                    </div>
                                    <div className="an-bar-pair">
                                        {/* Applied Bar */}
                                        <div className="an-bar-track--sm" title={`${applied} applied in ${label}`}>
                                            <div
                                                className="an-bar-fill an-bar-fill--applied"
                                                style={{
                                                    height: `${appliedPct}%`,
                                                    animationDelay: `${i * 60}ms`,
                                                }}
                                            />
                                        </div>
                                        {/* Interviewed Companies Bar */}
                                        <div 
                                            className="an-bar-track--sm" 
                                            title={`${interviewed} companies interviewed in ${label}${interviewedCompaniesList.length ? `: ${interviewedCompaniesList.join(', ')}` : ''}`}
                                        >
                                            <div
                                                className="an-bar-fill an-bar-fill--interviewed"
                                                style={{
                                                    height: `${interviewedPct}%`,
                                                    animationDelay: `${i * 60 + 30}ms`,
                                                }}
                                            />
                                        </div>
                                    </div>
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

            {/* ── Job Fit Insights ──────────────────────────────────── */}
            {an.fitStats.hasFitData && (
                <>
                    <h3 className="subsection-title">Job Fit Insights</h3>
                    <div className="an-kpi-row" style={{ marginTop: '20px', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))' }}>
                        <KpiCard
                            icon={<span style={{ fontSize: '18px' }}>🎯</span>}
                            label="Avg. Fit Score"
                            value={`${an.fitStats.avgFitScore}%`}
                            sub={`Based on ${an.fitStats.totalFitCount} applications`}
                            accent="#3b82f6"
                        />
                        <KpiCard
                            icon={<span style={{ fontSize: '18px' }}>📈</span>}
                            label="Interviews Avg. Fit"
                            value={an.fitStats.avgInterviewFitScore > 0 ? `${an.fitStats.avgInterviewFitScore}%` : 'N/A'}
                            sub="Average score of applications that reached interviews"
                            accent="#10b981"
                        />
                        <KpiCard
                            icon={<span style={{ fontSize: '18px' }}>📉</span>}
                            label="Rejections Avg. Fit"
                            value={an.fitStats.avgRejectedFitScore > 0 ? `${an.fitStats.avgRejectedFitScore}%` : 'N/A'}
                            sub="Average score of applications that were rejected"
                            accent="#ef4444"
                        />
                    </div>
                    
                    <div className="card an-status-card" style={{ marginTop: '20px' }}>
                        <div className="an-status-row">
                            <span className="an-status-name" style={{ color: 'var(--success-c)', fontWeight: 600 }}>Good Fit (≥80%)</span>
                            <div className="an-status-bar-bg">
                                <div className="an-status-bar-fill" style={{ width: `${(an.fitStats.goodFitCount / an.fitStats.totalFitCount) * 100}%`, background: 'var(--success-c)' }} />
                            </div>
                            <span className="an-status-meta">{an.fitStats.goodFitCount}</span>
                        </div>
                        <div className="an-status-row">
                            <span className="an-status-name" style={{ color: 'var(--warning-c)', fontWeight: 600 }}>Partial Fit (50-79%)</span>
                            <div className="an-status-bar-bg">
                                <div className="an-status-bar-fill" style={{ width: `${(an.fitStats.partialFitCount / an.fitStats.totalFitCount) * 100}%`, background: 'var(--warning-c)' }} />
                            </div>
                            <span className="an-status-meta">{an.fitStats.partialFitCount}</span>
                        </div>
                        <div className="an-status-row">
                            <span className="an-status-name" style={{ color: 'var(--danger-c)', fontWeight: 600 }}>Poor Fit (&lt;50%)</span>
                            <div className="an-status-bar-bg">
                                <div className="an-status-bar-fill" style={{ width: `${(an.fitStats.poorFitCount / an.fitStats.totalFitCount) * 100}%`, background: 'var(--danger-c)' }} />
                            </div>
                            <span className="an-status-meta">{an.fitStats.poorFitCount}</span>
                        </div>
                    </div>
                </>
            )}

            {/* ── Referral Impact ────────────────────────────────────── */}
            {applications.length > 0 && (
                <div className="an-referral-section">
                    <h3 className="subsection-title" style={{ marginTop: '28px' }}>Referral Impact</h3>
                    <p style={{ margin: '4px 0 16px 0', fontSize: '13px', color: 'var(--text-muted)' }}>
                        Comparing application success rates for roles with vs without referrals
                    </p>

                    <div className="an-kpi-row" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))' }}>
                        <KpiCard
                            icon={<span style={{ fontSize: '18px' }}>👥</span>}
                            label="Referred Interview Share"
                            value={`${referralMetrics.refShareOfInterviews}%`}
                            sub={`${referralMetrics.referred.interviewApps.length} of ${referralMetrics.totalInterviewedApps} interviewed applications`}
                            accent="#8b5cf6"
                        />
                        <KpiCard
                            icon={<span style={{ fontSize: '18px' }}>🚀</span>}
                            label="Interview Rate (Ref vs Direct)"
                            value={`${referralMetrics.refInterviewRate}% vs ${referralMetrics.directInterviewRate}%`}
                            sub={`${referralMetrics.referred.interviewApps.length}/${referralMetrics.totalReferredCount} ref vs ${referralMetrics.direct.interviewApps.length}/${referralMetrics.totalDirectCount} direct`}
                            accent="#10b981"
                        />
                        <KpiCard
                            icon={<span style={{ fontSize: '18px' }}>🏆</span>}
                            label="Referral Advantage"
                            value={referralMetrics.lift !== null ? `${referralMetrics.lift}× Higher` : 'N/A'}
                            sub={referralMetrics.lift !== null ? 'Higher interview conversion with referral' : 'Insufficient referral data'}
                            accent="#f59e0b"
                        />
                    </div>

                    <div className="an-referral-grid">
                        {/* With Referral Cohort */}
                        <div className="card an-status-card an-referral-cohort">
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                <span style={{ fontWeight: 600, color: '#8b5cf6', fontSize: '14px' }}>
                                    With Referral ({referralMetrics.referred.interviewApps.length} applications)
                                </span>
                                <span style={{ fontSize: '12px', fontWeight: 600, color: 'var(--text-muted)' }}>
                                    {referralMetrics.refShareOfInterviews}% of interviews
                                </span>
                            </div>
                            <div className="an-status-bar-bg" style={{ height: '6px' }}>
                                <div
                                    className="an-status-bar-fill"
                                    style={{ width: `${referralMetrics.refShareOfInterviews}%`, background: '#8b5cf6' }}
                                />
                            </div>

                            <div className="an-cohort-stats-row">
                                <span>
                                    <strong>{referralMetrics.referred.outcomes.offers.count}</strong> Offers ({referralMetrics.referred.outcomes.offers.pct}%) •{' '}
                                    <strong>{referralMetrics.referred.outcomes.active.count}</strong> Interviewing ({referralMetrics.referred.outcomes.active.pct}%) •{' '}
                                    <strong>{referralMetrics.referred.outcomes.rejected.count}</strong> Rejected ({referralMetrics.referred.outcomes.rejected.pct}%)
                                </span>
                                <span>Avg. Fit: {referralMetrics.referred.avgFit !== null ? `${referralMetrics.referred.avgFit}%` : 'N/A'}</span>
                            </div>

                            <div className="an-company-chips" style={{ marginTop: '8px' }}>
                                {referralMetrics.referred.interviewApps.length > 0 ? (
                                    referralMetrics.referred.interviewApps.map((app, idx) => (
                                        <span key={app.id || idx} className="an-company-chip chip-ref-app">
                                            {app.label}
                                        </span>
                                    ))
                                ) : (
                                    <span style={{ fontSize: '12px', color: 'var(--text-muted)', fontStyle: 'italic' }}>
                                        No referred applications reached interviews
                                    </span>
                                )}
                            </div>
                        </div>

                        {/* Direct / No Referral Cohort */}
                        <div className="card an-status-card an-referral-cohort">
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                <span style={{ fontWeight: 600, color: 'var(--text-muted)', fontSize: '14px' }}>
                                    Direct / No Referral ({referralMetrics.direct.interviewApps.length} applications)
                                </span>
                                <span style={{ fontSize: '12px', fontWeight: 600, color: 'var(--text-muted)' }}>
                                    {referralMetrics.directShareOfInterviews}% of interviews
                                </span>
                            </div>
                            <div className="an-status-bar-bg" style={{ height: '6px' }}>
                                <div
                                    className="an-status-bar-fill"
                                    style={{ width: `${referralMetrics.directShareOfInterviews}%`, background: '#64748b' }}
                                />
                            </div>

                            <div className="an-cohort-stats-row">
                                <span>
                                    <strong>{referralMetrics.direct.outcomes.offers.count}</strong> Offers ({referralMetrics.direct.outcomes.offers.pct}%) •{' '}
                                    <strong>{referralMetrics.direct.outcomes.active.count}</strong> Interviewing ({referralMetrics.direct.outcomes.active.pct}%) •{' '}
                                    <strong>{referralMetrics.direct.outcomes.rejected.count}</strong> Rejected ({referralMetrics.direct.outcomes.rejected.pct}%)
                                </span>
                                <span>Avg. Fit: {referralMetrics.direct.avgFit !== null ? `${referralMetrics.direct.avgFit}%` : 'N/A'}</span>
                            </div>

                            <div className="an-company-chips" style={{ marginTop: '8px' }}>
                                {referralMetrics.direct.interviewApps.length > 0 ? (
                                    referralMetrics.direct.interviewApps.map((app, idx) => (
                                        <span key={app.id || idx} className="an-company-chip chip-direct-app">
                                            {app.label}
                                        </span>
                                    ))
                                ) : (
                                    <span style={{ fontSize: '12px', color: 'var(--text-muted)', fontStyle: 'italic' }}>
                                        No direct applications reached interviews
                                    </span>
                                )}
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default AnalyticsPage;