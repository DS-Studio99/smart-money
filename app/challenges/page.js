'use client'
import { useState, useEffect } from 'react'
import Sidebar from '@/components/Sidebar'
import { useAuth } from '@/context/AuthContext'

const CHALLENGES = [
    { id: 1, title: '৩০ দিনে ৫০০০ টাকা সেভ চ্যালেঞ্জ', desc: 'প্রতিদিন অতিরিক্ত ১৬৭ টাকা সেভ করুন', target: 5000, days: 30, icon: '🏆', difficulty: 'সহজ', color: '#10B981', grad: 'linear-gradient(135deg, #10B981, #059669)' },
    { id: 2, title: 'বাইরে না খাওয়ার চ্যালেঞ্জ (১৫ দিন)', desc: 'পুরো ১৫ দিন বাড়িতে রান্না করুন, আনুমানিক ৩০০০ টাকা বাঁচবে', target: 3000, days: 15, icon: '🍚', difficulty: 'মাঝারি', color: '#F59E0B', grad: 'linear-gradient(135deg, #F59E0B, #D97706)' },
    { id: 3, title: 'ইমার্জেন্সি ফান্ড তৈরি করুন', desc: '৩ মাসের খরচের সমান টাকা জরুরি তহবিলে রাখুন', target: 30000, days: 90, icon: '🛡️', difficulty: 'কঠিন', color: '#3B82F6', grad: 'linear-gradient(135deg, #3B82F6, #2563EB)' },
    { id: 4, title: 'বিনোদন খরচ কমানোর চ্যালেঞ্জ', desc: 'এই মাসে বিনোদনে ৫০% কম খরচ করুন', target: 1000, days: 30, icon: '🎬', difficulty: 'মাঝারি', color: '#8B5CF6', grad: 'linear-gradient(135deg, #A855F7, #7C3AED)' },
    { id: 5, title: 'নো-স্পেন্ড সানডে', desc: 'প্রতি রবিবার একদম খরচ না করার চ্যালেঞ্জ', target: 500, days: 7, icon: '🔒', difficulty: 'সহজ', color: '#EC4899', grad: 'linear-gradient(135deg, #EC4899, #DB2777)' },
    { id: 6, title: 'কোটি টাকার স্বপ্ন চ্যালেঞ্জ', desc: 'মাসে সর্বনিম্ন ১০,০০০ টাকা বিনিয়োগ করুন', target: 10000, days: 30, icon: '💎', difficulty: 'কঠিন', color: '#F97316', grad: 'linear-gradient(135deg, #F97316, #EA580C)' },
]

