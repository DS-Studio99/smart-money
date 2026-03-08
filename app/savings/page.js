'use client'
import { useEffect, useState, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/context/AuthContext'
import Sidebar from '@/components/Sidebar'
import { BarChart, Bar, Cell, XAxis, YAxis, Tooltip, ResponsiveContainer, ReferenceLine } from 'recharts'

export default function SavingsVaultPage() {
    const { user, loading } = useAuth()
    const router = useRouter()
    const [data, setData] = useState(null)
    const [fetching, setFetching] = useState(true)

    const fetchSavings = useCallback(async () => {
        if (!user) return
        setFetching(true)
        const res = await fetch(`/api/savings?userId=${user.id}`)
        const result = await res.json()
        setData(result)
        setFetching(false)
    }, [user])

    useEffect(() => { if (!loading && !user) router.push('/') }, [user, loading, router])
    useEffect(() => { if (user) fetchSavings() }, [user, fetchSavings])

    const monthNames = ['জানুয়ারি', 'ফেব্রুয়ারি', 'মার্চ', 'এপ্রিল', 'মে', 'জুন', 'জুলাই', 'আগস্ট', 'সেপ্টেম্বর', 'অক্টোবর', 'নভেম্বর', 'ডিসেম্বর']

    if (fetching) return <div className="app-layout"><Sidebar /><main className="main-content"><div className="gl-loading-full"><div className="exp-loading-ring" style={{ borderTopColor: '#10B981' }}></div><p>ভল্ট লোড হচ্ছে...</p></div></main></div>

    if (!data) return <div className="app-layout"><Sidebar /><main className="main-content"><div className="exp-empty">ডেটা পাওয়া যায়নি।</div></main></div>

    const isDeficit = data.totalAccumulatedSavings < 0;

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
                                    <span className="exp-hero-icon" style={{ filter: 'drop-shadow(0 0 12px rgba(16,185,129,0.5))' }}>🏦</span>
                                    <div className="exp-hero-icon-ring" style={{ borderColor: 'rgba(16,185,129,0.3)', background: 'conic-gradient(from 0deg, transparent, rgba(16,185,129,0.2), transparent, rgba(59,130,246,0.2), transparent)' }}></div>
                                </div>
                                <div>
                                    <h1 className="gl-hero-title" style={{ background: 'linear-gradient(135deg, #F1F5F9, #10B981, #3B82F6)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>প্রকৃত সঞ্চয় (Vault)</h1>
                                    <p className="exp-hero-sub">মাস শেষে বেঁচে যাওয়া টাকার আসল হিসাব</p>
                                </div>
                            </div>
                            <button className="exp-add-btn" style={{ background: 'linear-gradient(135deg, #10B981, #059669)', boxShadow: '0 6px 24px rgba(16,185,129,0.4)' }} onClick={() => window.print()}>📥 <span>PDF ডাউনলোড</span><div className="exp-add-btn-shine"></div></button>
                        </div>
                    </div>

                    <style jsx global>{`
                        @media print {
                            .gl-hero, .exp-add-btn, sidebar { display: none !important; }
                            .gl-glass-card { break-inside: avoid; border: 1px solid #ccc !important; box-shadow: none !important; }
                            * { background: transparent !important; color: #000 !important; }
                            .app-layout { padding: 0 !important; margin: 0 !important; display: block; }
                            .main-content { margin-left: 0 !important; }
                        }

                        @keyframes pulse-border {
                            0% { box-shadow: 0 0 0 0 rgba(16, 185, 129, 0.4); }
                            70% { box-shadow: 0 0 0 10px rgba(16, 185, 129, 0); }
                            100% { box-shadow: 0 0 0 0 rgba(16, 185, 129, 0); }
                        }
                        .running-highlight {
                            position: relative;
                            animation: pulse-border 2s infinite;
                            border: 1px solid #10B981 !important;
                        }
                        
                        .running-highlight-danger {
                            animation: pulse-border-danger 2s infinite;
                            border: 1px solid #EF4444 !important;
                        }
                        @keyframes pulse-border-danger {
                            0% { box-shadow: 0 0 0 0 rgba(239, 68, 68, 0.4); }
                            70% { box-shadow: 0 0 0 10px rgba(239, 68, 68, 0); }
                            100% { box-shadow: 0 0 0 0 rgba(239, 68, 68, 0); }
                        }
                    `}</style>

                    {/* Main Vault Balance */}
                    <div className="gl-glass-card mb-6" style={{ background: isDeficit ? 'linear-gradient(135deg, rgba(239, 68, 68, 0.1), rgba(0, 0, 0, 0.2))' : 'linear-gradient(135deg, rgba(16, 185, 129, 0.1), rgba(0, 0, 0, 0.2))', border: `1px solid ${isDeficit ? 'rgba(239, 68, 68, 0.3)' : 'rgba(16, 185, 129, 0.3)'}` }}>
                        <div className="gl-glass-card-inner" style={{ textAlign: 'center', padding: '40px 20px' }}>
                            <div style={{ fontSize: 16, color: 'var(--text-secondary)', marginBottom: 12 }}>{isDeficit ? '🚨 মোট ঘাটতি পরিমাণ (আগের মাস পর্যন্ত)' : '💰 সর্বমোট প্রকৃত সঞ্চয় (আগের মাস পর্যন্ত)'}</div>
                            <div style={{ fontSize: 48, fontWeight: 900, color: isDeficit ? '#EF4444' : '#10B981', fontFamily: 'Inter', textShadow: `0 0 30px ${isDeficit ? 'rgba(239,68,68,0.4)' : 'rgba(16,185,129,0.4)'}` }}>
                                {isDeficit ? '-' : ''}৳{Math.abs(data.totalAccumulatedSavings).toLocaleString('bn-BD')}
                            </div>
                            <p style={{ marginTop: 12, fontSize: 14, color: 'var(--text-secondary)' }}>
                                {isDeficit ? 'আগের মাসগুলোয় আয়ের চেয়ে খরচ বেশি হওয়ায় আপনি ঘাটতিতে আছেন।' : 'দারুণ! আপনার আগের মাসের উদ্বৃত্ত টাকা এখানে জমা হয়েছে।'}
                            </p>

                            {/* Running Month Mini Stats */}
                            <div className={data.currentMonthData?.savings >= 0 ? "running-highlight" : "running-highlight-danger"} style={{ marginTop: 24, padding: '16px', background: 'rgba(255,255,255,0.03)', borderRadius: 12, display: 'inline-block', minWidth: 'min(100%, 300px)' }}>
                                <div style={{ fontSize: 13, color: 'var(--text-secondary)', marginBottom: 4 }}>⏳ চলতি মাস ({monthNames[new Date().getMonth()]}) - চলমান</div>
                                <div style={{ fontSize: 24, fontWeight: 800, color: data.currentMonthData?.savings >= 0 ? '#10B981' : '#EF4444', fontFamily: 'Inter' }}>
                                    {data.currentMonthData?.savings >= 0 ? '+' : '-'}৳{Math.abs(data.currentMonthData?.savings || 0).toLocaleString('bn-BD')}
                                </div>
                                <div style={{ fontSize: 12, color: 'var(--text-secondary)', marginTop: 4 }}>মাস শেষে এটি মূল ভল্টে যুক্ত হবে</div>
                            </div>
                        </div>
                    </div>

                    {/* Summary Stats */}
                    <div className="gl-two-col mb-6">
                        <div className="gl-glass-card"><div className="gl-glass-card-bg"></div><div className="gl-glass-card-inner">
                            <div className="gl-section-title">📊 সঞ্চয়ের সারাংশ</div>
                            {[
                                { label: 'গড় মাসিক সঞ্চয়', value: data.avgSavings, color: data.avgSavings >= 0 ? '#6EE7B7' : '#FCA5A5', icon: '📈' },
                                { label: 'সর্বোচ্চ সঞ্চয়ের মাস', value: data.bestMonth ? data.bestMonth.savings : 0, color: '#3B82F6', icon: '🏆', text: data.bestMonth ? `${monthNames[data.bestMonth.month - 1]} ${data.bestMonth.year}` : '-' },
                                { label: 'সর্বোচ্চ ঘাটতির মাস', value: data.worstMonth ? data.worstMonth.savings : 0, color: '#EF4444', icon: '📉', text: data.worstMonth ? `${monthNames[data.worstMonth.month - 1]} ${data.worstMonth.year}` : '-' },
                            ].map((s, i) => (
                                <div key={i} className="gl-list-item">
                                    <div className="gl-list-left">
                                        <div className="gl-list-icon" style={{ background: `${s.color}15` }}>{s.icon}</div>
                                        <div>
                                            <span style={{ fontSize: 14, color: 'var(--text-secondary)' }}>{s.label}</span>
                                            {s.text && <div style={{ fontSize: 12 }}>{s.text}</div>}
                                        </div>
                                    </div>
                                    <span style={{ fontSize: 18, fontWeight: 800, color: s.color, fontFamily: 'Inter' }}>৳{Math.abs(s.value).toLocaleString()}</span>
                                </div>
                            ))}
                        </div></div>

                        {/* Trend Chart */}
                        <div className="gl-glass-card"><div className="gl-glass-card-bg"></div><div className="gl-glass-card-inner">
                            <div className="gl-section-title">📊 গত ৬ মাসের ট্রেন্ড</div>
                            {data.trendData && data.trendData.length > 0 ? (
                                <ResponsiveContainer width="100%" height={200}>
                                    <BarChart data={data.trendData}>
                                        <XAxis dataKey="name" tick={{ fill: '#94A3B8', fontSize: 10 }} />
                                        <YAxis tick={{ fill: '#94A3B8', fontSize: 10 }} />
                                        <Tooltip formatter={v => `৳${Number(v).toLocaleString()}`} contentStyle={{ background: 'rgba(19,31,51,0.9)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 12, color: '#F1F5F9' }} />
                                        <ReferenceLine y={0} stroke="#94A3B8" />
                                        <Bar dataKey="savings" name="সঞ্চয়/ঘাটতি">
                                            {data.trendData.map((entry, index) => (
                                                <Cell key={`cell-${index}`} fill={entry.savings >= 0 ? '#10B981' : '#EF4444'} />
                                            ))}
                                        </Bar>
                                    </BarChart>
                                </ResponsiveContainer>
                            ) : <div className="gl-empty-mini">কোনো ডেটা নেই।</div>}
                        </div></div>
                    </div>

                    {/* Monthly History Heatmap */}
                    <div className="gl-glass-card mb-6"><div className="gl-glass-card-bg"></div><div className="gl-glass-card-inner">
                        <div className="gl-section-title">📅 মাসিক সঞ্চয় (গত ১২ মাস)</div>
                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: 10 }}>
                            {data.heatmapData && data.heatmapData.map((d, i) => {
                                const isPos = d.savings >= 0;
                                const amt = Math.abs(d.savings);
                                const maxAbs = Math.max(...data.heatmapData.map(x => Math.abs(x.savings))) || 1;
                                const intensity = 0.2 + (amt / maxAbs) * 0.8;
                                const bgColor = isPos ? `rgba(16, 185, 129, ${intensity})` : `rgba(239, 68, 68, ${intensity})`;
                                const isCurrent = d.year === new Date().getFullYear() && d.month === new Date().getMonth() + 1;
                                const highlightClass = isCurrent ? (isPos ? 'running-highlight' : 'running-highlight-danger') : '';

                                return (
                                    <div key={i} className={highlightClass} style={{ padding: '16px 20px', background: bgColor, borderRadius: 8, display: 'flex', flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', color: intensity > 0.4 ? '#fff' : 'var(--text-secondary)', border: '1px solid rgba(255,255,255,0.05)' }} title={`${monthNames[d.month - 1]} ${d.year}: ৳${d.savings.toLocaleString('bn-BD')}`}>
                                        <div style={{ fontSize: 14 }}>{monthNames[d.month - 1]} {d.year}</div>
                                        <div style={{ fontSize: 18, fontWeight: 'bold', fontFamily: 'Inter' }}>{isPos ? '+' : '-'}৳{amt.toLocaleString('bn-BD')}</div>
                                        {isCurrent && <div style={{ fontSize: 14, fontWeight: 'bold', opacity: 0.9 }}>(চলমান)</div>}
                                    </div>
                                )
                            })}
                        </div>
                    </div></div>

                    {/* Detailed History Table */}
                    <div className="gl-glass-card"><div className="gl-glass-card-bg"></div><div className="gl-glass-card-inner">
                        <div className="gl-section-title">📋 সম্পূর্ণ মাসভিত্তিক রেকর্ড</div>
                        <div className="table-wrapper" style={{ border: '1px solid rgba(255,255,255,0.06)', borderRadius: 14 }}>
                            <table>
                                <thead><tr><th>মাস ও বছর</th><th>মোট আয়</th><th>মোট খরচ</th><th>প্রকৃত সঞ্চয়</th><th>অবস্থা</th></tr></thead>
                                <tbody>
                                    {data.monthsData && data.monthsData.map((m, i) => (
                                        <tr key={i}>
                                            <td>{monthNames[m.month - 1]} {m.year}</td>
                                            <td style={{ fontFamily: 'Inter', color: '#FCD34D' }}>৳{m.income.toLocaleString()}</td>
                                            <td style={{ fontFamily: 'Inter', color: '#FCA5A5' }}>৳{m.expenses.toLocaleString()}</td>
                                            <td style={{ fontFamily: 'Inter', color: m.savings >= 0 ? '#10B981' : '#EF4444', fontWeight: 'bold' }}>
                                                {m.savings >= 0 ? '+' : '-'}৳{Math.abs(m.savings).toLocaleString()}
                                            </td>
                                            <td>
                                                {m.year === new Date().getFullYear() && m.month === new Date().getMonth() + 1 ? (
                                                    <span className="gl-badge" style={{ background: 'rgba(245,158,11,0.2)', color: '#FCD34D' }}>
                                                        Running
                                                    </span>
                                                ) : (
                                                    <span className={`gl-badge ${m.savings >= 0 ? 'gl-badge-active' : 'gl-badge-danger'}`}>
                                                        Completed
                                                    </span>
                                                )}
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </div></div>

                </div>
            </main>
        </div>
    )
}
