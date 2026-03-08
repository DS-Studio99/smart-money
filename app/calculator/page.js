'use client'
import { useState } from 'react'
import Sidebar from '@/components/Sidebar'

export default function CalculatorPage() {
    const [monthly, setMonthly] = useState('')
    const [rate, setRate] = useState('10')
    const [years, setYears] = useState('5')
    const [result, setResult] = useState(null)

    function calculate() {
        const P = parseFloat(monthly) || 0
        const r = (parseFloat(rate) || 0) / 100 / 12
        const n = (parseFloat(years) || 0) * 12
        if (P <= 0 || n <= 0) return
        const fv = r > 0 ? P * ((Math.pow(1 + r, n) - 1) / r) : P * n
        const totalInvested = P * n
        const totalReturn = fv - totalInvested
        const yearlyData = []
        for (let y = 1; y <= parseFloat(years); y++) {
            const months = y * 12
            const val = r > 0 ? P * ((Math.pow(1 + r, months) - 1) / r) : P * months
            yearlyData.push({ year: y, value: Math.round(val), invested: P * months })
        }
        setResult({ fv: Math.round(fv), totalInvested: Math.round(totalInvested), totalReturn: Math.round(totalReturn), yearlyData })
    }

    const milestones = result ? [
        { label: 'লক্ষপতি', target: 100000, icon: '🌟', color: '#F59E0B' },
        { label: 'দশ লক্ষ', target: 1000000, icon: '💎', color: '#3B82F6' },
        { label: 'কোটিপতি', target: 10000000, icon: '👑', color: '#A855F7' },
    ].map(m => {
        const P = parseFloat(monthly) || 1
        const r = (parseFloat(rate) || 0) / 100 / 12
        const months = r > 0 ? Math.log(1 + (m.target * r / P)) / Math.log(1 + r) : m.target / P
        return { ...m, months: Math.ceil(months), years: (Math.ceil(months) / 12).toFixed(1) }
    }) : []

    return (
        <div className="app-layout">
            <Sidebar />
            <main className="main-content">
                <div className="page-inner">
                    <div className="gl-hero">
                        <div className="gl-hero-bg" style={{ background: 'linear-gradient(135deg, rgba(245,158,11,0.15), rgba(16,185,129,0.10), rgba(139,92,246,0.08))' }}></div>
                        <div className="exp-hero-particles"><div className="exp-particle exp-p1"></div><div className="exp-particle exp-p2"></div></div>
                        <div className="gl-hero-content">
                            <div className="exp-hero-left">
                                <div className="exp-hero-icon-wrap">
                                    <span className="exp-hero-icon" style={{ filter: 'drop-shadow(0 0 12px rgba(245,158,11,0.5))' }}>🧮</span>
                                    <div className="exp-hero-icon-ring" style={{ borderColor: 'rgba(245,158,11,0.3)' }}></div>
                                </div>
                                <div>
                                    <h1 className="gl-hero-title" style={{ background: 'linear-gradient(135deg, #F1F5F9, #FCD34D, #A855F7)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>সম্পদ বৃদ্ধি ক্যালকুলেটর</h1>
                                    <p className="exp-hero-sub">মাসে কত বিনিয়োগ করলে কত বছরে কত হবে — হিসাব করুন</p>
                                </div>
                            </div>
                        </div>
                    </div>

                    <div className="gl-two-col">
                        <div className="gl-glass-card">
                            <div className="gl-glass-card-bg"></div>
                            <div className="gl-glass-card-inner">
                                <div className="gl-section-title">📊 বিনিয়োগ হিসাব করুন</div>
                                <div className="exp-form-section">
                                    <label className="exp-form-label">💰 মাসিক বিনিয়োগ (৳)</label>
                                    <input className="exp-form-input" type="number" placeholder="যেমন: ৫০০০" value={monthly} onChange={e => setMonthly(e.target.value)} style={{ fontFamily: 'Inter' }} />
                                </div>
                                <div className="exp-form-section">
                                    <label className="exp-form-label">📈 বার্ষিক রিটার্ন (%)</label>
                                    <input className="exp-form-input" type="number" placeholder="যেমন: ১০" value={rate} onChange={e => setRate(e.target.value)} style={{ fontFamily: 'Inter' }} />
                                    <p style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 6 }}>সঞ্চয়পত্র: ~১১%, স্টক মার্কেট: ~১২-১৫%, ব্যাংক: ~৬%</p>
                                </div>
                                <div className="exp-form-section">
                                    <label className="exp-form-label">📅 মেয়াদ (বছর)</label>
                                    <input className="exp-form-input" type="number" placeholder="যেমন: ১০" value={years} onChange={e => setYears(e.target.value)} style={{ fontFamily: 'Inter' }} />
                                </div>
                                <button className="exp-add-btn" style={{ width: '100%', justifyContent: 'center', background: 'linear-gradient(135deg, #F59E0B, #D97706)', boxShadow: '0 6px 24px rgba(245,158,11,0.4)' }} onClick={calculate}>
                                    🔢 হিসাব করুন <div className="exp-add-btn-shine"></div>
                                </button>

                                {result && (
                                    <div style={{ marginTop: 24 }}>
                                        <div style={{ padding: 24, background: 'rgba(245,158,11,0.06)', border: '1px solid rgba(245,158,11,0.15)', borderRadius: 16, textAlign: 'center', marginBottom: 16 }}>
                                            <p style={{ fontSize: 12, color: 'var(--text-secondary)', marginBottom: 8 }}>{years} বছর পর মোট সম্পদ</p>
                                            <p style={{ fontSize: 36, fontWeight: 900, color: '#FCD34D', fontFamily: 'Inter', textShadow: '0 0 30px rgba(245,158,11,0.3)' }}>৳{result.fv.toLocaleString()}</p>
                                        </div>
                                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                                            <div style={{ padding: 16, background: 'rgba(59,130,246,0.06)', border: '1px solid rgba(59,130,246,0.12)', borderRadius: 14, textAlign: 'center' }}>
                                                <p style={{ fontSize: 11, color: 'var(--text-secondary)' }}>মোট বিনিয়োগ</p>
                                                <p style={{ fontSize: 18, fontWeight: 800, color: '#60A5FA', fontFamily: 'Inter' }}>৳{result.totalInvested.toLocaleString()}</p>
                                            </div>
                                            <div style={{ padding: 16, background: 'rgba(16,185,129,0.06)', border: '1px solid rgba(16,185,129,0.12)', borderRadius: 14, textAlign: 'center' }}>
                                                <p style={{ fontSize: 11, color: 'var(--text-secondary)' }}>মুনাফা</p>
                                                <p style={{ fontSize: 18, fontWeight: 800, color: '#6EE7B7', fontFamily: 'Inter' }}>৳{result.totalReturn.toLocaleString()}</p>
                                            </div>
                                        </div>
                                    </div>
                                )}
                            </div>
                        </div>

                        <div>
                            {result && (
                                <>
                                    <div className="gl-glass-card mb-6">
                                        <div className="gl-glass-card-bg"></div>
                                        <div className="gl-glass-card-inner">
                                            <div className="gl-section-title">🏆 মাইলস্টোন</div>
                                            {milestones.map(m => (
                                                <div key={m.label} className="gl-list-item">
                                                    <div className="gl-list-left">
                                                        <div style={{ width: 44, height: 44, borderRadius: 12, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 22, background: `${m.color}15`, boxShadow: `0 0 12px ${m.color}22` }}>{m.icon}</div>
                                                        <div>
                                                            <p className="gl-list-name">{m.label} হতে পারবেন</p>
                                                            <p className="gl-list-sub" style={{ fontFamily: 'Inter' }}>{m.years} বছরে ({m.months} মাস)</p>
                                                        </div>
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    </div>

                                    <div className="gl-glass-card">
                                        <div className="gl-glass-card-bg"></div>
                                        <div className="gl-glass-card-inner">
                                            <div className="gl-section-title">📅 বছর অনুযায়ী বৃদ্ধি</div>
                                            <div style={{ maxHeight: 280, overflowY: 'auto' }}>
                                                {result.yearlyData.map(y => (
                                                    <div key={y.year} className="gl-list-item">
                                                        <span style={{ fontSize: 13, color: 'var(--text-secondary)' }}>{y.year} বছর পর</span>
                                                        <div style={{ textAlign: 'right' }}>
                                                            <p style={{ fontWeight: 800, fontFamily: 'Inter', color: '#FCD34D' }}>৳{y.value.toLocaleString()}</p>
                                                            <p style={{ fontSize: 11, color: 'var(--text-secondary)', fontFamily: 'Inter' }}>বিনিয়োগ: ৳{Number(y.invested).toLocaleString()}</p>
                                                        </div>
                                                    </div>
                                                ))}
                                            </div>
                                        </div>
                                    </div>
                                </>
                            )}
                            {!result && (
                                <div className="gl-glass-card">
                                    <div className="gl-glass-card-bg"></div>
                                    <div className="gl-glass-card-inner" style={{ textAlign: 'center', padding: 48 }}>
                                        <div style={{ fontSize: 56, marginBottom: 16, filter: 'drop-shadow(0 0 16px rgba(245,158,11,0.4))' }}>💰</div>
                                        <h3 style={{ fontSize: 17, fontWeight: 800, marginBottom: 10 }}>ভবিষ্যৎ সম্পদ হিসাব করুন</h3>
                                        <p style={{ color: 'var(--text-secondary)', fontSize: 14, lineHeight: 1.7 }}>মাসিক বিনিয়োগ, রিটার্ন রেট ও মেয়াদ দিয়ে হিসাব করুন এবং জানুন কত দিনে লক্ষপতি বা কোটিপতি হবেন।</p>
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            </main>
        </div>
    )
}
