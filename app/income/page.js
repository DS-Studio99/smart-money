'use client'
import { useEffect, useState, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/context/AuthContext'
import Sidebar from '@/components/Sidebar'
import BengaliNumberInput from '@/components/BengaliNumberInput'

const SOURCE_ICONS = ['💰', '💼', '🧑‍💻', '📚', '🏠', '🏪', '🚗', '📈', '🎯', '🌐', '💎', '🔧']
const SOURCE_COLORS = [
    { id: 'green', hex: '#10B981', gradient: 'linear-gradient(135deg, #10B981, #059669)', glow: 'rgba(16,185,129,0.4)', bg: 'rgba(16,185,129,0.12)' },
    { id: 'blue', hex: '#3B82F6', gradient: 'linear-gradient(135deg, #3B82F6, #2563EB)', glow: 'rgba(59,130,246,0.4)', bg: 'rgba(59,130,246,0.12)' },
    { id: 'purple', hex: '#A855F7', gradient: 'linear-gradient(135deg, #A855F7, #7C3AED)', glow: 'rgba(168,85,247,0.4)', bg: 'rgba(168,85,247,0.12)' },
    { id: 'orange', hex: '#F59E0B', gradient: 'linear-gradient(135deg, #F59E0B, #D97706)', glow: 'rgba(245,158,11,0.4)', bg: 'rgba(245,158,11,0.12)' },
    { id: 'pink', hex: '#EC4899', gradient: 'linear-gradient(135deg, #EC4899, #DB2777)', glow: 'rgba(236,72,153,0.4)', bg: 'rgba(236,72,153,0.12)' },
    { id: 'teal', hex: '#14B8A6', gradient: 'linear-gradient(135deg, #14B8A6, #0D9488)', glow: 'rgba(20,184,166,0.4)', bg: 'rgba(20,184,166,0.12)' },
    { id: 'red', hex: '#EF4444', gradient: 'linear-gradient(135deg, #EF4444, #DC2626)', glow: 'rgba(239,68,68,0.4)', bg: 'rgba(239,68,68,0.12)' },
    { id: 'gold', hex: '#EAB308', gradient: 'linear-gradient(135deg, #EAB308, #CA8A04)', glow: 'rgba(234,179,8,0.4)', bg: 'rgba(234,179,8,0.12)' },
]

function getColorObj(hex) {
    return SOURCE_COLORS.find(c => c.hex === hex) || SOURCE_COLORS[0]
}

function Modal({ open, onClose, title, children }) {
    if (!open) return null
    return (
        <div className="exp-modal-overlay" onClick={onClose}>
            <div className="exp-modal" onClick={e => e.stopPropagation()}>
                <div className="exp-modal-header">
                    <h2>{title}</h2>
                    <button className="exp-modal-close" onClick={onClose}>✕</button>
                </div>
                {children}
            </div>
        </div>
    )
}

const monthNames = ['জানুয়ারি', 'ফেব্রুয়ারি', 'মার্চ', 'এপ্রিল', 'মে', 'জুন', 'জুলাই', 'আগস্ট', 'সেপ্টেম্বর', 'অক্টোবর', 'নভেম্বর', 'ডিসেম্বর']

export default function IncomePage() {
    const { user, profile, loading } = useAuth()
    const router = useRouter()
    const now = new Date()

    // Sources
    const [sources, setSources] = useState([])
    const [showSourceModal, setShowSourceModal] = useState(false)
    const [editSource, setEditSource] = useState(null)
    const [sourceForm, setSourceForm] = useState({ name: '', icon: '💰', type: 'recurring', color: '#10B981' })

    // Entries
    const [entries, setEntries] = useState([])
    const [showEntryModal, setShowEntryModal] = useState(false)
    const [editEntry, setEditEntry] = useState(null)
    const [entryForm, setEntryForm] = useState({ source_id: '', amount: '', date: now.toISOString().split('T')[0], note: '' })
    const [filterSource, setFilterSource] = useState('')
    const [month, setMonth] = useState(now.getMonth() + 1)
    const [year, setYear] = useState(now.getFullYear())

    // UI
    const [saving, setSaving] = useState(false)
    const [fetching, setFetching] = useState(true)
    const [activeTab, setActiveTab] = useState('entries') // 'entries' | 'growth'

    // Growth data (monthly totals for chart)
    const [growthData, setGrowthData] = useState([])
    const [growthLoading, setGrowthLoading] = useState(false)

    const fetchSources = useCallback(async () => {
        if (!user) return
        const res = await fetch(`/api/income-sources?userId=${user.id}`)
        const data = await res.json()
        setSources(Array.isArray(data) ? data : [])
    }, [user])

    const fetchEntries = useCallback(async () => {
        if (!user) return
        setFetching(true)
        let url = `/api/income-entries?userId=${user.id}&month=${month}&year=${year}`
        if (filterSource) url += `&sourceId=${filterSource}`
        const res = await fetch(url)
        const data = await res.json()
        setEntries(Array.isArray(data) ? data : [])
        setFetching(false)
    }, [user, month, year, filterSource])

    const fetchGrowthData = useCallback(async () => {
        if (!user) return
        setGrowthLoading(true)
        // Fetch last 12 months of data
        const results = []
        for (let i = 11; i >= 0; i--) {
            const d = new Date(now.getFullYear(), now.getMonth() - i, 1)
            const m = d.getMonth() + 1
            const y = d.getFullYear()
            const res = await fetch(`/api/income-entries?userId=${user.id}&month=${m}&year=${y}`)
            const data = await res.json()
            const total = Array.isArray(data) ? data.reduce((s, e) => s + Number(e.amount), 0) : 0
            // Per source breakdown
            const bySource = {}
            if (Array.isArray(data)) {
                data.forEach(e => {
                    const sname = e.income_sources?.name || 'অজানা'
                    bySource[sname] = (bySource[sname] || 0) + Number(e.amount)
                })
            }
            results.push({ month: m, year: y, label: `${monthNames[m - 1].slice(0, 3)} ${y}`, total, bySource })
        }
        setGrowthData(results)
        setGrowthLoading(false)
    }, [user])

    useEffect(() => { if (!loading && !user) router.push('/') }, [user, loading, router])
    useEffect(() => { if (user) { fetchSources(); fetchEntries() } }, [user, fetchSources, fetchEntries])
    useEffect(() => { if (user && activeTab === 'growth') fetchGrowthData() }, [user, activeTab, fetchGrowthData])

    // Sum calculations
    const totalIncome = entries.reduce((s, e) => s + Number(e.amount), 0)
    const recurringTotal = entries.filter(e => e.income_sources?.type === 'recurring').reduce((s, e) => s + Number(e.amount), 0)
    const onetimeTotal = entries.filter(e => e.income_sources?.type === 'one_time').reduce((s, e) => s + Number(e.amount), 0)

    // Per-source breakdown
    const sourceBreakdown = sources.map(src => {
        const srcEntries = entries.filter(e => e.source_id === src.id)
        const sum = srcEntries.reduce((s, e) => s + Number(e.amount), 0)
        return { ...src, sum, count: srcEntries.length }
    }).filter(s => s.count > 0).sort((a, b) => b.sum - a.sum)

    // Growth chart helpers
    const maxGrowth = growthData.length > 0 ? Math.max(...growthData.map(d => d.total), 1) : 1
    const lastMonth = growthData.length >= 2 ? growthData[growthData.length - 2].total : 0
    const curMonth = growthData.length >= 1 ? growthData[growthData.length - 1].total : 0
    const growthPct = lastMonth > 0 ? (((curMonth - lastMonth) / lastMonth) * 100).toFixed(1) : null

    // Source CRUD
    async function handleSaveSource(ev) {
        ev.preventDefault()
        setSaving(true)
        try {
            const payload = { ...sourceForm, user_id: user.id }
            const url = editSource ? `/api/income-sources/${editSource.id}` : '/api/income-sources'
            const method = editSource ? 'PUT' : 'POST'

            const res = await fetch(url, {
                method,
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload)
            })

            const data = await res.json()
            if (!res.ok) throw new Error(data.error || 'Server Error')

            setShowSourceModal(false)
            setEditSource(null)
            fetchSources()
        } catch (err) {
            alert('Error: ' + err.message)
        } finally {
            setSaving(false)
        }
    }

    async function handleDeleteSource(id) {
        if (!confirm('এই আয়ের উৎসটি মুছে ফেলবেন? সব এন্ট্রিও মুছে যাবে।')) return
        await fetch(`/api/income-sources/${id}`, { method: 'DELETE' })
        fetchSources()
        fetchEntries()
    }

    function openAddSource() {
        setEditSource(null)
        setSourceForm({ name: '', icon: '💰', type: 'recurring', color: '#10B981' })
        setShowSourceModal(true)
    }
    function openEditSource(src) {
        setEditSource(src)
        setSourceForm({ name: src.name, icon: src.icon, type: src.type, color: src.color })
        setShowSourceModal(true)
    }

    // Entry CRUD
    async function handleSaveEntry(ev) {
        ev.preventDefault()
        setSaving(true)
        if (editEntry) {
            await fetch(`/api/income-entries/${editEntry.id}`, {
                method: 'PUT', headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(entryForm)
            })
        } else {
            await fetch('/api/income-entries', {
                method: 'POST', headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ ...entryForm, user_id: user.id })
            })
        }
        setSaving(false)
        setShowEntryModal(false)
        setEditEntry(null)
        fetchEntries()
    }

    async function handleDeleteEntry(id) {
        if (!confirm('এই আয় এন্ট্রিটি মুছে ফেলবেন?')) return
        await fetch(`/api/income-entries/${id}`, { method: 'DELETE' })
        fetchEntries()
    }

    function openAddEntry() {
        setEditEntry(null)
        setEntryForm({ source_id: '', amount: '', date: now.toISOString().split('T')[0], note: '' })
        setShowEntryModal(true)
    }
    function openEditEntry(e) {
        setEditEntry(e)
        setEntryForm({ source_id: e.source_id, amount: e.amount, date: e.date, note: e.note || '' })
        setShowEntryModal(true)
    }

    return (
        <div className="app-layout">
            <Sidebar />
            <main className="main-content">
                <div className="page-inner">

                    {/* ═══ HERO ═══ */}
                    <div className="inc-hero" style={{ padding: '20px', marginBottom: '20px' }}>
                        <div className="inc-hero-bg"></div>
                        <div className="inc-hero-particles">
                            {[1,2,3,4,5].map(i => <div key={i} className={`inc-particle inc-p${i}`}></div>)}
                        </div>
                        <div className="inc-hero-content">
                            <div className="exp-hero-left" style={{ gap: '12px' }}>
                                <div className="exp-hero-icon-wrap" style={{ width: 44, height: 44 }}>
                                    <span className="exp-hero-icon" style={{ fontSize: 24 }}>💰</span>
                                </div>
                                <div>
                                    <h1 className="exp-hero-title" style={{ fontSize: 22, background: 'linear-gradient(135deg, #F1F5F9, #34D399, #10B981)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
                                        আয় ব্যবস্থাপনা
                                    </h1>
                                    <p className="exp-hero-sub" style={{ fontSize: 13, marginTop: 2 }}>একাধিক আয়ের উৎস ট্র্যাক ও গ্রোথ দেখুন</p>
                                </div>
                            </div>
                            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                                <button className="exp-add-btn" style={{ padding: '8px 14px', minHeight: 'unset', fontSize: 13, background: 'linear-gradient(135deg, #059669, #047857)', boxShadow: '0 4px 12px rgba(5,150,105,0.3)' }} onClick={openAddSource}>
                                    <span style={{ fontSize: 14 }}>⚙️</span>
                                    <span>নতুন সোর্স</span>
                                    <div className="exp-add-btn-shine"></div>
                                </button>
                                <button className="exp-add-btn" style={{ padding: '8px 14px', minHeight: 'unset', fontSize: 13, background: 'linear-gradient(135deg, #10B981, #059669)', boxShadow: '0 4px 12px rgba(16,185,129,0.3)' }} onClick={openAddEntry} disabled={sources.length === 0}>
                                    <span style={{ fontSize: 14 }}>+</span>
                                    <span style={{ whiteSpace: 'nowrap' }}>আয় যোগ করুন</span>
                                    <div className="exp-add-btn-shine"></div>
                                </button>
                            </div>
                        </div>
                    </div>

                    {/* ═══ STAT CARDS ═══ */}
                    <div className="exp-stats-row">
                        <div className="exp-stat-glass">
                            <div className="exp-stat-glass-bg"></div>
                            <div className="exp-stat-content">
                                <div className="exp-stat-icon-box" style={{ background: 'linear-gradient(135deg, #10B981, #059669)' }}>💰</div>
                                <div>
                                    <p className="exp-stat-label">মোট আয়</p>
                                    <p className="exp-stat-value" style={{ color: '#6EE7B7' }}>৳{totalIncome.toLocaleString('bn-BD')}</p>
                                </div>
                            </div>
                        </div>
                        <div className="exp-stat-glass">
                            <div className="exp-stat-glass-bg"></div>
                            <div className="exp-stat-content">
                                <div className="exp-stat-icon-box" style={{ background: 'linear-gradient(135deg, #3B82F6, #2563EB)' }}>🔄</div>
                                <div>
                                    <p className="exp-stat-label">নিয়মিত আয়</p>
                                    <p className="exp-stat-value" style={{ color: '#60A5FA' }}>৳{recurringTotal.toLocaleString('bn-BD')}</p>
                                </div>
                            </div>
                        </div>
                        <div className="exp-stat-glass">
                            <div className="exp-stat-glass-bg"></div>
                            <div className="exp-stat-content">
                                <div className="exp-stat-icon-box" style={{ background: 'linear-gradient(135deg, #A855F7, #7C3AED)' }}>⚡</div>
                                <div>
                                    <p className="exp-stat-label">এককালীন আয়</p>
                                    <p className="exp-stat-value" style={{ color: '#C084FC' }}>৳{onetimeTotal.toLocaleString('bn-BD')}</p>
                                </div>
                            </div>
                        </div>
                        <div className="exp-stat-glass">
                            <div className="exp-stat-glass-bg"></div>
                            <div className="exp-stat-content">
                                <div className="exp-stat-icon-box" style={{ background: 'linear-gradient(135deg, #F59E0B, #D97706)' }}>📊</div>
                                <div>
                                    <p className="exp-stat-label">সোর্স সংখ্যা</p>
                                    <p className="exp-stat-value" style={{ color: '#FCD34D' }}>{sources.length}টি</p>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* ═══ SOURCES OVERVIEW ═══ */}
                    {sources.length > 0 && (
                        <div className="inc-sources-row">
                            {sources.map(src => {
                                const col = getColorObj(src.color)
                                const srcTotal = entries.filter(e => e.source_id === src.id).reduce((s, e) => s + Number(e.amount), 0)
                                const pct = totalIncome > 0 ? Math.round((srcTotal / totalIncome) * 100) : 0
                                return (
                                    <div key={src.id} className="inc-source-card" style={{ '--src-gradient': col.gradient, '--src-glow': col.glow, '--src-bg': col.bg }}>
                                        <div className="inc-source-card-glow"></div>
                                        <div className="inc-source-top">
                                            <div className="inc-source-icon" style={{ background: col.gradient, boxShadow: `0 4px 16px ${col.glow}` }}>{src.icon}</div>
                                            <div className="inc-source-actions">
                                                <button className="inc-source-edit-btn" onClick={() => openEditSource(src)}>✏️</button>
                                                <button className="inc-source-del-btn" onClick={() => handleDeleteSource(src.id)}>🗑️</button>
                                            </div>
                                        </div>
                                        <div className="inc-source-name">{src.name}</div>
                                        <div className="inc-source-type-badge" style={{ background: col.bg, color: col.hex || '#10B981' }}>
                                            {src.type === 'recurring' ? '🔄 নিয়মিত' : '⚡ এককালীন'}
                                        </div>
                                        <div className="inc-source-amount" style={{ color: col.hex || '#10B981' }}>
                                            ৳{srcTotal.toLocaleString('bn-BD')}
                                        </div>
                                        <div className="inc-source-bar-bg">
                                            <div className="inc-source-bar-fill" style={{ width: `${pct}%`, background: col.gradient }}></div>
                                        </div>
                                        <div className="inc-source-pct">{pct}% এই মাসে</div>
                                    </div>
                                )
                            })}
                        </div>
                    )}

                    {sources.length === 0 && (
                        <div className="exp-empty" style={{ marginTop: 24 }}>
                            <div className="exp-empty-icon">💰</div>
                            <h3>কোনো আয়ের উৎস নেই</h3>
                            <p>প্রথমে একটি আয়ের সোর্স যোগ করুন (যেমন: চাকরি, ফ্রিল্যান্স)</p>
                            <button className="exp-add-btn" onClick={openAddSource} style={{ marginTop: 16, background: 'linear-gradient(135deg, #10B981, #059669)' }}>
                                <span className="exp-add-btn-icon">⚙️</span>
                                <span>সোর্স যোগ করুন</span>
                                <div className="exp-add-btn-shine"></div>
                            </button>
                        </div>
                    )}

                    {/* ═══ TABS ═══ */}
                    {sources.length > 0 && (
                        <>
                            <div className="inc-tabs">
                                <button className={`inc-tab ${activeTab === 'entries' ? 'active' : ''}`} onClick={() => setActiveTab('entries')}>
                                    📋 আয়ের ইতিহাস
                                </button>
                                <button className={`inc-tab ${activeTab === 'growth' ? 'active' : ''}`} onClick={() => setActiveTab('growth')}>
                                    📈 গ্রোথ ট্র্যাকার
                                </button>
                            </div>

                            {/* ── ENTRIES TAB ── */}
                            {activeTab === 'entries' && (
                                <>
                                    {/* Filter Bar */}
                                    <div className="exp-filter-bar">
                                        <div className="exp-filter-glass-bg"></div>
                                        <div className="exp-filter-content">
                                            <div className="exp-filter-group">
                                                <label className="exp-filter-label">📅 মাস</label>
                                                <select className="exp-filter-select" value={month} onChange={e => setMonth(Number(e.target.value))}>
                                                    {monthNames.map((m, i) => <option key={i} value={i + 1}>{m}</option>)}
                                                </select>
                                            </div>
                                            <div className="exp-filter-group">
                                                <label className="exp-filter-label">📆 সাল</label>
                                                <select className="exp-filter-select" value={year} onChange={e => setYear(Number(e.target.value))}>
                                                    {[2023, 2024, 2025, 2026].map(y => <option key={y} value={y}>{y}</option>)}
                                                </select>
                                            </div>
                                            <div className="exp-filter-group">
                                                <label className="exp-filter-label">💼 সোর্স</label>
                                                <select className="exp-filter-select" value={filterSource} onChange={e => setFilterSource(e.target.value)}>
                                                    <option value="">সব সোর্স</option>
                                                    {sources.map(s => <option key={s.id} value={s.id}>{s.icon} {s.name}</option>)}
                                                </select>
                                            </div>
                                        </div>
                                    </div>

                                    {/* Entries List */}
                                    {fetching ? (
                                        <div className="exp-loading"><div className="exp-loading-ring"></div><p>লোড হচ্ছে...</p></div>
                                    ) : entries.length === 0 ? (
                                        <div className="exp-empty">
                                            <div className="exp-empty-icon">💸</div>
                                            <h3>কোনো আয় নেই</h3>
                                            <p>এই মাসে কোনো আয় এন্ট্রি নেই।</p>
                                            <button className="exp-add-btn" onClick={openAddEntry} style={{ marginTop: 16, background: 'linear-gradient(135deg, #10B981, #059669)' }}>
                                                <span className="exp-add-btn-icon">+</span>
                                                <span>আয় যোগ করুন</span>
                                                <div className="exp-add-btn-shine"></div>
                                            </button>
                                        </div>
                                    ) : (
                                        <div className="exp-cards-grid">
                                            {entries.map((e, idx) => {
                                                const col = getColorObj(e.income_sources?.color || '#10B981')
                                                return (
                                                    <div key={e.id} className="exp-card" style={{ '--card-gradient': col.gradient, '--card-glow': col.glow, '--card-bg': col.bg, '--card-text': col.hex, animationDelay: `${idx * 0.05}s` }}>
                                                        <div className="exp-card-glow-border"></div>
                                                        <div className="exp-card-inner">
                                                            <div className="exp-card-top">
                                                                <div className="exp-card-cat-icon" style={{ background: col.gradient, boxShadow: `0 4px 20px ${col.glow}` }}>
                                                                    {e.income_sources?.icon || '💰'}
                                                                </div>
                                                                <div className="exp-card-cat-info">
                                                                    <span className="exp-card-cat-name" style={{ color: col.hex }}>{e.income_sources?.name || 'অজানা'}</span>
                                                                    <span className="exp-card-date">{e.date}</span>
                                                                    <span style={{ fontSize: 11, color: col.hex, opacity: 0.7, marginTop: 2 }}>
                                                                        {e.income_sources?.type === 'recurring' ? '🔄 নিয়মিত' : '⚡ এককালীন'}
                                                                    </span>
                                                                </div>
                                                                <div className="exp-card-amount" style={{ color: col.hex }}>
                                                                    +৳{Number(e.amount).toLocaleString()}
                                                                </div>
                                                            </div>
                                                            {e.note && (
                                                                <div className="exp-card-note">
                                                                    <span className="exp-card-note-dot" style={{ background: col.gradient }}></span>
                                                                    {e.note}
                                                                </div>
                                                            )}
                                                            <div className="exp-card-actions">
                                                                <button className="exp-card-action-btn exp-edit-btn" onClick={() => openEditEntry(e)}>✏️ সম্পাদনা</button>
                                                                <button className="exp-card-action-btn exp-delete-btn" onClick={() => handleDeleteEntry(e.id)}>🗑️ মুছুন</button>
                                                            </div>
                                                        </div>
                                                    </div>
                                                )
                                            })}
                                        </div>
                                    )}
                                </>
                            )}

                            {/* ── GROWTH TAB ── */}
                            {activeTab === 'growth' && (
                                <div className="inc-growth-section">
                                    {growthLoading ? (
                                        <div className="exp-loading"><div className="exp-loading-ring"></div><p>গ্রোথ ডেটা লোড হচ্ছে...</p></div>
                                    ) : (
                                        <>
                                            {/* Growth Summary */}
                                            <div className="inc-growth-summary">
                                                <div className="inc-growth-card">
                                                    <div className="inc-growth-card-label">এই মাসের আয়</div>
                                                    <div className="inc-growth-card-value" style={{ color: '#6EE7B7' }}>৳{curMonth.toLocaleString('bn-BD')}</div>
                                                </div>
                                                <div className="inc-growth-card">
                                                    <div className="inc-growth-card-label">গত মাসের আয়</div>
                                                    <div className="inc-growth-card-value" style={{ color: '#60A5FA' }}>৳{lastMonth.toLocaleString('bn-BD')}</div>
                                                </div>
                                                <div className="inc-growth-card">
                                                    <div className="inc-growth-card-label">গ্রোথ</div>
                                                    <div className="inc-growth-card-value" style={{ color: growthPct >= 0 ? '#6EE7B7' : '#FCA5A5' }}>
                                                        {growthPct !== null ? `${growthPct > 0 ? '+' : ''}${growthPct}%` : '—'}
                                                    </div>
                                                </div>
                                                <div className="inc-growth-card">
                                                    <div className="inc-growth-card-label">বার্ষিক মোট</div>
                                                    <div className="inc-growth-card-value" style={{ color: '#C084FC' }}>
                                                        ৳{growthData.filter(d => d.year === now.getFullYear()).reduce((s, d) => s + d.total, 0).toLocaleString('bn-BD')}
                                                    </div>
                                                </div>
                                            </div>

                                            {/* Bar Chart */}
                                            <div className="inc-chart-wrap">
                                                <div className="inc-chart-title">📈 গত ১২ মাসের আয় চার্ট</div>
                                                <div className="inc-bar-chart">
                                                    {growthData.map((d, i) => {
                                                        const h = maxGrowth > 0 ? Math.round((d.total / maxGrowth) * 200) : 0
                                                        const isThisMonth = d.month === now.getMonth() + 1 && d.year === now.getFullYear()
                                                        return (
                                                            <div key={i} className="inc-bar-col">
                                                                <div className="inc-bar-value">৳{d.total > 0 ? (d.total / 1000).toFixed(0) + 'k' : '০'}</div>
                                                                <div className="inc-bar-wrap">
                                                                    <div className="inc-bar-fill" style={{
                                                                        height: `${Math.max(h, d.total > 0 ? 8 : 0)}px`,
                                                                        background: isThisMonth
                                                                            ? 'linear-gradient(180deg, #34D399, #10B981)'
                                                                            : 'linear-gradient(180deg, rgba(16,185,129,0.5), rgba(5,150,105,0.3))',
                                                                        boxShadow: isThisMonth ? '0 0 12px rgba(52,211,153,0.5)' : 'none'
                                                                    }}></div>
                                                                </div>
                                                                <div className="inc-bar-label" style={{ fontWeight: isThisMonth ? 700 : 400, color: isThisMonth ? '#34D399' : 'var(--text-muted)' }}>{d.label}</div>
                                                            </div>
                                                        )
                                                    })}
                                                </div>
                                            </div>

                                            {/* Monthly Breakdown Table */}
                                            <div className="inc-growth-table-wrap">
                                                <div className="inc-chart-title">📊 মাসিক আয় বিশ্লেষণ</div>
                                                <div className="inc-growth-table">
                                                    <div className="inc-growth-thead">
                                                        <span>মাস</span>
                                                        <span>মোট আয়</span>
                                                        <span>পরিবর্তন</span>
                                                    </div>
                                                    {[...growthData].reverse().map((d, i, arr) => {
                                                        const prev = arr[i + 1]
                                                        const pct = prev && prev.total > 0 ? (((d.total - prev.total) / prev.total) * 100).toFixed(1) : null
                                                        const isPos = pct >= 0
                                                        return (
                                                            <div key={i} className="inc-growth-row">
                                                                <span className="inc-growth-month">{d.label}</span>
                                                                <span className="inc-growth-amt">৳{d.total.toLocaleString('bn-BD')}</span>
                                                                <span className={`inc-growth-pct ${pct !== null ? (isPos ? 'pos' : 'neg') : ''}`}>
                                                                    {pct !== null ? `${isPos ? '▲' : '▼'} ${Math.abs(pct)}%` : '—'}
                                                                </span>
                                                            </div>
                                                        )
                                                    })}
                                                </div>
                                            </div>
                                        </>
                                    )}
                                </div>
                            )}
                        </>
                    )}
                </div>
            </main>

            {/* ═══ SOURCE MODAL ═══ */}
            <Modal open={showSourceModal} onClose={() => setShowSourceModal(false)} title={editSource ? '✏️ সোর্স সম্পাদনা' : '⚙️ নতুন আয়ের সোর্স'}>
                <form onSubmit={handleSaveSource}>
                    <div className="exp-form-section">
                        <label className="exp-form-label">📝 সোর্সের নাম</label>
                        <input className="exp-form-input" type="text" placeholder="যেমন: চাকরি, ফ্রিল্যান্সিং, টিউশন" value={sourceForm.name} onChange={e => setSourceForm(f => ({ ...f, name: e.target.value }))} required />
                    </div>
                    <div className="exp-form-section">
                        <label className="exp-form-label">😀 আইকন নির্বাচন করুন</label>
                        <div className="inc-icon-picker">
                            {SOURCE_ICONS.map(ic => (
                                <button key={ic} type="button" className={`inc-icon-btn ${sourceForm.icon === ic ? 'active' : ''}`} onClick={() => setSourceForm(f => ({ ...f, icon: ic }))}>{ic}</button>
                            ))}
                        </div>
                    </div>
                    <div className="exp-form-section">
                        <label className="exp-form-label">🎨 রঙ নির্বাচন করুন</label>
                        <div className="inc-color-picker">
                            {SOURCE_COLORS.map(col => (
                                <button key={col.id} type="button" className={`inc-color-btn ${sourceForm.color === col.hex ? 'active' : ''}`} style={{ background: col.gradient }} onClick={() => setSourceForm(f => ({ ...f, color: col.hex }))}></button>
                            ))}
                        </div>
                    </div>
                    <div className="exp-form-section">
                        <label className="exp-form-label">🔄 আয়ের ধরন</label>
                        <div style={{ display: 'flex', gap: 10 }}>
                            <button type="button" className={`inc-type-btn ${sourceForm.type === 'recurring' ? 'active' : ''}`} onClick={() => setSourceForm(f => ({ ...f, type: 'recurring' }))}>🔄 নিয়মিত</button>
                            <button type="button" className={`inc-type-btn ${sourceForm.type === 'one_time' ? 'active' : ''}`} onClick={() => setSourceForm(f => ({ ...f, type: 'one_time' }))}>⚡ এককালীন</button>
                        </div>
                    </div>
                    <div className="exp-modal-actions">
                        <button type="button" className="exp-modal-cancel" onClick={() => setShowSourceModal(false)}>বাতিল</button>
                        <button type="submit" className="exp-modal-save" style={{ background: 'linear-gradient(135deg, #10B981, #059669)', boxShadow: '0 4px 20px rgba(16,185,129,0.4)' }} disabled={saving}>
                            {saving ? <><span className="exp-save-spinner"></span> সংরক্ষণ হচ্ছে...</> : <>✅ সংরক্ষণ করুন</>}
                        </button>
                    </div>
                </form>
            </Modal>

            {/* ═══ ENTRY MODAL ═══ */}
            <Modal open={showEntryModal} onClose={() => setShowEntryModal(false)} title={editEntry ? '✏️ আয় সম্পাদনা' : '💰 নতুন আয় যোগ করুন'}>
                <form onSubmit={handleSaveEntry}>
                    <div className="exp-form-section">
                        <label className="exp-form-label">💼 আয়ের সোর্স</label>
                        <select className="exp-form-input" value={entryForm.source_id} onChange={e => setEntryForm(f => ({ ...f, source_id: e.target.value }))} required>
                            <option value="">সোর্স নির্বাচন করুন</option>
                            {sources.map(s => <option key={s.id} value={s.id}>{s.icon} {s.name}</option>)}
                        </select>
                    </div>
                    <div className="form-row">
                        <div className="exp-form-section">
                            <label className="exp-form-label">💰 পরিমাণ (৳)</label>
                            <BengaliNumberInput value={entryForm.amount} onChange={val => setEntryForm(f => ({ ...f, amount: val }))} placeholder="০" required min="1" className="exp-form-input" />
                        </div>
                        <div className="exp-form-section">
                            <label className="exp-form-label">📅 তারিখ</label>
                            <input className="exp-form-input" type="date" value={entryForm.date} onChange={e => setEntryForm(f => ({ ...f, date: e.target.value }))} required />
                        </div>
                    </div>
                    <div className="exp-form-section">
                        <label className="exp-form-label">📝 নোট (ঐচ্ছিক)</label>
                        <input className="exp-form-input" type="text" placeholder="বিবরণ লিখুন" value={entryForm.note} onChange={e => setEntryForm(f => ({ ...f, note: e.target.value }))} />
                    </div>
                    <div className="exp-modal-actions">
                        <button type="button" className="exp-modal-cancel" onClick={() => setShowEntryModal(false)}>বাতিল</button>
                        <button type="submit" className="exp-modal-save" style={{ background: 'linear-gradient(135deg, #10B981, #059669)', boxShadow: '0 4px 20px rgba(16,185,129,0.4)' }} disabled={saving}>
                            {saving ? <><span className="exp-save-spinner"></span> সংরক্ষণ হচ্ছে...</> : <>✅ সংরক্ষণ করুন</>}
                            <div className="exp-add-btn-shine"></div>
                        </button>
                    </div>
                </form>
            </Modal>
        </div>
    )
}
