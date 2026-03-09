'use client'
import { useEffect, useState, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/context/AuthContext'
import { useAISettings } from '@/context/AISettingsContext'
import Sidebar from '@/components/Sidebar'
import { RadialBarChart, RadialBar, ResponsiveContainer } from 'recharts'
import BengaliNumberInput from '@/components/BengaliNumberInput'

function Modal({ open, onClose, title, children }) {
    if (!open) return null
    return (
        <div className="exp-modal-overlay" onClick={onClose}>
            <div className="exp-modal" onClick={e => e.stopPropagation()}>
                <div className="exp-modal-header"><h2>{title}</h2><button className="exp-modal-close" onClick={onClose}>✕</button></div>
                {children}
            </div>
        </div>
    )
}

export default function GoalsPage() {
    const { user, loading } = useAuth()
    const { getAIBody } = useAISettings()
    const router = useRouter()
    const [goals, setGoals] = useState([])
    const [showModal, setShowModal] = useState(false)
    const [showAddSaving, setShowAddSaving] = useState(null)
    const [savingAmount, setSavingAmount] = useState('')
    const [fetching, setFetching] = useState(true)
    const [saving, setSaving] = useState(false)
    const [form, setForm] = useState({ title: '', target_amount: '', deadline: '', description: '' })

    const [missionLoading, setMissionLoading] = useState(false)
    const [missionData, setMissionData] = useState('')

    async function fetchAIMission() {
        setMissionLoading(true)
        try {
            const res = await fetch('/api/chat', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ message: "আমার বর্তমান লক্ষ্য ও বাজেট পূরণে সাহায্য করবে এমন ৩টি ছোট ও অর্জনযোগ্য ডেইলি/উইকলি আর্থিক মিশন (AI Money Missions) দাও।", userId: user.id, ...getAIBody() })
            })
            const data = await res.json()
            setMissionData(data.reply)
        } catch (err) {
            setMissionData('দুঃখিত, সংযোগে সমস্যা হয়েছে।')
        }
        setMissionLoading(false)
    }

    const fetchGoals = useCallback(async () => {
        if (!user) return
        setFetching(true)
        const res = await fetch(`/api/goals?userId=${user.id}`)
        const data = await res.json()
        setGoals(Array.isArray(data) ? data : [])
        setFetching(false)
    }, [user])

    useEffect(() => { if (!loading && !user) router.push('/') }, [user, loading, router])
    useEffect(() => { if (user) fetchGoals() }, [user, fetchGoals])

    async function handleCreate(e) {
        e.preventDefault(); setSaving(true)
        await fetch('/api/goals', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ ...form, target_amount: parseFloat(form.target_amount), saved_amount: 0, user_id: user.id }) })
        setSaving(false); setShowModal(false); fetchGoals()
    }

    async function handleAddSaving(goalId) {
        const amount = parseFloat(savingAmount)
        if (!amount || amount <= 0) return
        const goal = goals.find(g => g.id === goalId)
        await fetch('/api/goals', { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ id: goalId, saved_amount: Number(goal.saved_amount) + amount }) })
        setSavingAmount(''); setShowAddSaving(null); fetchGoals()
    }

    async function handleDelete(id) {
        if (!confirm('এই লক্ষ্যটি মুছে ফেলবেন?')) return
        await fetch(`/api/goals?id=${id}`, { method: 'DELETE' }); fetchGoals()
    }

    function daysLeft(deadline) { if (!deadline) return null; return Math.max(0, Math.ceil((new Date(deadline) - new Date()) / 86400000)) }
    function dailySavingNeeded(goal) { const r = Math.max(0, Number(goal.target_amount) - Number(goal.saved_amount)); const d = daysLeft(goal.deadline); if (!d || d === 0) return null; return Math.ceil(r / d) }

    return (
        <div className="app-layout">
            <Sidebar />
            <main className="main-content">
                <div className="page-inner">
                    <div className="gl-hero">
                        <div className="gl-hero-bg" style={{ background: 'linear-gradient(135deg, rgba(139,92,246,0.15), rgba(59,130,246,0.10), rgba(16,185,129,0.08))' }}></div>
                        <div className="gl-hero-content">
                            <div className="exp-hero-left">
                                <div className="exp-hero-icon-wrap">
                                    <span className="exp-hero-icon" style={{ filter: 'drop-shadow(0 0 12px rgba(139,92,246,0.5))' }}>🎯</span>
                                    <div className="exp-hero-icon-ring" style={{ borderColor: 'rgba(139,92,246,0.3)', background: 'conic-gradient(from 0deg, transparent, rgba(139,92,246,0.2), transparent, rgba(59,130,246,0.2), transparent)' }}></div>
                                </div>
                                <div>
                                    <h1 className="gl-hero-title" style={{ background: 'linear-gradient(135deg, #F1F5F9, #A855F7, #3B82F6)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>লক্ষ্য ও সঞ্চয়</h1>
                                    <p className="exp-hero-sub">আপনার আর্থিক লক্ষ্য নির্ধারণ করুন এবং এগিয়ে যান</p>
                                </div>
                            </div>
                            <div style={{ display: 'flex', gap: 10 }}>
                                <button className="exp-add-btn" style={{ background: 'linear-gradient(135deg, #A855F7, #7C3AED)', boxShadow: '0 6px 24px rgba(139,92,246,0.4)' }} onClick={() => setShowModal(true)}>
                                    <span className="exp-add-btn-icon">+</span><span>নতুন লক্ষ্য</span><div className="exp-add-btn-shine"></div>
                                </button>
                                <button className="exp-add-btn" style={{ background: 'linear-gradient(135deg, #F59E0B, #D97706)', boxShadow: '0 6px 24px rgba(245,158,11,0.4)' }} onClick={fetchAIMission} disabled={missionLoading}>
                                    <span>{missionLoading ? '⏳...' : '🎯 AI Missions'}</span><div className="exp-add-btn-shine"></div>
                                </button>
                            </div>
                        </div>
                    </div>

                    {(missionLoading || missionData) && (
                        <div className="gl-glass-card mb-6" style={{ background: 'linear-gradient(135deg, rgba(245,158,11,0.05), rgba(16,185,129,0.05))', border: '1px solid rgba(245,158,11,0.2)' }}>
                            <div className="gl-glass-card-inner">
                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
                                    <h3 style={{ fontSize: 18, fontWeight: 800, color: '#FCD34D' }}>🎯 AI Money Missions</h3>
                                    <button onClick={() => setMissionData('')} style={{ background: 'none', border: 'none', color: 'var(--text-secondary)', cursor: 'pointer', fontSize: 18 }}>✕</button>
                                </div>
                                {missionLoading ? (
                                    <div className="gl-loading-full" style={{ minHeight: 100 }}><div className="exp-loading-ring" style={{ borderTopColor: '#F59E0B' }}></div><p>মিশন তৈরি হচ্ছে...</p></div>
                                ) : (
                                    <div style={{ whiteSpace: 'pre-wrap', color: '#F1F5F9', lineHeight: 1.6, fontSize: 14 }}>{missionData}</div>
                                )}
                            </div>
                        </div>
                    )}

                    {fetching ? (
                        <div className="gl-loading-full"><div className="exp-loading-ring" style={{ borderTopColor: '#A855F7', borderColor: 'rgba(139,92,246,0.15)' }}></div><p>লোড হচ্ছে...</p></div>
                    ) : goals.length === 0 ? (
                        <div className="exp-empty"><div className="exp-empty-icon">🎯</div><h3>কোনো লক্ষ্য নেই</h3><p>আজই আপনার প্রথম আর্থিক লক্ষ্য নির্ধারণ করুন!</p>
                            <button className="exp-add-btn" style={{ marginTop: 16, background: 'linear-gradient(135deg, #A855F7, #7C3AED)', boxShadow: '0 6px 24px rgba(139,92,246,0.4)' }} onClick={() => setShowModal(true)}>
                                <span className="exp-add-btn-icon">+</span><span>লক্ষ্য তৈরি করুন</span><div className="exp-add-btn-shine"></div>
                            </button>
                        </div>
                    ) : (
                        <div className="exp-cards-grid">
                            {goals.map((goal, idx) => {
                                const pct = goal.target_amount > 0 ? Math.min(100, Math.round((goal.saved_amount / goal.target_amount) * 100)) : 0
                                const days = daysLeft(goal.deadline)
                                const daily = dailySavingNeeded(goal)
                                const remaining = Math.max(0, Number(goal.target_amount) - Number(goal.saved_amount))
                                const isComplete = pct >= 100
                                const ringColor = isComplete ? '#10B981' : pct < 50 ? '#A855F7' : '#3B82F6'
                                return (
                                    <div key={goal.id} className="gl-glass-card" style={{ animationDelay: `${idx * 0.06}s` }}>
                                        <div className="gl-glass-card-bg" style={isComplete ? { borderColor: 'rgba(16,185,129,0.3)', background: 'rgba(16,185,129,0.04)' } : {}}></div>
                                        <div className="gl-glass-card-inner">
                                            {isComplete && <div className="gl-alert gl-alert-success" style={{ marginBottom: 14, padding: '8px 14px' }}>🎉 অভিনন্দন! লক্ষ্য পূরণ!</div>}
                                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 16 }}>
                                                <div><h3 style={{ fontSize: 17, fontWeight: 800, marginBottom: 4 }}>{goal.title}</h3>{goal.description && <p style={{ fontSize: 12, color: 'var(--text-secondary)' }}>{goal.description}</p>}</div>
                                                <button className="exp-card-action-btn exp-delete-btn" style={{ flex: 'none', padding: '6px 10px' }} onClick={() => handleDelete(goal.id)}>🗑️</button>
                                            </div>
                                            <div style={{ display: 'flex', alignItems: 'center', gap: 20, marginBottom: 16 }}>
                                                <div style={{ width: 100, height: 100, position: 'relative', flexShrink: 0 }}>
                                                    <ResponsiveContainer width={100} height={100}>
                                                        <RadialBarChart cx={50} cy={50} innerRadius={32} outerRadius={46} data={[{ value: pct, fill: ringColor }]} startAngle={90} endAngle={-270}>
                                                            <RadialBar dataKey="value" background={{ fill: 'rgba(255,255,255,0.03)' }} />
                                                        </RadialBarChart>
                                                    </ResponsiveContainer>
                                                    <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                                        <span style={{ fontSize: 16, fontWeight: 800, fontFamily: 'Inter', color: ringColor, textShadow: `0 0 12px ${ringColor}44` }}>{pct}%</span>
                                                    </div>
                                                </div>
                                                <div style={{ flex: 1 }}>
                                                    <div style={{ marginBottom: 8 }}><p style={{ fontSize: 12, color: 'var(--text-secondary)' }}>জমা হয়েছে</p><p style={{ fontSize: 18, fontWeight: 800, color: '#6EE7B7', fontFamily: 'Inter' }}>৳{Number(goal.saved_amount).toLocaleString()}</p></div>
                                                    <div style={{ marginBottom: 8 }}><p style={{ fontSize: 12, color: 'var(--text-secondary)' }}>লক্ষ্যমাত্রা</p><p style={{ fontSize: 15, fontWeight: 700, fontFamily: 'Inter' }}>৳{Number(goal.target_amount).toLocaleString()}</p></div>
                                                    {remaining > 0 && <div><p style={{ fontSize: 12, color: 'var(--text-secondary)' }}>আরো দরকার</p><p style={{ fontSize: 14, fontWeight: 700, color: '#FCA5A5', fontFamily: 'Inter' }}>৳{remaining.toLocaleString()}</p></div>}
                                                </div>
                                            </div>
                                            <div style={{ display: 'flex', gap: 8, marginBottom: 14, flexWrap: 'wrap' }}>
                                                {days !== null && <span className="gl-badge-glow" style={{ '--badge-color': '#3B82F6' }}>📅 {days} দিন বাকি</span>}
                                                {daily !== null && !isComplete && <span className="gl-badge-glow" style={{ '--badge-color': '#F59E0B' }}>💰 দৈনিক ৳{daily.toLocaleString()}</span>}
                                                {isComplete && <span className="gl-badge-glow" style={{ '--badge-color': '#10B981' }}>✅ সম্পন্ন</span>}
                                            </div>
                                            {!isComplete && (showAddSaving === goal.id ? (
                                                <div style={{ display: 'flex', gap: 8 }}>
                                                    <BengaliNumberInput value={savingAmount} onChange={val => setSavingAmount(val)} placeholder="কত টাকা জমা করলেন?" style={{ flex: 1 }} autoFocus className="exp-form-input" />
                                                    <button className="exp-add-btn" style={{ padding: '10px 16px', background: 'linear-gradient(135deg, #10B981, #059669)', boxShadow: '0 4px 16px rgba(16,185,129,0.3)' }} onClick={() => handleAddSaving(goal.id)}>✅</button>
                                                    <button className="exp-card-action-btn" style={{ background: 'rgba(255,255,255,0.04)', color: 'var(--text-secondary)', flex: 'none', padding: '10px 14px' }} onClick={() => setShowAddSaving(null)}>✕</button>
                                                </div>
                                            ) : (
                                                <button className="gl-refresh-btn" style={{ width: '100%', justifyContent: 'center' }} onClick={() => setShowAddSaving(goal.id)}>+ টাকা জমা করুন</button>
                                            ))}
                                        </div>
                                    </div>
                                )
                            })}
                        </div>
                    )}
                </div>
            </main>

            <Modal open={showModal} onClose={() => setShowModal(false)} title="✨ নতুন লক্ষ্য তৈরি করুন">
                <form onSubmit={handleCreate}>
                    <div className="exp-form-section"><label className="exp-form-label">🎯 লক্ষ্যের নাম</label><input className="exp-form-input" type="text" placeholder="যেমন: ল্যাপটপ কিনব, ট্রিপ প্ল্যান" value={form.title} onChange={e => setForm(f => ({ ...f, title: e.target.value }))} required /></div>
                    <div className="exp-form-section"><label className="exp-form-label">📝 বিবরণ (ঐচ্ছিক)</label><input className="exp-form-input" type="text" placeholder="সংক্ষিপ্ত বিবরণ" value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} /></div>
                    <div className="form-row">
                        <div className="exp-form-section"><label className="exp-form-label">💰 লক্ষ্যমাত্রা (৳)</label><BengaliNumberInput value={form.target_amount} onChange={val => setForm(f => ({ ...f, target_amount: val }))} placeholder="০" required min="1" className="exp-form-input" /></div>
                        <div className="exp-form-section"><label className="exp-form-label">📅 সময়সীমা</label><input className="exp-form-input" type="date" value={form.deadline} onChange={e => setForm(f => ({ ...f, deadline: e.target.value }))} /></div>
                    </div>
                    <div className="exp-modal-actions">
                        <button type="button" className="exp-modal-cancel" onClick={() => setShowModal(false)}>বাতিল</button>
                        <button type="submit" className="exp-modal-save" style={{ background: 'linear-gradient(135deg, #A855F7, #7C3AED)', boxShadow: '0 4px 20px rgba(139,92,246,0.4)' }} disabled={saving}>{saving ? '⏳...' : '🎯 লক্ষ্য তৈরি করুন'}<div className="exp-add-btn-shine"></div></button>
                    </div>
                </form>
            </Modal>
        </div>
    )
}
