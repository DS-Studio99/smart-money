'use client'
import { useEffect, useState, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/context/AuthContext'
import { useAISettings } from '@/context/AISettingsContext'
import Sidebar from '@/components/Sidebar'
import { PieChart, Pie, Cell, BarChart, Bar, LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts'

const COLORS = ['#F97316', '#8B5CF6', '#3B82F6', '#EF4444', '#10B981', '#F59E0B', '#EC4899', '#94A3B8']

export default function ReportPage() {
    const { user, profile, loading } = useAuth()
    const { getAIParams } = useAISettings()
    const router = useRouter()
    const now = new Date()
    const [month, setMonth] = useState(now.getMonth() + 1)
    const [year, setYear] = useState(now.getFullYear())
    const [report, setReport] = useState(null)
    const [fetching, setFetching] = useState(false)
    const monthNames = ['জানুয়ারি', 'ফেব্রুয়ারি', 'মার্চ', 'এপ্রিল', 'মে', 'জুন', 'জুলাই', 'আগস্ট', 'সেপ্টেম্বর', 'অক্টোবর', 'নভেম্বর', 'ডিসেম্বর']

    const fetchReport = useCallback(async () => {
        if (!user) return; setFetching(true)
        const aiParams = getAIParams()
        const res = await fetch(`/api/report?userId=${user.id}&month=${month}&year=${year}${aiParams ? '&' + aiParams : ''}`)
        setReport(await res.json()); setFetching(false)
    }, [user, month, year])

    useEffect(() => { if (!loading && !user) router.push('/') }, [user, loading, router])
    useEffect(() => { if (user) fetchReport() }, [user, fetchReport])

    const pieData = report ? Object.entries(report.categoryBreakdown).map(([name, value], i) => ({ name, value, color: COLORS[i % COLORS.length] })) : []

    function getScore() {
        if (!report) return 50
        const savingRate = report.monthlyIncome > 0 ? report.totalSaving / report.monthlyIncome : 0
        const budgetAdherence = report.overBudget.length === 0 ? 30 : Math.max(0, 30 - report.overBudget.length * 10)

        let incomeScore = 50;
        if (report.monthlyIncome > 0) {
            incomeScore = Math.min(50, Math.round(savingRate * 100))
        } else if (report.totalExpenses > 0 && report.totalBudget > 0) {
            incomeScore = report.totalExpenses <= report.totalBudget ? 50 : Math.max(0, 50 - ((report.totalExpenses - report.totalBudget) / report.totalBudget) * 50)
        }

        return Math.min(100, Math.max(0, incomeScore + budgetAdherence + 20))
    }

    const score = getScore()
    const scoreColor = score >= 70 ? '#10B981' : score >= 40 ? '#F59E0B' : '#EF4444'
    const scoreLabel = score >= 70 ? 'চমৎকার!' : score >= 40 ? 'ভালো' : 'উন্নতি দরকার'

    const topCategory = pieData.length > 0 ? [...pieData].sort((a, b) => b.value - a.value)[0] : null
    const daysInMonth = new Date(year, month, 0).getDate()
    const dailyAvg = report ? Math.round(report.totalExpenses / (now.getMonth() + 1 === month && now.getFullYear() === year ? now.getDate() || 1 : daysInMonth)) : 0

    return (
        <div className="app-layout">
            <Sidebar />
            <main className="main-content">
                <div className="page-inner">
                    <div className="gl-hero">
                        <div className="gl-hero-bg" style={{ background: 'linear-gradient(135deg, rgba(16,185,129,0.15), rgba(59,130,246,0.10), rgba(245,158,11,0.08))' }}></div>
                        <div className="gl-hero-content">
                            <div className="exp-hero-left">
                                <div className="exp-hero-icon-wrap">
                                    <span className="exp-hero-icon" style={{ filter: 'drop-shadow(0 0 12px rgba(16,185,129,0.5))' }}>📈</span>
                                    <div className="exp-hero-icon-ring" style={{ borderColor: 'rgba(16,185,129,0.3)', background: 'conic-gradient(from 0deg, transparent, rgba(16,185,129,0.2), transparent, rgba(59,130,246,0.2), transparent)' }}></div>
                                </div>
                                <div>
                                    <h1 className="gl-hero-title" style={{ background: 'linear-gradient(135deg, #F1F5F9, #10B981, #3B82F6)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>মাসিক আর্থিক রিপোর্ট</h1>
                                    <p className="exp-hero-sub">আপনার সম্পূর্ণ আর্থিক বিশ্লেষণ</p>
                                </div>
                            </div>
                            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                                <select className="exp-filter-select" value={month} onChange={e => setMonth(Number(e.target.value))}>
                                    {monthNames.map((m, i) => <option key={i} value={i + 1}>{m}</option>)}
                                </select>
                                <select className="exp-filter-select" value={year} onChange={e => setYear(Number(e.target.value))}>
                                    {[2023, 2024, 2025, 2026].map(y => <option key={y} value={y}>{y}</option>)}
                                </select>
                                <div style={{ display: 'flex', gap: 8 }}>
                                    <button className="exp-add-btn" style={{ background: 'linear-gradient(135deg, #10B981, #059669)', boxShadow: '0 6px 24px rgba(16,185,129,0.4)' }} onClick={fetchReport}>📊 <span>রিপোর্ট দেখান</span><div className="exp-add-btn-shine"></div></button>
                                    <button className="exp-add-btn" style={{ background: 'linear-gradient(135deg, #8B5CF6, #6D28D9)', boxShadow: '0 6px 24px rgba(139,92,246,0.4)' }} onClick={() => window.print()}>📥 <span>PDF</span><div className="exp-add-btn-shine"></div></button>
                                </div>
                            </div>
                        </div>
                    </div>

                    {fetching ? <div className="gl-loading-full"><div className="exp-loading-ring" style={{ borderTopColor: '#10B981' }}></div><p>লোড হচ্ছে...</p></div>
                        : !report ? <div className="exp-empty"><div className="exp-empty-icon">📈</div><h3>রিপোর্ট দেখুন</h3><p>রিপোর্ট লোড করতে বোতাম চাপুন।</p></div>
                            : (
                                <>
                                    <div className="gl-two-col mb-6">
                                        {/* Health Score */}
                                        <div className="gl-glass-card">
                                            <div className="gl-glass-card-bg"></div>
                                            <div className="gl-glass-card-inner" style={{ textAlign: 'center' }}>
                                                <div className="gl-section-title" style={{ justifyContent: 'center' }}>🏆 অর্থনৈতিক স্বাস্থ্য স্কোর</div>
                                                <div style={{ position: 'relative', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', marginBottom: 16 }}>
                                                    <svg width="140" height="140" viewBox="0 0 140 140">
                                                        <circle cx="70" cy="70" r="60" fill="none" stroke="rgba(255,255,255,0.04)" strokeWidth="12" />
                                                        <circle cx="70" cy="70" r="60" fill="none" stroke={scoreColor} strokeWidth="12"
                                                            strokeDasharray={`${2 * Math.PI * 60 * score / 100} ${2 * Math.PI * 60 * (1 - score / 100)}`}
                                                            strokeLinecap="round" transform="rotate(-90 70 70)" style={{ transition: 'stroke-dasharray 1s', filter: `drop-shadow(0 0 8px ${scoreColor}66)` }} />
                                                    </svg>
                                                    <div style={{ position: 'absolute', textAlign: 'center' }}>
                                                        <div style={{ fontSize: 36, fontWeight: 800, color: scoreColor, fontFamily: 'Inter', textShadow: `0 0 20px ${scoreColor}44` }}>{score}</div>
                                                        <div style={{ fontSize: 12, color: 'var(--text-secondary)' }}>/ ১০০</div>
                                                    </div>
                                                </div>
                                                <p style={{ fontSize: 18, fontWeight: 800, color: scoreColor, marginBottom: 8 }}>{scoreLabel}</p>
                                                <p style={{ fontSize: 13, color: 'var(--text-secondary)' }}>
                                                    {score >= 70 ? 'আপনি অর্থ ব্যবস্থাপনায় খুবই দক্ষ!' : score >= 40 ? 'আরো সঞ্চয় করার চেষ্টা করুন।' : 'খরচ কমানো জরুরি।'}
                                                </p>
                                            </div>
                                        </div>

                                        {/* Summary */}
                                        <div className="gl-glass-card">
                                            <div className="gl-glass-card-bg"></div>
                                            <div className="gl-glass-card-inner">
                                                <div className="gl-section-title">📋 {monthNames[month - 1]} {year} সারসংক্ষেপ</div>
                                                {[
                                                    { label: 'মোট আয়', value: report.monthlyIncome, color: '#FCD34D', icon: '💰' },
                                                    { label: 'মোট বাজেট', value: report.totalBudget, color: '#60A5FA', icon: '📊' },
                                                    { label: 'মোট খরচ', value: report.totalExpenses, color: '#FCA5A5', icon: '💸' },
                                                    { label: 'মোট সঞ্চয়', value: report.totalSaving, color: '#6EE7B7', icon: '💎' },
                                                ].map(s => (
                                                    <div key={s.label} className="gl-list-item">
                                                        <div className="gl-list-left">
                                                            <div className="gl-list-icon" style={{ background: `${s.color}15` }}>{s.icon}</div>
                                                            <span style={{ fontSize: 14, color: 'var(--text-secondary)' }}>{s.label}</span>
                                                        </div>
                                                        <span style={{ fontSize: 18, fontWeight: 800, color: s.color, fontFamily: 'Inter' }}>৳{Math.abs(s.value).toLocaleString()}</span>
                                                    </div>
                                                ))}
                                                {report.overBudget.length > 0 && <div className="gl-alert gl-alert-danger" style={{ marginTop: 12, fontSize: 13 }}>⚠️ বাজেট অতিক্রম: {report.overBudget.map(b => b.category).join(', ')}</div>}
                                            </div>
                                        </div>
                                    </div>

                                    {/* Alerts */}
                                    {report.categoryAlerts && report.categoryAlerts.length > 0 && (
                                        <div className="mb-6">
                                            {report.categoryAlerts.map((a, i) => (
                                                <div key={i} className={`gl-alert ${a.type === 'danger' ? 'gl-alert-danger' : 'gl-alert-warn'}`} style={{ marginBottom: 8, padding: '12px 16px', borderRadius: 12 }}>{a.message}</div>
                                            ))}
                                        </div>
                                    )}

                                    {/* Custom Print Styles inline */}
                                    <style jsx global>{`
                                        @media print {
                                            .gl-hero, .exp-add-btn, sidebar, .gl-chat-header, .exp-filter-select { display: none !important; }
                                            .gl-glass-card { break-inside: avoid; border: 1px solid #ccc !important; box-shadow: none !important; color: #000; }
                                            * { background: transparent !important; color: #000 !important; }
                                            .app-layout { padding: 0 !important; margin: 0 !important; display: block; }
                                            .main-content { margin-left: 0 !important; }
                                            svg circle, svg path, rect { stroke: #000 !important; background: #000 !important; color: #000 !important;}
                                        }
                                    `}</style>

                                    {/* Charts */}
                                    <div className="gl-two-col mb-6">
                                        <div className="gl-glass-card"><div className="gl-glass-card-bg"></div><div className="gl-glass-card-inner">
                                            <div className="gl-section-title">🥧 খরচের ক্যাটাগরি</div>
                                            {pieData.length > 0 ? <ResponsiveContainer width="100%" height={250}><PieChart><Pie data={pieData} cx="50%" cy="50%" outerRadius={90} dataKey="value" label={({ name, value }) => `${name}: ৳${Number(value).toLocaleString()}`}>{pieData.map((entry, i) => <Cell key={i} fill={entry.color} />)}</Pie><Tooltip formatter={v => `৳${Number(v).toLocaleString()}`} contentStyle={{ background: 'rgba(19,31,51,0.9)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 12, color: '#F1F5F9' }} /></PieChart></ResponsiveContainer> : <div className="gl-empty-mini"><span>📊</span><p>কোনো খরচ নেই।</p></div>}
                                        </div></div>
                                        <div className="gl-glass-card"><div className="gl-glass-card-bg"></div><div className="gl-glass-card-inner">
                                            <div className="gl-section-title">📊 বাজেট বনাম খরচ</div>
                                            {report.budgetStatus.length > 0 ? <ResponsiveContainer width="100%" height={250}><BarChart data={report.budgetStatus}><XAxis dataKey="category" tick={{ fill: '#94A3B8', fontSize: 10 }} /><YAxis tick={{ fill: '#94A3B8', fontSize: 10 }} /><Tooltip formatter={v => `৳${Number(v).toLocaleString()}`} contentStyle={{ background: 'rgba(19,31,51,0.9)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 12, color: '#F1F5F9' }} /><Bar dataKey="budget" name="বাজেট" fill="#3B82F6" radius={[6, 6, 0, 0]} /><Bar dataKey="spent" name="খরচ" fill="#F59E0B" radius={[6, 6, 0, 0]} /></BarChart></ResponsiveContainer> : <div className="gl-empty-mini"><span>📊</span><p>বাজেট নির্ধারণ করুন।</p></div>}
                                        </div></div>
                                    </div>

                                    <div className="gl-glass-card mb-6"><div className="gl-glass-card-bg"></div><div className="gl-glass-card-inner">
                                        <div className="gl-section-title">📊 গত ৬ মাসের ট্রেন্ড</div>
                                        {report.trendData ? (
                                            <ResponsiveContainer width="100%" height={250}>
                                                <LineChart data={report.trendData}>
                                                    <XAxis dataKey="name" tick={{ fill: '#94A3B8', fontSize: 10 }} />
                                                    <YAxis tick={{ fill: '#94A3B8', fontSize: 10 }} />
                                                    <Tooltip formatter={v => `৳${Number(v).toLocaleString()}`} contentStyle={{ background: 'rgba(19,31,51,0.9)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 12, color: '#F1F5F9' }} />
                                                    <Line type="monotone" dataKey="value" stroke="#8B5CF6" strokeWidth={3} dot={{ fill: '#8B5CF6', r: 4 }} activeDot={{ r: 6, strokeWidth: 0 }} />
                                                </LineChart>
                                            </ResponsiveContainer>
                                        ) : <div className="gl-empty-mini">কোনো ডেটা নেই।</div>}
                                    </div></div>

                                    {/* Dashboard Highlights extended with Projection */}
                                    <div className="gl-glass-card mb-6">
                                        <div className="gl-glass-card-bg"></div>
                                        <div className="gl-glass-card-inner">
                                            <div className="gl-section-title">✨ অন্যান্য পরিসংখ্যান</div>
                                            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 16 }}>
                                                <div className="gl-list-item">
                                                    <div className="gl-list-left">
                                                        <div className="gl-list-icon" style={{ background: 'rgba(236,72,153,0.15)', fontSize: 20 }}>🔥</div>
                                                        <div><span style={{ fontSize: 13, color: 'var(--text-secondary)' }}>সর্বোচ্চ খরচের খাত</span><br /><span style={{ fontSize: 16, fontWeight: 700 }}>{topCategory ? topCategory.name : '—'}</span></div>
                                                    </div>
                                                </div>
                                                <div className="gl-list-item">
                                                    <div className="gl-list-left">
                                                        <div className="gl-list-icon" style={{ background: 'rgba(59,130,246,0.15)', fontSize: 20 }}>⏱️</div>
                                                        <div><span style={{ fontSize: 13, color: 'var(--text-secondary)' }}>দৈনিক গড় খরচ</span><br /><span style={{ fontSize: 16, fontWeight: 700, fontFamily: 'Inter' }}>৳{dailyAvg.toLocaleString()}</span></div>
                                                    </div>
                                                </div>
                                                <div className="gl-list-item">
                                                    <div className="gl-list-left">
                                                        <div className="gl-list-icon" style={{ background: 'rgba(16,185,129,0.15)', fontSize: 20 }}>🎯</div>
                                                        <div><span style={{ fontSize: 13, color: 'var(--text-secondary)' }}>সক্রিয় লক্ষ্য</span><br /><span style={{ fontSize: 16, fontWeight: 700, fontFamily: 'Inter' }}>{report.goals.length}টি</span></div>
                                                    </div>
                                                </div>
                                                {report.projectedEnd !== undefined && (
                                                    <div className="gl-list-item">
                                                        <div className="gl-list-left">
                                                            <div className="gl-list-icon" style={{ background: 'rgba(168,85,247,0.15)', fontSize: 20 }}>🔮</div>
                                                            <div><span style={{ fontSize: 13, color: 'var(--text-secondary)' }}>সম্ভাব্য মাস শেষে খরচ</span><br /><span style={{ fontSize: 16, fontWeight: 700, fontFamily: 'Inter', color: report.projectedEnd > report.totalBudget && report.totalBudget > 0 ? '#EF4444' : '#10B981' }}>৳{report.projectedEnd.toLocaleString()}</span></div>
                                                        </div>
                                                    </div>
                                                )}
                                            </div>
                                        </div>
                                    </div>

                                    {/* Goals & Recurring */}
                                    <div className="gl-two-col mb-6">
                                        <div className="gl-glass-card"><div className="gl-glass-card-bg"></div><div className="gl-glass-card-inner">
                                            <div className="gl-section-title">🎯 লক্ষ্য ট্র্যাকিং (Goal Impact)</div>
                                            {report.goalImpact && report.goalImpact.length > 0 ? report.goalImpact.map(g => (
                                                <div key={g.id} className="gl-list-item">
                                                    <div className="gl-list-left">
                                                        <div className="gl-list-icon" style={{ background: 'rgba(16,185,129,0.15)' }}>🎯</div>
                                                        <div><span style={{ fontSize: 14 }}>{g.title}</span><br />
                                                            <span style={{ fontSize: 12, color: 'var(--text-secondary)' }}>{g.monthsToGoal > 0 ? `বর্তমান সাশ্রয়ে আর ${g.monthsToGoal} মাস লাগবে` : 'সঞ্চয় বাড়াতে হবে'}</span></div>
                                                    </div>
                                                </div>
                                            )) : <div className="gl-empty-mini">কোনো সক্রিয় লক্ষ্য নেই।</div>}
                                        </div></div>
                                        <div className="gl-glass-card"><div className="gl-glass-card-bg"></div><div className="gl-glass-card-inner">
                                            <div className="gl-section-title">🔄 পুনরাবৃত্ত খরচ (Subscriptions)</div>
                                            {report.recurringExpenses && report.recurringExpenses.length > 0 ? report.recurringExpenses.map((r, i) => (
                                                <div key={i} className="gl-list-item">
                                                    <div className="gl-list-left">
                                                        <div className="gl-list-icon" style={{ background: 'rgba(59,130,246,0.15)' }}>🔄</div>
                                                        <div><span style={{ fontSize: 14 }}>{r.note || r.category}</span><br /><span style={{ fontSize: 12, color: 'var(--text-secondary)' }}>{r.count} মাস দেখা গেছে</span></div>
                                                    </div>
                                                    <span style={{ fontSize: 14, fontWeight: 'bold' }}>~৳{r.amount.toLocaleString()}</span>
                                                </div>
                                            )) : <div className="gl-empty-mini">কোনো সাবস্ক্রিপশন নেই।</div>}
                                        </div></div>
                                    </div>

                                    {/* Calendar Heatmap */}
                                    <div className="gl-glass-card mb-6"><div className="gl-glass-card-bg"></div><div className="gl-glass-card-inner">
                                        <div className="gl-section-title">📅 দৈনিক খরচ (হিটম্যাপ)</div>
                                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: 6 }}>
                                            {report.calendarData && report.calendarData.map(d => {
                                                let intensity = 0;
                                                if (d.amount > 0) intensity = Math.min(1, 0.2 + (d.amount / (dailyAvg * 2 || 1)) * 0.8)
                                                return (
                                                    <div key={d.day} style={{ aspectRatio: '1/1', background: d.amount > 0 ? `rgba(239, 68, 68, ${intensity})` : 'rgba(255,255,255,0.02)', borderRadius: 6, display: 'flex', alignItems: 'center', justifyContent: 'center', color: intensity > 0.4 ? '#fff' : 'var(--text-secondary)', fontSize: 12, border: '1px solid rgba(255,255,255,0.05)' }} title={`${d.day} তারিখ: ৳${d.amount.toLocaleString()}`}>
                                                        {d.day}
                                                    </div>
                                                )
                                            })}
                                        </div>
                                    </div></div>

                                    {/* Budget Detail */}
                                    {report.budgetStatus.length > 0 && (
                                        <div className="gl-glass-card mb-6"><div className="gl-glass-card-bg"></div><div className="gl-glass-card-inner">
                                            <div className="gl-section-title">📋 বাজেট বিস্তারিত</div>
                                            <div className="table-wrapper" style={{ border: '1px solid rgba(255,255,255,0.06)', borderRadius: 14 }}>
                                                <table>
                                                    <thead><tr><th>ক্যাটাগরি</th><th>বাজেট</th><th>খরচ</th><th>বাকি</th><th>অবস্থা</th></tr></thead>
                                                    <tbody>
                                                        {report.budgetStatus.map(b => (
                                                            <tr key={b.category}>
                                                                <td>{b.category}</td>
                                                                <td style={{ fontFamily: 'Inter' }}>৳{Number(b.budget).toLocaleString()}</td>
                                                                <td style={{ fontFamily: 'Inter', color: '#FCA5A5' }}>৳{Number(b.spent).toLocaleString()}</td>
                                                                <td style={{ fontFamily: 'Inter', color: '#6EE7B7' }}>৳{Math.max(0, b.remaining).toLocaleString()}</td>
                                                                <td>
                                                                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                                                                        <div className="progress-bar-bg" style={{ width: 80 }}><div className={`progress-bar-fill ${b.pct >= 100 ? 'danger' : b.pct >= 75 ? 'warn' : 'safe'}`} style={{ width: `${b.pct}%` }} /></div>
                                                                        <span style={{ fontSize: 12, fontFamily: 'Inter' }}>{b.pct}%</span>
                                                                    </div>
                                                                </td>
                                                            </tr>
                                                        ))}
                                                    </tbody>
                                                </table>
                                            </div>
                                        </div></div>
                                    )}

                                    {/* AI Insights */}
                                    <div className="gl-glass-card"><div className="gl-glass-card-bg"></div><div className="gl-glass-card-inner">
                                        <div className="gl-section-title">🤖 AI বিশ্লেষণ</div>
                                        <div style={{ background: 'rgba(255,255,255,0.02)', borderRadius: 14, padding: 20, lineHeight: 1.9, whiteSpace: 'pre-wrap', fontSize: 14, color: 'var(--text-primary)', border: '1px solid rgba(255,255,255,0.04)' }}>{report.aiInsights}</div>
                                    </div></div>


                                </>
                            )}
                </div>
            </main>
        </div>
    )
}