export default function ChallengesPage() {
    const { user } = useAuth()
    const [active, setActive] = useState({})
    const [progress, setProgress] = useState({})
    const [addVals, setAddVals] = useState({})

    useEffect(() => {
        const saved = localStorage.getItem(`challenges_${user?.id}`)
        if (saved) { const d = JSON.parse(saved); setActive(d.active || {}); setProgress(d.progress || {}) }
    }, [user])

    function save(a, p) { localStorage.setItem(`challenges_${user?.id}`, JSON.stringify({ active: a, progress: p })) }
    function startChallenge(id) { const a = { ...active, [id]: { startDate: new Date().toISOString(), savedAmount: 0 } }; setActive(a); save(a, progress) }
    function updateProgress(id) { const v = parseFloat(addVals[id] || 0); if (!v) return; const p = { ...progress, [id]: Math.min(CHALLENGES.find(c => c.id === id).target, (progress[id] || 0) + v) }; setProgress(p); save(active, p); setAddVals(a => ({ ...a, [id]: '' })) }
    function getStatus(c) { if (!active[c.id]) return 'idle'; return (progress[c.id] || 0) >= c.target ? 'complete' : 'active' }

    return (
        <div className="app-layout">
            <Sidebar />
            <main className="main-content">
                <div className="page-inner">
                    <div className="gl-hero">
                        <div className="gl-hero-bg" style={{ background: 'linear-gradient(135deg, rgba(245,158,11,0.15), rgba(236,72,153,0.10), rgba(139,92,246,0.08))' }}></div>
                        <div className="exp-hero-particles"><div className="exp-particle exp-p1"></div><div className="exp-particle exp-p2"></div><div className="exp-particle exp-p3"></div></div>
                        <div className="gl-hero-content">
                            <div className="exp-hero-left">
                                <div className="exp-hero-icon-wrap">
                                    <span className="exp-hero-icon" style={{ filter: 'drop-shadow(0 0 12px rgba(245,158,11,0.5))' }}>🏆</span>
                                    <div className="exp-hero-icon-ring" style={{ borderColor: 'rgba(245,158,11,0.3)', background: 'conic-gradient(from 0deg, transparent, rgba(245,158,11,0.2), transparent, rgba(236,72,153,0.2), transparent)' }}></div>
                                </div>
                                <div>
                                    <h1 className="gl-hero-title" style={{ background: 'linear-gradient(135deg, #F1F5F9, #FCD34D, #EC4899)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>সেভিং চ্যালেঞ্জ</h1>
                                    <p className="exp-hero-sub">বিভিন্ন চ্যালেঞ্জ গ্রহণ করুন এবং দ্রুত সঞ্চয় বাড়ান</p>
                                </div>
                            </div>
                        </div>
                    </div>

                    <div className="exp-cards-grid">
                        {CHALLENGES.map((c, idx) => {
                            const status = getStatus(c)
                            const saved = progress[c.id] || 0
                            const pct = Math.min(100, Math.round((saved / c.target) * 100))
                            const info = active[c.id]
                            const daysActive = info ? Math.floor((new Date() - new Date(info.startDate)) / 86400000) : 0
                            const daysLeft = Math.max(0, c.days - daysActive)

                            return (
                                <div key={c.id} className="gl-glass-card" style={{ animationDelay: `${idx * 0.06}s` }}>
                                    <div className="gl-glass-card-bg" style={status === 'complete' ? { borderColor: 'rgba(16,185,129,0.3)', background: 'rgba(16,185,129,0.04)' } : {}}></div>
                                    <div className="gl-glass-card-inner">
                                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 14 }}>
                                            <div style={{ width: 52, height: 52, borderRadius: 14, background: c.grad, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 26, boxShadow: `0 4px 20px ${c.color}55` }}>{c.icon}</div>
                                            <span className="gl-badge-glow" style={{ '--badge-color': c.difficulty === 'সহজ' ? '#10B981' : c.difficulty === 'মাঝারি' ? '#F59E0B' : '#EF4444' }}>{c.difficulty}</span>
                                        </div>
                                        <h3 style={{ fontSize: 15, fontWeight: 800, marginBottom: 6 }}>{c.title}</h3>
                                        <p style={{ fontSize: 13, color: 'var(--text-secondary)', marginBottom: 14, lineHeight: 1.6 }}>{c.desc}</p>
                                        <div style={{ display: 'flex', gap: 8, marginBottom: 14, flexWrap: 'wrap' }}>
                                            <span className="gl-badge-glow" style={{ '--badge-color': '#3B82F6' }}>📅 {c.days} দিন</span>
                                            <span className="gl-badge-glow" style={{ '--badge-color': '#F59E0B' }}>🎯 ৳{c.target.toLocaleString()}</span>
                                            {status === 'active' && <span className="gl-badge-glow" style={{ '--badge-color': '#A855F7' }}>⏰ {daysLeft} দিন বাকি</span>}
                                            {status === 'complete' && <span className="gl-badge-glow" style={{ '--badge-color': '#10B981' }}>✅ সম্পন্ন!</span>}
                                        </div>
                                        {status !== 'idle' && (
                                            <div style={{ marginBottom: 14 }}>
                                                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, color: 'var(--text-secondary)', marginBottom: 6 }}>
                                                    <span style={{ fontFamily: 'Inter' }}>৳{saved.toLocaleString()} / ৳{c.target.toLocaleString()}</span>
                                                    <span style={{ fontFamily: 'Inter', fontWeight: 700, color: status === 'complete' ? '#6EE7B7' : '#60A5FA' }}>{pct}%</span>
                                                </div>
                                                <div className="progress-bar-bg"><div className={`progress-bar-fill ${status === 'complete' ? 'safe' : pct >= 50 ? 'blue' : 'purple'}`} style={{ width: `${pct}%` }} /></div>
                                            </div>
                                        )}
                                        {status === 'idle' && (
                                            <button className="exp-add-btn" style={{ width: '100%', justifyContent: 'center', background: c.grad, boxShadow: `0 6px 24px ${c.color}44` }} onClick={() => startChallenge(c.id)}>
                                                🚀 চ্যালেঞ্জ শুরু করুন<div className="exp-add-btn-shine"></div>
                                            </button>
                                        )}
                                        {status === 'active' && (
                                            <div style={{ display: 'flex', gap: 8 }}>
                                                <input className="exp-form-input" type="number" placeholder="সেভ করলাম ৳" value={addVals[c.id] || ''} onChange={e => setAddVals(a => ({ ...a, [c.id]: e.target.value }))} style={{ flex: 1, fontFamily: 'Inter' }} />
                                                <button className="exp-add-btn" style={{ padding: '10px 18px', background: c.grad, boxShadow: `0 4px 16px ${c.color}33` }} onClick={() => updateProgress(c.id)}>✅</button>
                                            </div>
                                        )}
                                        {status === 'complete' && (
                                            <div style={{ textAlign: 'center', padding: '12px 0', color: '#6EE7B7', fontWeight: 800, fontSize: 15 }}>🎉 অভিনন্দন! চ্যালেঞ্জ সম্পন্ন!</div>
                                        )}
                                    </div>
                                </div>
                            )
                        })}
                    </div>
                </div>
            </main>
        </div>
    )
}
