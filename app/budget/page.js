'use client'
import { useEffect, useState, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/context/AuthContext'
import Sidebar from '@/components/Sidebar'
import BengaliNumberInput from '@/components/BengaliNumberInput'

const CATEGORIES = ['বাজার খরচ', 'বাসা ভাড়া', 'মাসিক বিল', 'যাতায়াত', 'চিকিৎসা', 'শিক্ষা', 'পারশনাল খরচ', 'মোটরসাইকেল খরচ', 'বিনোদন', 'কেনাকাটা', 'অন্যান্য']
const CAT_ICONS = { 'বাজার খরচ': '🍚', 'বাসা ভাড়া': '🏠', 'মাসিক বিল': '🧾', 'যাতায়াত': '🚌', 'চিকিৎসা': '💊', 'শিক্ষা': '📚', 'পারশনাল খরচ': '💆', 'মোটরসাইকেল খরচ': '🏍️', 'বিনোদন': '🎬', 'কেনাকাটা': '🛍️', 'অন্যান্য': '📌' }
const CAT_COLORS = {
    'বাজার খরচ': { grad: 'linear-gradient(135deg, #FF6B35, #F7931E)', glow: 'rgba(255,107,53,0.4)', text: '#FF8A5C' },
    'বাসা ভাড়া': { grad: 'linear-gradient(135deg, #A855F7, #7C3AED)', glow: 'rgba(168,85,247,0.4)', text: '#C084FC' },
    'মাসিক বিল': { grad: 'linear-gradient(135deg, #14B8A6, #0D9488)', glow: 'rgba(20,184,166,0.4)', text: '#5EEAD4' },
    'যাতায়াত': { grad: 'linear-gradient(135deg, #3B82F6, #2563EB)', glow: 'rgba(59,130,246,0.4)', text: '#60A5FA' },
    'চিকিৎসা': { grad: 'linear-gradient(135deg, #EF4444, #DC2626)', glow: 'rgba(239,68,68,0.4)', text: '#FCA5A5' },
    'শিক্ষা': { grad: 'linear-gradient(135deg, #10B981, #059669)', glow: 'rgba(16,185,129,0.4)', text: '#6EE7B7' },
    'পারশনাল খরচ': { grad: 'linear-gradient(135deg, #F43F5E, #E11D48)', glow: 'rgba(244,63,94,0.4)', text: '#FDA4AF' },
    'মোটরসাইকেল খরচ': { grad: 'linear-gradient(135deg, #EAB308, #CA8A04)', glow: 'rgba(234,179,8,0.4)', text: '#FDE047' },
    'বিনোদন': { grad: 'linear-gradient(135deg, #F59E0B, #D97706)', glow: 'rgba(245,158,11,0.4)', text: '#FCD34D' },
    'কেনাকাটা': { grad: 'linear-gradient(135deg, #EC4899, #DB2777)', glow: 'rgba(236,72,153,0.4)', text: '#F9A8D4' },
    'অন্যান্য': { grad: 'linear-gradient(135deg, #6B7280, #4B5563)', glow: 'rgba(107,114,128,0.4)', text: '#9CA3AF' }
}

export default function BudgetPage() {
    const { user, loading } = useAuth()
    const router = useRouter()
    const [budgets, setBudgets] = useState([])
    const [expenses, setExpenses] = useState([])
    const [fetching, setFetching] = useState(true)
    const [saving, setSaving] = useState(false)
    const [amounts, setAmounts] = useState({})
    const now = new Date()
    const [month, setMonth] = useState(now.getMonth() + 1)
    const [year, setYear] = useState(now.getFullYear())
    const monthNames = ['জানুয়ারি', 'ফেব্রুয়ারি', 'মার্চ', 'এপ্রিল', 'মে', 'জুন', 'জুলাই', 'আগস্ট', 'সেপ্টেম্বর', 'অক্টোবর', 'নভেম্বর', 'ডিসেম্বর']

    const fetchData = useCallback(async () => {
        if (!user) return
        setFetching(true)
        const [budRes, expRes] = await Promise.all([
            fetch(`/api/budgets?userId=${user.id}&month=${month}&year=${year}`),
            fetch(`/api/expenses?userId=${user.id}&month=${month}&year=${year}`)
        ])
        const [budData, expData] = await Promise.all([budRes.json(), expRes.json()])
        setBudgets(Array.isArray(budData) ? budData : [])
        setExpenses(Array.isArray(expData) ? expData : [])
        const init = {}
            ; (Array.isArray(budData) ? budData : []).forEach(b => { init[b.category] = b.amount })
        setAmounts(init)
        setFetching(false)
    }, [user, month, year])

    useEffect(() => { if (!loading && !user) router.push('/') }, [user, loading, router])
    useEffect(() => { if (user) fetchData() }, [user, fetchData])

    const catSpent = {}
    expenses.forEach(e => { catSpent[e.category] = (catSpent[e.category] || 0) + Number(e.amount) })

    async function handleSaveAll(e) {
        e.preventDefault()
        setSaving(true)
        await Promise.all(
            CATEGORIES.map(cat => {
                const amount = parseFloat(amounts[cat] || 0)
                if (amount > 0) {
                    return fetch('/api/budgets', {
                        method: 'POST', headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ user_id: user.id, category: cat, amount, month, year })
                    })
                }
                return Promise.resolve()
            })
        )
        setSaving(false); fetchData()
    }

    const totalBudget = CATEGORIES.reduce((s, c) => s + (parseFloat(amounts[c] || 0)), 0)
    const totalSpent = Object.values(catSpent).reduce((s, v) => s + v, 0)

    function getPct(cat) {
        const bgt = parseFloat(amounts[cat] || 0)
        const spent = catSpent[cat] || 0
        if (bgt <= 0) return 0
        return Math.min(100, Math.round((spent / bgt) * 100))
    }
    function getBarClass(pct) {
        if (pct >= 100) return 'danger'
        if (pct >= 75) return 'warn'
        return 'safe'
    }

    return (
        <div className="app-layout">
            <Sidebar />
            <main className="main-content">
                <div className="page-inner">
                    {/* Hero */}
                    <div className="gl-hero">
                        <div className="gl-hero-bg" style={{ background: 'linear-gradient(135deg, rgba(59,130,246,0.15), rgba(168,85,247,0.12), rgba(16,185,129,0.08))' }}></div>
                        <div className="gl-hero-content">
                            <div className="exp-hero-left">
                                <div className="exp-hero-icon-wrap">
                                    <span className="exp-hero-icon" style={{ filter: 'drop-shadow(0 0 12px rgba(59,130,246,0.5))' }}>📊</span>
                                    <div className="exp-hero-icon-ring" style={{ borderColor: 'rgba(59,130,246,0.3)', background: 'conic-gradient(from 0deg, transparent, rgba(59,130,246,0.2), transparent, rgba(168,85,247,0.2), transparent)' }}></div>
                                </div>
                                <div>
                                    <h1 className="gl-hero-title" style={{ background: 'linear-gradient(135deg, #F1F5F9, #3B82F6, #A855F7)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>বাজেট ম্যানেজার</h1>
                                    <p className="exp-hero-sub">প্রতি মাসে ক্যাটাগরি অনুযায়ী বাজেট নির্ধারণ করুন</p>
                                </div>
                            </div>
                            <div style={{ display: 'flex', gap: 8 }}>
                                <select className="exp-filter-select" value={month} onChange={e => setMonth(Number(e.target.value))}>
                                    {monthNames.map((m, i) => <option key={i} value={i + 1}>{m}</option>)}
                                </select>
                                <select className="exp-filter-select" value={year} onChange={e => setYear(Number(e.target.value))}>
                                    {[2023, 2024, 2025, 2026].map(y => <option key={y} value={y}>{y}</option>)}
                                </select>
                            </div>
                        </div>
                    </div>

                    {/* Summary Stats */}
                    <div className="exp-stats-row" style={{ gridTemplateColumns: 'repeat(3, 1fr)' }}>
                        {[
                            { icon: '📊', label: 'মোট বাজেট', value: `৳${totalBudget.toLocaleString('bn-BD')}`, color: '#60A5FA', grad: 'linear-gradient(135deg, #3B82F6, #2563EB)' },
                            { icon: '💸', label: 'মোট খরচ', value: `৳${totalSpent.toLocaleString('bn-BD')}`, color: '#FCA5A5', grad: 'linear-gradient(135deg, #EF4444, #DC2626)' },
                            { icon: '💎', label: 'বাজেটের বাকি', value: `৳${Math.max(0, totalBudget - totalSpent).toLocaleString('bn-BD')}`, color: '#6EE7B7', grad: 'linear-gradient(135deg, #10B981, #059669)' },
                        ].map((s, i) => (
                            <div key={i} className="exp-stat-glass">
                                <div className="exp-stat-glass-bg"></div>
                                <div className="exp-stat-content">
                                    <div className="exp-stat-icon-box" style={{ background: s.grad }}>{s.icon}</div>
                                    <div>
                                        <p className="exp-stat-label">{s.label}</p>
                                        <p className="exp-stat-value" style={{ color: s.color }}>{s.value}</p>
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>

                    {fetching ? (
                        <div className="gl-loading-full"><div className="exp-loading-ring"></div><p>লোড হচ্ছে...</p></div>
                    ) : (
                        <form onSubmit={handleSaveAll}>
                            <div className="gl-two-col mb-6">
                                {CATEGORIES.map((cat, idx) => {
                                    const pct = getPct(cat)
                                    const spent = catSpent[cat] || 0
                                    const budget = parseFloat(amounts[cat] || 0)
                                    const remaining = Math.max(0, budget - spent)
                                    const colors = CAT_COLORS[cat]
                                    return (
                                        <div key={cat} className="gl-glass-card" style={{ animationDelay: `${idx * 0.05}s` }}>
                                            <div className="gl-glass-card-bg"></div>
                                            <div className="gl-glass-card-inner">
                                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
                                                    <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                                                        <div className="exp-stat-icon-box" style={{ background: colors.grad, width: 40, height: 40, fontSize: 20, boxShadow: `0 4px 16px ${colors.glow}` }}>{CAT_ICONS[cat]}</div>
                                                        <span style={{ fontWeight: 700, fontSize: 15, color: colors.text }}>{cat}</span>
                                                    </div>
                                                    {pct >= 100 && <span className="gl-badge-glow" style={{ '--badge-color': '#EF4444' }}>⚠️ শেষ!</span>}
                                                    {pct >= 75 && pct < 100 && <span className="gl-badge-glow" style={{ '--badge-color': '#F59E0B' }}>⚡ সতর্কতা</span>}
                                                    {pct > 0 && pct < 75 && <span className="gl-badge-glow" style={{ '--badge-color': '#10B981' }}>✅ ঠিক আছে</span>}
                                                </div>
                                                <div style={{ display: 'flex', gap: 10, alignItems: 'center', marginBottom: 14 }}>
                                                    <span style={{ color: 'var(--text-secondary)', fontSize: 13, whiteSpace: 'nowrap' }}>বাজেট ৳</span>
                                                    <BengaliNumberInput
                                                        value={String(amounts[cat] || '')}
                                                        onChange={val => setAmounts(a => ({ ...a, [cat]: val }))}
                                                        placeholder="০" min="0" className="exp-form-input"
                                                    />
                                                </div>
                                                <div className="progress-wrapper">
                                                    <div className="progress-header">
                                                        <span style={{ fontSize: 12, color: 'var(--text-secondary)' }}>ব্যয়: ৳{spent.toLocaleString()} ({pct}%)</span>
                                                        <span className="progress-value">বাকি: ৳{remaining.toLocaleString()}</span>
                                                    </div>
                                                    <div className="progress-bar-bg">
                                                        <div className={`progress-bar-fill ${getBarClass(pct)}`} style={{ width: `${pct}%` }} />
                                                    </div>
                                                </div>
                                            </div>
                                        </div>
                                    )
                                })}
                            </div>
                            <div style={{ textAlign: 'center' }}>
                                <button type="submit" className="exp-add-btn" style={{ padding: '14px 36px', fontSize: 16 }} disabled={saving}>
                                    {saving ? '⏳ সংরক্ষণ হচ্ছে...' : '💾 সব বাজেট সংরক্ষণ করুন'}
                                    <div className="exp-add-btn-shine"></div>
                                </button>
                            </div>
                        </form>
                    )}
                </div>
            </main>
        </div>
    )
}
